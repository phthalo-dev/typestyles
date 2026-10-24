# @typestyles/eslint-plugin

## 0.5.0

### Minor Changes

- [#295](https://github.com/phthalo-dev/typestyles/pull/295) [`e900eb9`](https://github.com/phthalo-dev/typestyles/commit/e900eb9ab27cd9404ca77681488237d721a204c9) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Support ESLint 10 (the peer range is now `^8.57.0 || ^9.0.0 || ^10.0.0`). The test suite runs against ESLint 10.

## 0.4.5

### Patch Changes

- [#287](https://github.com/phthalo-dev/typestyles/pull/287) [`7979a45`](https://github.com/phthalo-dev/typestyles/commit/7979a45cf72a141f011bebb5f63d053be46f7fe9) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Build with tsdown (via Vite+) instead of tsup. Public exports and types are unchanged; the output no longer includes JSDoc comments, and `@typestyles/next` now shares code between its entry points instead of duplicating it.

- Updated dependencies [[`7979a45`](https://github.com/phthalo-dev/typestyles/commit/7979a45cf72a141f011bebb5f63d053be46f7fe9)]:
  - @typestyles/cli@0.3.5

## 0.4.4

### Patch Changes

- [#282](https://github.com/phthalo-dev/typestyles/pull/282) [`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Point the repository metadata at the phthalo-dev GitHub organization.

- Updated dependencies [[`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30)]:
  - @typestyles/cli@0.3.4

## 0.4.3

### Patch Changes

- [#276](https://github.com/type-styles/typestyles/pull/276) [`31872bc`](https://github.com/type-styles/typestyles/commit/31872bc1ed7b284c36534d8fcc2b2f6c5f6c14e0) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Breaking: `recipe()` and `override()` take one object. Positional calls (`recipe(name, config)`, `recipe(name, definition, callback)`, and `override(component, config, options)`) are removed. Declare `slots`, variant axes, and `vars` on that object and put option styles in `styles`, which is checked against those fields. Every call returns `{ className, attrs, props }`.

- Updated dependencies [[`31872bc`](https://github.com/type-styles/typestyles/commit/31872bc1ed7b284c36534d8fcc2b2f6c5f6c14e0)]:
  - @typestyles/cli@0.3.3

## 0.4.2

### Patch Changes

- Updated dependencies [[`9589afb`](https://github.com/type-styles/typestyles/commit/9589afbaa62ec8223b13a377431b0bec087694c2)]:
  - @typestyles/cli@0.3.2

## 0.4.1

### Patch Changes

- Updated dependencies [[`4464785`](https://github.com/type-styles/typestyles/commit/446478552a48aeabd85d6570bcbbb791ef9fdaba)]:
  - @typestyles/cli@0.3.1

## 0.4.0

### Minor Changes

- [#253](https://github.com/type-styles/typestyles/pull/253) [`dda8658`](https://github.com/type-styles/typestyles/commit/dda865821d0c6ddfa89c6fa46d4c095e943efc79) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Public API redesign: `createTypeStyles` returns a flat `{ style, hash, recipe, tokens, global, … }` surface; nested `layers: { order, token, style, global? }`; `global.rule` / `global.rules`; remove root `styles` / `tokens` / `global` singletons. Migrate codemod emits `style` / `recipe` via `createTypeStyles`. Cache-bust extract module imports so Next route CSS re-runs register styles.

## 0.3.1

### Patch Changes

- [#141](https://github.com/type-styles/typestyles/pull/141) [`35e02a7`](https://github.com/type-styles/typestyles/commit/35e02a7f332be97fb116e39102998079f17d24dd) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Breaking: semantic component class names now use `block`, `block--dimension-option`,
  and `block__slot` forms instead of hyphen semantic names. Compound variants now emit
  chained modifier selectors instead of `*-compound-N` classes. Attribute mode now
  kebab-cases `data-*` names and supports slots, returning per-slot
  `{ className, attrs, props }` results.

  Upgrade notes: regenerate public-classname snapshots; update hand-written CSS /
  tests that targeted `*-base` or `*-compound-N`. Prefer distinct namespaces for
  `styles.class` and `styles.component` when they would share a base class string —
  dev builds warn on that collision. See docs migration guide (0.10 semantic naming).

- Updated dependencies [[`35e02a7`](https://github.com/type-styles/typestyles/commit/35e02a7f332be97fb116e39102998079f17d24dd)]:
  - @typestyles/cli@0.2.1

## 0.3.0

### Minor Changes

- [#119](https://github.com/type-styles/typestyles/pull/119) [`10edb85`](https://github.com/type-styles/typestyles/commit/10edb85cf37802090cdc80b8294f0ecd342ba54b) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `styles.scope()` for proximity-correct nested theme overrides via CSS `@scope` (P5.3).

  Introduce **`@typestyles/cli`**, a new package with the `typestyles` binary and subcommands. The first command is `typestyles snapshot`, which scans semantic `styles.class` / `styles.component` class names and writes `.typestyles-public-classnames.json` for semver guarding. Snapshot logic and heavy deps (`typescript`, `fast-glob`) live in this package so the core `typestyles` runtime stays lean.

  Also ships the opt-in `@typestyles/no-removed-public-classname` ESLint rule (consumes `@typestyles/cli` programmatically).

### Patch Changes

- Updated dependencies [[`10edb85`](https://github.com/type-styles/typestyles/commit/10edb85cf37802090cdc80b8294f0ecd342ba54b)]:
  - @typestyles/cli@0.2.0

## 0.2.0

### Minor Changes

- [#96](https://github.com/type-styles/typestyles/pull/96) [`9f3f9a0`](https://github.com/type-styles/typestyles/commit/9f3f9a08bce372222fd2054ff25999671ee2b60d) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Ship ESLint plugin MVP (P2.11) with rules for shorthand/longhand conflicts, invalid unitless CSS values, and duplicate TypeStyles namespace literals.

- [#108](https://github.com/type-styles/typestyles/pull/108) [`3e03d35`](https://github.com/type-styles/typestyles/commit/3e03d3515f096fdfbc3e31f775202d346a31d01a) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `no-default-scope-in-package` ESLint rule and `package` config preset for library authors. Add "Publishing Packages" docs guide covering scoped factories, naming mode selection, and ESLint enforcement.

### Patch Changes

- [#98](https://github.com/type-styles/typestyles/pull/98) [`e17b8a0`](https://github.com/type-styles/typestyles/commit/e17b8a06d0a54ed3f6f0907fe84beb3d4fd03989) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add npm landing-page READMEs for every published package, an examples index with contributor guidance, and doc-to-example cross-links (P2.13).
