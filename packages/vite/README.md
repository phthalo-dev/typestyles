# @typestyles/vite

Vite plugin for [typestyles](https://github.com/type-styles/typestyles): style HMR in development, optional zero-runtime CSS extraction in production.

TypeStyles works without a bundler plugin — styles inject at runtime on first use. This plugin is optional but recommended for Vite apps: it keeps component state while styles hot-reload, catches duplicate namespace collisions at build time, and can emit a static `typestyles.css` file so production ships without client-side `<style>` injection.

## When to use this

| Goal                                                            | Setup                                                                                           |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Faster dev feedback (HMR instead of full reload)                | `typestyles()` with no extraction entry                                                         |
| Runtime in dev, static CSS in production (recommended for SPAs) | Add a [convention entry](#convention-entry) or `extract.modules` — `mode` defaults to `'build'` |
| Injection-only everywhere                                       | `typestyles({ mode: 'runtime' })` or omit any extraction entry                                  |

Full guide: [Zero-runtime extraction](https://typestyles.dev/docs/zero-runtime) · [Vite plugin docs](https://typestyles.dev/docs/vite-plugin)

## Installation

```bash
npm install typestyles
npm install -D @typestyles/vite
```

Peer dependency: Vite >= 5.

## Quick start

### HMR only

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [react(), typestyles()],
});
```

Edit any file that calls `recipe`, `style`, `tokens.create`, etc. Styles update in place without a full page reload.

### Runtime in dev, zero-runtime in production (recommended)

**1. Create a convention entry** that imports every style registration side effect:

```ts
// src/typestyles-entry.ts
import './tokens';
import './components/button';
import './components/card';
```

**2. Add the plugin** (no `mode` needed — discovery defaults to `'build'`):

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [react(), typestyles()],
});
```

**3. Link the CSS** in your HTML shell (optional — the plugin auto-injects this during dev and build when extraction is enabled):

```html
<link rel="stylesheet" href="/typestyles.css" />
```

During `vite dev`, styles still inject at runtime and HMR works. During `vite build`, the plugin emits `typestyles.css`, defines `__TYPESTYLES_RUNTIME_DISABLED__`, and the browser loads one cacheable stylesheet.

Example app: [`examples/vite-app`](../../examples/vite-app)

## Convention entry

When `extract.modules` is omitted, the plugin discovers the first existing file (tries `.ts`, `.tsx`, `.js`, `.mjs` per base):

```text
src/typestyles-entry.ts
src/typestyles.ts
src/styles/index.ts
src/styles.ts
styles/typestyles-entry.ts
styles/typestyles.ts
```

Re-export helpers from `@typestyles/build-runner`:

```ts
import { DEFAULT_EXTRACT_MODULE_CANDIDATES, discoverDefaultExtractModules } from '@typestyles/vite';
```

## Configuration

```ts
typestyles({
  /** Default: true — fail the build on duplicate recipe / style namespaces */
  warnDuplicates?: boolean;

  /**
   * - 'runtime': HMR only, no extraction
   * - 'build': extract on vite build; runtime stays on during vite dev (default when modules resolve)
   * - 'hybrid': same as build for Vite today
   */
  mode?: 'runtime' | 'build' | 'hybrid';

  extract?: {
    /** Explicit entry files relative to project root */
    modules?: string[];
    /** Output asset name. Default: 'typestyles.css' */
    fileName?: string;
  };
});
```

### Explicit extraction modules

Use when you have multiple entry files or non-standard paths:

```ts
typestyles({
  extract: {
    modules: ['src/styles/tokens.ts', 'src/styles/components.ts'],
    fileName: 'assets/typestyles.css',
  },
});
```

### Force runtime-only

```ts
typestyles({ mode: 'runtime' });
```

Even with a convention entry present, this keeps `<style>` injection in production builds.

## How it works

**HMR:** On each `.ts`/`.tsx` module that registers typestyles APIs, the plugin injects `import.meta.hot` accept/dispose handlers. On dispose, it calls `invalidateKeys` from `typestyles/hmr` so stale rules are removed before the module re-executes. HMR code is only injected during `vite dev`, not in production bundles.

**Extraction:** On `vite build`, matching entry modules are bundled and executed in Node via `@typestyles/build-runner`. The collected CSS is emitted as a static asset. In dev, the same extraction runs on demand when the browser requests `/typestyles.css` so your `<link>` href works without SPA fallback returning HTML.

**Duplicate detection:** The plugin scans every source file for namespace strings (`recipe({ name: 'button' })` → `.button-`). Collisions across files fail the build with a clear error.

## Verify production output

Extraction is execute-and-collect: styles unreachable from your entry file are silently dropped. After `vite build`, run:

```ts
import { verifyTypestylesBuild } from '@typestyles/build-runner';

verifyTypestylesBuild({
  root: process.cwd(),
  cssFile: 'dist/typestyles.css',
  requiredCssSubstrings: ['.button-base'],
});
```

See [Zero-runtime extraction — verification](https://typestyles.dev/docs/zero-runtime#verify-the-build).

## Related packages

| Package                                       | Use for                               |
| --------------------------------------------- | ------------------------------------- |
| [`@typestyles/astro`](../astro)               | Astro integration (wraps this plugin) |
| [`@typestyles/rollup`](../rollup)             | Rollup / Rolldown                     |
| [`@typestyles/esbuild`](../esbuild)           | esbuild                               |
| [`@typestyles/webpack`](../webpack)           | webpack                               |
| [`@typestyles/next`](../next)                 | Next.js App/Pages Router              |
| [`@typestyles/build-runner`](../build-runner) | Shared extraction + CI verification   |

## License

Apache-2.0
