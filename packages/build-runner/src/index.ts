export {
  DEFAULT_EXTRACT_MODULE_CANDIDATES,
  DEFAULT_REGISTERED_COMPONENTS_MODULE_BASES,
  discoverDefaultExtractModules,
  discoverRegisteredComponentsModule,
} from './discover';
export {
  extractNamespaces,
  moduleNeedsOverrideHmr,
  reportDuplicateNamespaces,
  TYPESTYLES_IMPORT_RE,
  type DuplicateNamespaceReporter,
} from './namespaces';
export {
  LITE_SPECIFIER,
  chainSourceMap,
  indexPlans,
  isTransformableId,
  mayNeedRecompile,
  mightContainRecipeCalls,
  parseModule,
  transformRecipeCalls,
  type CompileTransformResult,
  type ParseFn,
  type PlanIndex,
} from './compile-transform';
export {
  ZeroRuntimeSheetWebpackPlugin,
  findLingeringRuntime,
  findRealSheetModules,
  lingeringRuntimeMessage,
  lingeringRuntimeWarning,
  isSheetRequest,
  toZeroRuntimeSheetId,
  zeroRuntimeLeakMessage,
} from './zero-runtime';
export {
  resolveExtractMode,
  resolveExtractModules,
  type TypestylesExtractOptions,
  type TypestylesIntegrationMode,
} from './resolve-extract';
export {
  verifyTypestylesBuild,
  VerifyTypestylesBuildError,
  type TypestylesExtractManifestV1,
  type VerifyTypestylesBuildOptions,
  type VerifyTypestylesBuildResult,
} from './verify';
export {
  isManifestV2,
  normalizeRoutePath,
  type TypestylesExtractManifest,
  type TypestylesExtractManifestV2,
  type TypestylesRouteCssEntry,
} from './manifest';
export { discoverNextAppRoutes, pageRelPathToRoutePath, type NextAppRoute } from './next-routes';
export { createModuleLoader, traceTypestylesModules } from './trace-imports';
export {
  findUnextractedRecipes,
  type RecipeModuleRecord,
  type UnextractedRecipe,
} from './unextracted-recipes';
export {
  buildManifestV2,
  collectAndWriteRouteCss,
  type CollectRouteCssOptions,
  type CollectRouteCssResult,
} from './route-css';
export {
  getRouteCss,
  readCssFile,
  readTypestylesManifest,
  type GetRouteCssOptions,
} from './route-css-read';

import { build as esbuildBuild } from 'esbuild';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildCssSourceMap } from './css-source-map';

export interface RunTypestylesBuildOptions {
  /**
   * Project root used to resolve extraction entry modules.
   */
  root: string;
  /**
   * Module paths (relative to root) that register typestyles styles.
   */
  modules: string[];
  /**
   * Precede each rule with a `/* path:line *\/` comment for the call that registered it.
   * Paths are relative to `root`. See {@link TypestylesExtractOptions.sourceComments}.
   */
  sourceComments?: boolean;
  /**
   * Generate a real CSS source map mapping each extracted rule to the `recipe()` /
   * `style()` call that registered it. See {@link TypestylesExtractOptions.sourceMap}.
   */
  sourceMap?: boolean;
  /**
   * JSX transform for the extraction bundle. Module-level JSX (e.g. a constant holding
   * `<Icon />`) is evaluated during extraction, so it must compile the way the app does.
   * Defaults to `'automatic'` unless the project's `tsconfig.json` sets `jsx` itself.
   */
  jsx?: 'automatic' | 'transform';
  /**
   * Extra esbuild `conditions` used when resolving package `exports` while bundling the
   * extraction entries (e.g. a custom source condition the host bundler also resolves).
   * Defaults to esbuild's own conditions for `platform: 'node'`.
   */
  conditions?: string[];
  /**
   * esbuild `alias` map applied while bundling the extraction entries, so extraction resolves
   * bare specifiers the same way the host bundler does.
   */
  alias?: Record<string, string>;
}

/** True when `<root>/tsconfig.json` declares a `jsx` compiler option (esbuild then honours it). */
function tsconfigSetsJsx(root: string): boolean {
  try {
    return /"jsx"\s*:/.test(readFileSync(resolve(root, 'tsconfig.json'), 'utf8'));
  } catch {
    return false;
  }
}

/**
 * An import specifier esbuild resolves as a file, relative to the extraction root. Only `./`,
 * `../` and absolute paths are left as-is: a root-relative path under a dot directory
 * (`.storybook/styles.ts`) still needs `./`, or it is read as a package name.
 */
function toImportPath(modulePath: string): string {
  const normalized = modulePath.replace(/\\/g, '/');
  if (/^(\.{1,2}\/|\/|[A-Za-z]:\/)/.test(normalized)) {
    return normalized;
  }
  return `./${normalized}`;
}

/**
 * Bundle + execute style registration modules and return collected CSS.
 *
 * This is shared by integrations (Vite, Rollup, Rolldown, etc.) so app code
 * does not need an external TS runtime loader like tsx.
 */
export async function runTypestylesBuild(options: RunTypestylesBuildOptions): Promise<string> {
  return (await runTypestylesExtract(options)).css;
}

export type { GeneratedCssWithMap } from './css-source-map';
export { buildCssSourceMap } from './css-source-map';

/**
 * What a recipe call needs at runtime. Mirrors `AttrsRecipePlan` from `typestyles` (kept as a
 * copy so these published types don't depend on `typestyles`; `plan-types.typecheck.ts` locks
 * the two together).
 */
export type ClientRecipePlan = ClientRecipeCallPlan & {
  /** Logical var path -> custom property name, for recipes that declare `vars`. */
  vars?: Record<string, string>;
  /** Logical var path -> fallback value for `inheritOverride` vars (mirrors `AttrsRecipePlan`). */
  varFallbacks?: Record<string, string>;
};

type ClientRecipeCallPlan =
  | {
      kind: 'attrs';
      namespace: string;
      base: string;
      dimensions: Record<string, string[]>;
      defaults: Record<string, unknown>;
    }
  | {
      kind: 'classes';
      namespace: string;
      base?: string;
      classMap: Record<string, string>;
      dimensions: Record<string, string[]>;
      defaults: Record<string, unknown>;
      variantClasses: Record<string, string>;
      compounds: Array<{ when: Record<string, unknown>; className: string }>;
    }
  | {
      kind: 'class-slots';
      namespace: string;
      slots: Record<string, string>;
      dimensions: Record<string, string[]>;
      defaults: Record<string, unknown>;
      variantClasses: Record<string, string>;
    }
  | {
      kind: 'flat';
      namespace: string;
      classMap: Record<string, string>;
      variantKeys: string[];
    }
  | {
      kind: 'multi-slot';
      namespace: string;
      slots: Record<string, string>;
    }
  | {
      kind: 'attrs-slots';
      namespace: string;
      slots: Record<string, string>;
      dimensions: Record<string, string[]>;
      defaults: Record<string, unknown>;
    };

/**
 * One recorded recipe: a plan, or an `unplanned` marker for a recipe the lite runtime can't
 * reproduce (mirrors `ClientPlanEntry` from `typestyles`).
 */
export type ClientPlanEntry = ClientRecipePlan | { kind: 'unplanned'; namespace: string };

export interface TypestylesExtractResult {
  /** Collected CSS (what {@link runTypestylesBuild} returns). */
  css: string;
  /**
   * CSS source map as a JSON string, mapping each rule to the registering call.
   * Only present when {@link RunTypestylesBuildOptions.sourceMap} is enabled.
   */
  map?: string;
  /**
   * Call-behavior plans recorded while the real runtime ran, for the
   * compile-time transform. Empty with a `typestyles` that predates plans.
   */
  plans: ClientPlanEntry[];
}

/**
 * Like {@link runTypestylesBuild}, but also returns the client plans recorded
 * during the same execution (one extraction run feeds both outputs).
 */
export async function runTypestylesExtract({
  root,
  modules,
  sourceComments = false,
  sourceMap = false,
  jsx,
  conditions,
  alias,
}: RunTypestylesBuildOptions): Promise<TypestylesExtractResult> {
  if (!modules.length) return { css: '', plans: [] };

  const needsSourceCapture = sourceComments || sourceMap;

  const importLines = modules
    .map((mod) => `import ${JSON.stringify(toImportPath(mod))};`)
    .join('\n');
  const bundleResult = await esbuildBuild({
    write: false,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['typestyles'],
    ...(jsx ? { jsx } : tsconfigSetsJsx(root) ? {} : { jsx: 'automatic' as const }),
    ...(conditions?.length ? { conditions } : {}),
    ...(alias && Object.keys(alias).length ? { alias } : {}),
    // Style registration calls (styles.component/class, createTypeStyles) are
    // side-effect-only: the CSS they register into the global registry is the
    // point, regardless of whether the returned classname function is ever
    // read. esbuild's default tree shaking doesn't know that, so any
    // consumer module reached only through an unread namespace/barrel import
    // (or a package marked "sideEffects": false) can have its registration
    // calls silently dropped as "unused". Disable tree shaking here so every
    // registration in the extraction graph survives.
    treeShaking: false,
    // `treeShaking: false` only stops esbuild from pruning declarations
    // *within* an already-included module. It's a separate esbuild behavior
    // — driven directly by "sideEffects": false / @__PURE__ annotations, not
    // by the treeShaking option — that drops a plain bare import entirely
    // (`import './some-lib'` with no binding at all) when it resolves to a
    // module/package marked "sideEffects": false, before that module is ever
    // considered for inclusion. A real extraction entry is exactly this
    // shape: several side-effect-only imports, any one of which may point at
    // a (correctly) tree-shakeable component library. Ignore both kinds of
    // annotation so every import in the extraction graph is included.
    ignoreAnnotations: true,
    // Source-mapped stacks (with `--enable-source-maps` below) give original file:line.
    ...(needsSourceCapture ? { sourcemap: 'inline' as const } : {}),
    stdin: {
      contents: importLines,
      resolveDir: root,
      sourcefile: 'typestyles-extract-entry.ts',
      loader: 'ts',
    },
  });

  const bundledCode = bundleResult.outputFiles?.[0]?.text;
  if (!bundledCode) {
    throw new Error('[typestyles] Failed to produce extraction bundle.');
  }

  const scriptPath = resolve(root, `.typestyles-extract-${process.pid}.cjs`);
  // The result goes to a file, not stdout: style modules (or their dependencies) may log while
  // they load, and that output must neither corrupt the CSS nor break parsing.
  const resultPath = resolve(root, `.typestyles-extract-${process.pid}.json`);
  const prelude =
    `globalThis.__TYPESTYLES_RECORD_PLANS__ = true;\n` +
    (sourceComments
      ? `globalThis.__TYPESTYLES_SOURCE_COMMENTS__ = { root: ${JSON.stringify(root)} };\n`
      : '') +
    (sourceMap
      ? `globalThis.__TYPESTYLES_SOURCE_MAP__ = { root: ${JSON.stringify(root)} };\n`
      : '');
  const script =
    `${prelude}${bundledCode}\n` +
    `const __ts = require('typestyles');\n` +
    `const __mapData = ${sourceMap ? 'typeof __ts.getRegisteredCssForSourceMap === "function" ? __ts.getRegisteredCssForSourceMap() : null' : 'null'};\n` +
    `require('node:fs').writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify({ ` +
    `css: __mapData ? __mapData.css : __ts.getRegisteredCss(), ` +
    `mapData: __mapData ? __mapData.rules : undefined, ` +
    `plans: typeof __ts.getClientPlans === 'function' ? __ts.getClientPlans() : [] }));\n`;

  try {
    writeFileSync(scriptPath, script, 'utf8');
    const result = spawnSync(
      process.execPath,
      [...(needsSourceCapture ? ['--enable-source-maps'] : []), scriptPath],
      {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    if (result.error) {
      throw new Error(`[typestyles] Extraction failed: ${result.error.message}.`);
    }
    if (result.status !== 0) {
      throw new Error(
        `[typestyles] Extraction script failed:\n${result.stderr || result.stdout || 'unknown error'}`,
      );
    }

    if (result.stdout) process.stderr.write(result.stdout);
    const raw = JSON.parse(readFileSync(resultPath, 'utf8')) as TypestylesExtractResult & {
      mapData?: Array<{ css: string; source?: string }>;
    };
    if (sourceMap && raw.mapData) {
      const { map } = buildCssSourceMap(raw.mapData, { file: 'typestyles.css' });
      return { css: raw.css, map, plans: raw.plans };
    }
    return raw;
  } finally {
    for (const path of [scriptPath, resultPath]) {
      if (existsSync(path)) {
        try {
          unlinkSync(path);
        } catch {
          // Best effort cleanup for temp files.
        }
      }
    }
  }
}
