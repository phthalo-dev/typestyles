# @typestyles/vite

## 0.5.4

### Patch Changes

- [#297](https://github.com/phthalo-dev/typestyles/pull/297) [`c894838`](https://github.com/phthalo-dev/typestyles/commit/c894838f62e1bd2f66a68149f67bc811eb060388) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fail `vite build` when a local module reachable from the app calls `recipe()` and is missing from the extract entry. Set `coverage: false` to extract a subset on purpose.
- Updated dependencies [[`c894838`](https://github.com/phthalo-dev/typestyles/commit/c894838f62e1bd2f66a68149f67bc811eb060388)]:
  - @typestyles/build-runner@0.6.4

## 0.5.3

### Patch Changes

- [#287](https://github.com/phthalo-dev/typestyles/pull/287) [`7979a45`](https://github.com/phthalo-dev/typestyles/commit/7979a45cf72a141f011bebb5f63d053be46f7fe9) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Build with tsdown (via Vite+) instead of tsup. Public exports and types are unchanged; the output no longer includes JSDoc comments, and `@typestyles/next` now shares code between its entry points instead of duplicating it.

- Updated dependencies [[`7979a45`](https://github.com/phthalo-dev/typestyles/commit/7979a45cf72a141f011bebb5f63d053be46f7fe9)]:
  - @typestyles/build-runner@0.6.3

## 0.5.2

### Patch Changes

- [#282](https://github.com/phthalo-dev/typestyles/pull/282) [`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Point the repository metadata at the phthalo-dev GitHub organization.

- Updated dependencies [[`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30)]:
  - @typestyles/build-runner@0.6.2

## 0.5.1

### Patch Changes

- Updated dependencies [[`31872bc`](https://github.com/type-styles/typestyles/commit/31872bc1ed7b284c36534d8fcc2b2f6c5f6c14e0)]:
  - @typestyles/build-runner@0.6.1

## 0.5.0

### Minor Changes

- [#251](https://github.com/type-styles/typestyles/pull/251) [`35afeef`](https://github.com/type-styles/typestyles/commit/35afeef56754392e8583cb71382bd36f63507027) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Public API redesign: `createTypeStyles` returns a flat `{ style, hash, recipe, tokens, global, … }` surface; nested `layers: { order, token, style, global? }`; `global.rule` / `global.rules`; remove root `styles` / `tokens` / `global` singletons. Migrate codemod emits `style` / `recipe` via `createTypeStyles`. Cache-bust extract module imports so Next route CSS re-runs register styles.

### Patch Changes

- Updated dependencies [[`35afeef`](https://github.com/type-styles/typestyles/commit/35afeef56754392e8583cb71382bd36f63507027)]:
  - @typestyles/build-runner@0.6.0

## 0.4.5

### Patch Changes

- Updated dependencies [[`cf3f66c`](https://github.com/type-styles/typestyles/commit/cf3f66c93e9b9dfc92444f5f764b8d9e3609a2c1)]:
  - @typestyles/build-runner@0.5.3

## 0.4.4

### Patch Changes

- [#139](https://github.com/type-styles/typestyles/pull/139) [`f68e5ab`](https://github.com/type-styles/typestyles/commit/f68e5ab6a67541ca90c9855143194b79cb743622) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Auto-inject `<link rel="stylesheet">` for extracted `typestyles.css` into HTML entry points during dev and build, fixing silent unstyled production builds when the manual link step is skipped ([#133](https://github.com/type-styles/typestyles/issues/133)).

- Updated dependencies []:
  - @typestyles/build-runner@0.5.2

## 0.4.3

### Patch Changes

- Updated dependencies [[`41155b0`](https://github.com/type-styles/typestyles/commit/41155b02b38961c2ea158ab1e6f2b8fbe7a36d9e)]:
  - @typestyles/build-runner@0.5.2

## 0.4.2

### Patch Changes

- Updated dependencies [[`de79e3a`](https://github.com/type-styles/typestyles/commit/de79e3a17eb1765b5a1349bf08b7b7f7ca486838)]:
  - @typestyles/build-runner@0.5.1

## 0.4.1

### Patch Changes

- [#97](https://github.com/type-styles/typestyles/pull/97) [`468375c`](https://github.com/type-styles/typestyles/commit/468375cbf9524059e6749f6a48513495c41a9376) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add shared convention entry discovery across Rollup, esbuild, and webpack plugins; ship `@typestyles/esbuild` and `@typestyles/webpack`; extend discovery to `.js` entry files; add Vue, Svelte, esbuild, and Parcel examples with build verification.

- [#98](https://github.com/type-styles/typestyles/pull/98) [`e17b8a0`](https://github.com/type-styles/typestyles/commit/e17b8a06d0a54ed3f6f0907fe84beb3d4fd03989) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add npm landing-page READMEs for every published package, an examples index with contributor guidance, and doc-to-example cross-links (P2.13).

- Updated dependencies [[`468375c`](https://github.com/type-styles/typestyles/commit/468375cbf9524059e6749f6a48513495c41a9376), [`e17b8a0`](https://github.com/type-styles/typestyles/commit/e17b8a06d0a54ed3f6f0907fe84beb3d4fd03989), [`f5b9c6d`](https://github.com/type-styles/typestyles/commit/f5b9c6d079a638e5d62c21746f12b0a2e53e29a2)]:
  - @typestyles/build-runner@0.5.0

## 0.4.0

### Minor Changes

- [#75](https://github.com/type-styles/typestyles/pull/75) [`8bf64b0`](https://github.com/type-styles/typestyles/commit/8bf64b0f3f7da26a4dd91ce4ef5fcca5fea0cb4b) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add shared convention entry discovery: `discoverDefaultExtractModules` and `DEFAULT_EXTRACT_MODULE_CANDIDATES` (including `styles/typestyles-entry.ts` and `styles/typestyles.ts` after the `src/…` paths).

  **@typestyles/vite** re-exports these from `@typestyles/build-runner` and resolves optional `extract.modules` using the same list.

  **@typestyles/next** depends on `@typestyles/build-runner`, aligns `buildTypestylesForNext` with that discovery, defaults `cssOutFile` to `app/typestyles.css` and manifest output unless overridden, adds `withTypestyles` for production config when a convention file exists, and re-exports the discovery helpers.

  `withTypestyles` now passes `root` through to extraction internals so webpack resolution uses the same project root as convention discovery.

  **Breaking (Next):** `BuildTypestylesForNextOptions` no longer requires `modules` or `cssOutFile`; pass them explicitly when you need non-default behavior.

- [#77](https://github.com/type-styles/typestyles/pull/77) [`28a3f82`](https://github.com/type-styles/typestyles/commit/28a3f8233b473ee7420afb2b23564253f4221f73) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - **Breaking:** Duplicate logical `styles.component` / `styles.class` namespaces across different modules are now **build errors** (via `this.error`) instead of Rollup warnings, so overlapping registrations fail fast during `vite build` / Rollup.

  The `warnDuplicates` option still defaults to `true`; set `warnDuplicates: false` to skip the check. Namespace extraction now includes `styles.class('…')` calls so they participate in the same cross-module duplicate detection as `styles.component`.

### Patch Changes

- Updated dependencies [[`8bf64b0`](https://github.com/type-styles/typestyles/commit/8bf64b0f3f7da26a4dd91ce4ef5fcca5fea0cb4b), [`d8149d6`](https://github.com/type-styles/typestyles/commit/d8149d6ebee682eed0aff6917c0cf8be8b027d89)]:
  - @typestyles/build-runner@0.4.0

## 0.3.0

### Minor Changes

- [#49](https://github.com/type-styles/typestyles/pull/49): Add ESLint configuration across all packages, examples, and docs. Create shared `eslint.base.js` config with TypeScript rules and add lint scripts to all package.json files. Update CI workflow to run lint via turbo.
- [#60](https://github.com/type-styles/typestyles/pull/60): **@typestyles/vite:** When `extract.modules` is set and `mode` is omitted, default `mode` is now `'build'`: `vite dev` keeps runtime injection and HMR; `vite build` emits the CSS asset and disables client injection (same as explicit `mode: 'build'`). Pass `mode: 'runtime'` to keep the previous “extract config present but runtime-only” behavior. Vitest: plugin tests extended; runtime/build parity moved to `build-parity.test.ts` with `skipIf` when `build-runner` dist is missing.

  **@typestyles/next:** README documents applying `withTypestylesExtract` only in production so development keeps client runtime injection.

  Docs (`vite-plugin`, `zero-runtime`, `getting-started`) and `roadmap.md` describe dev-runtime / prod-extraction; `examples/vite-app`, `examples/typewind`, and `examples/next-app` (`next.config.mjs`) follow the recommended wiring.

### Patch Changes

- [#50](https://github.com/type-styles/typestyles/pull/50): Add lint-staged for prettier formatting on pre-commit hook and format entire codebase
- [#54](https://github.com/type-styles/typestyles/pull/54): Unify multi-variant styling on `styles.component` with a CVA-style return value: call it for a composed class string (base always applied) or destructure named class strings. Supports dimensioned variants (`variants`, `compoundVariants`, `defaultVariants`), flat variant maps, and slot-based configs.

  Remove `styles.create` from the public `styles` API; use `styles.component` instead.

  Update Vite and Rollup static namespace extraction to match `styles.component(...)` only (no longer scans `styles.create(...)`).

- Updated dependencies [[#49](https://github.com/type-styles/typestyles/pull/49)]
- Updated dependencies [[#50](https://github.com/type-styles/typestyles/pull/50)]
  - @typestyles/build-runner@0.3.0

## 0.2.0

### Minor Changes

- [#25](https://github.com/type-styles/typestyles/pull/25): Updating bundler integrations and adding examples

### Patch Changes

- Updated dependencies [[#25](https://github.com/type-styles/typestyles/pull/25)]
  - @typestyles/build-runner@0.2.0

## 0.1.1

### Patch Changes

- [#15](https://github.com/type-styles/typestyles/pull/15): Add additional test coverage for vite plugin

## 0.1.0

### Minor Changes

- [#4](https://github.com/type-styles/typestyles/pull/4): Add `styles.component()` API for multi-variant component styles with support for base styles, variant dimensions, compound variants, and default variants. Add `global.style()` and `global.fontFace()` APIs for applying styles to arbitrary CSS selectors and declaring `@font-face` rules. Update the Vite plugin to support HMR for the new APIs.

## 0.0.2

### Patch Changes

- [#1](https://github.com/type-styles/typestyles/pull/1): Initial release of typestyles - CSS-in-TypeScript that embraces CSS instead of hiding from it.

  Features:

  - Core typestyles library with type-safe CSS styling
  - Server-side rendering support
  - Vite plugin for HMR support
