import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Plugin, PluginBuild } from 'esbuild';
import {
  extractNamespaces,
  reportDuplicateNamespaces,
  resolveExtractMode,
  resolveExtractModules,
  runTypestylesBuild,
  TYPESTYLES_CORE_SPECIFIER,
  aliasCapturesTypestylesRuntime,
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
  },
): void {
  const { warnDuplicates, extract, root, resolvedExtractModules, resolvedMode, moduleNamespaces } =
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

    const css = await runTypestylesBuild({
      root,
      modules: resolvedExtractModules,
    });
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
  const { warnDuplicates = true, extract, root = process.cwd() } = options;
  const moduleNamespaces = new Map<string, { keys: string[]; prefixes: string[] }>();

  return {
    name: 'typestyles',
    setup(build) {
      const resolvedExtractModules = resolveExtractModules(root, extract);
      const resolvedMode = resolveExtractMode(options.mode, resolvedExtractModules);

      if (resolvedMode === 'build' || resolvedMode === 'hybrid') {
        build.initialOptions.define = {
          ...build.initialOptions.define,
          __TYPESTYLES_RUNTIME_DISABLED__: JSON.stringify('true'),
        };
      }

      if (resolvedMode === 'build' && build.initialOptions.platform !== 'node') {
        // Zero-runtime (client builds only; node builds keep the full runtime):
        // resolve the bare `typestyles` runtime barrel to the pure name-only
        // build. Class names / data attributes are computed identically; the
        // CSS insertion runtime, stylesheet state, and DOM plumbing are absent
        // from that entry and tree-shake away. Extraction still runs the real
        // runtime in a node subprocess (see onEnd). `hybrid` keeps the runtime
        // for dynamic styles.
        //
        // An `onResolve` hook is used instead of `alias` because esbuild
        // aliases also match subpaths (`typestyles/color` would become
        // `typestyles/core/color`). Honors the user's own aliases and
        // `external`, via `build.resolve`.
        const userAliased = Object.keys(build.initialOptions.alias ?? {}).some(
          aliasCapturesTypestylesRuntime,
        );
        if (!userAliased) {
          build.onResolve({ filter: /^typestyles$/ }, async (args) => {
            if (args.pluginData?.typestylesCoreSwap) return undefined;
            const result = await build.resolve(TYPESTYLES_CORE_SPECIFIER, {
              importer: args.importer,
              namespace: args.namespace,
              resolveDir: args.resolveDir,
              kind: args.kind,
              pluginData: { typestylesCoreSwap: true },
            });
            return result.errors.length > 0 ? undefined : result;
          });
        }
      }

      attachHooks(build, {
        warnDuplicates,
        extract,
        root,
        resolvedExtractModules,
        resolvedMode,
        moduleNamespaces,
      });
    },
  };
}
