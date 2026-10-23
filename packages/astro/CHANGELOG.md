# @typestyles/astro

## 0.3.10

### Patch Changes

- [#287](https://github.com/phthalo-dev/typestyles/pull/287) [`7979a45`](https://github.com/phthalo-dev/typestyles/commit/7979a45cf72a141f011bebb5f63d053be46f7fe9) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Build with tsdown (via Vite+) instead of tsup. Public exports and types are unchanged; the output no longer includes JSDoc comments, and `@typestyles/next` now shares code between its entry points instead of duplicating it.

- Updated dependencies [[`7979a45`](https://github.com/phthalo-dev/typestyles/commit/7979a45cf72a141f011bebb5f63d053be46f7fe9)]:
  - @typestyles/vite@0.5.3

## 0.3.9

### Patch Changes

- [#282](https://github.com/phthalo-dev/typestyles/pull/282) [`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Point the repository metadata at the phthalo-dev GitHub organization.

- Updated dependencies [[`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30)]:
  - @typestyles/vite@0.5.2

## 0.3.8

### Patch Changes

- Updated dependencies []:
  - @typestyles/vite@0.5.1

## 0.3.7

### Patch Changes

- Updated dependencies [[`35afeef`](https://github.com/type-styles/typestyles/commit/35afeef56754392e8583cb71382bd36f63507027)]:
  - @typestyles/vite@0.5.0

## 0.3.6

### Patch Changes

- Updated dependencies []:
  - @typestyles/vite@0.4.5

## 0.3.5

### Patch Changes

- Updated dependencies [[`f68e5ab`](https://github.com/type-styles/typestyles/commit/f68e5ab6a67541ca90c9855143194b79cb743622)]:
  - @typestyles/vite@0.4.4

## 0.3.4

### Patch Changes

- Updated dependencies []:
  - @typestyles/vite@0.4.3

## 0.3.3

### Patch Changes

- Updated dependencies []:
  - @typestyles/vite@0.4.2

## 0.3.2

### Patch Changes

- [#98](https://github.com/type-styles/typestyles/pull/98) [`e17b8a0`](https://github.com/type-styles/typestyles/commit/e17b8a06d0a54ed3f6f0907fe84beb3d4fd03989) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add npm landing-page READMEs for every published package, an examples index with contributor guidance, and doc-to-example cross-links (P2.13).

- Updated dependencies [[`468375c`](https://github.com/type-styles/typestyles/commit/468375cbf9524059e6749f6a48513495c41a9376), [`e17b8a0`](https://github.com/type-styles/typestyles/commit/e17b8a06d0a54ed3f6f0907fe84beb3d4fd03989)]:
  - @typestyles/vite@0.4.1

## 0.3.1

### Patch Changes

- Updated dependencies [[`8bf64b0`](https://github.com/type-styles/typestyles/commit/8bf64b0f3f7da26a4dd91ce4ef5fcca5fea0cb4b), [`28a3f82`](https://github.com/type-styles/typestyles/commit/28a3f8233b473ee7420afb2b23564253f4221f73)]:
  - @typestyles/vite@0.4.0

## 0.3.0

### Minor Changes

- [#39](https://github.com/type-styles/typestyles/pull/39): Add **`@typestyles/astro`**, an Astro integration that registers the existing `@typestyles/vite` plugin for dev HMR and optional build-time CSS extraction (`mode` / `extract` options re-exported from the Vite plugin).

  Dogfood the integration on the docs site: Astro config, client entry for dev HMR, refreshed layout and docs components (code blocks, alerts, theme toggle, mobile sidebar), markdown code highlighting helpers, and shared design-system patterns in examples (`@examples/design-system`, React adapters). **Workspace-only** packages (`typestyles-docs`, examples) are unchanged on npm; root `package.json` / `turbo.json` updates are monorepo tooling only.

- [#49](https://github.com/type-styles/typestyles/pull/49): Add ESLint configuration across all packages, examples, and docs. Create shared `eslint.base.js` config with TypeScript rules and add lint scripts to all package.json files. Update CI workflow to run lint via turbo.

### Patch Changes

- [#50](https://github.com/type-styles/typestyles/pull/50): Add lint-staged for prettier formatting on pre-commit hook and format entire codebase
- Updated dependencies [[#49](https://github.com/type-styles/typestyles/pull/49)]
- Updated dependencies [[#50](https://github.com/type-styles/typestyles/pull/50)]
- Updated dependencies [[#54](https://github.com/type-styles/typestyles/pull/54)]
- Updated dependencies [[#60](https://github.com/type-styles/typestyles/pull/60)]
  - @typestyles/vite@0.3.0
