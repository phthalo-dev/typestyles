---
title: Zero-Runtime Build Extraction
description: How to eliminate the typestyles runtime in production and emit a static CSS file
---

Without a bundler integration, typestyles injects CSS at runtime when components render. With **`@typestyles/vite`**, you can make **production** zero-runtime by default: if the plugin finds a [convention entry file](#vite) under the project root, it resolves an extraction module and defaults to `mode: 'build'` (runtime + HMR in dev, static CSS + no client injection on `vite build`). Apps that prefer injection-only can set `mode: 'runtime'` or omit a convention entry and any `extract.modules` list.

Typestyles supports an optional **build extraction** mode through its bundler integrations. When enabled:

- All styles are extracted at build time and written to a static `.css` asset.
- The typestyles runtime is replaced with a no-op stub (`~0 bytes` when tree-shaken).
- No `<style>` injection happens in the browser — the CSS file is served directly.

The same `recipe()`, `tokens.create()`, and `keyframes.create()` APIs work identically in both modes.

**Runnable examples** (monorepo root, after `pnpm install`):

| Bundler / app     | Command                 | README                                                                                                     |
| ----------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| Vite + React      | `pnpm vite-app dev`     | [examples/vite-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/vite-app/README.md)       |
| Next.js + verify  | `pnpm next-app build`   | [examples/next-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/next-app/README.md)       |
| esbuild           | `pnpm esbuild-app test` | [examples/esbuild-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/esbuild-app/README.md) |
| Rollup / Rolldown | `pnpm rollup-app build` | [examples/rollup-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/rollup-app/README.md)   |

See also [examples/README.md](https://github.com/phthalo-dev/typestyles/blob/main/examples/README.md) and the [doc ↔ example map](https://github.com/phthalo-dev/typestyles/blob/main/docs/README.md#doc-pages-and-runnable-examples).

---

## Why runtime in dev and extraction in production?

**Development:** You want instant feedback. The typestyles runtime plus the Vite plugin’s HMR hooks let you change tokens or components without running a separate Node extraction step on every save.

**Production:** You want a plain `.css` file: normal browser caching, parallel download/parse with JS, and no style injection work on the main thread after load.

The Vite plugin implements this split when at least one extraction module is resolved (explicit `extract.modules`, or an auto-discovered convention entry): it defaults to `mode: 'build'`, which **only** disables the runtime and emits CSS during `vite build`. `vite dev` keeps injection enabled.

---

## How it works

1. The bundler plugin (Vite, Rollup, Rolldown) scans your source files for typestyles imports.
2. Those modules are bundled and executed in a Node.js subprocess.
3. `getRegisteredCss()` collects all CSS that was registered during that execution.
4. The collected CSS is written as a static asset (e.g. `typestyles.css`) and linked in the HTML.
5. The `__TYPESTYLES_RUNTIME_DISABLED__` flag is defined as `"true"` so the browser bundle uses a no-op sheet that never injects CSS.

---

## Theme extraction

Theme and token CSS needs no separate build step. Because extraction is execute-and-collect, everything a module registers when it runs — including the `:root { --… }` blocks from **`tokens.create`** and the `.theme-*` classes from **`createTheme`** — lands in the same static CSS asset as your component styles. Theme CSS is a byproduct of normal extraction across all six bundler integrations: **Vite**, **Rollup / Rolldown**, **esbuild**, **webpack**, **Next.js**, and **Astro**.

```ts
// src/typestyles-entry.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const color = tokens.create('color', { primary: '#0066ff', surface: '#ffffff' });
tokens.createTheme({
  name: 'dark',
  tokens: { color: { primary: '#66aaff', surface: '#111111' } },
});
```

```css
/* typestyles.css (emitted at build time) */
:root {
  --color-primary: #0066ff;
  --color-surface: #ffffff;
}
.theme-dark {
  --color-primary: #66aaff;
  --color-surface: #111111;
}
```

This means TypeStyles never needs a "did you forget to build your theme" runtime warning. Some zero-runtime libraries treat themes as a separate compilation unit — Astryx, for example, falls back to runtime theme evaluation and warns when a theme wasn't pre-built with `astryx theme build`. In TypeStyles there is no unbuilt-theme state to fall back from: if your entry module reaches the theme, the theme is in the CSS file.

The one thing to get right is the same as for component styles: the modules calling `tokens.create` / `createTheme` must be reachable from your [convention entry](#vite) (or explicit `extract.modules`).

**Design systems with many recipes:** add a registry module (for example `src/themeable-refs.ts`) that side-effect-imports every recipe file and exports `getRegisteredComponentRefs(ts)` from your `createTypeStyles` runtime. Wire it with Vite `extract.registeredComponentsModule: 'src/themeable-refs.ts'`, or set `extract.include: 'allRegisteredComponents'` to auto-append a convention registry file when present (`src/themeable-refs.ts`, `src/typestyles/themeable-refs.ts`, …). The plain `typestyles-entry` side-effect imports are not enough on their own — the registry module must pull in each recipe so `recipe()` runs during extract. Full theme + override walkthrough: [End-to-end theming](/docs/theming-end-to-end).

To guard against a theme module dropping out of the entry graph, assert on a token variable or theme class with `verifyTypestylesBuild()` (see [Verify extraction in CI](#verify-extraction-in-ci)):

```ts
verifyTypestylesBuild({
  root: process.cwd(),
  cssFile: 'dist/typestyles.css',
  requiredCssSubstrings: [':root { --color-primary:', '.theme-dark'],
});
```

---

## Vite

Install the Vite plugin:

```bash
npm install --save-dev @typestyles/vite
```

In `vite.config.ts`, either **add a convention entry** so the plugin can discover it, or **set `extract.modules`** yourself. When at least one module resolves, **`mode` defaults to `'build'`** (runtime stays on during `vite dev`; extraction and zero-runtime apply on `vite build`).

**Convention entry (minimal config):** add a file at one of these paths (first match wins), re-exporting or importing every registration side effect — for example `src/typestyles-entry.ts` that imports your tokens and components. After the `src/…` entries, the same names are tried under a top-level `styles/` folder (common in Next.js apps without `src/`).

```text
src/typestyles-entry.ts
src/typestyles.ts
src/styles/index.ts
src/styles.ts
styles/typestyles-entry.ts
styles/typestyles.ts
```

```ts
import { defineConfig } from 'vite';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [
    // Discovers src/typestyles-entry.ts (etc.); mode defaults to 'build'
    typestyles(),
  ],
});
```

**Explicit modules** (multiple entries or non-standard paths):

```ts
import { defineConfig } from 'vite';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [
    typestyles({
      extract: {
        modules: ['src/styles/tokens.ts', 'src/styles/components.ts'],
        fileName: 'typestyles.css', // optional, default: "typestyles.css"
      },
    }),
  ],
});
```

On `vite build`, a local module that calls `recipe()` and is reachable from the app must also be reachable from the extract entry. The build fails with the module path and the recipe `name`. Set `coverage: false` when the extract is intentionally a subset:

```ts
typestyles({ coverage: false });
```

Explicit modes are still available when you need them:

```ts
typestyles({
  mode: 'runtime', // force injection-only (even if extract is set)
  extract: { modules: ['src/styles/index.ts'] },
});
```

### Modes

| Mode        | Description                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"runtime"` | Default when **no** extraction modules resolve (no `extract.modules`, no discovered convention file). Injection only; no emitted CSS file.            |
| `"build"`   | Default when at least one module resolves (explicit or discovered). CSS is extracted on `vite build`; runtime disabled **only** in production builds. |
| `"hybrid"`  | CSS is extracted AND the runtime is kept (useful for dynamic styles not known at build time).                                                         |

### Linking the CSS file

Add a `<link rel="stylesheet" href="/typestyles.css" />` (or your chosen `fileName`) to `index.html` only when you need manual control — **`@typestyles/vite` auto-injects this link** into HTML entry points when extraction is enabled. During `vite dev`, the dev server serves that URL; production builds include the emitted asset.

---

## Rollup / Rolldown

Install the Rollup plugin:

```bash
npm install --save-dev @typestyles/rollup
```

Add a [convention entry file](#vite) (for example `src/typestyles-entry.ts`) or pass explicit `extract.modules`. When a convention entry resolves, `mode` defaults to `"build"`.

```js
// rollup.config.js
import typestylesRollupPlugin from '@typestyles/rollup';

export default {
  input: 'src/main.ts',
  plugins: [
    typestylesRollupPlugin(), // discovers src/typestyles-entry.ts (etc.)
  ],
};
```

Explicit extraction:

```js
typestylesRollupPlugin({
  mode: 'build',
  extract: {
    modules: ['src/styles/index.ts'],
  },
});
```

---

## esbuild

Install the esbuild plugin:

```bash
npm install --save-dev @typestyles/esbuild esbuild
```

```js
// build.mjs
import { build } from 'esbuild';
import typestylesEsbuildPlugin from '@typestyles/esbuild';

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  plugins: [typestylesEsbuildPlugin()],
});
```

Convention entry discovery matches Vite and Rollup. The plugin writes `typestyles.css` to esbuild’s `outdir` (default: `dist/typestyles.css`).

---

## webpack

Install the webpack plugin:

```bash
npm install --save-dev @typestyles/webpack webpack
```

```js
// webpack.config.mjs
import TypestylesWebpackPlugin from '@typestyles/webpack';

export default {
  entry: './src/index.ts',
  plugins: [new TypestylesWebpackPlugin()],
};
```

When a convention entry resolves, the plugin emits `typestyles.css` as a build asset and defines `__TYPESTYLES_RUNTIME_DISABLED__` for client bundles.

---

## Next.js

Install the Next.js integration:

```bash
npm install --save-dev @typestyles/next
```

Use **`withTypestyles`** so behavior matches **`@typestyles/vite`**: when `NODE_ENV === 'production'` and a **convention entry file** exists under the project root (same discovery order as Vite — see the list above), the client bundle disables `<style>` injection (`withTypestylesExtract` under the hood). In **development**, the config is left unchanged so the runtime stays on (no need to branch on `NODE_ENV` yourself).

```js
// next.config.mjs
import { withTypestyles } from '@typestyles/next/build';

export default withTypestyles({
  // your existing config, e.g. transpilePackages: ['typestyles', '@typestyles/next'],
});
```

Run extraction before `next build` (CI or a `prebuild` script). **Defaults** match the Vite story: `buildTypestylesForNext({ root })` discovers a convention entry, then writes **`app/typestyles.css`** and **`app/typestyles.manifest.json`** (override with `cssOutFile`, `manifestOutFile`, or `modules` when you need a custom layout).

When an **`app/`** directory exists, extraction also emits **per-route critical CSS** under **`app/_typestyles/routes/`** and upgrades the manifest to **version 2** with a `routes` map. Disable with `routeCss: false` or customize `routeCssOutDir`.

```ts
// scripts/typestyles-build.mts
import { buildTypestylesForNext } from '@typestyles/next/build';

await buildTypestylesForNext({ root: process.cwd() });
```

Import the emitted CSS from your App Router layout (`import './typestyles.css'`), or load route-scoped CSS at request time with **`getRouteCss`** (see [SSR — per-route CSS](/docs/ssr#per-route-critical-css-nextjs)).

For full manual control, **`withTypestylesExtract`** is still available (always merges production defines). **`discoverDefaultExtractModules`** and **`DEFAULT_EXTRACT_MODULE_CANDIDATES`** are re-exported from `@typestyles/next/build` (same as `@typestyles/build-runner` / `@typestyles/vite`).

### Verify extraction in CI

Zero-runtime extraction is execute-and-collect: styles that never run during the build step are omitted from the CSS file. `@typestyles/vite` fails `vite build` when a local module reachable from the app calls `recipe()` and is missing from the extract entry (see [Vite](#vite); opt out with `coverage: false`). Other registrations, and extracts from Rollup, esbuild, webpack, and Next, still need a check against the emitted file.

Use **`verifyTypestylesBuild()`** from `@typestyles/build-runner` (also re-exported from `@typestyles/next/build`) after your build step to fail fast when output is missing or incomplete:

```ts
// scripts/typestyles-verify.mts
import { verifyTypestylesBuild } from '@typestyles/build-runner';

verifyTypestylesBuild({
  root: process.cwd(),
  cssFile: 'app/typestyles.css',
  manifestFile: 'app/typestyles.manifest.json',
  minBytes: 500,
  // App-specific: class names / token vars you expect from the entry graph
  requiredCssSubstrings: ['.my-scope-button {', ':root { --my-scope-color-primary:'],
});
```

Checks performed:

- CSS file exists and meets `minBytes` (defaults to non-empty when omitted)
- Optional `requiredCssSubstrings` — catch missing imports from the entry barrel
- Optional manifest exists with `version: 1` or `version: 2` and `css` pointing at your stylesheet path
- For v2 manifests, optional `minRouteEntries` and per-route CSS file checks

Wire it into `package.json` before `next build` (see `@examples/next`):

```json
{
  "scripts": {
    "typestyles:build": "tsx ./scripts/typestyles-build.mts",
    "typestyles:verify": "tsx ./scripts/typestyles-verify.mts",
    "build": "pnpm typestyles:build && pnpm typestyles:verify && next build"
  }
}
```

For Vite/Rollup, pass the emitted asset path (e.g. `dist/typestyles.css`) and omit `manifestFile` unless you write one yourself.

Add `TypestylesStylesheet` to your root layout to handle streaming SSR (React 18 App Router):

```tsx
// app/layout.tsx
import { TypestylesStylesheet } from '@typestyles/next/client';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TypestylesStylesheet />
        {children}
      </body>
    </html>
  );
}
```

---

## Entry module requirements

The `modules` array should list files that register styles either directly or by importing other style files. A common pattern is a single `styles/index.ts` barrel file:

```ts
// src/styles/index.ts
export * from './tokens'; // tokens.create(...)
export * from './button'; // recipe(...)
export * from './card'; // recipe(...)
export * from './typography'; // recipe(...)
```

```ts
// vite.config.ts
typestyles({
  extract: { modules: ['src/styles/index.ts'] },
});
```

---

## Switching between modes

Typestyles is designed for incremental migration from runtime to build extraction:

1. **Start in runtime-only mode** — omit a convention entry and any `extract.modules` (or set `mode: 'runtime'`).
2. **Add a convention entry or `extract`** — default `build` mode gives dev runtime + prod extraction in Vite.
3. **Use `hybrid`** when you need a static baseline plus runtime for dynamic values.

---

## Checking runtime disabled state

You can check whether the runtime is disabled at any point:

```ts
// The RUNTIME_DISABLED variable is defined by the bundler plugin.
// This will tree-shake to `false` in runtime mode and `true` in build mode.
declare const __TYPESTYLES_RUNTIME_DISABLED__: string | undefined;

const isStaticCSS =
  typeof __TYPESTYLES_RUNTIME_DISABLED__ !== 'undefined' &&
  __TYPESTYLES_RUNTIME_DISABLED__ === 'true';
```

---

## Limitations

- **Dynamic styles** — styles that are created based on runtime data (e.g. user-provided values) cannot be extracted at build time. Use the `hybrid` mode or keep those styles in runtime mode.
- **Lazy routes** — a dynamically imported module that calls `recipe()` is part of the app graph. On `vite build` it must also be reachable from the extract entry, or the build fails. Import it from the convention entry, or set `coverage: false` when that CSS should stay out of the production extract.
- **Server Components (Next.js)** — `TypestylesStylesheet` handles streaming SSR for React Server Components. Ensure it is present in your root layout, or use build-time extraction. See [SSR — RSC patterns](/docs/ssr#react-server-components-nextjs-app-router).
