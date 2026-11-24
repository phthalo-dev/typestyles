# TypeStyles documentation site

Astro site for [typestyles.dev](https://typestyles.dev) — markdown guides, live style demos, design-system kitchen sink, and package changelogs.

The site **dogfoods typestyles**: styles live in TypeScript, production builds extract static CSS via `@typestyles/astro`, and interactive pages use `@typestyles/props` plus `@examples/design-system`.

## Run

From the **monorepo root** (recommended — workspace packages must be built first):

```bash
pnpm install
pnpm --filter docs dev
```

Or from this directory:

```bash
cd docs
pnpm install   # only if not using the workspace root install
pnpm dev
```

Open the URL Astro prints (typically [http://localhost:4321](http://localhost:4321)).

Other scripts:

```bash
pnpm build    # static output in dist/
pnpm preview  # serve production build locally
pnpm lint
```

## Repository layout

```text
docs/
├── content/docs/          # Guide markdown (routes at /docs/<slug>)
├── src/
│   ├── pages/             # Astro routes (home, docs shell, changelog, kitchen sink)
│   ├── layouts/           # DocsLayout, etc.
│   ├── components/        # Site chrome, LiveDemo, CodeBlock, search, …
│   ├── demos/             # Live demo modules + registry
│   ├── styles/            # Site typestyles (nav, doc page, live demo chrome)
│   ├── lib/               # Markdown pipeline, search index, demo CSS helpers
│   ├── atoms.ts           # @typestyles/props utilities for layout
│   ├── tokens.ts          # Docs theme tokens (uses @examples/design-system)
│   ├── typestyles-entry.ts  # Extraction entry — import all registrations here
│   └── navigation.ts      # Sidebar structure
├── astro.config.mjs       # @typestyles/astro + vite-tsconfig-paths
└── package.json
```

### Typestyles on this site

| Piece                     | Role                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `src/typestyles-entry.ts` | Side-effect imports for **`mode: 'build'`** extraction                                    |
| `astro.config.mjs`        | `@typestyles/astro({ mode: 'build', extract: { modules: ['src/typestyles-entry.ts'] } })` |
| `src/styles/`             | Site chrome registered via typestyles                                                     |
| `src/demos/*.ts`          | Isolated demo styles extracted per-demo for `LiveDemo` previews                           |
| `@examples/design-system` | Shared tokens, recipes, themes, syntax highlighting                                       |

Production CSS is emitted as `typestyles.css` and linked from `Head.astro`. Demo previews can inject scoped CSS from individual demo modules (`previewCss` in the registry).

## Adding a documentation page

1. Create `content/docs/your-page.md` with frontmatter:

   ```yaml
   ---
   title: Your Title
   description: Brief description for SEO and cards
   ---
   ```

2. Register the slug in `src/navigation.ts` under the right category.

3. Run `pnpm dev` and open `/docs/your-page`.

Guides use a unified markdown pipeline (`src/lib/docs.ts`) with GFM, syntax highlighting, and optional live demo expansion.

## Output parity baseline

`pnpm verify` (`vp run ci`) builds the docs and runs `vp run -F docs parity`, which compares `dist/` with
`specs/baseline/`: URL list, heading ids, `llms.txt`, and content hashes of the `.md` views, `llms-full.txt`,
the docs/search indexes, sitemaps and MCP content. **Any doc content edit (or other intended output change)
changes those hashes**: after it, run `vp run -F docs build && vp run -F docs parity:update` and commit
`specs/baseline/` with the change.

## Adding a live demo

Live demos show **authored code + emitted CSS + rendered preview** on doc pages.

1. Add a demo module under `src/demos/` (e.g. `my-demo.ts`) exporting `demoSourceCode`, `demoVariants`, etc. For build-time CSS, add a sibling `*.impl.ts` or use the module path directly.

2. Register in `src/demos/registry.ts`:

   ```ts
   'my-demo': {
     title: '…',
     headerLabel: 'path/to/file.ts',
     codeLang: 'typescript',
     modulePath: 'src/demos/my-demo.impl.ts',
     previewCss: true,        // optional isolated preview stylesheet
     preview: 'button',       // or 'themed-card'
     load: () => import('./my-demo'),
   },
   ```

3. Reference in markdown via the live-demo directive (see existing pages like `getting-started.md`).

4. If the demo registers new global styles, import its module from `src/typestyles-entry.ts` so production extraction includes them.

## Navigation categories

Defined in `src/navigation.ts`:

- **Getting Started** — install, framework comparison, API reference, changelog index
- **Core Concepts** — styles, components, tokens, atomic CSS, Open Props, fonts, …
- **Advanced Features** — SSR, zero-runtime, Vite plugin, class naming, cascade layers, theming
- **Guides** — migration, best practices, testing, performance, troubleshooting
- **Examples** — React, component library, design system, animations

## Changelog pages

Package and example changelogs render from workspace `CHANGELOG.md` files:

- Index: `/docs/changelog`
- Per package: `/docs/changelog/packages/<name>`

Sources are collected in `src/lib/changelogs.ts`.

## Regenerating API reference

```bash
node ../scripts/generate-api-reference.js
```

Updates `content/docs/api-reference.md` from JSDoc in `packages/typestyles`.

## Related packages in this app

| Dependency                 | Use                                               |
| -------------------------- | ------------------------------------------------- |
| `@typestyles/astro`        | Integration wrapper around `@typestyles/vite`     |
| `@typestyles/props`        | Docs layout utilities (`src/atoms.ts`)            |
| `@typestyles/build-runner` | Demo CSS extraction in Node (`collectDemoCss.ts`) |
| `@examples/design-system`  | Tokens, recipes, themes, code highlighting        |
| `typestyles`               | Core styling API                                  |

## Examples elsewhere in the monorepo

Runnable apps that mirror docs topics: [`../examples/`](../examples/README.md) (Vite, Next.js, Vue, Svelte, bundler extraction, Typewind, design systems).

See also [`../examples/README.md` — Contributing to examples](../examples/README.md#contributing-to-examples) when adding or changing sample apps.

## Doc pages and runnable examples

When editing a guide, use these repos as the source of truth. Paths are relative to the monorepo root.

### Getting Started

| Doc page             | Route                        | Example / source                                                                                                                 |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Getting Started      | `/docs/getting-started`      | [`examples/vite-app`](../examples/vite-app/README.md) · [`examples/parcel-app`](../examples/parcel-app/README.md) (runtime-only) |
| Framework comparison | `/docs/framework-comparison` | [Examples index](../examples/README.md#runtime-vs-extraction)                                                                    |
| API Reference        | `/docs/api-reference`        | [`packages/typestyles`](../packages/typestyles/README.md) · regenerate via `scripts/generate-api-reference.js`                   |

### Core Concepts

| Doc page             | Route                  | Example / source                                                                                                            |
| -------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Styles               | `/docs/styles`         | [`examples/typewind`](../examples/typewind/README.md) (`style`)                                                             |
| Components           | `/docs/components`     | [`examples/react-design-system`](../examples/react-design-system/README.md)                                                 |
| Style Composition    | `/docs/compose`        | [`examples/vite-app`](../examples/vite-app/README.md) · docs [`src/atoms.ts`](./src/atoms.ts)                               |
| Dynamic styling      | `/docs/dynamic-styles` | Live demos in [`src/demos/`](./src/demos/)                                                                                  |
| Atomic CSS Utilities | `/docs/atomic-css`     | Docs [`src/atoms.ts`](./src/atoms.ts) (`@typestyles/props`) · compare [`examples/typewind`](../examples/typewind/README.md) |
| Tokens               | `/docs/tokens`         | [`examples/design-system`](../examples/design-system/README.md)                                                             |
| Open Props           | `/docs/open-props`     | [`packages/open-props`](../packages/open-props/README.md)                                                                   |
| Fonts                | `/docs/fonts`          | [`examples/next-app`](../examples/next-app/README.md) · [`examples/vite-app`](../examples/vite-app/README.md)               |
| Keyframes            | `/docs/keyframes`      | [`examples/design-system`](../examples/design-system/README.md) (`designMotion`)                                            |
| Color Helpers        | `/docs/color`          | [`packages/typestyles`](../packages/typestyles/README.md) (`typestyles/color`)                                              |

### Advanced Features

| Doc page                    | Route                    | Example / source                                                                                                                                                                                                                        |
| --------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-Side Rendering       | `/docs/ssr`              | [`examples/next-app`](../examples/next-app/README.md)                                                                                                                                                                                   |
| Zero-runtime extraction     | `/docs/zero-runtime`     | [`examples/vite-app`](../examples/vite-app/README.md) · [`examples/next-app`](../examples/next-app/README.md) · [`examples/esbuild-app`](../examples/esbuild-app/README.md) · [`examples/rollup-app`](../examples/rollup-app/README.md) |
| Vite Plugin                 | `/docs/vite-plugin`      | [`examples/vite-app`](../examples/vite-app/README.md) · [`examples/vue-app`](../examples/vue-app/README.md) · [`examples/svelte-app`](../examples/svelte-app/README.md) · [`examples/typewind`](../examples/typewind/README.md)         |
| Class naming                | `/docs/class-naming`     | [`examples/react-design-system`](../examples/react-design-system/README.md) vs [`examples/typewind`](../examples/typewind/README.md)                                                                                                    |
| Cascade layers              | `/docs/cascade-layers`   | [`examples/design-system`](../examples/design-system/README.md) · [`examples/vite-app/src/site-styles.ts`](../examples/vite-app/src/site-styles.ts)                                                                                     |
| Custom selectors & at-rules | `/docs/custom-at-rules`  | [`examples/design-system`](../examples/design-system/README.md)                                                                                                                                                                         |
| Theming patterns            | `/docs/theming-patterns` | [`examples/design-system`](../examples/design-system/README.md) · [`examples/vite-app`](../examples/vite-app/README.md) (Sunset override) · docs [`src/tokens.ts`](./src/tokens.ts)                                                     |

### Guides

| Doc page        | Route                   | Example / source                                                                                                                                   |
| --------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration       | `/docs/migration`       | [`packages/migrate`](../packages/migrate/README.md)                                                                                                |
| Best practices  | `/docs/best-practices`  | [`examples/vite-app`](../examples/vite-app/README.md) · [`examples/next-app`](../examples/next-app/README.md)                                      |
| Testing         | `/docs/testing`         | Example `scripts/verify-build.mjs` files · [`examples/next-app/scripts/verify-typestyles.mts`](../examples/next-app/scripts/verify-typestyles.mts) |
| Performance     | `/docs/performance`     | [`examples/parcel-app`](../examples/parcel-app/README.md) (runtime) vs [`examples/vite-app`](../examples/vite-app/README.md) (extraction)          |
| TypeScript tips | `/docs/typescript-tips` | All TypeScript examples under [`examples/`](../examples/README.md)                                                                                 |
| Troubleshooting | `/docs/troubleshooting` | Framework-specific example READMEs linked above                                                                                                    |

### Examples (doc category)

| Doc page           | Route                      | Example / source                                                                                                  |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| React Integration  | `/docs/react-integration`  | [`examples/vite-app`](../examples/vite-app/README.md) · [`examples/next-app`](../examples/next-app/README.md)     |
| Component Library  | `/docs/component-library`  | [`examples/react-design-system`](../examples/react-design-system/README.md)                                       |
| Design System      | `/docs/design-system`      | [`examples/design-system`](../examples/design-system/README.md) · kitchen sink `/docs/design-system/kitchen-sink` |
| Animation Patterns | `/docs/animation-patterns` | [`examples/design-system`](../examples/design-system/README.md) (`designMotion`, keyframes)                       |

### Docs-only surfaces

| Surface            | Route              | Source                                                                              |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------- |
| Documentation site | `/`                | This package — [`docs/README.md`](./README.md)                                      |
| Live demos         | embedded in guides | [`src/demos/registry.ts`](./src/demos/registry.ts)                                  |
| Changelog          | `/docs/changelog`  | Package `CHANGELOG.md` files via [`src/lib/changelogs.ts`](./src/lib/changelogs.ts) |

When you add a doc page that describes runnable code, add a row here and link the guide markdown to the example README (see **Contributing** below).

## Contributing

1. Match existing markdown tone and frontmatter.
2. Prefer live demos over static screenshots for typestyles behavior.
3. Run `pnpm lint` in `docs/` before opening a PR.
4. Verify code samples against a running example app when possible — use the [doc ↔ example map](#doc-pages-and-runnable-examples) above.
5. When a guide describes integration steps, add a **Runnable example** link in the markdown to the matching [`examples/*/README.md`](../examples/README.md) (see `getting-started.md` and `zero-runtime.md` for patterns).
6. New example apps: follow [`examples/README.md` — Contributing to examples](../examples/README.md#contributing-to-examples) and add a row to the map in this file.

## Deployment

Static output from `pnpm build` — deploy `docs/dist/` to any static host (CDN, Netlify, GitHub Pages, etc.).
