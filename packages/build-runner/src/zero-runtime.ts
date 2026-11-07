import { relative } from 'node:path';

/**
 * Zero-runtime build seam.
 *
 * Every `typestyles` module reaches the stylesheet through one file,
 * `typestyles/dist/sheet.js` (`sheet.cjs`), imported by relative path. A
 * sibling `sheet-noop` file exports the same API but does nothing. In
 * zero-runtime client builds the bundler integrations redirect the former to
 * the latter, so the CSS insertion runtime, stylesheet state and DOM plumbing
 * never enter the module graph — for the main entry and for subpaths such as
 * `typestyles/css` alike, all sharing one registry. No specifier is rewritten
 * and no second copy of the package is involved.
 *
 * It is a plain relative import on purpose: package `imports` / `exports`
 * conditions are not understood by every tool (Parcel without flags, Metro,
 * older Jest), whereas a relative path resolves everywhere.
 */

const REAL_SHEET_FILE = /([\\/]typestyles[\\/]dist[\\/])sheet(\.c?js)(\?.*)?$/;

/** True when `request` could be a relative import of the sheet module. */
export function isSheetRequest(request: string): boolean {
  return /(^|[\\/])sheet\.c?js(\?.*)?$/.test(request);
}

/**
 * Map the resolved path of typestyles' real `sheet` module to its no-op
 * sibling. Returns `null` for anything else (including another package's own
 * `sheet.js`), so callers can leave those untouched.
 */
export function toZeroRuntimeSheetId(resolvedId: string): string | null {
  if (!REAL_SHEET_FILE.test(resolvedId)) return null;
  return resolvedId.replace(REAL_SHEET_FILE, '$1sheet-noop$2$3');
}

/** The slice of webpack's `Compiler` this plugin touches. */
interface WebpackCompilerLike {
  hooks: {
    normalModuleFactory: {
      tap(
        name: string,
        fn: (factory: {
          hooks: {
            afterResolve: {
              tap(name: string, fn: (data: { createData?: { resource?: string } }) => void): void;
            };
          };
        }) => void,
      ): void;
    };
  };
}

/**
 * Webpack plugin (also used by Next.js client bundles): redirect typestyles'
 * resolved `sheet` module to its no-op sibling.
 */
export class ZeroRuntimeSheetWebpackPlugin {
  apply(compiler: WebpackCompilerLike): void {
    compiler.hooks.normalModuleFactory.tap('typestyles-zero-runtime', (factory) => {
      factory.hooks.afterResolve.tap('typestyles-zero-runtime', (data) => {
        const resource = data.createData?.resource;
        if (!resource) return;
        const noop = toZeroRuntimeSheetId(resource);
        if (noop && data.createData) data.createData.resource = noop;
      });
    });
  }
}

/**
 * Module ids (from a finished bundle) that are typestyles' real `sheet`
 * module. In a zero-runtime client build there should be none: if one is
 * present, something bypassed the redirect and the CSS insertion runtime is
 * back in the bundle.
 */
export function findRealSheetModules(moduleIds: Iterable<string>): string[] {
  const found: string[] = [];
  for (const id of moduleIds) {
    if (toZeroRuntimeSheetId(id)) found.push(id);
  }
  return found;
}

/** Warning text for a zero-runtime build that still contains the real sheet. */
export function zeroRuntimeLeakMessage(moduleIds: readonly string[]): string {
  return (
    `[typestyles] mode: 'build' should ship no CSS runtime, but the real stylesheet ` +
    `module is in this bundle (${moduleIds[0]}). Something resolved typestyles' sheet ` +
    `without going through the bundler plugin (a pre-bundled dependency, an alias, or ` +
    `a second copy of typestyles?). Client JS is larger than it needs to be.`
  );
}

/** Modules of typestyles' dist that the lite runtime legitimately ships. */
const LITE_DIST_MODULE =
  /[\\/]typestyles[\\/]dist[\\/](?:lite|sheet-noop|chunks[\\/](?:attrs-runtime|rolldown-runtime|color|sheet-context))\.c?js$/;
const ANY_DIST_MODULE = /[\\/]typestyles[\\/]dist[\\/].*\.c?js$/;

/** Rendered typestyles runtime (excluding what the lite runtime needs) above this is worth a warning. */
const LINGERING_RUNTIME_BYTES = 8 * 1024;

export interface LingeringRuntime {
  /** Module ids of the full runtime still in the bundle. */
  ids: string[];
  /** Their combined rendered size. */
  bytes: number;
}

/**
 * After `compile`, report any substantial piece of the full typestyles runtime that is still in
 * the bundle (something the transform couldn't replace kept it alive). `null` when it's gone.
 */
export function findLingeringRuntime(
  modules: Iterable<{ id: string; renderedLength: number }>,
): LingeringRuntime | null {
  const ids: string[] = [];
  let bytes = 0;
  for (const { id, renderedLength } of modules) {
    if (!ANY_DIST_MODULE.test(id) || LITE_DIST_MODULE.test(id)) continue;
    if (renderedLength === 0) continue;
    ids.push(id);
    bytes += renderedLength;
  }
  return bytes >= LINGERING_RUNTIME_BYTES ? { ids, bytes } : null;
}

/** Warning text for a `compile` build that still ships the full runtime. */
export function lingeringRuntimeMessage(runtime: LingeringRuntime, importers: string[]): string {
  const kb = (runtime.bytes / 1024).toFixed(1);
  const from = importers.length > 0 ? ` It is still reached from: ${importers.join(', ')}.` : '';
  return (
    `[typestyles] compile: ${kb} KB of the typestyles runtime is still in the client bundle.${from} ` +
    `Those modules call typestyles APIs the compile step can't replace yet (themes, tokens, ` +
    `class helpers, or recipes it can't plan), and use their results at runtime.`
  );
}

/** A rendered chunk, as Rollup/Vite's `generateBundle` sees it (only what we read). */
interface BundleChunkLike {
  type: string;
  modules?: Record<string, { renderedLength: number }>;
}

/**
 * Warning for a `compile` build whose bundle still ships the full runtime, naming the app
 * modules that keep it alive; `null` when the runtime is gone. Shared by the Rollup and Vite
 * `generateBundle` hooks.
 */
export function lingeringRuntimeWarning(
  bundle: Record<string, BundleChunkLike>,
  getImporters: (id: string) => readonly string[] | undefined,
  root: string,
): string | null {
  const modules = Object.values(bundle).flatMap((chunk) =>
    chunk.type === 'chunk' && chunk.modules
      ? Object.entries(chunk.modules).map(([id, info]) => ({
          id,
          renderedLength: info.renderedLength,
        }))
      : [],
  );
  const lingering = findLingeringRuntime(modules);
  if (!lingering) return null;
  // Only modules that still contribute code: a stale import of tree-shaken code isn't a cause.
  const contributes = new Set(modules.filter((m) => m.renderedLength > 0).map((m) => m.id));
  const importers = new Set<string>();
  for (const id of lingering.ids) {
    for (const importer of getImporters(id) ?? []) {
      if (!contributes.has(importer)) continue;
      if (!/[\\/]typestyles[\\/]dist[\\/]/.test(importer)) {
        importers.add(relative(root, importer));
      }
    }
  }
  return lingeringRuntimeMessage(lingering, [...importers].slice(0, 5));
}
