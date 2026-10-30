# @typestyles/next

## 0.5.9

### Patch Changes

- Updated dependencies [[`6b862ab`](https://github.com/phthalo-dev/typestyles/commit/6b862abfe2a326997d5d99808174a7fe5acb6c14), [`1266ee6`](https://github.com/phthalo-dev/typestyles/commit/1266ee608f50dd812b863f41c310e8794e5bee16)]:
  - @typestyles/build-runner@0.7.0

## 0.5.8

### Patch Changes

- Updated dependencies [[`c894838`](https://github.com/phthalo-dev/typestyles/commit/c894838f62e1bd2f66a68149f67bc811eb060388)]:
  - @typestyles/build-runner@0.6.4

## 0.5.7

### Patch Changes

- [#287](https://github.com/phthalo-dev/typestyles/pull/287) [`7979a45`](https://github.com/phthalo-dev/typestyles/commit/7979a45cf72a141f011bebb5f63d053be46f7fe9) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Build with tsdown (via Vite+) instead of tsup. Public exports and types are unchanged; the output no longer includes JSDoc comments, and `@typestyles/next` now shares code between its entry points instead of duplicating it.

- Updated dependencies [[`7979a45`](https://github.com/phthalo-dev/typestyles/commit/7979a45cf72a141f011bebb5f63d053be46f7fe9)]:
  - @typestyles/build-runner@0.6.3

## 0.5.6

### Patch Changes

- [#282](https://github.com/phthalo-dev/typestyles/pull/282) [`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Point the repository metadata at the phthalo-dev GitHub organization.

- Updated dependencies [[`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30)]:
  - @typestyles/build-runner@0.6.2

## 0.5.5

### Patch Changes

- Updated dependencies [[`31872bc`](https://github.com/type-styles/typestyles/commit/31872bc1ed7b284c36534d8fcc2b2f6c5f6c14e0)]:
  - @typestyles/build-runner@0.6.1

## 0.5.4

### Patch Changes

- [#251](https://github.com/type-styles/typestyles/pull/251) [`35afeef`](https://github.com/type-styles/typestyles/commit/35afeef56754392e8583cb71382bd36f63507027) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Public API redesign: `createTypeStyles` returns a flat `{ style, hash, recipe, tokens, global, … }` surface; nested `layers: { order, token, style, global? }`; `global.rule` / `global.rules`; remove root `styles` / `tokens` / `global` singletons. Migrate codemod emits `style` / `recipe` via `createTypeStyles`. Cache-bust extract module imports so Next route CSS re-runs register styles.

- Updated dependencies [[`35afeef`](https://github.com/type-styles/typestyles/commit/35afeef56754392e8583cb71382bd36f63507027)]:
  - @typestyles/build-runner@0.6.0

## 0.5.3

### Patch Changes

- Updated dependencies [[`cf3f66c`](https://github.com/type-styles/typestyles/commit/cf3f66c93e9b9dfc92444f5f764b8d9e3609a2c1)]:
  - @typestyles/build-runner@0.5.3

## 0.5.2

### Patch Changes

- Updated dependencies [[`41155b0`](https://github.com/type-styles/typestyles/commit/41155b02b38961c2ea158ab1e6f2b8fbe7a36d9e)]:
  - @typestyles/build-runner@0.5.2

## 0.5.1

### Patch Changes

- Updated dependencies [[`de79e3a`](https://github.com/type-styles/typestyles/commit/de79e3a17eb1765b5a1349bf08b7b7f7ca486838)]:
  - @typestyles/build-runner@0.5.1

## 0.5.0

### Minor Changes

- [#100](https://github.com/type-styles/typestyles/pull/100) [`f5b9c6d`](https://github.com/type-styles/typestyles/commit/f5b9c6d079a638e5d62c21746f12b0a2e53e29a2) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Per-route critical CSS for Next.js App Router (P2.15): `buildTypestylesForNext` emits route-scoped stylesheets and manifest v2 with a `routes` map; `getRouteCss` reads them at request time instead of the full `getRegisteredCss()` buffer.

### Patch Changes

- Updated dependencies [[`468375c`](https://github.com/type-styles/typestyles/commit/468375cbf9524059e6749f6a48513495c41a9376), [`e17b8a0`](https://github.com/type-styles/typestyles/commit/e17b8a06d0a54ed3f6f0907fe84beb3d4fd03989), [`f5b9c6d`](https://github.com/type-styles/typestyles/commit/f5b9c6d079a638e5d62c21746f12b0a2e53e29a2)]:
  - @typestyles/build-runner@0.5.0

## 0.4.0

### Minor Changes

- [#75](https://github.com/type-styles/typestyles/pull/75) [`8bf64b0`](https://github.com/type-styles/typestyles/commit/8bf64b0f3f7da26a4dd91ce4ef5fcca5fea0cb4b) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add shared convention entry discovery: `discoverDefaultExtractModules` and `DEFAULT_EXTRACT_MODULE_CANDIDATES` (including `styles/typestyles-entry.ts` and `styles/typestyles.ts` after the `src/…` paths).

  **@typestyles/vite** re-exports these from `@typestyles/build-runner` and resolves optional `extract.modules` using the same list.

  **@typestyles/next** depends on `@typestyles/build-runner`, aligns `buildTypestylesForNext` with that discovery, defaults `cssOutFile` to `app/typestyles.css` and manifest output unless overridden, adds `withTypestyles` for production config when a convention file exists, and re-exports the discovery helpers.

  `withTypestyles` now passes `root` through to extraction internals so webpack resolution uses the same project root as convention discovery.

  **Breaking (Next):** `BuildTypestylesForNextOptions` no longer requires `modules` or `cssOutFile`; pass them explicitly when you need non-default behavior.

### Patch Changes

- [#86](https://github.com/type-styles/typestyles/pull/86) [`fd16bad`](https://github.com/type-styles/typestyles/commit/fd16bad633315ba34ba352e6c3b63c167af41196) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix silent-wrong-output correctness issues (P0.1): refresh the unitless CSS property set, prefix `scopeId` onto semantic class names, add dev-mode class-name collision warnings, and wire `useTypestyles` to `subscribeRegisteredCss` via `useSyncExternalStore`.

- [#87](https://github.com/type-styles/typestyles/pull/87) [`ffeb2ef`](https://github.com/type-styles/typestyles/commit/ffeb2ef6a8a4c4f523c115a47435e6ec1c2c8b0f) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Credibility sweep (P0.2): fix docs site GitHub org links, correct landing page samples, unify package licenses to Apache-2.0, remove broken `@typestyles/open-props/css` export and unused `open-props` dependency.

- [#75](https://github.com/type-styles/typestyles/pull/75) [`8bf64b0`](https://github.com/type-styles/typestyles/commit/8bf64b0f3f7da26a4dd91ce4ef5fcca5fea0cb4b) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Ensure `withTypestyles({ root })` uses the same `root` for downstream webpack module resolution as it does for convention discovery.

- [#92](https://github.com/type-styles/typestyles/pull/92) [`d8149d6`](https://github.com/type-styles/typestyles/commit/d8149d6ebee682eed0aff6917c0cf8be8b027d89) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `verifyTypestylesBuild()` to `@typestyles/build-runner` for CI checks that extracted CSS and optional manifest exist and contain expected output. Re-export from `@typestyles/next/build` and document on the zero-runtime page.

- Updated dependencies [[`8bf64b0`](https://github.com/type-styles/typestyles/commit/8bf64b0f3f7da26a4dd91ce4ef5fcca5fea0cb4b), [`d8149d6`](https://github.com/type-styles/typestyles/commit/d8149d6ebee682eed0aff6917c0cf8be8b027d89)]:
  - @typestyles/build-runner@0.4.0

## 0.3.0

### Minor Changes

- [#49](https://github.com/type-styles/typestyles/pull/49): Add ESLint configuration across all packages, examples, and docs. Create shared `eslint.base.js` config with TypeScript rules and add lint scripts to all package.json files. Update CI workflow to run lint via turbo.

### Patch Changes

- [#73](https://github.com/type-styles/typestyles/pull/73): **typestyles:** Extend `global.fontFace` / `FontFaceProps`: `src` may be a string or an array of fragments (joined into one CSS `src`); optional `@font-face` descriptors `sizeAdjust`, `ascentOverride`, `descentOverride`, and `lineGapOverride`; dedupe keys use normalized `src` (including array vs equivalent comma-separated string). Export `FontFaceSrc`. When the same rule dedupe key is registered again with different CSS, the later rule is skipped and non-production builds warn on the mismatch (re-registration with identical CSS stays silent). Tests cover multi-`src` font faces, metric overrides, and global dedupe warnings.

  **@typestyles/next:** README examples use `styles.component` and default variant calls; add **Fonts and local files** guidance for Next extraction (`public/fonts/`, root-relative URLs) versus Vite asset URLs.

- [#34](https://github.com/type-styles/typestyles/pull/34): `withTypestylesExtract` now sets `NEXT_PUBLIC_TYPESTYLES_RUNTIME_DISABLED` via `next.config` `env` so client bundles disable runtime style injection under **Turbopack** as well as webpack (webpack `DefinePlugin` alone does not run for Turbopack). Core `sheet` reads this env flag alongside `__TYPESTYLES_RUNTIME_DISABLED__`.

  README: build-time CSS / Turbopack notes; clarify `getTypestylesMetadata` and fix the previous `generateMetadata` example. Add `@typestyles/next` tests for `withTypestylesExtract`.

  TypeScript: module augmentation + `client.d.ts` declaration for `useServerInsertedHTML` (aligned `@types/react` / `@types/react-dom`); add `typecheck` script; restore `webpack` + `typestyles` devDependencies and `server.d.ts` / `./build` exports. `buildTypestylesForNext` now uses `collectStylesFromModules` from `typestyles/build` (no separate `@typestyles/build` package).

- [#50](https://github.com/type-styles/typestyles/pull/50): Add lint-staged for prettier formatting on pre-commit hook and format entire codebase
- [#60](https://github.com/type-styles/typestyles/pull/60): **@typestyles/vite:** When `extract.modules` is set and `mode` is omitted, default `mode` is now `'build'`: `vite dev` keeps runtime injection and HMR; `vite build` emits the CSS asset and disables client injection (same as explicit `mode: 'build'`). Pass `mode: 'runtime'` to keep the previous “extract config present but runtime-only” behavior. Vitest: plugin tests extended; runtime/build parity moved to `build-parity.test.ts` with `skipIf` when `build-runner` dist is missing.

  **@typestyles/next:** README documents applying `withTypestylesExtract` only in production so development keeps client runtime injection.

  Docs (`vite-plugin`, `zero-runtime`, `getting-started`) and `roadmap.md` describe dev-runtime / prod-extraction; `examples/vite-app`, `examples/typewind`, and `examples/next-app` (`next.config.mjs`) follow the recommended wiring.

## 0.2.0

### Minor Changes

- [#15](https://github.com/type-styles/typestyles/pull/15): Add @typestyles/next package for Next.js SSR integration
- [#17](https://github.com/type-styles/typestyles/pull/17): Fix changesets dep bump
