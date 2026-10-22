# @typestyles/astro

[Astro](https://astro.build) integration for [typestyles](https://github.com/type-styles/typestyles): wires `@typestyles/vite` into your Astro config for style HMR in development and build-time CSS extraction in production.

## When to use this

Use this integration when you build an Astro site with typestyles and want the same developer experience as Vite:

- **Development:** runtime style injection + HMR (no separate extraction step on every save)
- **Production:** static `typestyles.css`, no client `<style>` injection

TypeStyles works in Astro without this package — import `typestyles` in `.astro` frontmatter or client components and call `getRegisteredCss()` for SSR. The integration removes boilerplate and aligns dev/prod behavior with the rest of the typestyles ecosystem.

Docs site usage: [`docs/astro.config.mjs`](../../docs/astro.config.mjs)

## Installation

```bash
npm install typestyles @typestyles/astro
```

Peer dependency: Astro >= 4.

## Quick start

**1. Create an extraction entry** that imports every registration side effect:

```ts
// src/typestyles-entry.ts
import './styles/tokens';
import './styles/layout';
```

**2. Register the integration:**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import typestyles from '@typestyles/astro';

export default defineConfig({
  integrations: [
    typestyles({
      mode: 'build',
      extract: {
        modules: ['src/typestyles-entry.ts'],
        fileName: 'typestyles.css',
      },
    }),
  ],
});
```

When `extract.modules` resolves (or a [convention entry](https://typestyles.dev/docs/zero-runtime#vite) is discovered), `mode` defaults to `'build'` — same as `@typestyles/vite`.

**3. Link the stylesheet** in your layout:

```astro
---
// src/layouts/Base.astro
---
<html lang="en">
  <head>
    <link rel="stylesheet" href="/typestyles.css" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

**4. Use typestyles in components:**

```astro
---
// src/components/Card.astro
import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const card = recipe({
  name: 'card',
  styles: { base: { padding: '16px', borderRadius: '8px' } },
});
---

<div class={card().className}>Hello</div>
```

## Configuration

Accepts the same options as `@typestyles/vite`:

```ts
typestyles({
  warnDuplicates?: boolean;
  mode?: 'runtime' | 'build' | 'hybrid';
  extract?: {
    modules?: string[];
    fileName?: string;
  };
});
```

Re-exported type: `TypestylesPluginOptions`.

### Minimal config with convention discovery

If `src/typestyles-entry.ts` exists, you can omit `extract`:

```js
export default defineConfig({
  integrations: [typestyles()],
});
```

## HMR with `.astro` frontmatter

`.astro` frontmatter runs on the server during dev. The Vite plugin cannot hot-replace styles registered only in server-only modules until those registrations also run in the browser.

For instant style updates in dev, add a client script that dynamically imports the same entry:

```astro
<script>
  if (import.meta.env.DEV) {
    void import('../typestyles-entry.ts');
  }
</script>
```

Avoid inlining `getRegisteredCss()` in dev when using extraction mode — prefer the linked `/typestyles.css` URL so the dev server serves fresh CSS.

## Production build

On `astro build`, the integration:

1. Emits `typestyles.css` as a static asset
2. Sets `__TYPESTYLES_RUNTIME_DISABLED__` so client bundles skip `<style>` injection
3. Runs duplicate namespace checks across your source tree

Verify output in CI with [`verifyTypestylesBuild`](../build-runner/README.md) from `@typestyles/build-runner`.

## SSR without extraction

For content sites that prefer runtime injection everywhere:

```js
export default defineConfig({
  integrations: [typestyles({ mode: 'runtime' })],
});
```

Inject collected CSS in your layout with `getRegisteredCss()` from `typestyles/server` or `@typestyles/next` patterns — see [SSR guide](https://typestyles.dev/docs/ssr).

## Related packages

| Package                                       | Role                                         |
| --------------------------------------------- | -------------------------------------------- |
| [`@typestyles/vite`](../vite)                 | Underlying Vite plugin                       |
| [`@typestyles/build-runner`](../build-runner) | Extraction engine + CI verification          |
| [`@typestyles/props`](../props)               | Atomic utility props (used on the docs site) |

Full docs: [typestyles.dev](https://typestyles.dev)

## License

Apache-2.0
