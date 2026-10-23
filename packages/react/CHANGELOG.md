# @typestyles/react

## 0.3.2

### Patch Changes

- [#282](https://github.com/phthalo-dev/typestyles/pull/282) [`612537e`](https://github.com/phthalo-dev/typestyles/commit/612537ef6e3c0297c5627c855e3289825873ea30) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Point the repository metadata at the phthalo-dev GitHub organization.

## 0.3.1

### Patch Changes

- [#276](https://github.com/type-styles/typestyles/pull/276) [`31872bc`](https://github.com/type-styles/typestyles/commit/31872bc1ed7b284c36534d8fcc2b2f6c5f6c14e0) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - `createStyled` calls `recipe({ name, styles })`. Requires `typestyles` >=0.32.0, where the positional recipe call is removed.

## 0.3.0

### Minor Changes

- [#251](https://github.com/type-styles/typestyles/pull/251) [`35afeef`](https://github.com/type-styles/typestyles/commit/35afeef56754392e8583cb71382bd36f63507027) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Public API redesign: `createTypeStyles` returns a flat `{ style, hash, recipe, tokens, global, … }` surface; nested `layers: { order, token, style, global? }`; `global.rule` / `global.rules`; remove root `styles` / `tokens` / `global` singletons. Migrate codemod emits `style` / `recipe` via `createTypeStyles`. Cache-bust extract module imports so Next route CSS re-runs register styles.

## 0.2.0

### Minor Changes

- [#111](https://github.com/type-styles/typestyles/pull/111) [`13ddff8`](https://github.com/type-styles/typestyles/commit/13ddff8043b52318b71a520b87641df36edbcd0f) Thanks [@charleswallace0826](https://github.com/charleswallace0826)! - Add `@typestyles/react` with `createStyled` wrapper over `styles.component`, runtime `css` prop via jsx runtime + `TypeStylesProvider`, and Babel plugin for zero-runtime static css props (P3.25).

## 0.1.0

### Minor Changes

- Initial release: `createStyled` wrapper over `styles.component`, runtime `css` prop via jsx runtime, and Babel plugin for zero-runtime static css props (P3.25).
