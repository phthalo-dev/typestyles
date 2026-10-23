# @typestyles/cli

## 0.3.4

### Patch Changes

- [#282](https://github.com/phthalo-dev/typestyles/pull/282) [`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Point the repository metadata at the phthalo-dev GitHub organization.

## 0.3.3

### Patch Changes

- [#276](https://github.com/type-styles/typestyles/pull/276) [`31872bc`](https://github.com/type-styles/typestyles/commit/31872bc1ed7b284c36534d8fcc2b2f6c5f6c14e0) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Breaking: `recipe()` and `override()` take one object. Positional calls (`recipe(name, config)`, `recipe(name, definition, callback)`, and `override(component, config, options)`) are removed. Declare `slots`, variant axes, and `vars` on that object and put option styles in `styles`, which is checked against those fields. Every call returns `{ className, attrs, props }`.

## 0.3.2

### Patch Changes

- [#263](https://github.com/type-styles/typestyles/pull/263) [`9589afb`](https://github.com/type-styles/typestyles/commit/9589afbaa62ec8223b13a377431b0bec087694c2) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Recognize schema-first `recipe(namespace, definition, callback)` calls when scanning public class names for `typestyles snapshot` and `no-removed-public-classname`. The collector now reads the style config from the callback (third argument) and the `slots` list from the definition (second argument), instead of treating the definition's branded `variant.enum(...)` / `variant.boolean(...)` axes as styles and emitting no names.

## 0.3.1

### Patch Changes

- [#257](https://github.com/type-styles/typestyles/pull/257) [`4464785`](https://github.com/type-styles/typestyles/commit/446478552a48aeabd85d6570bcbbb791ef9fdaba) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Recognize `typestyles.recipe` / `typestyles.style` (and parenthesized arrow configs) when scanning public class names for `typestyles snapshot` and `no-removed-public-classname`.

## 0.3.0

### Minor Changes

- [#251](https://github.com/type-styles/typestyles/pull/251) [`35afeef`](https://github.com/type-styles/typestyles/commit/35afeef56754392e8583cb71382bd36f63507027) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Public API redesign: `createTypeStyles` returns a flat `{ style, hash, recipe, tokens, global, … }` surface; nested `layers: { order, token, style, global? }`; `global.rule` / `global.rules`; remove root `styles` / `tokens` / `global` singletons. Migrate codemod emits `style` / `recipe` via `createTypeStyles`. Cache-bust extract module imports so Next route CSS re-runs register styles.

## 0.2.1

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

## 0.2.0

### Minor Changes

- [#119](https://github.com/type-styles/typestyles/pull/119) [`10edb85`](https://github.com/type-styles/typestyles/commit/10edb85cf37802090cdc80b8294f0ecd342ba54b) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `styles.scope()` for proximity-correct nested theme overrides via CSS `@scope` (P5.3).

  Introduce **`@typestyles/cli`**, a new package with the `typestyles` binary and subcommands. The first command is `typestyles snapshot`, which scans semantic `styles.class` / `styles.component` class names and writes `.typestyles-public-classnames.json` for semver guarding. Snapshot logic and heavy deps (`typescript`, `fast-glob`) live in this package so the core `typestyles` runtime stays lean.

  Also ships the opt-in `@typestyles/no-removed-public-classname` ESLint rule (consumes `@typestyles/cli` programmatically).
