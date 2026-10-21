---
title: Vite Plugin
description: Enhance your Vite development experience with HMR and style validation
---

The optional `@typestyles/vite` plugin enhances your development experience with Hot Module Replacement (HMR) and helpful warnings.

**Runnable examples:** [examples/vite-app](https://github.com/type-styles/typestyles/blob/main/examples/vite-app/README.md) (React), [examples/vue-app](https://github.com/type-styles/typestyles/blob/main/examples/vue-app/README.md), [examples/svelte-app](https://github.com/type-styles/typestyles/blob/main/examples/svelte-app/README.md), and [examples/typewind](https://github.com/type-styles/typestyles/blob/main/examples/typewind/README.md). Each includes a convention entry and production extraction.

## Installation

```bash
npm install -D @typestyles/vite
# or
pnpm add -D @typestyles/vite
# or
yarn add -D @typestyles/vite
```

## Basic setup

Add the plugin to your `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [typestyles()],
});
```

For **zero-runtime production** builds while keeping **runtime + HMR in development**, add a [convention style entry](/docs/zero-runtime#vite) (e.g. `src/typestyles-entry.ts`) or set `extract.modules` (see [Zero-runtime extraction](/docs/zero-runtime)). When at least one extraction module resolves, the plugin defaults to `mode: 'build'`: `vite dev` still injects styles at runtime, and `vite build` emits a static CSS file and strips client injection.

For loading self-hosted fonts with Vite’s asset pipeline, see [Fonts](/docs/fonts).

## Features

### Hot Module Replacement (HMR)

Without the plugin, editing a style file causes a full page reload. With the plugin:

- Style changes apply instantly
- Component state is preserved
- No flicker or re-render cascade

The plugin works by:

1. Detecting when a module uses typestyles
2. Injecting HMR accept handlers
3. Invalidating affected style registrations on file change
4. Triggering a targeted update instead of a full reload

### Duplicate namespace warnings

The plugin warns you when multiple files use the same namespace:

```
Style namespace "button" is also used in /path/to/other/file.ts.
Duplicate namespaces cause class name collisions.
```

This helps catch issues early, since duplicate namespaces can cause unexpected style overwrites.

## Configuration

### Runtime in dev, static CSS in production (recommended for SPAs)

This is the usual setup for Vite: **development** uses the typestyles runtime so edits hot-reload without running a separate extraction step; **production** emits a real `.css` asset the browser can cache and parse in parallel with JS.

Add a convention entry file that imports every registration side effect (see [Zero-runtime extraction](/docs/zero-runtime)), **or** set `extract.modules` explicitly. You do **not** need to pass `mode` — when modules resolve (discovered or explicit), it defaults to `build`, and the plugin only disables the runtime during `vite build`, not during `vite dev`.

**Using discovery (minimal `vite.config`):**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [
    react(),
    typestyles(), // discovers e.g. src/typestyles-entry.ts when present
  ],
});
```

**Explicit `extract` (multiple entries or custom paths):**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [
    react(),
    typestyles({
      extract: {
        modules: ['src/typestyles-entry.ts'],
        fileName: 'typestyles.css',
      },
    }),
  ],
});
```

Link the generated file from `index.html` only if you need a custom placement or filename — otherwise the plugin injects `<link rel="stylesheet" href="…">` into every HTML entry during dev and build (respecting `extract.fileName` and Vite `base`). In dev the middleware serves the same URL; production builds include the emitted asset.

To force runtime-only everywhere (no extraction), set `mode: 'runtime'` even when `extract` is present. For dynamic values that cannot be extracted, see `mode: 'hybrid'` in [Zero-runtime extraction](/docs/zero-runtime).

### Disable duplicate warnings

If you have a legitimate use case for duplicate namespaces (uncommon), you can disable the warning:

```ts
import { defineConfig } from 'vite';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [
    typestyles({
      warnDuplicates: false,
    }),
  ],
});
```

## How HMR works

When you save a file that imports from `typestyles`, the plugin:

1. **Extracts namespaces**: Parses your code to find all `recipe()`, `tokens.create()`, `createTheme()` / `tokens.createTheme({ name })`, and `keyframes.create()` calls (see [End-to-end theming](/docs/theming-end-to-end) for the theme + override pattern)

2. **Injects HMR code**: Adds Vite's `import.meta.hot` handlers to the module

3. **On file change**:
   - The HMR handler calls `invalidateKeys()` from `typestyles/hmr`
   - Affected styles are removed from the internal registry
   - The module re-executes with fresh style definitions
   - New CSS is injected, replacing the old rules

4. **State preserved**: React/Vue/Svelte components keep their state since only the module containing styles changed

## Example: seeing HMR in action

Create a simple Vite app with typestyles:

```ts
// src/tokens.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const color = tokens.create('color', {
  primary: '#0066ff',
});

// src/styles.ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { color } from './tokens';

export const button = recipe({
  name: 'button',
  styles: {
    base: {
      backgroundColor: color.primary,
      padding: '8px 16px',
    },
  },
});

// src/main.ts
import { button } from './styles';

document.getElementById('app').innerHTML = `
  <button class="${button()}">Click me</button>
`;
```

Run the dev server:

```bash
npm run dev
```

Now edit `src/tokens.ts` and change the primary color. The button updates instantly without a page reload!

## Framework integration

The plugin works with any Vite-based framework:

### React

```bash
npm create vite@latest my-app -- --template react-ts
npm install typestyles @typestyles/vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [react(), typestyles()],
});
```

### Vue

```bash
npm create vite@latest my-app -- --template vue-ts
npm install typestyles @typestyles/vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [vue(), typestyles()],
});
```

### Svelte

```bash
npm create vite@latest my-app -- --template svelte-ts
npm install typestyles @typestyles/vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [svelte(), typestyles()],
});
```

## SSR with Vite

HMR hooks are dev-only (`import.meta.hot`). For build-time extraction, production client bundles get `__TYPESTYLES_RUNTIME_DISABLED__` so the sheet does not inject `<style>` tags; pair that with the emitted CSS file or SSR helpers. For SSR without extraction, use `collectStyles()` from `typestyles/server` as described in the [SSR guide](/docs/ssr).

## Troubleshooting

### HMR not working

1. Check that the plugin is listed in `vite.config.ts`
2. Ensure your files import from `'typestyles'` (not a relative path to the package)
3. Verify `import.meta.hot` is available (dev mode, not production)

### Duplicate namespace warnings appearing incorrectly

The detection is regex-based and may have false positives if you:

- Have strings that look like typestyles calls in comments
- Use variable names like `styles` for other purposes

These are rare and don't affect functionality—just ignore the warning or disable it.

### Full reloads still happening

Some changes require a full reload:

- Adding/removing imports that affect the module graph
- Changes to non-typestyles code in the same file
- Type-only changes (TypeScript types don't affect runtime)

### Plugin performance

The plugin adds minimal overhead:

- Only transforms files that import from `'typestyles'`
- Transformation is a simple regex match, not a full AST parse
- HMR helpers are stripped from production bundles; extraction runs only during `vite build` when using `build` or `hybrid` mode

## Is the plugin required?

No. TypeStyles works perfectly without it. The plugin improves DX for:

- Faster iteration with HMR
- Early warning about duplicate namespaces
- Optional production CSS extraction via `extract` (see [Zero-runtime extraction](/docs/zero-runtime))

If you prefer full page reloads or use a different bundler, you don't need this plugin.

## Future features

Planned enhancements (not yet implemented):

- **Dead style detection**: Warn when styles are defined but never used
- **Source maps**: Map generated CSS back to your style definitions

Stay tuned to the [GitHub repository](https://github.com/type-styles/typestyles) for updates.
