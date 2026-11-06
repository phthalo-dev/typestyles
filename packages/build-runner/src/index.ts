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
  indexPlans,
  isTransformableId,
  mightContainRecipeCalls,
  parseModule,
  transformRecipeCalls,
  type ParseFn,
  type PlanIndex,
} from './compile-transform';
export {
  ZeroRuntimeSheetWebpackPlugin,
  findLingeringRuntime,
  findRealSheetModules,
  lingeringRuntimeMessage,
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
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

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
}

function toImportPath(modulePath: string): string {
  const normalized = modulePath.replace(/\\/g, '/');
  if (normalized.startsWith('.') || normalized.startsWith('/')) {
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

/** What a recipe call needs at runtime; mirrors `AttrsRecipePlan` from `typestyles`. */
export type ClientRecipePlan =
  | {
      kind: 'attrs';
      namespace: string;
      base: string;
      dimensions: Record<string, string[]>;
      defaults: Record<string, unknown>;
    }
  | {
      kind: 'attrs-slots';
      namespace: string;
      slots: Record<string, string>;
      dimensions: Record<string, string[]>;
      defaults: Record<string, unknown>;
    };

export interface TypestylesExtractResult {
  /** Collected CSS (what {@link runTypestylesBuild} returns). */
  css: string;
  /**
   * Call-behavior plans recorded while the real runtime ran, for the
   * compile-time transform. Empty with a `typestyles` that predates plans.
   */
  plans: ClientRecipePlan[];
}

/**
 * Like {@link runTypestylesBuild}, but also returns the client plans recorded
 * during the same execution (one extraction run feeds both outputs).
 */
export async function runTypestylesExtract({
  root,
  modules,
  sourceComments = false,
}: RunTypestylesBuildOptions): Promise<TypestylesExtractResult> {
  if (!modules.length) return { css: '', plans: [] };

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
    ...(sourceComments ? { sourcemap: 'inline' as const } : {}),
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
  const prelude = sourceComments
    ? `globalThis.__TYPESTYLES_SOURCE_COMMENTS__ = { root: ${JSON.stringify(root)} };\n`
    : '';
  const script =
    `${prelude}${bundledCode}\n` +
    `const __ts = require('typestyles');\n` +
    `process.stdout.write(JSON.stringify({ css: __ts.getRegisteredCss(), ` +
    `plans: typeof __ts.getClientPlans === 'function' ? __ts.getClientPlans() : [] }));\n`;

  try {
    writeFileSync(scriptPath, script, 'utf8');
    const result = spawnSync(
      process.execPath,
      [...(sourceComments ? ['--enable-source-maps'] : []), scriptPath],
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

    return JSON.parse(result.stdout || '{"css":"","plans":[]}') as TypestylesExtractResult;
  } finally {
    if (existsSync(scriptPath)) {
      try {
        unlinkSync(scriptPath);
      } catch {
        // Best effort cleanup for temp script.
      }
    }
  }
}
