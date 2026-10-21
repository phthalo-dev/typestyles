import { resolve as resolvePath } from 'node:path';
import type { Plugin, ResolvedConfig, UserConfig } from 'vite';
import {
  extractNamespaces,
  moduleNeedsOverrideHmr,
  reportDuplicateNamespaces,
  resolveExtractMode,
  resolveExtractModules,
  runTypestylesBuild,
  type TypestylesExtractOptions,
  type TypestylesIntegrationMode,
} from '@typestyles/build-runner';

/** Re-export shared convention discovery (same paths as `@typestyles/next/build`). */
export {
  DEFAULT_EXTRACT_MODULE_CANDIDATES,
  discoverDefaultExtractModules,
} from '@typestyles/build-runner';

export type { TypestylesExtractOptions };

/**
 * Regex patterns to extract namespace strings from typestyles API calls.
 *
 * Matches:
 *   recipe({ name: 'button', ... })   → prefix ".button-"
 *   style('card', ...)         → prefix ".card-"
 *   tokens.create('color', ...)       → key "tokens:color"
 *   tokens.createTheme({ name: 'dark', … })   → key "theme:dark"
 *   createTheme('dark', …)                    → key "theme:dark" (low-level positional)
 *   keyframes.create('fadeIn', ...)   → key "keyframes:fadeIn"
 *   global.rule('body', ...)         → prefix "body"
 *   global.fontFace('Inter', ...)     → prefix "font-face:Inter"
 */

export interface TypestylesPluginOptions {
  /**
   * When true (default), fail the build if the same logical `styles.component` / `styles.class`
   * namespace appears in more than one module. Set to `false` to skip this check.
   */
  warnDuplicates?: boolean;
  /**
   * Mode for typestyles integration:
   * - `"runtime"`: HMR only, no build-time extraction.
   * - `"build"`: emit a static CSS asset on `vite build` and disable client injection there.
   * - `"hybrid"`: extract on build and keep runtime-compatible behavior.
   *
   * When omitted and at least one extraction module is resolved (explicit `extract.modules`, or a
   * discovered convention entry file), defaults to `"build"`: `vite dev` keeps runtime
   * injection + HMR (runtime is only disabled during `vite build`), serves the same extracted CSS
   * at `extract.fileName` so `<link href="/typestyles.css">` is valid (avoids SPA fallback
   * returning HTML for that URL), and production emits the CSS file. If no modules are resolved,
   * defaults to `"runtime"`.
   */
  mode?: TypestylesIntegrationMode;
  /**
   * Options for build-time CSS extraction when mode is "build" or "hybrid".
   *
   * Omitted entirely: discover a convention entry under the project root (see
   * {@link discoverDefaultExtractModules}); if none exist, stays in runtime-only mode.
   */
  extract?: TypestylesExtractOptions;
}

function resolveExtractModulesForVite(
  root: string,
  extract: TypestylesExtractOptions | undefined,
): string[] {
  return resolveExtractModules(root, extract);
}

/** Public URL path for the extracted CSS asset (respects Vite `base`). */
export function resolveTypestylesCssHref(base: string, fileName: string): string {
  const normalizedFileName = fileName.replace(/^\//, '');
  const normalizedBase = base.replace(/\/$/, '') || '';
  if (normalizedBase === '' || normalizedBase === '/') {
    return `/${normalizedFileName}`;
  }
  return `${normalizedBase}/${normalizedFileName}`;
}

/** True when `html` already links the extracted stylesheet (avoids duplicate injection). */
export function htmlLinksTypestylesCss(html: string, cssHref: string, fileName: string): boolean {
  const bareName = fileName.replace(/^\//, '');
  const linkPattern = /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi;
  const hrefPattern = /\bhref=["']([^"']+)["']/i;

  for (const match of html.matchAll(linkPattern)) {
    const hrefMatch = match[0].match(hrefPattern);
    const href = hrefMatch?.[1];
    if (!href) continue;
    if (
      href === cssHref ||
      href.endsWith(`/${bareName}`) ||
      href === bareName ||
      href === `./${bareName}`
    ) {
      return true;
    }
  }
  return false;
}

export { extractNamespaces };
export { moduleNeedsOverrideHmr } from '@typestyles/build-runner';

/**
 * Vite plugin for typestyles HMR support.
 *
 * When a module that registers typestyles (e.g. `styles.component`, `styles.class`, `tokens.create`) is edited,
 * this plugin injects HMR accept/dispose handlers that invalidate that module's registrations
 * before re-execution. Files may import from a local re-export such as `./typestyles` rather
 * than `from 'typestyles'` directly — we key off API call patterns in the source, not the import path.
 */
export default function typestylesPlugin(options: TypestylesPluginOptions = {}): Plugin {
  const { warnDuplicates = true, extract } = options;

  /** Effective module list after optional convention discovery; set in `config`. */
  let resolvedExtractModules: string[] = [];
  let resolvedMode: TypestylesIntegrationMode = 'runtime';

  // Track namespaces per module for duplicate detection
  const moduleNamespaces = new Map<string, { keys: string[]; prefixes: string[] }>();
  let resolvedConfig: ResolvedConfig | null = null;
  let isBuildCommand = false;
  /** HMR injection only during dev server — avoids pulling `typestyles/hmr` into production bundles. */
  let isServe = false;

  /** Dev-only cache for on-demand extract CSS (avoids SPA fallback serving HTML for the link href). */
  let devExtractCss: string | null = null;
  let devExtractInFlight: Promise<string> | null = null;

  return {
    name: 'typestyles',
    enforce: 'pre',

    config(config: UserConfig, env) {
      isBuildCommand = env.command === 'build';

      const root = resolvePath(config.root ?? process.cwd());
      resolvedExtractModules = resolveExtractModulesForVite(root, extract);
      resolvedMode = resolveExtractMode(options.mode, resolvedExtractModules);

      if (env.command === 'build' && (resolvedMode === 'build' || resolvedMode === 'hybrid')) {
        config.define = {
          ...(config.define ?? {}),
          // Inlined by the bundler so typestyles sheet skips creating <style> in production
          __TYPESTYLES_RUNTIME_DISABLED__: JSON.stringify('true'),
        };
      }

      return config;
    },

    configResolved(config) {
      resolvedConfig = config;
      isServe = config.command === 'serve';
    },

    configureServer(server) {
      if (resolvedExtractModules.length === 0) return;
      if (resolvedMode === 'runtime') return;

      const fileName = extract?.fileName ?? 'typestyles.css';

      const invalidateDevExtract = (): void => {
        devExtractCss = null;
        devExtractInFlight = null;
      };

      server.watcher.on('change', invalidateDevExtract);
      server.watcher.on('add', invalidateDevExtract);
      server.watcher.on('unlink', invalidateDevExtract);

      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          next();
          return;
        }
        const config = resolvedConfig;
        if (!config) {
          next();
          return;
        }

        const url = req.url?.split('?')[0] ?? '';
        const base = config.base.replace(/\/$/, '') || '';
        const expectedPath =
          base === '' || base === '/'
            ? `/${fileName.replace(/^\//, '')}`
            : `${base}/${fileName.replace(/^\//, '')}`;

        if (url !== expectedPath) {
          next();
          return;
        }

        const root = config.root ?? process.cwd();

        try {
          if (devExtractCss !== null) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(devExtractCss);
            return;
          }
          if (!devExtractInFlight) {
            devExtractInFlight = runTypestylesBuild({
              root,
              modules: resolvedExtractModules,
            })
              .then((css) => {
                devExtractCss = css;
                return css;
              })
              .finally(() => {
                devExtractInFlight = null;
              });
          }
          const css = await devExtractInFlight;
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(css);
        } catch (err) {
          next(err);
        }
      });
    },

    transform(code, id) {
      // Skip non-JS/TS modules and node_modules
      if (!/\.[jt]sx?$/.test(id)) return null;
      if (id.includes('node_modules')) return null;

      const { keys, prefixes } = extractNamespaces(code);
      const overrideHmr = moduleNeedsOverrideHmr(code);

      // Nothing to invalidate (no typestyles registration calls in this file)
      if (keys.length === 0 && prefixes.length === 0 && !overrideHmr) return null;

      // Duplicate namespace detection (build error — not a warning)
      if (warnDuplicates && prefixes.length > 0) {
        reportDuplicateNamespaces(moduleNamespaces, id, prefixes, this);
      }

      if (keys.length > 0 || prefixes.length > 0) {
        moduleNamespaces.set(id, { keys, prefixes });
      }

      if (!isServe) {
        return null;
      }

      // Dev-only: synchronous dispose must run invalidateKeys before the updated module re-executes.
      // A dynamic import().then(...) registers dispose too late and can load a different chunk than the
      // app's `typestyles` singleton, so the registry never clears.
      //
      // Override HMR: theme modules often only call `createDesignTheme({ components })` /
      // `styles.override` — no static namespace strings. Detection follows import bindings
      // (including `createDesignTheme as cdt` / `import * as Core`). Runtime slots attribute
      // `override:` keys to the module so dispose drops them (and re-exec can re-register).
      const keysJSON = JSON.stringify(keys);
      const prefixesJSON = JSON.stringify(prefixes);
      const hmrImports = overrideHmr
        ? `import { invalidateKeys as __typestylesInvalidateKeys, createOverrideHmrSlot as __tsCreateOvHmr } from 'typestyles/hmr';\n`
        : `import { invalidateKeys as __typestylesInvalidateKeys } from 'typestyles/hmr';\n`;
      const overrideBootstrap = overrideHmr
        ? `const __tsOvHmr = __tsCreateOvHmr();\n__tsOvHmr.activate();\n`
        : '';
      const overrideTeardown = overrideHmr ? `\n__tsOvHmr.deactivate();\n` : '';
      const disposeBody = [
        keys.length > 0 || prefixes.length > 0
          ? `__typestylesInvalidateKeys(${keysJSON}, ${prefixesJSON});`
          : null,
        overrideHmr ? `__tsOvHmr.dispose();` : null,
      ]
        .filter(Boolean)
        .join('\n    ');
      const hmrCode = `${overrideTeardown}
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    ${disposeBody}
  });
}`;

      return {
        code: hmrImports + overrideBootstrap + code + hmrCode,
        map: null,
      };
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (resolvedExtractModules.length === 0) return;
        if (resolvedMode === 'runtime') return;
        if (!resolvedConfig) return;

        const fileName = extract?.fileName ?? 'typestyles.css';
        const href = resolveTypestylesCssHref(resolvedConfig.base, fileName);

        if (htmlLinksTypestylesCss(html, href, fileName)) {
          return;
        }

        return [
          {
            tag: 'link',
            attrs: {
              rel: 'stylesheet',
              href,
            },
            injectTo: 'head',
          },
        ];
      },
    },

    async generateBundle() {
      if (!isBuildCommand) return;
      if (resolvedMode === 'runtime') return;
      if (!resolvedExtractModules.length) return;
      if (!resolvedConfig) return;

      const root = resolvedConfig.root ?? process.cwd();
      const fileName = extract?.fileName ?? 'typestyles.css';

      try {
        const css = await runTypestylesBuild({
          root,
          modules: resolvedExtractModules,
        });
        this.emitFile({
          type: 'asset',
          fileName,
          source: css,
        });
      } catch (err) {
        this.error(
          `[typestyles] Failed to extract CSS: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  };
}
