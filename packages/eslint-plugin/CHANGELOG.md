# @typestyles/eslint-plugin

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
