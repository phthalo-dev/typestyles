# TypeStyles documentation site

Astro site for [typestyles.dev](https://typestyles.dev) — markdown guides, live style demos, a playground, a kitchen sink of the components the site is built from, and package changelogs.

The site **dogfoods typestyles**: styles live in TypeScript and production builds extract static CSS via `@typestyles/astro`. The chrome (top bar, sidebar, TOC, search, appearance menu, mobile menu, code blocks) comes from the [Var UI](https://github.com/phthalo-dev/var-ui) docs kit (`@var-ui/docs`, `@var-ui/astro`, `@var-ui/core`), which is itself written with typestyles.

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
│   ├── pages/             # Astro routes (home, docs, changelog, playground, kitchen sink)
│   ├── layouts/           # KitDocsLayout (docs pages), PlaygroundLayout
│   ├── components/        # KitSiteHead, LiveDemo, Code, DocAiActions, PageFooter, …
│   ├── demos/             # Live demo modules + registry
│   ├── styles/            # Site typestyles (doc page, home, live demo, playground)
│   ├── lib/               # Markdown pipeline, kitNav, search/MCP/llms outputs, highlighting
│   ├── scripts/           # Client scripts (install tabs, code-block copy, live demos, AI actions)
│   ├── atoms.ts           # @typestyles/props utilities (atomic CSS guide)
│   ├── typestyles-entry.ts  # Extraction entry — import all registrations here
│   └── navigation.ts      # Sidebar structure (source of truth for the kit sidebar)
├── astro.config.mjs       # @typestyles/astro + vite-tsconfig-paths
└── package.json
```

### Typestyles on this site

| Piece                     | Role                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `src/typestyles-entry.ts` | Side-effect imports for **`mode: 'build'`** extraction                                    |
| `astro.config.mjs`        | `@typestyles/astro({ mode: 'build', extract: { modules: ['src/typestyles-entry.ts'] } })` |
| `src/styles/`             | Page styles on `@var-ui/core` tokens (doc frame, home, live demo, playground)             |
| `src/demos/*.ts`          | Isolated demo styles extracted per-demo for `LiveDemo` previews                           |
| `@var-ui/core/styles`     | Kit component recipes and the default theme (imported by the entry)                       |
| `@var-ui/docs/styles`     | Kit docs chrome recipes, including the prose used for markdown bodies (`docProseRoot`)    |

Production CSS is emitted as `typestyles.css` and linked by the kit (`DocsPage`, `DocsMarketingPage`) or by
`PlaygroundLayout`. Demo previews can inject scoped CSS from individual demo modules (`previewCss` in the registry).

## Site shell (Var UI docs kit)

| Page                       | Shell                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `/docs/**`, changelog, 404 | `src/layouts/KitDocsLayout.astro` wraps `@var-ui/docs/DocsPage`                          |
| `/` (home)                 | `@var-ui/docs/DocsMarketingPage`                                                         |
| `/playground`              | `src/layouts/PlaygroundLayout.astro` composes `AppShell`, `DocsTopBar`, `DocsMobileMenu` |

- **Navigation:** `src/navigation.ts` stays the source of truth. `src/lib/kitNav.ts` maps it to the kit's top nav,
  sidebar sections and search items (`toKitTopNav`, `toKitSidebarSections`, `toKitSearchItems`).
- **Content:** pages still render markdown through `getDocBySlug` (`src/lib/docs.ts`), because the `.md` views,
  `llms.txt`, search index, MCP content, install tabs and live demos all consume that pipeline. Code blocks use the
  kit's code-block markup with the kit's Shiki design-token theme (`src/lib/shikiTokens.ts`).
- **Head:** `src/components/KitSiteHead.astro` adds canonical, markdown alternate and llms/MCP links to every page.
- **Kitchen sink:** `/docs/design-system/kitchen-sink` renders the Var UI components the site uses in one page; check
  it in light and dark mode after a Var UI bump.
- **Known kit gaps** and the workaround for each are listed in `specs/varui-docs-site-issues.md`.

## Var UI version pin policy

- `@var-ui/astro`, `@var-ui/core`, `@var-ui/docs` and `@var-ui/icons` are pinned to **exact** versions (no `^`) in
  `docs/package.json`, all on the same version.
- Bump them **together with `typestyles`**: Var UI is built on typestyles, so a typestyles release and the Var UI
  release that supports it move as a pair. If Var UI has not caught up with a new typestyles version yet, leave the
  Var UI pins where they are (the docs keep building against the workspace `typestyles`) and bump them once Var UI
  ships a release that supports it.
- There must be exactly one `typestyles` in the install. `pnpm-workspace.yaml` overrides `@var-ui/core>typestyles`
  and `@var-ui/astro>typestyles` to the workspace copy, and `pnpm check:single-typestyles` (part of `pnpm verify`)
  fails if a second copy appears.
- The overrides also stop pnpm from warning when `typestyles` leaves the range Var UI declares, so the same check
  prints a prominent **warning** (package, declared range, workspace version) when the workspace `typestyles`
  version does not satisfy the `typestyles` range of a pinned `@var-ui/*` package. It does not fail `pnpm verify`:
  the `chore: version packages` PR that moves typestyles to the next 0.x minor must stay releasable, or Var UI could
  never ship a compatible version. **The docs build is the gate**: if the kit is really incompatible, the build in
  `pnpm verify` breaks. Run `node scripts/check-single-typestyles.ts --strict-ranges` to make a mismatch fail.
- After a bump: `pnpm install`, `pnpm verify` (docs build, CI parity and the typestyles range check), then look at the kitchen sink in both colour modes.

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

`specs/baseline/` records the docs output contract: URL list, heading ids, `llms.txt`, and content hashes of the
`.md` views, `llms-full.txt`, the docs/search indexes, sitemaps and `.well-known/mcp.json`
(`docs/scripts/capture-baseline.mts`, comparison in `src/lib/parity.ts`). Changelog views (`/docs/changelog/**`,
generated from every `CHANGELOG.md`) and `/mcp-content.json` (which embeds the changelogs) are never hashed, so
release PRs do not touch it. There are two checks, both reading an existing build (`vp run -F "docs..." build`):

- **CI mode**, `vp run -F docs parity:ci`, part of `pnpm verify` (`vp run ci`). Fails only when a URL from the
  baseline is missing from the build: a deleted or renamed page breaks inbound links. New pages, doc content edits
  and release PRs pass without a rebaseline; lost heading ids are printed as warnings. If you remove or rename a
  page on purpose, add a redirect, then run `vp run -F docs parity:update` and commit `specs/baseline/`.
- **Strict mode**, `vp run -F docs parity`, run by hand for migrations (shell or pipeline rewrites that must not
  change any output): URL lists must match exactly, no heading id may disappear, and `llms.txt` and every hashed
  output must be unchanged. HTML markup and CSS are not hashed. To use it, run `vp run -F docs parity:update` on the
  base branch build first (or check that the committed baseline is current), then build the migration and run
  `vp run -F docs parity`.

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
| `@typestyles/props`        | Atomic utilities (`src/atoms.ts`)                 |
| `@typestyles/build-runner` | Demo CSS extraction in Node (`collectDemoCss.ts`) |
| `@var-ui/docs`             | Docs shell, prose, code-block and Shiki theme     |
| `@var-ui/astro`            | Astro components (Button, Menu, Tabs, …)          |
| `@var-ui/core`             | Tokens, recipes, default theme                    |
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
| Theming patterns            | `/docs/theming-patterns` | [`examples/design-system`](../examples/design-system/README.md) · [`examples/vite-app`](../examples/vite-app/README.md) (Sunset override)                                                                                               |

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

| Doc page           | Route                      | Example / source                                                                                              |
| ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| React Integration  | `/docs/react-integration`  | [`examples/vite-app`](../examples/vite-app/README.md) · [`examples/next-app`](../examples/next-app/README.md) |
| Component Library  | `/docs/component-library`  | [`examples/react-design-system`](../examples/react-design-system/README.md)                                   |
| Design System      | `/docs/design-system`      | [`examples/design-system`](../examples/design-system/README.md)                                               |
| Animation Patterns | `/docs/animation-patterns` | [`examples/design-system`](../examples/design-system/README.md) (`designMotion`, keyframes)                   |

### Docs-only surfaces

| Surface            | Route                              | Source                                                                                                                                      |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation site | `/`                                | This package — [`docs/README.md`](./README.md)                                                                                              |
| Live demos         | embedded in guides                 | [`src/demos/registry.ts`](./src/demos/registry.ts)                                                                                          |
| Changelog          | `/docs/changelog`                  | Package `CHANGELOG.md` files via [`src/lib/changelogs.ts`](./src/lib/changelogs.ts)                                                         |
| Kitchen sink       | `/docs/design-system/kitchen-sink` | Var UI components used by the site ([`src/pages/docs/design-system/kitchen-sink.astro`](./src/pages/docs/design-system/kitchen-sink.astro)) |

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
