import './sheet-node';
import {
  startCollection,
  flushSync,
  getRegisteredCss,
  subscribeRegisteredCss,
  TYPESTYLES_STYLE_ID,
} from '#sheet';
import { runWithIsolatedSheet } from './sheet-context';

export { getRegisteredCss, subscribeRegisteredCss, TYPESTYLES_STYLE_ID };

/**
 * Render a `<style id="typestyles">` tag for embedding in HTML.
 * Returns an empty string when `css` is empty.
 */
export function typestylesStyleHtml(css: string): string {
  if (!css) return '';
  return `<style id="${TYPESTYLES_STYLE_ID}">${css}</style>`;
}

/**
 * Insert collected CSS before `</head>` in a full or partial HTML document.
 * When no `</head>` is present, prepends the style tag to the string.
 */
export function injectStylesIntoHtml(html: string, css: string): string {
  const tag = typestylesStyleHtml(css);
  if (!tag) return html;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${tag}</head>`);
  }
  return `${tag}${html}`;
}

/**
 * Open an HTML document shell for `renderToPipeableStream`: doctype, `<head>` with
 * charset meta and collected CSS, and `<body>`. Pair with `collectStyles()` for the
 * CSS pass, then close `</body></html>` when the stream finishes.
 */
export function streamingDocumentShell(css: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${typestylesStyleHtml(css)}</head><body>`;
}

export type CollectStylesResult<T> = { html: T; css: string };

/**
 * Collect all CSS generated during a render pass (for SSR).
 *
 * Wraps a render function and captures all CSS registered while it runs.
 * On Node, each call uses an isolated sheet store (`AsyncLocalStorage`) so
 * concurrent SSR requests do not interleave CSS. Sync and async render
 * functions are supported.
 *
 * For frameworks where you need the CSS separately from the render pass
 * (e.g. TanStack Start's `head()`, Next.js metadata), use the simpler
 * `getRegisteredCss()` instead.
 *
 * @example
 * ```ts
 * import { collectStyles } from 'typestyles/server';
 * import { renderToString } from 'react-dom/server';
 *
 * const { html, css } = collectStyles(() => renderToString(<App />));
 *
 * const fullHtml = `
 *   <html>
 *     <head><style id="typestyles">${css}</style></head>
 *     <body>${html}</body>
 *   </html>
 * `;
 * ```
 */
export function collectStyles<T>(renderFn: () => T): CollectStylesResult<T>;
export function collectStyles<T>(renderFn: () => Promise<T>): Promise<CollectStylesResult<T>>;
export function collectStyles<T>(
  renderFn: () => T | Promise<T>,
): CollectStylesResult<T> | Promise<CollectStylesResult<T>> {
  return runWithIsolatedSheet(() => {
    const endCollection = startCollection();
    const result = renderFn();
    if (result instanceof Promise) {
      return result.then((html) => {
        flushSync();
        return { html, css: endCollection() };
      });
    }
    flushSync();
    return { html: result, css: endCollection() };
  });
}
