import type { Plugin } from 'rollup';
import {
  extractNamespaces,
  reportDuplicateNamespaces,
  resolveExtractMode,
  resolveExtractModules,
  runTypestylesBuild,
  findRealSheetModules,
  isSheetRequest,
  TYPESTYLES_IMPORT_RE,
  toZeroRuntimeSheetId,
  zeroRuntimeLeakMessage,
  type TypestylesExtractOptions,
  type TypestylesIntegrationMode,
} from '@typestyles/build-runner';

/** Re-export shared convention discovery (same paths as `@typestyles/vite`). */
export {
  DEFAULT_EXTRACT_MODULE_CANDIDATES,
  discoverDefaultExtractModules,
} from '@typestyles/build-runner';

export type { TypestylesExtractOptions };

export interface TypestylesRollupPluginOptions {
  /**
   * When true (default), fail the build if the same logical `styles.component` / `styles.class`
   * namespace appears in more than one module. Set to `false` to skip this check.
   */
  warnDuplicates?: boolean;
  /**
   * Integration mode:
   * - `"runtime"` (default when no extraction modules resolve): no static extraction.
   * - `"build"`: emit static CSS and disable runtime insertion.
   * - `"hybrid"`: emit static CSS and keep runtime-compatible behavior.
   *
   * When omitted and at least one extraction module resolves (explicit `extract.modules` or a
   * discovered convention entry), defaults to `"build"`.
   */
  mode?: TypestylesIntegrationMode;
  /**
   * Build-time extraction options for `"build"` and `"hybrid"` modes.
   *
   * Omitted entirely: discover a convention entry under `root` (see
   * {@link discoverDefaultExtractModules}); if none exist, stays in runtime-only mode.
   */
  extract?: TypestylesExtractOptions;
  /**
   * Project root used to resolve extraction modules and convention discovery.
   * Defaults to `process.cwd()`.
   */
  root?: string;
}

export { extractNamespaces };

/**
 * Rollup plugin for typestyles runtime + optional static extraction.
 *
 * Rolldown supports Rollup-compatible plugins, so this plugin also works
 * as a starting integration there.
 */
export default function typestylesRollupPlugin(
  options: TypestylesRollupPluginOptions = {},
): Plugin {
  const { warnDuplicates = true, extract, root = process.cwd() } = options;
  const moduleNamespaces = new Map<string, { keys: string[]; prefixes: string[] }>();
  let resolvedExtractModules: string[] = [];
  let resolvedMode: TypestylesIntegrationMode = 'runtime';

  return {
    name: 'typestyles-rollup',

    buildStart() {
      resolvedExtractModules = resolveExtractModules(root, extract);
      resolvedMode = resolveExtractMode(options.mode, resolvedExtractModules);
    },

    async resolveId(source, importer) {
      // Zero-runtime (mode: 'build'): typestyles reaches its stylesheet through
      // the `sheet` module. Resolve it normally, then point it at the
      // no-op sheet so the CSS insertion runtime, stylesheet state, and DOM
      // plumbing never enter the bundle. Class names / data attributes are
      // computed identically; extraction still runs the real runtime in a node
      // subprocess (see generateBundle). `hybrid` keeps the runtime for dynamic
      // styles.
      if (resolvedMode !== 'build' || !isSheetRequest(source)) return null;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      if (!resolved) return null;
      const noop = toZeroRuntimeSheetId(resolved.id);
      return noop ? { ...resolved, id: noop } : null;
    },

    transform(code, id) {
      if (
        (resolvedMode === 'build' || resolvedMode === 'hybrid') &&
        code.includes('__TYPESTYLES_RUNTIME_DISABLED__')
      ) {
        return {
          code: code.replace(/__TYPESTYLES_RUNTIME_DISABLED__/g, '"true"'),
          map: null,
        };
      }

      if (!/\.[jt]sx?$/.test(id)) return null;
      if (id.includes('node_modules')) return null;
      if (!TYPESTYLES_IMPORT_RE.test(code)) return null;

      const { keys, prefixes } = extractNamespaces(code);
      if (keys.length === 0 && prefixes.length === 0) return null;

      if (warnDuplicates) {
        reportDuplicateNamespaces(moduleNamespaces, id, prefixes, this);
      }

      moduleNamespaces.set(id, { keys, prefixes });
      return null;
    },

    async generateBundle(_options, bundle) {
      if (resolvedMode === 'build') {
        const leaked = findRealSheetModules(
          Object.values(bundle ?? {}).flatMap((chunk) =>
            chunk.type === 'chunk' ? Object.keys(chunk.modules) : [],
          ),
        );
        if (leaked.length > 0) this.warn(zeroRuntimeLeakMessage(leaked));
      }
      if (resolvedMode === 'runtime') return;
      if (!resolvedExtractModules.length) return;

      try {
        const css = await runTypestylesBuild({
          root,
          modules: resolvedExtractModules,
        });
        this.emitFile({
          type: 'asset',
          fileName: extract?.fileName ?? 'typestyles.css',
          source: css,
        });
      } catch (error) {
        this.error(
          `[typestyles] Failed to extract CSS: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  };
}
