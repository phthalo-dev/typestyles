# @typestyles/esbuild

## 0.6.1

### Patch Changes

- Updated dependencies [[`e861e27`](https://github.com/phthalo-dev/typestyles/commit/e861e27e8e5b8b5e166d3388273b2fc1ed18a364), [`e861e27`](https://github.com/phthalo-dev/typestyles/commit/e861e27e8e5b8b5e166d3388273b2fc1ed18a364)]:
  - @typestyles/build-runner@0.8.1

## 0.6.0

### Minor Changes

- [#310](https://github.com/phthalo-dev/typestyles/pull/310) [`ad6fe59`](https://github.com/phthalo-dev/typestyles/commit/ad6fe5902ed697fce791f9e701619bfe7a40ed18) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add an experimental compile-time transform (`compile: true`) for zero-runtime client bundles.
  
  Extraction now records a small JSON plan per `recipe()` — base classes, slots, dimensions and defaults, i.e. everything a call needs — in the same Node run that produces the CSS (`runTypestylesExtract` returns `{ css, plans }`; `runTypestylesBuild` is unchanged). With `compile: true`, the Vite, Rollup, esbuild (and Bun), and webpack (and Rspack) integrations replace `recipe({ name, ... })` definitions in client bundles with `createAttrsRecipeFromPlan(<plan>)` from the new `typestyles/lite` entry (under 1 KB gzipped), and mark calls of style factories imported from `typestyles` (`createTypeStyles`, `createStyles`, `createTokens`, `createGlobal`) as pure. The style configs, token tables and CSS machinery they referenced then tree-shake away. Class names, `data-*` attributes and the emitted CSS are unchanged.
  
  Plans cover attribute-mode dimensioned and slot recipes, flat and multi-slot recipes, and the class-name modes (`semantic`, `bem`, `template`, `hashed`, `compact`, `atomic`) for dimensioned recipes (with compound variants) plus slot recipes in `semantic`/`bem`/`template`. Parity with the real runtime is tested across a grid of selections. Calls that can't be planned (non-literal names, spreads in the recipe config, a name used in more than one scope, themes/tokens whose results are read at runtime, recipes in unsupported shapes) keep the runtime, and the Vite and Rollup integrations warn when a substantial part of it remains.
  
  On var-ui's bundle fixtures this removes about 80–105 KB of minified JS (button-only 312.7 → 230.2 KB, form-kit 457.9 → 367.3 KB, date-kit 512.9 → 421.7 KB).
  
  `@typestyles/vite` returns two plugins when `compile: true` (the transform must run after Vite's own TypeScript transform); otherwise it still returns a single plugin. Rewritten modules keep accurate source maps, still go through duplicate-namespace checks, and are re-transformed in watch mode and with webpack's cache so plans never go stale. Plans are only recorded while extraction runs (`getClientPlans()` is empty in normal runtime builds), and extraction now returns its result through a temp file, so style modules that log to stdout no longer affect it. `@typestyles/build-runner` gains the shared transform (`transformRecipeCalls`, `indexPlans`, …) and `acorn`, `magic-string` and `@jridgewell/remapping` dependencies.

- [#307](https://github.com/phthalo-dev/typestyles/pull/307) [`429d477`](https://github.com/phthalo-dev/typestyles/commit/429d477d70af39c3a28401ed4c883808ded6e433) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Zero-runtime client builds now ship no CSS insertion runtime — for every typestyles entry point.
  
  `typestyles` publishes its stylesheet module (`dist/sheet.js`) next to a no-op sibling (`dist/sheet-noop.js`) that exports the same API but does nothing. Every other module reaches the sheet through that one file, so in `mode: 'build'` the bundler integrations just redirect it in client bundles. The stylesheet state, CSSOM/DOM plumbing, insertion registry and dev-time collision bookkeeping never enter the module graph, while class names and data attributes are computed identically.
  
  - One module graph, one registry: `typestyles`, `typestyles/css`, `typestyles/color`, … are all covered, with nothing to import differently and no specifier rewriting.
  - `@typestyles/vite` (and `@typestyles/astro`) and `@typestyles/rollup`: `resolveId` hook (client builds only for Vite). `@typestyles/esbuild`: `onResolve` hook (skipped for `platform: 'node'`). `@typestyles/webpack` and `@typestyles/next/build`: module-factory hook (non-node targets / client bundles only; server bundles keep the real runtime for SSR collection).
  - `mode: 'runtime'` / `'hybrid'`, development builds, and server/SSR/node builds keep the full runtime.
  - Vite, Rollup and webpack warn at build time if the real sheet still ends up in a zero-runtime client bundle.
  - Development diagnostics (namespace/class-name collision tracking) are gated behind the sheet, so they are absent from zero-runtime bundles.
  - `@typestyles/build-runner` exports `toZeroRuntimeSheetId`, `isSheetRequest`, `findRealSheetModules`, `zeroRuntimeLeakMessage` and `ZeroRuntimeSheetWebpackPlugin` for custom integrations.
  - The package also declares a conservative `sideEffects` allowlist (`hmr`, `server`, `build`, `testing`).

### Patch Changes

- Updated dependencies [[`ad6fe59`](https://github.com/phthalo-dev/typestyles/commit/ad6fe5902ed697fce791f9e701619bfe7a40ed18), [`429d477`](https://github.com/phthalo-dev/typestyles/commit/429d477d70af39c3a28401ed4c883808ded6e433)]:
  - @typestyles/build-runner@0.8.0

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

- [#97](https://github.com/type-styles/typestyles/pull/97) [`468375c`](https://github.com/type-styles/typestyles/commit/468375cbf9524059e6749f6a48513495c41a9376) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add shared convention entry discovery across Rollup, esbuild, and webpack plugins; ship `@typestyles/esbuild` and `@typestyles/webpack`; extend discovery to `.js` entry files; add Vue, Svelte, esbuild, and Parcel examples with build verification.

### Patch Changes

- Updated dependencies [[`468375c`](https://github.com/type-styles/typestyles/commit/468375cbf9524059e6749f6a48513495c41a9376), [`e17b8a0`](https://github.com/type-styles/typestyles/commit/e17b8a06d0a54ed3f6f0907fe84beb3d4fd03989), [`f5b9c6d`](https://github.com/type-styles/typestyles/commit/f5b9c6d079a638e5d62c21746f12b0a2e53e29a2)]:
  - @typestyles/build-runner@0.5.0
