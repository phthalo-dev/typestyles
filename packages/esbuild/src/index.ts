import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve as resolvePath } from 'node:path';
import type { Plugin, PluginBuild } from 'esbuild';
import {
  extractNamespaces,
  reportDuplicateNamespaces,
  resolveExtractMode,
  resolveExtractModules,
  chainSourceMap,
  indexPlans,
  mightContainRecipeCalls,
  runTypestylesExtract,
  transformRecipeCalls,
  type PlanIndex,
  type TypestylesExtractResult,
  isSheetRequest,
  toZeroRuntimeSheetId,
  TYPESTYLES_IMPORT_RE,
  type TypestylesExtractOptions,
  type TypestylesIntegrationMode,
} from '@typestyles/build-runner';

/** Re-export shared convention discovery (same paths as `@typestyles/vite`). */
export {
  DEFAULT_EXTRACT_MODULE_CANDIDATES,
  discoverDefaultExtractModules,
} from '@typestyles/build-runner';

export type { TypestylesExtractOptions };

export interface TypestylesEsbuildPluginOptions {
  warnDuplicates?: boolean;
  mode?: TypestylesIntegrationMode;
  extract?: TypestylesExtractOptions;
  root?: string;
  /**
   * Experimental. In `"build"` mode on non-node builds, replace `recipe()` definitions with the
   * small call-behavior plans recorded during extraction, so style configs and CSS machinery
   * tree-shake out of the bundle. Handles `.js`/`.mjs`/`.cjs` and `.ts`/`.mts`/`.cts` modules
   * (types are stripped with esbuild's own transform first); `.jsx`/`.tsx` modules are left
   * alone.
   */
  compile?: boolean;
}

function loaderForPath(path: string): 'js' | 'jsx' | 'ts' | 'tsx' {
  if (path.endsWith('.tsx')) return 'tsx';
  if (path.endsWith('.ts')) return 'ts';
  if (path.endsWith('.jsx')) return 'jsx';
  return 'js';
}

/** Record a module's style namespaces and report duplicates across modules (throws). */
function namespaceTracker(
  warnDuplicates: boolean,
  moduleNamespaces: Map<string, { keys: string[]; prefixes: string[] }>,
): (path: string, code: string) => void {
  return (path, code) => {
    if (path.includes('node_modules')) return;
    if (!TYPESTYLES_IMPORT_RE.test(code)) return;

    const { keys, prefixes } = extractNamespaces(code);
    if (keys.length === 0 && prefixes.length === 0) return;

    if (warnDuplicates) {
      reportDuplicateNamespaces(moduleNamespaces, path, prefixes, {
        error(message) {
          throw new Error(message);
        },
      });
    }

    moduleNamespaces.set(path, { keys, prefixes });
  };
}

function attachHooks(
  build: PluginBuild,
  options: {
    extract: TypestylesExtractOptions | undefined;
    root: string;
    resolvedExtractModules: string[];
    resolvedMode: TypestylesIntegrationMode;
    trackNamespaces: (path: string, code: string) => void;
    extractOnce: () => Promise<TypestylesExtractResult>;
  },
): void {
  const { extract, root, resolvedExtractModules, resolvedMode, trackNamespaces, extractOnce } =
    options;

  build.onLoad({ filter: /\.[jt]sx?$/ }, (args) => {
    if (args.path.includes('node_modules')) return null;

    const code = readFileSync(args.path, 'utf8');
    const loader = loaderForPath(args.path);

    if (
      (resolvedMode === 'build' || resolvedMode === 'hybrid') &&
      code.includes('__TYPESTYLES_RUNTIME_DISABLED__')
    ) {
      return {
        contents: code.replace(/__TYPESTYLES_RUNTIME_DISABLED__/g, '"true"'),
        loader,
      };
    }

    trackNamespaces(args.path, code);
    return null;
  });

  build.onEnd(async () => {
    if (resolvedMode === 'runtime') return;
    if (!resolvedExtractModules.length) return;

    const { css } = await extractOnce();
    const fileName = extract?.fileName ?? 'typestyles.css';
    const outdir = build.initialOptions.outdir ?? join(root, 'dist');
    await mkdir(outdir, { recursive: true });
    await writeFile(join(outdir, fileName), css, 'utf8');
  });
}

/**
 * esbuild plugin for typestyles runtime + optional static extraction.
 */
export default function typestylesEsbuildPlugin(
  options: TypestylesEsbuildPluginOptions = {},
): Plugin {
  const { warnDuplicates = true, extract, root = process.cwd(), compile = false } = options;
  const moduleNamespaces = new Map<string, { keys: string[]; prefixes: string[] }>();

  return {
    name: 'typestyles',
    setup(build) {
      const resolvedExtractModules = resolveExtractModules(root, extract);
      const resolvedMode = resolveExtractMode(options.mode, resolvedExtractModules);

      const trackNamespaces = namespaceTracker(warnDuplicates, moduleNamespaces);

      /** One extraction run per build: it feeds both the emitted CSS and the compile plans. */
      let extraction: Promise<TypestylesExtractResult> | null = null;
      let planIndex: PlanIndex | null = null;
      const extractOnce = (): Promise<TypestylesExtractResult> =>
        (extraction ??= runTypestylesExtract({ root, modules: resolvedExtractModules }));
      build.onStart(() => {
        extraction = null;
        planIndex = null;
      });

      if (resolvedMode === 'build' || resolvedMode === 'hybrid') {
        build.initialOptions.define = {
          ...build.initialOptions.define,
          __TYPESTYLES_RUNTIME_DISABLED__: JSON.stringify('true'),
        };
      }

      if (resolvedMode === 'build' && build.initialOptions.platform !== 'node') {
        // Zero-runtime (client builds only; node builds keep the full runtime):
        // redirect typestyles' `sheet` module to its no-op sibling. Class names / data attributes are
        // computed identically; the CSS insertion runtime, stylesheet state, and
        // DOM plumbing never enter the module graph. Extraction still runs the
        // real runtime in a node subprocess (see onEnd). `hybrid` keeps the
        // runtime for dynamic styles.
        build.onResolve({ filter: /sheet\.c?js$/ }, (args) => {
          if (!isSheetRequest(args.path) || !args.resolveDir) return undefined;
          const noop = toZeroRuntimeSheetId(resolvePath(args.resolveDir, args.path));
          return noop ? { path: noop } : undefined;
        });
      }

      if (
        compile &&
        resolvedMode === 'build' &&
        resolvedExtractModules.length > 0 &&
        build.initialOptions.platform !== 'node'
      ) {
        const wantMaps = Boolean(build.initialOptions.sourcemap);
        build.onLoad({ filter: /\.[cm]?[jt]s$/ }, async (args) => {
          const source = readFileSync(args.path, 'utf8');
          if (!mightContainRecipeCalls(source)) return undefined;
          // This hook replaces the module's load, so the namespace hook below never sees it.
          trackNamespaces(args.path, source);
          let js = source;
          let tsMap: string | undefined;
          if (/\.[cm]?ts$/.test(args.path)) {
            // `build` (not `transform`) so the project's tsconfig.json applies as it would in the
            // main build: decorators, `useDefineForClassFields`, `extends`, ….
            const { build: esbuildBuild } = await import('esbuild');
            const { initialOptions } = build;
            const stripped = await esbuildBuild({
              entryPoints: [args.path],
              bundle: false,
              write: false,
              format: 'esm',
              outfile: `${args.path}.typestyles.js`,
              platform: initialOptions.platform,
              target: initialOptions.target,
              tsconfig: initialOptions.tsconfig,
              tsconfigRaw: initialOptions.tsconfigRaw,
              absWorkingDir: initialOptions.absWorkingDir,
              sourcemap: wantMaps ? 'external' : false,
              logLevel: 'silent',
            });
            for (const file of stripped.outputFiles) {
              if (file.path.endsWith('.map')) tsMap = file.text;
              else js = file.text;
            }
          }
          planIndex ??= indexPlans((await extractOnce()).plans);
          const out = transformRecipeCalls(js, planIndex, undefined, args.path);
          if (out === null) return undefined;
          const contents = wantMaps
            ? `${out.code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(
                JSON.stringify(chainSourceMap(out.map, tsMap)),
              ).toString('base64')}\n`
            : out.code;
          return { contents, loader: 'js', resolveDir: dirname(args.path) };
        });
      }

      attachHooks(build, {
        extract,
        root,
        resolvedExtractModules,
        resolvedMode,
        trackNamespaces,
        extractOnce,
      });
    },
  };
}
