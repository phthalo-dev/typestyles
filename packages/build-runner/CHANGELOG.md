# @typestyles/build-runner

## 0.8.0

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

## 0.7.0

### Minor Changes

- [#306](https://github.com/phthalo-dev/typestyles/pull/306) [`6b862ab`](https://github.com/phthalo-dev/typestyles/commit/6b862abfe2a326997d5d99808174a7fe5acb6c14) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add opt-in `extract.sourceComments` to precede each extracted CSS rule with a `/* path:line */` comment naming the `recipe()` / `style()` call that registered it. `@typestyles/vite` passes the option through to the extract; paths are relative to the project root. Runtime injection is unchanged because `insertRule` drops comments.

### Patch Changes

- [#300](https://github.com/phthalo-dev/typestyles/pull/300) [`1266ee6`](https://github.com/phthalo-dev/typestyles/commit/1266ee608f50dd812b863f41c310e8794e5bee16) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Emit Vite extracted CSS as a content-hashed asset by default so production deploys cannot pair new JavaScript with a cached `typestyles.css`. Dev still serves the stable `/typestyles.css` URL. Set `extract.fileName` to a literal path to opt out, or use `[hash]` placeholders for a custom name.
  
  `@typestyles/astro` keeps the stable `typestyles.css` name by default, because Astro pages do not pass through Vite's HTML rewrite.

## 0.6.4

### Patch Changes

- [#297](https://github.com/phthalo-dev/typestyles/pull/297) [`c894838`](https://github.com/phthalo-dev/typestyles/commit/c894838f62e1bd2f66a68149f67bc811eb060388) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fail `vite build` when a local module reachable from the app calls `recipe()` and is missing from the extract entry. Set `coverage: false` to extract a subset on purpose.

## 0.6.3

### Patch Changes

- [#287](https://github.com/phthalo-dev/typestyles/pull/287) [`7979a45`](https://github.com/phthalo-dev/typestyles/commit/7979a45cf72a141f011bebb5f63d053be46f7fe9) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Build with tsdown (via Vite+) instead of tsup. Public exports and types are unchanged; the output no longer includes JSDoc comments, and `@typestyles/next` now shares code between its entry points instead of duplicating it.

## 0.6.2

### Patch Changes

- [#282](https://github.com/phthalo-dev/typestyles/pull/282) [`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Point the repository metadata at the phthalo-dev GitHub organization.

## 0.6.1

### Patch Changes

- [#276](https://github.com/type-styles/typestyles/pull/276) [`31872bc`](https://github.com/type-styles/typestyles/commit/31872bc1ed7b284c36534d8fcc2b2f6c5f6c14e0) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Breaking: `recipe()` and `override()` take one object. Positional calls (`recipe(name, config)`, `recipe(name, definition, callback)`, and `override(component, config, options)`) are removed. Declare `slots`, variant axes, and `vars` on that object and put option styles in `styles`, which is checked against those fields. Every call returns `{ className, attrs, props }`.

## 0.6.0

### Minor Changes

- [#251](https://github.com/type-styles/typestyles/pull/251) [`35afeef`](https://github.com/type-styles/typestyles/commit/35afeef56754392e8583cb71382bd36f63507027) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Public API redesign: `createTypeStyles` returns a flat `{ style, hash, recipe, tokens, global, … }` surface; nested `layers: { order, token, style, global? }`; `global.rule` / `global.rules`; remove root `styles` / `tokens` / `global` singletons. Migrate codemod emits `style` / `recipe` via `createTypeStyles`. Cache-bust extract module imports so Next route CSS re-runs register styles.

## 0.5.3

### Patch Changes

- [#226](https://github.com/type-styles/typestyles/pull/226) [`cf3f66c`](https://github.com/type-styles/typestyles/commit/cf3f66c93e9b9dfc92444f5f764b8d9e3609a2c1) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add component registry extract helpers and `extract.registeredComponentsModule` / `include: 'allRegisteredComponents'` ([#219](https://github.com/type-styles/typestyles/issues/219)). The include flag appends a convention `themeable-refs` registry module to the extract graph when it exists.

## 0.5.2

### Patch Changes

- [#128](https://github.com/type-styles/typestyles/pull/128) [`41155b0`](https://github.com/type-styles/typestyles/commit/41155b02b38961c2ea158ab1e6f2b8fbe7a36d9e) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix `runTypestylesBuild` dropping CSS from a component reached only through a plain bare import (`import './some-lib';`, no binding at all) of a package marked `"sideEffects": false`. This is a separate esbuild behavior from the tree-shaking-of-declarations bug fixed previously (`treeShaking: false`, in the prior patch) — it happens earlier, driven directly by the `sideEffects` / `@__PURE__` annotations, and drops the import before the module is ever considered for bundling, regardless of the `treeShaking` setting. A real extraction entry is exactly this shape: several side-effect-only imports, any one of which may point at a (correctly) tree-shakeable component library. The extraction bundle now also sets `ignoreAnnotations: true` so no import in the extraction graph is dropped based on these annotations.

## 0.5.1

### Patch Changes

- [#126](https://github.com/type-styles/typestyles/pull/126) [`de79e3a`](https://github.com/type-styles/typestyles/commit/de79e3a17eb1765b5a1349bf08b7b7f7ca486838) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix `runTypestylesBuild` dropping CSS from components reached only through an unread namespace/barrel import. Style registration calls (`styles.component`, `styles.class`, `createTypeStyles`) are side-effect-only — the CSS they register is the point, independent of whether the returned classname function is ever read. esbuild's default tree shaking didn't know that, so a consumer's extraction entry that imports a tree-shakeable component library via `import * as lib from '...'` (never destructuring/reading a named export) could have that library's internal registration calls silently eliminated as "unused," especially for libraries marked `"sideEffects": false`. The extraction bundle now sets `treeShaking: false` so every registration in the graph survives, matching real runtime behavior.

## 0.5.0

### Minor Changes

- [#97](https://github.com/type-styles/typestyles/pull/97) [`468375c`](https://github.com/type-styles/typestyles/commit/468375cbf9524059e6749f6a48513495c41a9376) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add shared convention entry discovery across Rollup, esbuild, and webpack plugins; ship `@typestyles/esbuild` and `@typestyles/webpack`; extend discovery to `.js` entry files; add Vue, Svelte, esbuild, and Parcel examples with build verification.

- [#100](https://github.com/type-styles/typestyles/pull/100) [`f5b9c6d`](https://github.com/type-styles/typestyles/commit/f5b9c6d079a638e5d62c21746f12b0a2e53e29a2) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Per-route critical CSS for Next.js App Router (P2.15): `buildTypestylesForNext` emits route-scoped stylesheets and manifest v2 with a `routes` map; `getRouteCss` reads them at request time instead of the full `getRegisteredCss()` buffer.

### Patch Changes

- [#98](https://github.com/type-styles/typestyles/pull/98) [`e17b8a0`](https://github.com/type-styles/typestyles/commit/e17b8a06d0a54ed3f6f0907fe84beb3d4fd03989) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add npm landing-page READMEs for every published package, an examples index with contributor guidance, and doc-to-example cross-links (P2.13).

## 0.4.0

### Minor Changes

- [#75](https://github.com/type-styles/typestyles/pull/75) [`8bf64b0`](https://github.com/type-styles/typestyles/commit/8bf64b0f3f7da26a4dd91ce4ef5fcca5fea0cb4b) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add shared convention entry discovery: `discoverDefaultExtractModules` and `DEFAULT_EXTRACT_MODULE_CANDIDATES` (including `styles/typestyles-entry.ts` and `styles/typestyles.ts` after the `src/…` paths).

  **@typestyles/vite** re-exports these from `@typestyles/build-runner` and resolves optional `extract.modules` using the same list.

  **@typestyles/next** depends on `@typestyles/build-runner`, aligns `buildTypestylesForNext` with that discovery, defaults `cssOutFile` to `app/typestyles.css` and manifest output unless overridden, adds `withTypestyles` for production config when a convention file exists, and re-exports the discovery helpers.

  `withTypestyles` now passes `root` through to extraction internals so webpack resolution uses the same project root as convention discovery.

  **Breaking (Next):** `BuildTypestylesForNextOptions` no longer requires `modules` or `cssOutFile`; pass them explicitly when you need non-default behavior.

- [#92](https://github.com/type-styles/typestyles/pull/92) [`d8149d6`](https://github.com/type-styles/typestyles/commit/d8149d6ebee682eed0aff6917c0cf8be8b027d89) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `verifyTypestylesBuild()` to `@typestyles/build-runner` for CI checks that extracted CSS and optional manifest exist and contain expected output. Re-export from `@typestyles/next/build` and document on the zero-runtime page.

## 0.3.0

### Minor Changes

- [#49](https://github.com/type-styles/typestyles/pull/49): Add ESLint configuration across all packages, examples, and docs. Create shared `eslint.base.js` config with TypeScript rules and add lint scripts to all package.json files. Update CI workflow to run lint via turbo.

### Patch Changes

- [#50](https://github.com/type-styles/typestyles/pull/50): Add lint-staged for prettier formatting on pre-commit hook and format entire codebase

## 0.2.0

### Minor Changes

- [#25](https://github.com/type-styles/typestyles/pull/25): Updating bundler integrations and adding examples
