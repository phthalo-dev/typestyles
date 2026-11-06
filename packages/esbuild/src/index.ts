import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve as resolvePath } from 'node:path';
import type { Plugin, PluginBuild } from 'esbuild';
import {
  extractNamespaces,
  reportDuplicateNamespaces,
  resolveExtractMode,
  resolveExtractModules,
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

function attachHooks(
  build: PluginBuild,
  options: {
    warnDuplicates: boolean;
    extract: TypestylesExtractOptions | undefined;
    root: string;
    resolvedExtractModules: string[];
    resolvedMode: TypestylesIntegrationMode;
    moduleNamespaces: Map<string, { keys: string[]; prefixes: string[] }>;
    extractOnce: () => Promise<TypestylesExtractResult>;
  },
): void {
  const {
    warnDuplicates,
    extract,
    root,
    resolvedExtractModules,
    resolvedMode,
    moduleNamespaces,
    extractOnce,
  } = options;

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

    if (!TYPESTYLES_IMPORT_RE.test(code)) return null;

    const { keys, prefixes } = extractNamespaces(code);
    if (keys.length === 0 && prefixes.length === 0) return null;

    if (warnDuplicates) {
      reportDuplicateNamespaces(moduleNamespaces, args.path, prefixes, {
        error(message) {
          throw new Error(message);
        },
      });
    }

    moduleNamespaces.set(args.path, { keys, prefixes });
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
        build.onLoad({ filter: /\.[cm]?[jt]s$/ }, async (args) => {
          const source = readFileSync(args.path, 'utf8');
          if (!mightContainRecipeCalls(source)) return undefined;
          let js = source;
          if (/\.[cm]?ts$/.test(args.path)) {
            const { transform } = await import('esbuild');
            js = (
              await transform(source, {
                loader: 'ts',
                sourcefile: args.path,
                tsconfigRaw: build.initialOptions.tsconfigRaw,
              })
            ).code;
          }
          planIndex ??= indexPlans((await extractOnce()).plans);
          const out = transformRecipeCalls(js, planIndex);
          return out === null
            ? undefined
            : { contents: out, loader: 'js', resolveDir: dirname(args.path) };
        });
      }

      attachHooks(build, {
        warnDuplicates,
        extract,
        root,
        resolvedExtractModules,
        resolvedMode,
        moduleNamespaces,
        extractOnce,
      });
    },
  };
}
