---
title: Server-Side Rendering (SSR)
description: Render typestyles on the server for better performance and SEO
---

TypeStyles supports SSR out of the box. Instead of injecting styles into the DOM during rendering, you can collect all the CSS on the server and include it in the HTML response.

## Request-safe collection

Every `collectStyles()` call runs inside an **isolated sheet store**. On Node, that isolation uses `AsyncLocalStorage`, so concurrent SSR requests (multiple Express handlers, parallel Remix bots, overlapping `renderToString` passes) each get their own CSS buffer. CSS from request A never leaks into request B.

This matters for:

- **Concurrent HTTP handlers** — two users hitting your server at the same time
- **The two-pass streaming pattern** — a sync `renderToString` pass for CSS, then `renderToPipeableStream` for the response (see below)
- **Async renders** — `collectStyles(async () => …)` is supported; isolation holds for the full await

`collectStylesFromModules()` (build extraction) uses the same isolation. In the browser bundle, isolation is a no-op because there is only one document.

## Basic setup

Import `collectStyles` from `typestyles/server`:

```ts
import { collectStyles } from 'typestyles/server';
import { renderToString } from 'react-dom/server';

const { html, css } = collectStyles(() => renderToString(<App />));
```

The `collectStyles` function:

1. Starts collecting CSS instead of injecting it
2. Runs your render function
3. Returns the rendered HTML and collected CSS

## Full example

Here's a complete Express.js example:

```ts
import express from 'express';
import { collectStyles } from 'typestyles/server';
import { renderToString } from 'react-dom/server';
import { App } from './App';

const app = express();

app.get('/', (req, res) => {
  const { html, css } = collectStyles(() => renderToString(<App />));

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>My App</title>
        <style id="typestyles">${css}</style>
      </head>
      <body>
        <div id="root">${html}</div>
        <script src="/client.js"></script>
      </body>
    </html>
  `);
});

app.listen(3000);
```

## How it works

During SSR:

1. **Collection mode**: When `collectStyles()` wraps your render, TypeStyles switches to collection mode
2. **CSS capture**: All styles, tokens, themes, and keyframes are captured to a buffer instead of being injected into the DOM
3. **Single style tag**: The collected CSS is returned as a single string ready to embed in your HTML

On the client:

1. **Hydration detection**: TypeStyles looks for an existing `<style id="typestyles">` element
2. **Reuse**: If found, it reuses that element and avoids re-injecting the CSS
3. **Seamless transition**: No flicker or style recalculation during hydration

## React Server Components (Next.js App Router)

Next.js streams HTML by default. TypeStyles supports three patterns — pick based on whether you extract CSS at build time or collect at request time.

| Pattern                                              | When to use                                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Build-time extraction**                            | Production apps — static `typestyles.css`, no runtime sheet. See [Zero-runtime extraction](/docs/zero-runtime).                                                    |
| **`getRegisteredCss()` in root layout**              | Runtime mode; styles are imported on the server before layout runs. Simplest request-time setup.                                                                   |
| **`TypestylesStylesheet` + `useServerInsertedHTML`** | Runtime mode; styles register during the **same streamed render** as `{children}`. Use when lazy boundaries or client-only imports would make Option B miss rules. |

### Build-time extraction (recommended for production)

Import the extracted stylesheet in your root layout. No `collectStyles()` per request — CSS is static:

```tsx
// app/layout.tsx
import './typestyles.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Configure extraction with `@typestyles/next/build` — see [Zero-runtime extraction](/docs/zero-runtime).

### Runtime: server layout + `getRegisteredCss`

When style modules load synchronously on the server, the registered sheet already contains everything the layout needs:

```tsx
// app/layout.tsx
import { getRegisteredCss } from '@typestyles/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const css = getRegisteredCss();

  return (
    <html lang="en">
      <head>
        {css ? <style id="typestyles" dangerouslySetInnerHTML={{ __html: css }} /> : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

This works in **Server Components** — no `'use client'` required. Request isolation from `AsyncLocalStorage` applies when you also call `collectStyles()` elsewhere in the same request (for example a streaming pre-pass).

### Runtime: streaming collection with `TypestylesStylesheet`

For styles that register during the streamed React tree (client boundaries, lazy imports, or `useServerInsertedHTML` timing), use the client component wrapper:

```tsx
// app/layout.tsx
import { TypestylesStylesheet } from '@typestyles/next/client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TypestylesStylesheet />
        {children}
      </body>
    </html>
  );
}
```

`TypestylesStylesheet` calls React's `useServerInsertedHTML` so CSS collected during the real SSR pass is injected into the streamed document — no separate `renderToString` pass and no CSS leakage between concurrent requests.

## Next.js

Install the official integration so App Router, `useServerInsertedHTML`, and server helpers stay aligned:

```bash
pnpm add @typestyles/next typestyles
```

See the [`@typestyles/next` package README](https://github.com/type-styles/typestyles/tree/main/packages/next) for build-time extraction (`withTypestylesExtract`) and Turbopack notes.

### App Router (runtime) — quick reference

The [RSC section above](#react-server-components-nextjs-app-router) has full examples and a decision table. The options below are the same patterns in brief:

```tsx
// app/layout.tsx
import { getRegisteredCss } from '@typestyles/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const css = getRegisteredCss();

  return (
    <html lang="en">
      <head>
        {css ? <style id="typestyles" dangerouslySetInnerHTML={{ __html: css }} /> : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Option B — `TypestylesStylesheet` (client):** uses Next’s `useServerInsertedHTML` so CSS collected during the real SSR pass is injected into the streamed document. Prefer this when you rely on the same render tree as `{children}` (for example lazy boundaries or patterns where Option A would miss rules).

```tsx
// app/layout.tsx
import { TypestylesStylesheet } from '@typestyles/next/client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TypestylesStylesheet />
        {children}
      </body>
    </html>
  );
}
```

**Subtree-only CSS (advanced):** `collectStylesFromComponent` / `getTypestylesMetadata` from `@typestyles/next/server` run `renderToString` on a specific element and return the CSS registered during that pass. Each call is request-isolated via `collectStyles()`.

### Pages Router

Wrap the page tree with `TypestylesStylesheet` so collection lines up with what Next renders:

```tsx
// pages/_app.tsx
import { TypestylesStylesheet } from '@typestyles/next';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <TypestylesStylesheet>
      <Component {...pageProps} />
    </TypestylesStylesheet>
  );
}
```

Custom `pages/_document.tsx` with `collectStyles(() => ctx.renderPage())` is fragile because `renderPage` can be asynchronous and does not return a React element. Prefer the `_app` pattern above unless you maintain a custom synchronous pipeline.

## Remix

`renderToString(<RemixServer />)` usually returns your `app/root.tsx` tree, which in the default template already includes `<head>…</head>`. Collect CSS from that same render, inject the tag before `</head>`, then prefix `<!DOCTYPE html>` if the string does not already include it:

```tsx
// app/entry.server.tsx
import type { EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { renderToString } from 'react-dom/server';
import { collectStyles, injectStylesIntoHtml } from 'typestyles/server';

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  const { html, css } = collectStyles(() =>
    renderToString(<RemixServer context={remixContext} url={request.url} />),
  );

  responseHeaders.set('Content-Type', 'text/html; charset=utf-8');

  if (!html.includes('</head>')) {
    throw new Error(
      'typestyles SSR: expected </head> in Remix output. Ensure app/root.tsx renders a <head> (default Remix template does).',
    );
  }

  let documentHtml = injectStylesIntoHtml(html, css);
  if (!documentHtml.trimStart().toLowerCase().startsWith('<!doctype')) {
    documentHtml = `<!DOCTYPE html>${documentHtml}`;
  }

  return new Response(documentHtml, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
```

**Streaming:** the stock Remix `entry.server.tsx` uses `renderToPipeableStream` and never builds a single HTML string, so the pattern above targets **synchronous** document responses (for example the bot path in Remix’s default entry, or a custom non-streaming entry). To keep streaming, you still need a strategy for CSS: a prior `collectStyles(() => renderToString(<RemixServer … />))` pass, build-time CSS extraction, or adapting the streaming pipeline—see [Remix streaming](https://remix.run/docs/en/main/guides/streaming) and [entry.server](https://remix.run/docs/en/main/file-conventions/entry.server).

## Streaming SSR (Express / Node)

React's `renderToPipeableStream` does not give you a complete HTML string up front, so TypeStyles cannot collect CSS from the stream itself. The supported pattern is **two renders**:

1. **CSS pass** — `collectStyles(() => renderToString(<App />))` inside the same request (isolated via `AsyncLocalStorage`)
2. **Stream pass** — `renderToPipeableStream(<App />)` for the response body

Open your HTML shell (including the style tag) **before** `pipe(res)`, then finish the document when React signals the stream is done. Exact callbacks depend on Suspense boundaries — see [React `renderToPipeableStream`](https://react.dev/reference/react-dom/server/renderToPipeableStream).

Helpers from `typestyles/server` reduce boilerplate:

- `typestylesStyleHtml(css)` — `<style id="typestyles">…</style>`
- `streamingDocumentShell(css)` — doctype + `<head>` with charset and styles + `<body>`
- `injectStylesIntoHtml(html, css)` — insert before `</head>` (Remix-style full documents)
- `TYPESTYLES_STYLE_ID` — the stable `"typestyles"` id (must match client hydration)

```tsx
import { renderToString, renderToPipeableStream } from 'react-dom/server';
import type { Response } from 'express';
import { collectStyles, streamingDocumentShell } from 'typestyles/server';

app.get('/', (req, res: Response) => {
  const { css } = collectStyles(() => renderToString(<App />));

  const { pipe } = renderToPipeableStream(<App />, {
    onShellReady() {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(streamingDocumentShell(css));
      pipe(res);
    },
    onShellError(error) {
      res.statusCode = 500;
      console.error(error);
      res.end();
    },
  });
});
```

If your shell opens wrappers around `<App />`, add the matching closing tags in the appropriate callback (`onAllReady` when streaming deferred content, or follow the full pattern in the React docs) so you never write to `res` after it has ended.

**Next.js App Router** already streams — prefer `TypestylesStylesheet` or build-time extraction instead of manual two-pass rendering.

## Important considerations

### Style deduplication

TypeStyles automatically deduplicates CSS during collection. If multiple components use the same style variant, it's only included once in the output.

### Critical CSS

By default, `getRegisteredCss()` returns every rule registered in the process. For large apps, prefer **build-time per-route CSS** on Next.js: `buildTypestylesForNext` writes route-scoped stylesheets and a v2 manifest (see [zero-runtime — Next.js](/docs/zero-runtime#nextjs) and [per-route critical CSS](#per-route-critical-css-nextjs) below).

### Per-route critical CSS (Next.js)

`buildTypestylesForNext` traces each App Router `page` plus its layout chain, extracts CSS for modules that import `typestyles`, and writes self-contained files under `app/_typestyles/routes/` (default). The manifest maps route paths to those files:

```json
{
  "version": 2,
  "css": "app/typestyles.css",
  "routes": {
    "/": { "css": "app/_typestyles/routes/index.css" },
    "/about": { "css": "app/_typestyles/routes/about.css" }
  }
}
```

At request time, read the pre-built CSS for the current route instead of the full global sheet:

```tsx
// app/about/layout.tsx (Server Component)
import { getRouteCss } from '@typestyles/next/server';

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  const css = getRouteCss('/about', { root: process.cwd() });
  return (
    <>
      <style id="typestyles-about" dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </>
  );
}
```

Keep your convention entry minimal (tokens, reset, fonts). Route-specific `styles.*` modules imported only from that page's tree stay out of other routes' CSS files. Pass `routeCss: false` to `buildTypestylesForNext` when you only want the monolithic `typestyles.css`.

### Client-side hydration

Always use the same `id="typestyles"` on both server and client. Import `TYPESTYLES_STYLE_ID` from `typestyles/server` or use `typestylesStyleHtml()` so the id stays consistent:

```html
<!-- Server -->
<style id="typestyles">
  ${css}
</style>

<!-- Client finds and reuses this element -->
```

If the IDs don't match, you'll get duplicate styles.

### Memory and cleanup

`collectStyles()` manages collection state automatically. After the render function completes and CSS is collected, the internal state is reset. You don't need to manually clean up.

## Troubleshooting

### Styles missing in SSR output

Make sure you're actually rendering components that use typestyles during the `collectStyles()` call. If styles are defined but the component isn't rendered, no CSS will be generated.

### Styles appearing twice

This happens when the client can't find the server-rendered style tag:

1. Check that the `id` is exactly `"typestyles"`
2. Make sure the style tag is present in the initial HTML
3. Verify no ad blockers or CSP are interfering

### Flash of unstyled content (FOUC)

If you see FOUC:

1. Ensure styles are in the `<head>`, not the body
2. Check that the CSS string isn't empty
3. Verify that `collectStyles()` wraps the actual component render, not just an empty render
