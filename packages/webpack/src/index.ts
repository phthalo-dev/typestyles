import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Compiler, NormalModule, WebpackPluginInstance } from 'webpack';
import {
  ZeroRuntimeSheetWebpackPlugin,
  findRealSheetModules,
  zeroRuntimeLeakMessage,
  extractNamespaces,
  reportDuplicateNamespaces,
  resolveExtractMode,
  resolveExtractModules,
  runTypestylesExtract,
  type TypestylesExtractResult,
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

export interface TypestylesWebpackPluginOptions {
  warnDuplicates?: boolean;
  mode?: TypestylesIntegrationMode;
  extract?: TypestylesExtractOptions;
  root?: string;
  /**
   * Experimental. In `"build"` mode on non-node targets, replace `recipe()` definitions with the
   * small call-behavior plans recorded during extraction, so style configs and CSS machinery
   * tree-shake out of the bundle. Works via a post loader, so it sees plain JS after
   * ts-loader/babel-loader/swc-loader. Also works with Rspack.
   */
  compile?: boolean;
}

/**
 * webpack plugin for typestyles runtime + optional static extraction.
 */
export default class TypestylesWebpackPlugin implements WebpackPluginInstance {
  private readonly warnDuplicates: boolean;
  private readonly mode?: TypestylesIntegrationMode;
  private readonly extract?: TypestylesExtractOptions;
  private readonly root: string;
  private readonly moduleNamespaces = new Map<string, { keys: string[]; prefixes: string[] }>();
  private readonly resolvedExtractModules: string[];
  private readonly resolvedMode: TypestylesIntegrationMode;
  private readonly compile: boolean;
  /** One extraction run per compilation: it feeds both the emitted CSS and the compile plans. */
  private extraction: Promise<TypestylesExtractResult> | null = null;

  constructor(options: TypestylesWebpackPluginOptions = {}) {
    this.warnDuplicates = options.warnDuplicates ?? true;
    this.mode = options.mode;
    this.extract = options.extract;
    this.root = options.root ?? process.cwd();
    this.compile = options.compile ?? false;
    this.resolvedExtractModules = resolveExtractModules(this.root, this.extract);
    this.resolvedMode = resolveExtractMode(this.mode, this.resolvedExtractModules);
  }

  apply(compiler: Compiler): void {
    if (this.resolvedMode === 'build' || this.resolvedMode === 'hybrid') {
      new compiler.webpack.DefinePlugin({
        __TYPESTYLES_RUNTIME_DISABLED__: JSON.stringify('true'),
      }).apply(compiler);
    }

    const target = [compiler.options.target].flat();
    const isNodeTarget = target.some((t) => typeof t === 'string' && /^(async-)?node/.test(t));
    if (this.resolvedMode === 'build' && !isNodeTarget) {
      // Zero-runtime (client targets only; node targets keep the full runtime):
      // resolve typestyles' stylesheet module to its no-op build. Class names /
      // data attributes are computed identically; the CSS insertion runtime,
      // stylesheet state, and DOM plumbing never enter the module graph. Extraction
      // still runs the real runtime in a node subprocess (see the asset
      // hook below). `hybrid` keeps the runtime for dynamic styles.
      this.applyZeroRuntimeSheet(compiler);
    }

    if (this.compile && this.resolvedMode === 'build' && !isNodeTarget) {
      this.applyCompile(compiler);
    }

    compiler.hooks.thisCompilation.tap('typestyles', (compilation) => {
      this.extraction = null; // fresh extraction per compilation (watch rebuilds)
      compilation.hooks.succeedModule.tap('typestyles', (module) => {
        const resource = (module as NormalModule).resource;
        if (!resource || !/\.[jt]sx?$/.test(resource) || resource.includes('node_modules')) {
          return;
        }

        const source = module.originalSource()?.source();
        const code = typeof source === 'string' ? source : source?.toString();
        if (!code || !TYPESTYLES_IMPORT_RE.test(code)) return;

        const { keys, prefixes } = extractNamespaces(code);
        if (keys.length === 0 && prefixes.length === 0) return;

        if (this.warnDuplicates) {
          reportDuplicateNamespaces(this.moduleNamespaces, resource, prefixes, {
            error(message) {
              compilation.errors.push(new Error(message));
            },
          });
        }

        this.moduleNamespaces.set(resource, { keys, prefixes });
      });

      if (this.resolvedMode === 'runtime' || !this.resolvedExtractModules.length) {
        return;
      }

      const fileName = this.extract?.fileName ?? 'typestyles.css';
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'typestyles',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
        },
        async () => {
          try {
            const { css } = await this.extractOnce();
            compilation.emitAsset(fileName, new compiler.webpack.sources.RawSource(css));
          } catch (error) {
            compilation.errors.push(
              new Error(
                `[typestyles] Failed to extract CSS: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
        },
      );
    });
  }

  private extractOnce(): Promise<TypestylesExtractResult> {
    return (this.extraction ??= runTypestylesExtract({
      root: this.root,
      modules: this.resolvedExtractModules,
    }));
  }

  /** Add the post loader that swaps recipe definitions for their recorded plans. */
  private applyCompile(compiler: Compiler): void {
    if (!this.resolvedExtractModules.length) return;
    const here =
      typeof __dirname === 'string' ? __dirname : dirname(fileURLToPath(import.meta.url));
    // Published layout: next to this file. Running from source (tests): the built package.
    const loader = [
      join(here, 'compile-loader.cjs'),
      join(here, '../dist/compile-loader.cjs'),
    ].find((candidate) => existsSync(candidate));
    if (!loader) return;
    const moduleOptions = compiler.options.module;
    moduleOptions.rules = [
      ...moduleOptions.rules,
      {
        test: /\.[cm]?[jt]sx?$/,
        enforce: 'post',
        use: [
          {
            loader,
            options: {
              getPlans: async () => (await this.extractOnce()).plans,
            },
          },
        ],
      },
    ];
  }

  /**
   * Redirect typestyles' resolved `sheet` module to its no-op sibling, so the
   * CSS insertion runtime never enters the module graph.
   */
  private applyZeroRuntimeSheet(compiler: Compiler): void {
    new ZeroRuntimeSheetWebpackPlugin().apply(compiler);
    compiler.hooks.thisCompilation.tap('typestyles-zero-runtime-guard', (compilation) => {
      compilation.hooks.afterSeal.tap('typestyles-zero-runtime-guard', () => {
        const ids: string[] = [];
        for (const module of compilation.modules) {
          const resource = (module as { resource?: string }).resource;
          if (resource) ids.push(resource);
        }
        const leaked = findRealSheetModules(ids);
        if (leaked.length > 0) {
          compilation.warnings.push(
            new compiler.webpack.WebpackError(zeroRuntimeLeakMessage(leaked)),
          );
        }
      });
    });
  }
}
