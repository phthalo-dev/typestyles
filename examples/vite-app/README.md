# Vite + React example

Reference app for **`@typestyles/vite`**: runtime style injection and HMR in development, a content-hashed CSS asset and zero client injection on production build.

Consumes [`@examples/react-design-system`](../react-design-system) for components and adds app-level shell styles in `src/site-styles.ts`.

> Run from the monorepo root after `pnpm install`. See the [examples index](../README.md) for all apps.

## Run

From the monorepo root:

```bash
pnpm vite-app dev
```

Or from this directory:

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints (typically [http://localhost:5173](http://localhost:5173)).

Production build + preview:

```bash
pnpm build
pnpm preview
```

## What this demonstrates

| Topic                                 | Where                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Convention entry discovery            | `src/typestyles-entry.ts`                                                |
| Vite plugin (default `build` mode)    | `vite.config.ts`                                                         |
| App shell + scoped `createTypeStyles` | `src/site-styles.ts`                                                     |
| Shared design system consumption      | `@examples/react-design-system`                                          |
| Theme override (`tokens.createTheme`) | `src/App.tsx`                                                            |
| Linked extracted CSS                  | `index.html` → `/typestyles.css` in dev; hashed asset after `vite build` |

## Typestyles layout

```text
src/typestyles-entry.ts   # imports design system + site-styles (extraction graph)
src/site-styles.ts        # createTypeStyles({ scopeId: 'example-app', … })
src/App.tsx               # demo UI + optional brand theme
vite.config.ts            # typestyles() — discovers entry, HMR in dev
```

During **`vite dev`**, styles inject at runtime and hot-reload via the plugin, and `/typestyles.css` stays a stable URL. During **`vite build`**, CSS is extracted to a content-hashed file such as `dist/assets/typestyles-<hash>.css` and `__TYPESTYLES_RUNTIME_DISABLED__` strips client `<style>` injection.

## Learn more

- [`@typestyles/vite` README](../../packages/vite/README.md)
- [Zero-runtime extraction](https://typestyles.dev/docs/zero-runtime)
- [Next.js example](../next-app/README.md) — same design system, App Router extraction
- [Examples index](../README.md)
