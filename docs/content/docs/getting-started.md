---
title: Getting Started
description: Install TypeStyles and ship your first typed component styles in a few minutes
---

TypeStyles is **CSS in TypeScript**: style objects (selectors, media queries, pseudos), **typed variants**, **tokens as CSS variables**, and ordinary `className` strings in React, Vue, Svelte, or HTML.

In production, TypeStyles extracts styles at build time into a **static CSS file** with zero runtime overhead — the same approach as StyleX and Vanilla Extract. During development, the runtime injects styles for instant feedback with HMR.

> **Try it live:** Edit React + TypeStyles in the browser on the [Playground](/playground).

## Installation

<!-- doc-install-tabs -->

```bash
pnpm add typestyles @typestyles/vite
```

```bash
npm install typestyles @typestyles/vite
```

```bash
yarn add typestyles @typestyles/vite
```

<!-- /doc-install-tabs -->

The bundler plugin gives you **zero-runtime production builds** and **HMR in dev**. Plugins are also available for [Next.js](/docs/zero-runtime#nextjs), [Rollup](/docs/zero-runtime#rollup--rolldown), [esbuild](/docs/zero-runtime#esbuild), and [webpack](/docs/zero-runtime#webpack).

> **Prototyping without a plugin?** TypeStyles also works as a pure runtime library — just `npm install typestyles` and skip the plugin. You can add build extraction later without changing any application code. See [Zero-runtime extraction](/docs/zero-runtime#switching-between-modes) for the migration path.

## Set up the Vite plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [react(), typestyles()],
});
```

Create a **convention entry** that imports all your style registrations. The plugin discovers it automatically and extracts CSS on `vite build`:

```ts
// src/typestyles-entry.ts
import './tokens';
import './components/Button.styles';
import './components/Card.styles';
```

That's it. In dev you get runtime injection + HMR. In production, `typestyles.css` is emitted as a static asset with no runtime JS.

## Your first styles

Call [`createTypeStyles`](/docs/api-reference#createtypestyles-options) once and destructure **`style`**, **`recipe`**, and **`tokens`** so they share one **`scopeId`** (namespaced CSS variables and predictable class names). Put the module in a file you import from your UI — the live example below includes the full source and a `className` usage snippet.

<!-- doc-live-demo id="getting-started-button" -->

Toggle **Ghost** in the demo and check the **DOM** and **Emitted CSS** panels (or DevTools on the preview button). Scoped class names are prefixed with your `scopeId`, and token-backed values resolve to custom properties such as `--app-color-primary`.

**What just happened:** definitions register when the module loads. In dev, the runtime injects CSS rules into a managed `<style>` tag. In production with a bundler plugin, these same rules are extracted into a static `.css` file — no client-side injection at all. See [Zero-runtime extraction](/docs/zero-runtime) for the full story.

For React-specific patterns (refs, merging `className`, server components), see [React integration](/docs/react-integration). Vue and Svelte work the same way — see the runnable examples below.

## Runnable examples

Clone the [typestyles monorepo](https://github.com/phthalo-dev/typestyles) and run from the repo root (`pnpm install` once):

| Example                                                | Command               | README                                                                                                   |
| ------------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------- |
| Vite + React (recommended, zero-runtime in production) | `pnpm vite-app dev`   | [examples/vite-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/vite-app/README.md)     |
| Next.js App Router + extraction verify                 | `pnpm next-app dev`   | [examples/next-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/next-app/README.md)     |
| Vue 3                                                  | `pnpm vue-app dev`    | [examples/vue-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/vue-app/README.md)       |
| Svelte 5                                               | `pnpm svelte-app dev` | [examples/svelte-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/svelte-app/README.md) |
| Runtime only (no bundler plugin)                       | `pnpm parcel-app dev` | [examples/parcel-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/parcel-app/README.md) |

Full index: [examples/README.md](https://github.com/phthalo-dev/typestyles/blob/main/examples/README.md) · maintainer map: [docs/README.md](https://github.com/phthalo-dev/typestyles/blob/main/docs/README.md#doc-pages-and-runnable-examples)

## Next steps

| Topic                                              | What you will learn                                                |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| [Zero-runtime extraction](/docs/zero-runtime)      | Production static CSS with Vite, Next.js, Rollup, esbuild, webpack |
| [Styles](/docs/styles)                             | Flat vs dimensioned `recipe`, `style`, composition, mental model   |
| [Components](/docs/components)                     | Variants, compounds, multipart `slots`                             |
| [Tokens](/docs/tokens)                             | Namespaces, themes, `tokens.use`                                   |
| [Framework comparison](/docs/framework-comparison) | How TypeStyles compares to other tools                             |
| [Migration](/docs/migration)                       | Coming from StyleX, Panda, vanilla-extract, Stitches, Emotion      |
| [End-to-end theming](/docs/theming-end-to-end)     | Tokens, themes, overrides, and mounting in one walkthrough         |
| [Design system with tokens](/docs/design-system)   | Primitives → semantics → components                                |
| [Class naming](/docs/class-naming)                 | Semantic vs hashed output                                          |
