# Documentation Structure

Published pages live under `content/docs/` and appear in the sidebar via `src/navigation.ts`.
Internal research notes live under `research/` and are not built or indexed.

## How pages are rendered

- `src/navigation.ts` is the single source for the sidebar order. `src/lib/kitNav.ts` maps it to the Var UI docs
  kit (`@var-ui/docs`): top nav, sidebar sections and the search palette items.
- Every guide is built by `src/pages/docs/[slug].astro`: markdown goes through `getDocBySlug` (`src/lib/docs.ts`,
  marked + kit code blocks + install tabs + live-demo markers) and renders inside `src/layouts/KitDocsLayout.astro`,
  which wraps the kit's `DocsPage` (top bar, sidebar, TOC, search, appearance menu, mobile menu).
- The same pipeline produces the `.md` views, `llms.txt` / `llms-full.txt`, the search and docs indexes and the MCP
  content. `pnpm verify` runs `vp run -F docs parity:ci`, which fails only when a URL in `specs/baseline/` is
  missing from the build; the strict check (`vp run -F docs parity`, content hashes) is a manual migration tool.
  See "Output parity baseline" in `docs/README.md`.
- Non-guide pages: home (`src/pages/index.astro`, kit `DocsMarketingPage`), `/playground`
  (`src/layouts/PlaygroundLayout.astro`), changelogs (`src/pages/docs/changelog/`), and the kitchen sink of Var UI
  components (`src/pages/docs/design-system/kitchen-sink.astro`).
- Var UI packages are pinned to exact versions and bumped together with `typestyles`; see
  [README — Var UI version pin policy](./README.md#var-ui-version-pin-policy).

## Getting Started

- getting-started.md
- framework-comparison.md
- api-reference.md

## Core Concepts

- styles.md
- components.md
- compose.md
- atomic-css.md
- tokens.md
- open-props.md
- fonts.md
- keyframes.md
- color.md

## Advanced Features

- ssr.md
- zero-runtime.md
- vite-plugin.md
- class-naming.md
- cascade-layers.md
- custom-at-rules.md
- theming-end-to-end.md
- theming-patterns.md

## Guides

- migration.md
- style-dictionary.md
- best-practices.md
- testing.md
- performance.md
- typescript-tips.md
- troubleshooting.md

## Examples

- react-integration.md
- component-library.md
- design-system.md
- animation-patterns.md

## Research (not published)

- research/css-selector-patterns.md
