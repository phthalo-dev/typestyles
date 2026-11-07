import type { Plugin, TransformPluginContext } from 'rollup';
import {
  extractNamespaces,
  reportDuplicateNamespaces,
  resolveExtractMode,
  resolveExtractModules,
  indexPlans,
  isTransformableId,
  runTypestylesExtract,
  transformRecipeCalls,
  mayNeedRecompile,
  type CompileTransformResult,
  type PlanIndex,
  type TypestylesExtractResult,
  findRealSheetModules,
  lingeringRuntimeWarning,
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
  /**
   * Experimental. In `"build"` mode, replace `recipe()` definitions with the small call-behavior
   * plans recorded during extraction, so style configs and CSS machinery tree-shake out of the
   * bundle. Rollup applies `transform` hooks in plugin order, so list this plugin **after** any
   * TypeScript/JSX plugin: only plain-JS modules are rewritten.
   */
  compile?: boolean;
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
  const { warnDuplicates = true, extract, root = process.cwd(), compile = false } = options;
  const moduleNamespaces = new Map<string, { keys: string[]; prefixes: string[] }>();
  let resolvedExtractModules: string[] = [];
  let resolvedMode: TypestylesIntegrationMode = 'runtime';
  /** One extraction run per build: it feeds both the emitted CSS and the compile plans. */
  let extraction: Promise<TypestylesExtractResult> | null = null;
  let planIndex: PlanIndex | null = null;
  const extractOnce = (): Promise<TypestylesExtractResult> =>
    (extraction ??= runTypestylesExtract({ root, modules: resolvedExtractModules }));
  const compileEnabled = (): boolean =>
    compile && resolvedMode === 'build' && resolvedExtractModules.length > 0;

  /**
   * Namespace bookkeeping always runs on the module's own source, so compiled modules still
   * report duplicate recipe names; the compiled code (and its map) is what's returned.
   */
  function finishTransform(
    this: TransformPluginContext,
    source: string,
    id: string,
    compiled: CompileTransformResult | null,
  ): { code: string; map: CompileTransformResult['map'] | null } | null {
    const code = compiled?.code ?? source;
    if (
      (resolvedMode === 'build' || resolvedMode === 'hybrid') &&
      code.includes('__TYPESTYLES_RUNTIME_DISABLED__')
    ) {
      return {
        code: code.replace(/__TYPESTYLES_RUNTIME_DISABLED__/g, '"true"'),
        map: compiled?.map ?? null,
      };
    }
    trackNamespaces.call(this, source, id);
    return compiled ? { code: compiled.code, map: compiled.map } : null;
  }

  function trackNamespaces(this: TransformPluginContext, code: string, id: string): void {
    if (!/\.[jt]sx?$/.test(id)) return;
    if (id.includes('node_modules')) return;
    if (!TYPESTYLES_IMPORT_RE.test(code)) return;

    const { keys, prefixes } = extractNamespaces(code);
    if (keys.length === 0 && prefixes.length === 0) return;

    if (warnDuplicates) {
      reportDuplicateNamespaces(moduleNamespaces, id, prefixes, this);
    }

    moduleNamespaces.set(id, { keys, prefixes });
  }

  return {
    name: 'typestyles-rollup',

    async buildStart() {
      resolvedExtractModules = resolveExtractModules(root, extract);
      resolvedMode = resolveExtractMode(options.mode, resolvedExtractModules);
      extraction = null;
      planIndex = null;
      if (compileEnabled()) await extractOnce();
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

    transform(source, id) {
      // Sync unless the compile step needs the (async) extraction result: callers and tests
      // rely on duplicate-namespace errors being thrown synchronously.
      if (!(compileEnabled() && isTransformableId(id)))
        return finishTransform.call(this, source, id, null);
      return extractOnce().then(({ plans }) => {
        planIndex ??= indexPlans(plans);
        const compiled = transformRecipeCalls(source, planIndex, (text) => this.parse(text), id);
        return finishTransform.call(this, source, id, compiled);
      });
    },

    // In watch mode Rollup reuses a module's cached transform when its own file is unchanged,
    // but the inlined plan depends on other modules (tokens, config) and on this build's
    // extraction run. Re-run the transform for modules it rewrites.
    shouldTransformCachedModule({ code }) {
      return compileEnabled() && mayNeedRecompile(code);
    },

    async generateBundle(_options, bundle) {
      if (resolvedMode === 'build') {
        const leaked = findRealSheetModules(
          Object.values(bundle ?? {}).flatMap((chunk) =>
            chunk.type === 'chunk' ? Object.keys(chunk.modules) : [],
          ),
        );
        if (leaked.length > 0) this.warn(zeroRuntimeLeakMessage(leaked));
        if (compileEnabled()) {
          const warning = lingeringRuntimeWarning(
            bundle ?? {},
            (id) => this.getModuleInfo(id)?.importers,
            root,
          );
          if (warning) this.warn(warning);
        }
      }
      if (resolvedMode === 'runtime') return;
      if (!resolvedExtractModules.length) return;

      try {
        const { css } = await extractOnce();
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
