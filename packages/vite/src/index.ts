import { createHash } from 'node:crypto';
import { posix as posixPath, resolve as resolvePath } from 'node:path';
import type { Plugin, ResolvedConfig, UserConfig } from 'vite';
import {
  extractNamespaces,
  findUnextractedRecipes,
  moduleNeedsOverrideHmr,
  reportDuplicateNamespaces,
  resolveExtractMode,
  resolveExtractModules,
  runTypestylesBuild,
  type TypestylesExtractOptions,
  type TypestylesIntegrationMode,
  type UnextractedRecipe,
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
   * When true (default), fail `vite build` if a local module reachable from the app calls
   * `recipe()` (or `styles.component()`) and that module is missing from the extract entry.
   * The error names the module and the recipe. Set to `false` when the production extract
   * is meant to cover only part of the app. Ignored in `runtime` mode and when nothing
   * is extracted.
   */
  coverage?: boolean;
  /**
   * Mode for typestyles integration:
   * - `"runtime"`: HMR only, no build-time extraction.
   * - `"build"`: emit a static CSS asset on `vite build` and disable client injection there.
   * - `"hybrid"`: extract on build and keep runtime-compatible behavior.
   *
   * When omitted and at least one extraction module is resolved (explicit `extract.modules`, or a
   * discovered convention entry file), defaults to `"build"`: `vite dev` keeps runtime
   * injection + HMR (runtime is only disabled during `vite build`) and serves extracted CSS at a
   * stable URL (`/typestyles.css`, unless `extract.fileName` sets another path) so
   * `<link href="/typestyles.css">` is valid (avoids SPA fallback returning HTML for that URL).
   * Production emits a content-hashed CSS asset and points the HTML link at it. If no modules
   * are resolved, defaults to `"runtime"`.
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

/** Stable dev URL. Production hashing never changes this path. */
const DEFAULT_CSS_FILE_NAME = 'typestyles.css';

/**
 * Fragment Vite will not try to resolve during the HTML scan (`#` URLs are left as-is).
 * The build post-hook replaces it with the emitted asset href.
 */
const PARKED_CSS_HREF = '#__typestyles_css__';

/** Public URL path for the extracted CSS asset (respects Vite `base`). */
export function resolveTypestylesCssHref(
  base: string,
  fileName: string,
  /** Root-relative HTML path (e.g. `/nested/index.html`); only used when `base` is relative. */
  htmlPath?: string,
): string {
  const normalizedFileName = fileName.replace(/^\//, '');
  if (base.startsWith('.')) {
    // Relative base: Vite links assets relative to each emitted HTML file.
    const fromDir = posixPath.dirname(`/${(htmlPath ?? 'index.html').replace(/^\//, '')}`);
    const relative = posixPath.relative(fromDir, `/${normalizedFileName}`);
    return relative.startsWith('.') ? relative : `./${relative}`;
  }
  const normalizedBase = base.replace(/\/$/, '') || '';
  if (normalizedBase === '' || normalizedBase === '/') {
    return `/${normalizedFileName}`;
  }
  return `${normalizedBase}/${normalizedFileName}`;
}

function cssFileNameHasPlaceholder(fileName: string): boolean {
  return /\[(?:hash(?::\d+)?|name|extname|ext)\]/.test(fileName);
}

/**
 * Dev middleware and the dev `<link>` use a stable path. Hash placeholders are removed so
 * `assets/typestyles-[hash].css` is served at `/assets/typestyles.css`.
 */
function stableDevCssFileName(fileName: string | undefined): string {
  if (!fileName) return DEFAULT_CSS_FILE_NAME;
  const normalized = fileName.replace(/^\//, '');
  if (!cssFileNameHasPlaceholder(normalized)) return normalized;
  return normalized
    .replace(/-?\[hash(?::\d+)?\]/g, '')
    .replace(/\[name\]/g, 'typestyles')
    .replace(/\[extname\]/g, '.css')
    .replace(/\[ext\]/g, 'css');
}

/** Expand Rollup-style placeholders in `extract.fileName`. `[hash]` is 8 url-safe characters. */
function renderCssFileName(pattern: string, source: string): string {
  const hash = createHash('sha256').update(source).digest('base64url');
  return pattern.replace(
    /\[(hash(?::(\d+))?|name|extname|ext)\]/g,
    (_match, kind: string, size?: string) => {
      if (kind === 'name') return 'typestyles';
      if (kind === 'extname') return '.css';
      if (kind === 'ext') return 'css';
      const length = size ? Number(size) : 8;
      const clamped = Math.min(Math.max(1, length), hash.length);
      return hash.slice(0, clamped);
    },
  );
}

function isTypestylesStylesheetHref(href: string, cssHref: string, bareName: string): boolean {
  return (
    href === cssHref ||
    href.endsWith(`/${bareName}`) ||
    href === bareName ||
    href === `./${bareName}`
  );
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
    if (isTypestylesStylesheetHref(href, cssHref, bareName)) return true;
  }
  return false;
}

/**
 * Point an existing stable stylesheet link at `nextHref`, leaving other links alone.
 * `/typestyles.css` is always recognized alongside the configured stable path.
 */
function retargetTypestylesStylesheet(html: string, fileName: string, nextHref: string): string {
  const bareNames = [...new Set([fileName.replace(/^\//, ''), DEFAULT_CSS_FILE_NAME])];
  return html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\brel=["']stylesheet["']/i.test(tag)) return tag;
    return tag.replace(/\bhref=(["'])([^"']+)\1/i, (attr, quote: string, href: string) => {
      if (!bareNames.some((name) => isTypestylesStylesheetHref(href, `/${name}`, name))) {
        return attr;
      }
      return `href=${quote}${nextHref}${quote}`;
    });
  });
}

/**
 * The default stylesheet moves from `/typestyles.css` into `assets/`. Relative `url()`s
 * resolved against the site root before, so climb back out to keep them pointing there.
 */
function rebaseRelativeCssUrls(css: string, depth: number): string {
  if (depth <= 0) return css;
  const up = '../'.repeat(depth);
  return css.replace(/url\(\s*(['"]?)([^'")]+?)\1\s*\)/g, (match, quote: string, url: string) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url)) return match;
    return `url(${quote}${up}${url.replace(/^\.\//, '')}${quote})`;
  });
}

export { extractNamespaces };
export { moduleNeedsOverrideHmr } from '@typestyles/build-runner';

function formatUnextractedRecipeError(
  missing: UnextractedRecipe[],
  extractEntries: string[],
): string {
  const entries = extractEntries.map((entry) => entry.replace(/\\/g, '/')).join(', ');
  const lines = missing.map((item) => {
    const quoted = item.names.map((name) => `"${name}"`).join(', ');
    const label = item.names.length === 1 ? 'recipe' : 'recipes';
    return `  ${label} ${quoted} in ${item.modulePath}`;
  });
  return [
    '[typestyles] Production extract is missing app recipes:',
    ...lines,
    `These modules are reachable from the app and missing from the extract entry (${entries}).`,
    'Import them from the extract entry, or set coverage: false to extract a subset.',
  ].join('\n');
}

/**
 * Vite plugin for typestyles HMR support.
 *
 * When a module that registers typestyles (e.g. `styles.component`, `styles.class`, `tokens.create`) is edited,
 * this plugin injects HMR accept/dispose handlers that invalidate that module's registrations
 * before re-execution. Files may import from a local re-export such as `./typestyles` rather
 * than `from 'typestyles'` directly — we key off API call patterns in the source, not the import path.
 */
export default function typestylesPlugin(options: TypestylesPluginOptions = {}): Plugin {
  const { warnDuplicates = true, coverage = true, extract } = options;

  /** Effective module list after optional convention discovery; set in `config`. */
  let resolvedExtractModules: string[] = [];
  let resolvedMode: TypestylesIntegrationMode = 'runtime';

  // Track namespaces per module for duplicate detection
  const moduleNamespaces = new Map<string, { keys: string[]; prefixes: string[] }>();
  let resolvedConfig: ResolvedConfig | null = null;
  let isBuildCommand = false;
  /** HMR injection only during dev server — avoids pulling `typestyles/hmr` into production bundles. */
  let isServe = false;

  /** Local app modules that call `recipe()`, recorded while Vite transforms the build graph. */
  const recipeModules = new Map<string, string[]>();

  /** Dev-only cache for on-demand extract CSS (avoids SPA fallback serving HTML for the link href). */
  let devExtractCss: string | null = null;
  let devExtractInFlight: Promise<string> | null = null;

  /** Final production CSS path, set in `generateBundle` before HTML is emitted. */
  let builtCssFileName: string | null = null;

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

      const fileName = stableDevCssFileName(extract?.fileName);

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
              sourceComments: extract?.sourceComments,
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
      // Park a hardcoded `/typestyles.css` link before Vite's HTML scan. A `#` href is
      // left untouched, so the build does not warn that the unhashed file is missing.
      // `transformIndexHtml` (post) swaps in the emitted filename after `generateBundle`.
      if (
        isBuildCommand &&
        resolvedMode !== 'runtime' &&
        resolvedExtractModules.length > 0 &&
        id.split('?')[0]?.endsWith('.html')
      ) {
        const parked = retargetTypestylesStylesheet(
          code,
          stableDevCssFileName(extract?.fileName),
          PARKED_CSS_HREF,
        );
        if (parked !== code) return { code: parked, map: null };
      }

      // Skip non-JS/TS modules and node_modules
      if (!/\.[jt]sx?$/.test(id)) return null;
      if (id.includes('node_modules')) return null;

      const { keys, prefixes, recipeNames } = extractNamespaces(code);
      const overrideHmr = moduleNeedsOverrideHmr(code);

      // The build graph is whatever Vite transforms. Extraction runs a separate
      // esbuild of the convention entry, so a recipe module can land in the app
      // and still be absent from typestyles.css.
      if (
        coverage &&
        isBuildCommand &&
        resolvedMode !== 'runtime' &&
        resolvedExtractModules.length > 0 &&
        recipeNames.length > 0
      ) {
        recipeModules.set(id, recipeNames);
      }

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
      order: 'post',
      handler(html, ctx) {
        if (resolvedExtractModules.length === 0) return;
        if (resolvedMode === 'runtime') return;
        if (!resolvedConfig) return;

        const stableFileName = stableDevCssFileName(extract?.fileName);

        if (!isBuildCommand) {
          const href = resolveTypestylesCssHref(resolvedConfig.base, stableFileName);
          if (htmlLinksTypestylesCss(html, href, stableFileName)) return;
          return [
            {
              tag: 'link',
              attrs: { rel: 'stylesheet', href },
              injectTo: 'head' as const,
            },
          ];
        }

        if (!builtCssFileName) return;
        const href = resolveTypestylesCssHref(resolvedConfig.base, builtCssFileName, ctx?.path);
        if (html.includes(PARKED_CSS_HREF)) {
          return html.split(PARKED_CSS_HREF).join(href);
        }
        if (htmlLinksTypestylesCss(html, href, builtCssFileName)) return;
        const retargeted = retargetTypestylesStylesheet(html, stableFileName, href);
        if (retargeted !== html) return retargeted;
        return [
          {
            tag: 'link',
            attrs: { rel: 'stylesheet', href },
            injectTo: 'head' as const,
          },
        ];
      },
    },

    async generateBundle(_options, bundle) {
      if (!isBuildCommand) return;
      if (resolvedMode === 'runtime') return;
      if (!resolvedExtractModules.length) return;
      if (!resolvedConfig) return;

      const root = resolvedConfig.root ?? process.cwd();
      const requestedFileName = extract?.fileName?.replace(/^\//, '');

      if (coverage && recipeModules.size > 0) {
        let missing: UnextractedRecipe[] = [];
        try {
          missing = await findUnextractedRecipes({
            root,
            extractEntries: resolvedExtractModules,
            recipeModules: [...recipeModules.entries()].map(([id, names]) => ({ id, names })),
          });
        } catch (err) {
          this.error(
            `[typestyles] Failed to check extract coverage: ${err instanceof Error ? err.message : String(err)}`,
          );
          return;
        }
        if (missing.length > 0) {
          this.error(formatUnextractedRecipeError(missing, resolvedExtractModules));
          return;
        }
      }

      try {
        const css = await runTypestylesBuild({
          root,
          modules: resolvedExtractModules,
          sourceComments: extract?.sourceComments,
        });
        if (requestedFileName && cssFileNameHasPlaceholder(requestedFileName)) {
          builtCssFileName = renderCssFileName(requestedFileName, css);
          this.emitFile({
            type: 'asset',
            fileName: builtCssFileName,
            source: css,
          });
        } else if (requestedFileName) {
          builtCssFileName = requestedFileName;
          this.emitFile({
            type: 'asset',
            fileName: requestedFileName,
            source: css,
          });
        } else {
          const referenceId = this.emitFile({
            type: 'asset',
            name: DEFAULT_CSS_FILE_NAME,
            source: css,
          });
          builtCssFileName = this.getFileName(referenceId);
          // Rollup hashed the original source; the rebase is deterministic, so the hash stays valid.
          const asset = bundle?.[builtCssFileName];
          if (asset?.type === 'asset' && typeof asset.source === 'string') {
            asset.source = rebaseRelativeCssUrls(
              asset.source,
              builtCssFileName.split('/').length - 1,
            );
          }
        }
      } catch (err) {
        this.error(
          `[typestyles] Failed to extract CSS: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  };
}
