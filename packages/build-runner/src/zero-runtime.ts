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
