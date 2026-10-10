# typestyles

## 0.28.0

### Minor Changes

- [#250](https://github.com/type-styles/typestyles/pull/250) [`c0b0ef8`](https://github.com/type-styles/typestyles/commit/c0b0ef87a94d4128f90d5c48131539ed49bca4e4) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - **BREAKING:** Remove structured `createTheme({ colorMode })` / `Theme.override({ colorMode })` patches. Light/dark values are mode-aware token leaves only (`{ light, dark }` → CSS `light-dark()`). Keep instance `colorModes` and conditional `modes` / `tokens.colorMode.*` presets.

## 0.27.0

### Minor Changes

- [#246](https://github.com/type-styles/typestyles/pull/246) [`1b93cff`](https://github.com/type-styles/typestyles/commit/1b93cffb0f10abebfdbfe8e23177926949b90560) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `Theme.source` and typed `Theme.override()` for deriving child themes from a root `createTheme`. Override patches are deep-partials of the parent token tree (excess keys error). Remove `createTheme({ from })` — fork with `theme.override({ name, tokens })` instead. Rename `ThemeSurface` → `Theme`, `ThemePreset` → `ThemeSource`, and `ThemeSurfaceOverrideInput` → `ThemeOverrideInput`. Raise main-entry gzip budget (+400 B) for override/source runtime.

## 0.26.1

### Patch Changes

- [#244](https://github.com/type-styles/typestyles/pull/244) [`7a3ebfd`](https://github.com/type-styles/typestyles/commit/7a3ebfd340c83871ce14d6d5765816de1a24ab56) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Consolidate same-named `@layer` blocks (and hoist `@property`) in `getRegisteredCss()` / SSR / extract output so generated CSS is easier to read.

- [#242](https://github.com/type-styles/typestyles/pull/242) [`a48f23b`](https://github.com/type-styles/typestyles/commit/a48f23b3ff78574a8f7cb87acd90b817cf9710a1) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix `tokens.create(..., { decl })` rejecting mode-aware `{ light, dark }` leaves. Schema validation now expands those leaves before path checks so declared color slots accept light/dark pairs.

## 0.26.0

### Minor Changes

- [#240](https://github.com/type-styles/typestyles/pull/240) [`cc0f437`](https://github.com/type-styles/typestyles/commit/cc0f4376dfdaf5598ce09a3f216df9a9ea958941) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `styles.when` / `whenStyle` to spread `ThemeCondition` into recipe slot style objects (closes [#235](https://github.com/type-styles/typestyles/issues/235)). Raise main-entry gzip budget (+400 B) for the new helper.

- [#237](https://github.com/type-styles/typestyles/pull/237) [`56c9bf1`](https://github.com/type-styles/typestyles/commit/56c9bf1dafccfc46335c63251d83e986d79bb73e) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Simplify `tokens.createTheme` to a single named-argument object: per-namespace values live under `tokens` (replacing `base` / `extend`), presets use `from` with sibling-field merges (no `patch`), and docs cover migration from StyleX, Panda, vanilla-extract, and Stitches.

## 0.25.0

### Minor Changes

- [#221](https://github.com/type-styles/typestyles/pull/221) [`f8e1bb4`](https://github.com/type-styles/typestyles/commit/f8e1bb499db91492770625e2c598bcd6a62692a4) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add per-instance component registry (`getComponent`, `getThemeableComponents`, `listComponentNamespaces`) and `themeable` opt-out on `styles.component()` ([#214](https://github.com/type-styles/typestyles/issues/214)). Raise main-entry gzip budget (+300 B) for registry runtime.

- [#223](https://github.com/type-styles/typestyles/pull/223) [`5e4858e`](https://github.com/type-styles/typestyles/commit/5e4858efecfcedaebe78c7f9b0bb6c53625818e5) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `createTheme({ components })` for namespace-keyed recipe overrides on the same `createTypeStyles` instance ([#216](https://github.com/type-styles/typestyles/issues/216)). Raise main-entry gzip budget (+400 B) for theme component override runtime.

- [#225](https://github.com/type-styles/typestyles/pull/225) [`5582a83`](https://github.com/type-styles/typestyles/commit/5582a83a7fbcb0734bc01715c6b144dd67bd3663) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `createTheme({ extend })`, `ThemeSurface.tokens`, and `tokens.ensureNamespace()` ([#218](https://github.com/type-styles/typestyles/issues/218)). Raise main-entry gzip budget (+400 B) for extend/token-context runtime.

- [#227](https://github.com/type-styles/typestyles/pull/227) [`b698012`](https://github.com/type-styles/typestyles/commit/b698012f29efa989140f44c68d83ad08264fa057) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `createTheme({ from, patch })` preset merge for design-system themes ([#220](https://github.com/type-styles/typestyles/issues/220)). Raise main-entry gzip budget (+400 B cumulative) for preset merge runtime.

- [#222](https://github.com/type-styles/typestyles/pull/222) [`40ae70b`](https://github.com/type-styles/typestyles/commit/40ae70b51939ff7d56e9c859c6701d0378a7a91c) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `tokens.disposeTheme()` and replace-by-default `createTheme` ([#215](https://github.com/type-styles/typestyles/issues/215)). Raise main-entry gzip budget (+600 B cumulative with registry work) for theme disposal runtime.

- [#224](https://github.com/type-styles/typestyles/pull/224) [`457d7b0`](https://github.com/type-styles/typestyles/commit/457d7b07ca8df3c5074d5613712b4ed3ef9134fc) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Accept inline `{ light, dark }` token leaves in theme overrides with automatic normalization ([#217](https://github.com/type-styles/typestyles/issues/217)). Export `normalizeModeAwareOverrides` and `normalizeThemeConfig`. Raise main-entry gzip budget (+600 B) for normalization runtime.

- [#226](https://github.com/type-styles/typestyles/pull/226) [`cf3f66c`](https://github.com/type-styles/typestyles/commit/cf3f66c93e9b9dfc92444f5f764b8d9e3609a2c1) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add component registry extract helpers and `extract.registeredComponentsModule` / `include: 'allRegisteredComponents'` ([#219](https://github.com/type-styles/typestyles/issues/219)). The include flag appends a convention `themeable-refs` registry module to the extract graph when it exists.

## 0.24.0

### Minor Changes

- [#210](https://github.com/type-styles/typestyles/pull/210) [`4b1f40d`](https://github.com/type-styles/typestyles/commit/4b1f40dade837f5281824a2e7d8a6f65220baefd) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `mergeProps` and `combine` helpers for attribute-mode DOM binding, and dev warnings when `cx()` drops variant attrs. Raise main-entry gzip budget (+800 B) for the new runtime.

## 0.23.1

### Patch Changes

- [#208](https://github.com/type-styles/typestyles/pull/208) [`b51907a`](https://github.com/type-styles/typestyles/commit/b51907a4a2f11360b478fa0e9d18ded4bd7648cb) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix `invalidateKeys` / `invalidatePrefix` so layered theme rules are dropped from the live stylesheet (CSSOM and `#typestyles-fallback`) without deleting sibling themes in the same `@layer`. Nested `@media` / `@supports` groupings are walked the same way, emptied groupings are removed, and concatenated fallback text is pruned by registered CSS.

## 0.23.0

### Minor Changes

- [#202](https://github.com/type-styles/typestyles/pull/202) [`42fb13d`](https://github.com/type-styles/typestyles/commit/42fb13df8c1a8325bfdaa984233ca8c2d8cc7e85) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add typed `vars` on `styles.override()` and symmetric top-level `vars` on component configs. Recipes expose a `recipe.vars` ref tree; theme consumers override with the same logical keys on `styles.override({ vars })`. `c.vars()` auto-stamps override typing metadata — pass `vars: v` in the recipe return (no duplicate definition object).

### Patch Changes

- [#205](https://github.com/type-styles/typestyles/pull/205) [`9806e53`](https://github.com/type-styles/typestyles/commit/9806e53c77f6eb5dac890934ac495448a1f2c03e) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Update README

## 0.22.0

### Minor Changes

- [#199](https://github.com/type-styles/typestyles/pull/199) [`c0642fd`](https://github.com/type-styles/typestyles/commit/c0642fd26780bd23b48351d640da3029bc133512) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add typed `vars` on `styles.override()` and symmetric top-level `vars` on component configs. Recipes expose a `recipe.vars` ref tree; theme consumers override with the same logical keys on `styles.override({ vars })`. `c.vars()` auto-stamps override typing metadata — pass `vars: v` in the recipe return (no duplicate definition object).

## 0.21.0

### Minor Changes

- [#196](https://github.com/type-styles/typestyles/pull/196) [`c749aaf`](https://github.com/type-styles/typestyles/commit/c749aafd602d3b6e55eb45977d93c387987af490) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `supports()` and `styles.supports()` helpers for typed `@supports` feature-query keys, mirroring the `container()` pattern. Object forms accept camelCase declaration features (joined with `and`); string forms pass through raw conditions including `not` and `selector()`. Raise main-entry gzip budget (+200 B) for the new helper runtime.

### Patch Changes

- [#197](https://github.com/type-styles/typestyles/pull/197) [`bf6614f`](https://github.com/type-styles/typestyles/commit/bf6614f5efa7d0edfffe024cd4c0d2640067d674) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix slot+variant components not emitting `c.vars()` default assignments when both `slots` and dimensioned `variants` are used together.

## 0.20.0

### Minor Changes

- [#192](https://github.com/type-styles/typestyles/pull/192) [`51a78c0`](https://github.com/type-styles/typestyles/commit/51a78c0a0a0d75bd6d8edee66498cc725edd461e) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add relative color syntax helpers (`color.from`, `rgbFrom`, `oklchFrom`) and OKLCH manipulation sugar (`lighten`, `darken`, `saturate`, `desaturate`, `rotate`, `grayscale`) on `typestyles/color`, plus trigonometric/exponential CSS math helpers (`sin`, `cos`, `tan`, `atan2`, `pow`, `sqrt`, `hypot`) on the main entry.

### Patch Changes

- [#195](https://github.com/type-styles/typestyles/pull/195) [`40ca798`](https://github.com/type-styles/typestyles/commit/40ca798658357a97e675b7f8af67b95944703e04) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix slot-based components not emitting `c.vars()` default assignments when values reference other CSS custom properties.

## 0.19.0

### Minor Changes

- [#188](https://github.com/type-styles/typestyles/pull/188) [`0d33463`](https://github.com/type-styles/typestyles/commit/0d334636c0253106c214d89ff6d65db8979dd730) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add syntax-typed design tokens via `tokens.declare()`: `SyntaxRef<'<color>'>` (and other CSS syntaxes) for compile-time ref compatibility in `create({ decl })` and `styles()`, while plain `tokens.create()` without `declare` stays unchanged.

### Patch Changes

- [#190](https://github.com/type-styles/typestyles/pull/190) [`046d084`](https://github.com/type-styles/typestyles/commit/046d0848877219f928f7c7eeef867c346b733fff) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix `tokens.use()` when passed a `tokens.declare()` handle — rebuild proxies from declared schema paths instead of resolving an empty namespace. Raise main-entry gzip budget (+200 B) for syntax-typed token runtime.

## 0.18.1

### Patch Changes

- [#186](https://github.com/type-styles/typestyles/pull/186) [`db05b28`](https://github.com/type-styles/typestyles/commit/db05b288c0878d1ec08093c8a4dd88b5e8f975e5) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Default component `c.var()`, `c.vars()`, and `.declare()` `@property` registrations to `inherits: true`, matching `tokens.declare()` behavior. Explicit `inherits: false` overrides are preserved.

## 0.18.0

### Minor Changes

- [#185](https://github.com/type-styles/typestyles/pull/185) [`06de0f6`](https://github.com/type-styles/typestyles/commit/06de0f621febba04684b32dcc2b35529aee15f1f) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `mediaQueries` constant export with ready-to-use `@media (...)` strings for `prefers-reduced-motion`, `prefers-contrast`, and hover/pointer capability queries (`hover`, `any-hover`, `pointer`, `any-pointer`), grouped by feature. Drop a leaf value (e.g. `mediaQueries.prefersReducedMotion.reduce`) directly into a `styles.class`, `styles.override`, or `styles.component` (nested inside `base` or a variant's style) object as a key.

- [#184](https://github.com/type-styles/typestyles/pull/184) [`00cf163`](https://github.com/type-styles/typestyles/commit/00cf16386ea79141d74e3305ba636a0b79040cb5) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `typestyles/testing` subpath export (`resetAll`, `onAfterReset`, `createTestHarness`) for coordinating test-state reset across design systems built on typestyles.

### Patch Changes

- [#182](https://github.com/type-styles/typestyles/pull/182) [`748d530`](https://github.com/type-styles/typestyles/commit/748d5303dae9b9bd4d0ff60626003fa228902265) Thanks [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)! - Default `tokens.declare()` typed schema leaves to `inherits: true` for `@property` registration, including direct `atProperty` preset leaves, while preserving explicit `inherits: false` overrides.

## 0.17.0

### Minor Changes

- [#176](https://github.com/type-styles/typestyles/pull/176) [`939a158`](https://github.com/type-styles/typestyles/commit/939a15833e740cce4144b78014cfb38874068727) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Export `cloneThemeValues` and `mergeThemeOverrides` for ref-aware theme override merging (Issue [#168](https://github.com/type-styles/typestyles/issues/168))

- [#180](https://github.com/type-styles/typestyles/pull/180) [`1338c06`](https://github.com/type-styles/typestyles/commit/1338c06841b1acdb8821c9d2e20600676def26a7) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Export `ModeAwareTokenLeaf`, `ModeAwareTokenObject`, and `TokenRefTree`; preserve input shape in `tokens.create()` return types (nested namespaces, mode-aware leaves, plain scalars).

- [#178](https://github.com/type-styles/typestyles/pull/178) [`eeb4253`](https://github.com/type-styles/typestyles/commit/eeb425307b3768ed85ae61233febadeed5b9dc76) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `styles.breakpoint()` and `styles.media()` helpers that build viewport `@media` keys from configured `breakpoints`, matching the `container()` + `atRuleBlock` pattern for container queries.

### Patch Changes

- [#175](https://github.com/type-styles/typestyles/pull/175) [`f96b133`](https://github.com/type-styles/typestyles/commit/f96b13308930a4221f4b5288609d9e92f2c7798c) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Discriminate slot+variant `styles.component()` configs so callback recipes infer per-slot return types without casts (Issue [#166](https://github.com/type-styles/typestyles/issues/166))

- [#179](https://github.com/type-styles/typestyles/pull/179) [`200359e`](https://github.com/type-styles/typestyles/commit/200359e78b2a44d57d9e7c77422a435e3420c0c1) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Export `OverrideConfigFor` and `MultiSlotReturn` so design-system consumers can infer `styles.override()` config shapes from recipe return types (Issue [#160](https://github.com/type-styles/typestyles/issues/160))

- [#177](https://github.com/type-styles/typestyles/pull/177) [`3a8feb2`](https://github.com/type-styles/typestyles/commit/3a8feb2a3be61afcba55038a31320a78182ee57c) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix `conditions` type-checking in `styles.override()` configs and type mode-aware `{ light, dark }` property values in override and recipe styles (Issue [#169](https://github.com/type-styles/typestyles/issues/169))

- [#173](https://github.com/type-styles/typestyles/pull/173) [`ed956d8`](https://github.com/type-styles/typestyles/commit/ed956d8577d4bda104d333fa1190d1e33fd915ee) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix `CSSProperties` assignability for `c.vars()` computed custom-property keys in nested selectors (Issue [#167](https://github.com/type-styles/typestyles/issues/167))

## 0.16.0

### Minor Changes

- [#164](https://github.com/type-styles/typestyles/pull/164) [`aebb0c0`](https://github.com/type-styles/typestyles/commit/aebb0c0b36b442797b44e006d498b51c2bbea919) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add mode-aware token leaves (`{ light, dark }`) on `tokens.create()` and `tokens.createTheme()` when `colorModes` is configured. Color/image-compatible values compile to `light-dark()` on custom properties; incompatible values (e.g. shadow shorthands) emit dark-mode override rules. `createTheme` accepts structured `colorMode: { light, dark }` patches and emits `color-scheme: light dark` on theme surfaces. Preset mode layers (`tokens.colorMode.*`) are passed via `modes` instead of `colorMode`. Documentation updated in Tokens and Theming patterns guides.

## 0.15.0

### Minor Changes

- [#161](https://github.com/type-styles/typestyles/pull/161) [`7d24e42`](https://github.com/type-styles/typestyles/commit/7d24e420180fdef8429eeeb084c4d1eb0ab1dce2) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add conditional `styles.override()` blocks (`conditions` + `ThemeCondition`) and `colorModes` config for `{ light, dark }` property values that compile to `light-dark()` on color/image properties. Export `colorModes` constant (`['light', 'dark']`) for `createStyles` / `createTypeStyles`.

## 0.14.0

### Minor Changes

- [#157](https://github.com/type-styles/typestyles/pull/157) [`f163b08`](https://github.com/type-styles/typestyles/commit/f163b08f071e8b34a64432be3c5b05566c73d81c) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `atProperty` presets (`atProperty.color`, `atProperty.angle`, etc.) for spreadable `@property` registration metadata across tokens, components, styles, and `typestyles/css`.

  Add `typestyles/css` subpath with `css.atProperty`, `css.customProperty`, `css.customProperties`, and `css.var` for exact-name CSS custom property control.

  Add `styles.property.declare` / `styles.property.set` and `ctx.vars.declare` / `ctx.var.declare` for split `@property` registration and value assignment. Shorthand `styles.property(id, options?)` and `ctx.vars(definitions)` behavior is unchanged.

  Export `PropertyRegistration`, `PropertyRef`, and `PropertyOptions` types. `TokenDescriptor` and `RegisteredPropertyOptions` are deprecated aliases.

- [#159](https://github.com/type-styles/typestyles/pull/159) [`bc7e94d`](https://github.com/type-styles/typestyles/commit/bc7e94d4eee898a2886d802b64570bbec4c69b87) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add namespace-optional overloads for `tokens.declare(schema)` and `tokens.create(values)` so design systems can register a flat token tree without a namespace segment in emitted `--*` names.

  When the namespace is omitted, custom property names use `--{scopeId}-{path}` (scoped) or `--{path}` (unscoped) instead of `--{scopeId}-{namespace}-{path}`. Pass `{ decl }` on `create()` to pair with a namespace-less `declare()` for schema validation and forward references.

## 0.13.0

### Minor Changes

- [#155](https://github.com/type-styles/typestyles/pull/155) [`9865095`](https://github.com/type-styles/typestyles/commit/9865095a7cba8f9c24a1df11508c6ac7dc716ed0) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - `tokens.declare(namespace, schema)` accepts a schema object, emits `@property` for `syntax` leaves, and infers ref types from the input shape. `tokens.create()` accepts plain values only (no inline `TokenDescriptor`); pass `{ decl }` for typed partial fills with merge semantics across calls. Schema-less `declare()`, `declare<T>()`, and `LooseTokenRef` are removed.

## 0.12.0

### Minor Changes

- [#154](https://github.com/type-styles/typestyles/pull/154) [`0b1c9e8`](https://github.com/type-styles/typestyles/commit/0b1c9e8bbd520bb29a88d4296e0380f5e920cf86) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Register `@property` with a syntax-appropriate placeholder `initial-value` (e.g. `transparent` for `<color>`, `0` for `<number>`) instead of always skipping registration for `var()`/`env()`-dependent token values. The real value still reaches the cascade via the existing unconditional `:root` declaration. Add `TokenDescriptor.initial` / `RegisteredPropertyOptions.initial` to override the placeholder explicitly. Note: a dependent token that previously fell back to CSS's default `inherits: true` (because `@property` was skipped) now respects its `inherits` option like any other typed token — pass `inherits: true` explicitly if you relied on the old implicit-inheritance fallback.

- [#154](https://github.com/type-styles/typestyles/pull/154) [`0b1c9e8`](https://github.com/type-styles/typestyles/commit/0b1c9e8bbd520bb29a88d4296e0380f5e920cf86) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `tokens.declare(namespace, options?)` — a lazy `var(--…)` reference proxy for referencing a token before its value exists, either within the same `tokens.create()` call (self-referencing derived tokens) or across modules without a real import cycle. Names resolve through the same logic `tokens.create`/`tokens.use` already use, including `scopeId` and `nameTemplate`.

## 0.11.2

### Patch Changes

- [#150](https://github.com/type-styles/typestyles/pull/150) [`8496b57`](https://github.com/type-styles/typestyles/commit/8496b5759dedd5086bfdd30f0ac6e7070b8f346f) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Allow widened CSS keywords on `VariantOptionStyle` and block multi-slot overload fallthrough when recipe keys are present

## 0.11.1

### Patch Changes

- [#147](https://github.com/type-styles/typestyles/pull/147) [`2364f0f`](https://github.com/type-styles/typestyles/commit/2364f0f014d3c256d92d6099e2c3f966c1b384c9) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Tighten `VariantOptionStyle` for CSS IntelliSense while keeping custom-property assignability

## 0.11.0

### Minor Changes

- [#144](https://github.com/type-styles/typestyles/pull/144) [`08cab3b`](https://github.com/type-styles/typestyles/commit/08cab3b2f44503a5ee7390c2cd218f272c9c0f22) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add SlotAttrsReturn type

## 0.10.0

### Minor Changes

- [#141](https://github.com/type-styles/typestyles/pull/141) [`35e02a7`](https://github.com/type-styles/typestyles/commit/35e02a7f332be97fb116e39102998079f17d24dd) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Breaking: semantic component class names now use `block`, `block--dimension-option`,
  and `block__slot` forms instead of hyphen semantic names. Compound variants now emit
  chained modifier selectors instead of `*-compound-N` classes. Attribute mode now
  kebab-cases `data-*` names and supports slots, returning per-slot
  `{ className, attrs, props }` results.

  Upgrade notes: regenerate public-classname snapshots; update hand-written CSS /
  tests that targeted `*-base` or `*-compound-N`. Prefer distinct namespaces for
  `styles.class` and `styles.component` when they would share a base class string —
  dev builds warn on that collision. See docs migration guide (0.10 semantic naming).

- [#143](https://github.com/type-styles/typestyles/pull/143) [`34d7fe2`](https://github.com/type-styles/typestyles/commit/34d7fe289eb24095e8573e1b94f2acf4dd3216cc) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `styles.override()` for recipe-shaped typed component restyling, backed by
  non-enumerable `__tsMeta` on every `styles.component()` return and
  `getComponentMeta()` for consumers. Supports semantic, bem, template, and
  attribute naming modes with `selectorPrefix` + cascade `layer` options.

  Raises the main-entry gzip budget to 26 KB for the new override runtime.

## 0.9.0

### Minor Changes

- [#130](https://github.com/type-styles/typestyles/pull/130) [`644a96c`](https://github.com/type-styles/typestyles/commit/644a96c65e8c9fa0d5a0013a6b15bc86e255a88f) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - `variantStrategy: 'attribute'` (from the unreleased PR [#130](https://github.com/type-styles/typestyles/issues/130)) is now `createStyles({ mode: 'attribute' })` / `createTypeStyles({ mode: 'attribute' })` — an instance-wide setting instead of a per-component field, matching how `semantic`/`hashed`/`compact`/`atomic` already work. Every dimensioned `styles.component()` call from that instance compiles `variants` to `&[data-{dimension}="{option}"]` selectors and returns `{ className, attrs, props }`; `slots` is rejected at the type level. `variantStrategy`/`defaultVariantStrategy` no longer exist. See `specs/attribute-driven-variants.md`.

- [#132](https://github.com/type-styles/typestyles/pull/132) [`6be2124`](https://github.com/type-styles/typestyles/commit/6be2124795c1b8a5d1a414a8a6f0ee93798cbeb0) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `mode: 'bem'` to `createStyles`/`createTypeStyles`: dimensioned and slot `styles.component()` variants compile to BEM modifier classes (`block--modifier`, `block__element--modifier`) instead of the default `{namespace}-{dimension}-{option}` naming. The base/root class drops the `-base` suffix (the bare block class is the base state). Compound variants compile to chained modifier-class selectors with no synthetic class. Dev mode warns when two dimensions would produce the same modifier class name. See `specs/bem-variant-mode.md`.

- [#137](https://github.com/type-styles/typestyles/pull/137) [`9cf89f1`](https://github.com/type-styles/typestyles/commit/9cf89f1ce4861e16dba4bea508895072a028df4e) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `mode: 'template'` to `createStyles`/`createTypeStyles`: dimensioned and slot `styles.component()` variants compile to class names decided by a user-supplied `classNameTemplate: (ctx) => string` function, instead of a fixed convention. `mode: 'bem'` is now implemented internally as a built-in preset of this same mechanism — its public behavior for valid input is unchanged, though in development it now also validates that emitted class names are legal CSS identifiers (previously invalid variant/slot names could silently produce a broken selector). See `specs/classname-template-mode.md`.

## 0.8.2

### Patch Changes

- [#125](https://github.com/type-styles/typestyles/pull/125) [`7111074`](https://github.com/type-styles/typestyles/commit/7111074f0c3ea2333be733ee210a92962e9695c2) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix `styles.class()` throwing when the same class name is registered twice in one process — e.g. meta-frameworks with multiple server module graphs in a single process (the Vite Environment API, or RSC frameworks like Waku/Vocs) re-evaluate the same source module once per environment, which previously crashed SSR with `[typestyles] styles.class('name', ...) was called more than once for scope '...'`.

  In development, `styles.class()` now matches the re-registration behavior `styles.component()` already had: it invalidates the previous rule(s) for that class and re-registers instead of throwing (the same trade-off already made for HMR / out-of-order `dispose` re-execution). Production behavior is unchanged — it never threw there.

  Also fixes a related bug in the shared HMR invalidation path (`invalidateKeys` / `invalidatePrefix`, used by both `styles.class()` and `styles.component()`): re-registering before the prior registration's CSS had flushed left the stale CSS text queued alongside the new CSS, producing a duplicate, conflicting rule once flushed.

## 0.8.1

### Patch Changes

- [#123](https://github.com/type-styles/typestyles/pull/123) [`f641e3f`](https://github.com/type-styles/typestyles/commit/f641e3f63a6f61f14c9153cdaae4c9f0a0707c1a) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix two runtime injection bugs that could leave pages completely unstyled in real browsers:
  - `@property` registrations whose initial value contains `var()` / `env()` now degrade to the universal `"*"` syntax without an `initial-value` (the CSS spec requires initial values to be computationally independent, so browsers rejected the typed rule outright). `inherits` behavior is preserved, and defaults still cascade via the `:root` / base-style assignments.
  - Rules rejected by `CSSStyleSheet.insertRule` are now appended as text to a dedicated `<style id="typestyles-fallback">` element instead of the main managed element. Appending text to the main element made browsers re-parse it from its text content, silently discarding every rule previously inserted through `insertRule` — a single rejected rule wiped the entire runtime sheet.

## 0.8.0

### Minor Changes

- [#119](https://github.com/type-styles/typestyles/pull/119) [`10edb85`](https://github.com/type-styles/typestyles/commit/10edb85cf37802090cdc80b8294f0ecd342ba54b) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `styles.scope()` for proximity-correct nested theme overrides via CSS `@scope` (P5.3).

  Introduce **`@typestyles/cli`**, a new package with the `typestyles` binary and subcommands. The first command is `typestyles snapshot`, which scans semantic `styles.class` / `styles.component` class names and writes `.typestyles-public-classnames.json` for semver guarding. Snapshot logic and heavy deps (`typescript`, `fast-glob`) live in this package so the core `typestyles` runtime stays lean.

  Also ships the opt-in `@typestyles/no-removed-public-classname` ESLint rule (consumes `@typestyles/cli` programmatically).

- [#116](https://github.com/type-styles/typestyles/pull/116) [`7ea7356`](https://github.com/type-styles/typestyles/commit/7ea7356299798f5412c1117e83c074b0f5f4374e) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `'descendant'` as a third `scope` value on `tokens.when.attr` / `tokens.when.className` theme conditions, compiling to a descendant-combinator selector (`.theme-name [data-x="y"]`) so a mode can match a marker element inside the themed subtree — the relationship a fixed-tone surface (e.g. an always-dark toast on a light page) needs. `when.not()` on a descendant-scoped condition is rejected with an explicit dev warning (P5.4).

- [#121](https://github.com/type-styles/typestyles/pull/121) [`4be825a`](https://github.com/type-styles/typestyles/commit/4be825a34c0007cdec73d0057b64b3920bac1906) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add responsive object syntax for breakpoint shorthand in style property values. Register breakpoints once via `createStyles({ breakpoints })` or `createTypeStyles({ breakpoints })`, then use `{ base, md, lg }` on CSS properties — expands to `@media` blocks at serialization time. Supports `_` alias, `breakpoints.fromTokens`, atomic mode, and dev-time validation for unknown breakpoints.

- [#120](https://github.com/type-styles/typestyles/pull/120) [`2bfa8a4`](https://github.com/type-styles/typestyles/commit/2bfa8a4cdcb59e569e831c7f6d4e7178c9acaaf9) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add optional `nameTemplate` on `createTokens` and `tokens.create` for custom CSS custom property names — migration from existing variable systems, Style Dictionary / DTCG naming conventions, and cross-namespace aliasing. Default `--{scopeId}-{namespace}-{path}` behavior is unchanged when `nameTemplate` is omitted. Theme overrides, `tokens.use()`, and `@property` registration share the same resolved names.

## 0.7.0

### Minor Changes

- [#94](https://github.com/type-styles/typestyles/pull/94) [`47bc7bd`](https://github.com/type-styles/typestyles/commit/47bc7bd9b7e916e86c9876b2428c84a28781fc71) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Document streaming SSR and RSC patterns against request-scoped collection (P1.9). Add `TYPESTYLES_STYLE_ID`, `typestylesStyleHtml`, `injectStylesIntoHtml`, and `streamingDocumentShell` helpers on `typestyles/server`. Expand the SSR guide with request-safe collection, RSC decision table, and streaming examples.

- [#95](https://github.com/type-styles/typestyles/pull/95) [`f06fb48`](https://github.com/type-styles/typestyles/commit/f06fb488b07123c85df72fd070961d0ee0431d71) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Rename hash-only class naming mode to `compact` and implement true per-declaration `atomic` output with cross-component dedup (P2.10). `styles.class`, `styles.component`, and `styles.hashClass` in `atomic` mode now emit one class per CSS declaration; identical declarations share a class.

- [#105](https://github.com/type-styles/typestyles/pull/105) [`0729526`](https://github.com/type-styles/typestyles/commit/07295265f2ca7ac006ce0b99a3c5533b97ac41bf) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `@property` registration for typed token leaves (`{ value, syntax, inherits? }` in `tokens.create`) and standalone `styles.property(id, opts)`. Both return `{ name, var, toString }` refs (P3.24).

- [#112](https://github.com/type-styles/typestyles/pull/112) [`b701e62`](https://github.com/type-styles/typestyles/commit/b701e627c73c8626e168ced7acc79dab7e67607c) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `typestyles/color-scale` subpath with `parseColor` (hex → OKLCH), `generateRamp` (perceptual OKLCH ramps), and `contrastRatio` (WCAG relative luminance). Design-system palette ramps now call the shared `generateRamp` implementation (P5.1).

- [#113](https://github.com/type-styles/typestyles/pull/113) [`3459b70`](https://github.com/type-styles/typestyles/commit/3459b70650c30d83e957e18fa5ab317e6760697b) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add `typestyles/token-scale` subpath with `generateGeometricScale` (modular ladders like font sizes from `{ base, ratio, steps }`), `generateLinearScale` (grid-based ladders like radii from `{ base, multiplier, steps }`), and `expandDurationBand` (a `{ min, base, max }` motion band from `{ base, ratio }`, rounded to the nearest 5ms by default). Pure numeric outputs with zero naming opinions — mapping steps to token names stays a design-system concern (P5.2).

### Patch Changes

- [#101](https://github.com/type-styles/typestyles/pull/101) [`23bd4f1`](https://github.com/type-styles/typestyles/commit/23bd4f107766c9435e21468ec1b934def64f5039) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Consolidate planning docs: remove 6 stale files, update ARCHITECTURE.md and IMPROVEMENTS.md.

- [#98](https://github.com/type-styles/typestyles/pull/98) [`e17b8a0`](https://github.com/type-styles/typestyles/commit/e17b8a06d0a54ed3f6f0907fe84beb3d4fd03989) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add npm landing-page READMEs for every published package, an examples index with contributor guidance, and doc-to-example cross-links (P2.13).

- [#103](https://github.com/type-styles/typestyles/pull/103) [`a4ccfbc`](https://github.com/type-styles/typestyles/commit/a4ccfbcc3c85c2e52c76dcf319b0cfc6203ff0b5) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - `styles.compose()` now infers merged variant selection types from composed component functions (P3.22). Unknown variant keys are rejected by TypeScript and logged in development when no composed function accepts them.

- [#104](https://github.com/type-styles/typestyles/pull/104) [`8de36fa`](https://github.com/type-styles/typestyles/commit/8de36fa8ff24cd589d9a45a482f562f874fde403) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - `tokens.use()` now infers token shapes from a `tokens.create()` return value (P3.23). Pass the created ref for cross-package typing, or declare a `TokenRegistry` on `createTokens()` for string-based lookups.

- [#107](https://github.com/type-styles/typestyles/pull/107) [`aff0a8c`](https://github.com/type-styles/typestyles/commit/aff0a8c4e7d71b72779b47e2205c04fdcf4fb725) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix `reset()` to also clear `registeredNamespaces` — previously required manual clearing in tests.

- [#102](https://github.com/type-styles/typestyles/pull/102) [`a984b6b`](https://github.com/type-styles/typestyles/commit/a984b6bddb950d1907371a316db838d5928fb9fc) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Dev-mode warning for unscoped namespace collisions (P3.5.2): `styles.component()` now emits a `console.warn` when the same namespace is registered more than once without a `scopeId`, helping catch cross-file class name collisions before they reach production.

## 0.6.0

### Minor Changes

- [#78](https://github.com/type-styles/typestyles/pull/78) [`aa88d25`](https://github.com/type-styles/typestyles/commit/aa88d251c352c617841f2aefed730c2b2871e50d) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add **`createStyles({ utils })`** (and **`createTypeStyles({ utils })`**) so shorthand style expanders attach to one styles instance without a separate `withUtils` object. **`styles.withUtils`** remains on the default export; there is no global **`registerUtils`**.

- [#93](https://github.com/type-styles/typestyles/pull/93) [`60a8383`](https://github.com/type-styles/typestyles/commit/60a8383ba5f35767c33c6c92dc9b763337d3325d) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add debug names and optional fallbacks to `createVar()`. Document the dynamic styling story on a dedicated page and cross-link from performance and best-practices guides.

- [#90](https://github.com/type-styles/typestyles/pull/90) [`f979149`](https://github.com/type-styles/typestyles/commit/f979149bc2993438655e635f6e83028f1220e17f) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Move `color` helpers to the `typestyles/color` subpath entry to shrink the main runtime bundle (~14.9 KB gzip). CI enforces a gzip budget on `dist/index.js`.

  **Breaking:** `import { color } from 'typestyles'` is removed — use `import { color } from 'typestyles/color'` (or named imports from that subpath).

- [#89](https://github.com/type-styles/typestyles/pull/89) [`b29a531`](https://github.com/type-styles/typestyles/commit/b29a531dac4c7657b122a3af55141fee070a8fc9) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Request-safe SSR collection (P0.4): isolate `collectStyles` / `collectStylesFromModules` sheet state with Node `AsyncLocalStorage`, and add async render support to `collectStyles`.

### Patch Changes

- [#86](https://github.com/type-styles/typestyles/pull/86) [`fd16bad`](https://github.com/type-styles/typestyles/commit/fd16bad633315ba34ba352e6c3b63c167af41196) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Fix silent-wrong-output correctness issues (P0.1): refresh the unitless CSS property set, prefix `scopeId` onto semantic class names, add dev-mode class-name collision warnings, and wire `useTypestyles` to `subscribeRegisteredCss` via `useSyncExternalStore`.

## 0.5.0

### Minor Changes

- [#52](https://github.com/type-styles/typestyles/pull/52): Add built-in `cx()` utility for joining class names with falsy-value filtering
- [#63](https://github.com/type-styles/typestyles/pull/63): Add first-class container query helpers: `container()` for typed `@container` keys, readable `containerRef()` / `createContainerRef()` for `container-name`, and `atRuleBlock()` / `styles.atRuleBlock()` so computed `@…` nests type-check without casting. Documentation and design-system example updated.
- [#62](https://github.com/type-styles/typestyles/pull/62): Add **opt-in CSS cascade layers** (`@layer`) and a unified **`createTypeStyles`** factory.
  - **`createStyles({ layers })`** — Pass a layer tuple (`as const`) or `{ order, prependFrameworkLayers? }`. Emits a single `@layer …;` preamble (once per stack) and wraps rules in `@layer name { … }`. When enabled, every **`class`**, **`hashClass`**, and **`component`** call must pass a third argument **`{ layer: … }`** (with `hashClass`, use **`{ layer, label? }`** instead of a positional label).
  - **`createTokens({ layers, tokenLayer })`** — When `layers` is set, `tokenLayer` is required; `:root` and theme CSS are emitted into that layer.
  - **`createTypeStyles(options)`** — Returns **`{ styles, tokens }`** with one shared `scopeId` and optional `layers` / `tokenLayer` for both class and token output.
  - **`createTheme`** / **`createDarkMode`** — Optional fourth argument for layer context when using tokens with layers.

  Default behavior is unchanged when **`layers`** is omitted (flat CSS, no `layer` option).

  New exports include **`createTypeStyles`**, **`StylesApiWithLayers`**, **`CreateStylesInput`**, **`LayerOption`**, **`LayeredComponentFn`**, cascade layer types (**`CascadeLayersInput`**, **`ResolvedCascadeLayers`**, etc.), and **`ThemeEmitLayerContext`**.

  `ClassNamingConfig` may include resolved **`cascadeLayers`**. The sheet exposes **`registerCascadeLayerOrder`** for the preamble.

  Documentation: new cascade-layers doc (`docs/content/docs/cascade-layers.md`), updates to class naming, API reference, and tokens. The design-system example uses **`createTypeStyles`**.

- [#61](https://github.com/type-styles/typestyles/pull/61): Add function overload for `styles.component(namespace, (ctx) => config)` with component-scoped internal custom properties: `ctx.var(id, options?)` and `ctx.vars(definitions)` using the same nested shape as tokens (string/number leaves or `{ value, syntax?, inherits? }`). Default `value`s are merged into `base`; optional `syntax` registers `@property`. `ctx.var` now takes `value` (not `initialValue`) for defaults and typed registration. New exports: `ComponentConfigContext`, `ComponentVarDefinitions`, `ComponentVarDescriptor`, `ComponentVarNode`, `ComponentVarRefTree`, and related `*Input` types for the component overload.
- [#73](https://github.com/type-styles/typestyles/pull/73): **typestyles:** Extend `global.fontFace` / `FontFaceProps`: `src` may be a string or an array of fragments (joined into one CSS `src`); optional `@font-face` descriptors `sizeAdjust`, `ascentOverride`, `descentOverride`, and `lineGapOverride`; dedupe keys use normalized `src` (including array vs equivalent comma-separated string). Export `FontFaceSrc`. When the same rule dedupe key is registered again with different CSS, the later rule is skipped and non-production builds warn on the mismatch (re-registration with identical CSS stays silent). Tests cover multi-`src` font faces, metric overrides, and global dedupe warnings.

  **@typestyles/next:** README examples use `styles.component` and default variant calls; add **Fonts and local files** guidance for Next extraction (`public/fonts/`, root-relative URLs) versus Vite asset URLs.

- [#72](https://github.com/type-styles/typestyles/pull/72): Add **`createGlobal`** for scoped global CSS (optional cascade **`layers`** and default **`globalLayer`**), wire **`global`** into **`createTypeStyles`**, and ship a **`typestyles/globals`** entry with Josh Comeau’s **`reset`** (plus **`layer`** support for layered stacks) and small selector recipes.
  - **`createTypeStyles`** now returns **`{ styles, tokens, global }`**. With **`layers`**, pass optional **`globalLayer`** so `global.style` / **`global.apply`** defaults match your stack; **`tokenLayer`** remains required when layers are enabled.
  - **`global.style`** accepts **`GlobalStyleTuple`** recipes (from **`typestyles/globals`**) in addition to selector + properties; root **`global`** ignores per-call **`layer`** (dev warning) — use **`createGlobal`** / layered **`createTypeStyles`** for `@layer`.
  - **`global.apply(...tuples)`** applies multiple tuples in one call.
  - New **`content`** helper for typed CSS **`content`** values on the main export.
  - Types: **`GlobalApiUnlayered`**, **`GlobalApiLayered`**, **`GlobalStyleTuple`**.

- [#59](https://github.com/type-styles/typestyles/pull/59): Replace global class naming with **instance-based** APIs.

  **Breaking:** Remove `configureClassNaming`, `getClassNamingConfig`, and `resetClassNaming`. Use **`createStyles({ mode?, prefix?, scopeId? })`** for a dedicated style API (same surface as the default `styles` export). The default `import { styles } from 'typestyles'` is `createStyles()` with default options.

  **Breaking:** **`createTokens({ scopeId? })`** returns the token and theme API (`create`, `use`, `createTheme`, `createDarkMode`, `when`, `colorMode`, plus read-only `scopeId`). The default `import { tokens } from 'typestyles'` is `createTokens()`. When `scopeId` is set, emitted custom properties and theme class segments are prefixed (sanitized) so multiple bundles on one page do not collide.

  **Breaking:** Low-level **`createComponent`**, **`createClass`**, and **`createHashClass`** now take **`ClassNamingConfig`** as the first argument when imported from implementation modules; application code should use `createStyles()` or the default `styles` object.

  **Breaking:** **`createTheme`** and **`createDarkMode`** accept an optional third argument **`scopeId`** for unscoped usage; instances from `createTokens({ scopeId })` bind scope automatically.

  New exports: **`mergeClassNaming`**, **`defaultClassNamingConfig`**, **`scopedTokenNamespace`**, **`StylesApi`**, **`TokensApi`**, **`CreateTokensOptions`**. Style instances expose read-only **`classNaming`**.

  Documentation, examples, and the design-system package are updated to describe and use the new pattern.

- [#49](https://github.com/type-styles/typestyles/pull/49): Add ESLint configuration across all packages, examples, and docs. Create shared `eslint.base.js` config with TypeScript rules and add lint scripts to all package.json files. Update CI workflow to run lint via turbo.
- [#56](https://github.com/type-styles/typestyles/pull/56): Support nested token objects in `tokens.create` and the same nested shape in `tokens.createTheme`. Nested keys become hyphenated CSS custom properties (for example `color.text.primary` → `--color-text-primary` and `var(--color-text-primary)`).

  Export `flattenTokenEntries` and the `FlatTokenEntry` type so consumers can build `--namespace-key` declarations with the same rules as the token APIs.

  The design-system example now uses this pattern directly instead of local flatten/ref helpers.

- [#66](https://github.com/type-styles/typestyles/pull/66): Add `fileScopeId(import.meta)` for per-file `scopeId` so the same logical class or component name in different modules does not collide. In development, registering the same `styles.class` or `styles.component` name twice under one scope throws (with guidance to use `scopeId` / `fileScopeId`); production behavior is unchanged. In development, unknown variant dimensions, invalid option values, and unknown flat variant keys emit `console.error`. `createComponent` and `styles.component` overloads use `const` type parameters for sharper literal inference.
- [#68](https://github.com/type-styles/typestyles/pull/68): Infer multipart **`slots`** from the array literal passed to **`styles.component`** (and **`createComponent`**) using a `const` type parameter on `Slots extends readonly string[]`. Slot names are typed as `Slots[number]`, so destructuring and `()` return **`Record<…>`** with known keys and errors on unknown properties—**without `as const` on `slots`** when the array is written inline.

  **Type-only:** `MultiSlotConfig`, `MultiSlotReturn`, `SlotComponentConfig`, `SlotComponentFunction`, and related inputs now take a **readonly string tuple** type parameter (the `slots` array) instead of a single string union `S`. Call-site inference is unchanged for typical object literals; advanced `extends` / explicit generics may need a small adjustment.

  Docs and the design-system example drop redundant `as const` on `slots` where inference applies.

- [#57](https://github.com/type-styles/typestyles/pull/57): **Breaking:** `tokens.createTheme` now takes a config object with `base`, and either `modes` or `colorMode` (presets). Namespace overrides must live under `base` (for example `{ base: { color: { … } } }`). It returns a **`ThemeSurface`** (`className`, `name`, string coercion) instead of a plain class string—use `surface.className` or `` `${surface}` `` where a string is required.

  Adds **`tokens.when`** (media, `prefersDark` / `prefersLight`, attribute/class scope, `selector` escape hatch, `and` / `or` / **`not`**) and **`tokens.colorMode`** presets (`mediaOnly`, `attributeOnly`, `mediaOrAttribute`, `systemWithLightDarkOverride`), plus **`tokens.createDarkMode`** as a shorthand for media-only dark overrides.

  Theme rules use stable dedupe keys (`theme:{name}:base`, `theme:{name}:mode:{id}:branch:{n}`). In development, empty mode overrides and dubious `when.selector` / `when.not` shapes log warnings.

  **Types:** `ThemeOverrides` allows deep partial nested token maps; new exports include `ThemeConditionNot` and `DeepPartialTokenValues`.

- [#54](https://github.com/type-styles/typestyles/pull/54): Unify multi-variant styling on `styles.component` with a CVA-style return value: call it for a composed class string (base always applied) or destructure named class strings. Supports dimensioned variants (`variants`, `compoundVariants`, `defaultVariants`), flat variant maps, and slot-based configs.

  Remove `styles.create` from the public `styles` API; use `styles.component` instead.

  Update Vite and Rollup static namespace extraction to match `styles.component(...)` only (no longer scans `styles.create(...)`).

- [#64](https://github.com/type-styles/typestyles/pull/64): Add `has`, `is`, and `where` helpers for `:has()`, `:is()`, and `:where()` nested keys (also on `styles`). Infer literal `@container …` keys from typed `container()` arguments so bracket notation mixes with longhands without `as CSSProperties`; use `atRuleBlock` when the key is only a generic `string`. Export `ContainerObjectKey` and document the pattern in the docs.

### Patch Changes

- [#45](https://github.com/type-styles/typestyles/pull/45): Add comprehensive test coverage for previously untested modules: props utils/generate/runtime, typestyles build, and migrate transform/css/files.
- [#34](https://github.com/type-styles/typestyles/pull/34): `withTypestylesExtract` now sets `NEXT_PUBLIC_TYPESTYLES_RUNTIME_DISABLED` via `next.config` `env` so client bundles disable runtime style injection under **Turbopack** as well as webpack (webpack `DefinePlugin` alone does not run for Turbopack). Core `sheet` reads this env flag alongside `__TYPESTYLES_RUNTIME_DISABLED__`.

  README: build-time CSS / Turbopack notes; clarify `getTypestylesMetadata` and fix the previous `generateMetadata` example. Add `@typestyles/next` tests for `withTypestylesExtract`.

  TypeScript: module augmentation + `client.d.ts` declaration for `useServerInsertedHTML` (aligned `@types/react` / `@types/react-dom`); add `typecheck` script; restore `webpack` + `typestyles` devDependencies and `server.d.ts` / `./build` exports. `buildTypestylesForNext` now uses `collectStylesFromModules` from `typestyles/build` (no separate `@typestyles/build` package).

- [#50](https://github.com/type-styles/typestyles/pull/50): Add lint-staged for prettier formatting on pre-commit hook and format entire codebase

## Unreleased

### Breaking changes

- **Instance-based APIs replace global class naming.** Removed `configureClassNaming`, `getClassNamingConfig`, and `resetClassNaming`.
  - Use **`createStyles({ mode?, prefix?, scopeId? })`** for a dedicated style API (same surface as the default `styles` export). Default `import { styles } from 'typestyles'` is `createStyles()`.
  - Use **`createTokens({ scopeId? })`** for a dedicated token + theme API. Default `import { tokens } from 'typestyles'` is `createTokens()`. When `scopeId` is set, `tokens.create` / `createTheme` emit scoped `--{scope}-namespace-*` variables and `.theme-{scope}-{name}` classes (sanitized segments).
  - New exports: `mergeClassNaming`, `defaultClassNamingConfig`, `scopedTokenNamespace`, and types `StylesApi`, `TokensApi`, `CreateTokensOptions`.
- Low-level **`createComponent`**, **`createClass`**, and **`createHashClass`** now take **`ClassNamingConfig`** as the first argument when imported from internal modules; app code should use `createStyles()` or the default `styles` object instead.

## 0.4.0

### Minor Changes

- [#25](https://github.com/type-styles/typestyles/pull/25): Updating bundler integrations and adding examples
- [#27](https://github.com/type-styles/typestyles/pull/27): Add a new `styles.withUtils(utils)` API for defining typed style shorthands (for example `marginX`, `paddingY`, and `size`) and using them with `styles.class`, `styles.create`, and `styles.hashClass`.
- [#33](https://github.com/type-styles/typestyles/pull/33): Add configurable class naming modes for gradual adoption across packages:
  - `configureClassNaming({ mode, prefix?, scopeId? })` with modes `semantic` (default), `hashed`, and `atomic`.
  - Applies to `styles.create`, `styles.class`, `styles.component` (including slot recipes), and affects `prefix` / optional `scopeId` mixing for `styles.hashClass`.
  - Export `getClassNamingConfig` and `resetClassNaming` (for tests).

  Documentation:
  - New site page `docs/content/docs/class-naming.md` (sidebar: Class naming) describing modes, `scopeId`, SSR, and testing.
  - Cross-links from Getting Started, Styles, Recipes, Atomic CSS utilities, API Reference, and Testing.

- [#31](https://github.com/type-styles/typestyles/pull/31): Unify variant APIs around `styles.component` and add first-class multipart slot support via `slots`.

  Breaking changes:
  - Remove `styles.recipe` in favor of `styles.component`.
  - Remove recipe type aliases (`RecipeConfig`, `RecipeFunction`, `RecipeVariants`) and replace with component terminology (`ComponentVariants`, plus new slot component types).

  New capability:
  - `styles.component(name, { slots, base, variants, compoundVariants, defaultVariants })` now returns per-slot class maps for multipart components.

  Naming update for slot mode:
  - Slot base classes now use `{namespace}-{slot}` (without `-base`).

- [#23](https://github.com/type-styles/typestyles/pull/23): Add `styles.class()` for single-class definitions and a three-argument `styles.create(name, base, variants)` API that automatically includes base styles, then updated the Next.js example to use the new DX without affecting published packages.
- [#26](https://github.com/type-styles/typestyles/pull/26): feat: styles.recipe()

## 0.3.0

### Minor Changes

- [#9](https://github.com/type-styles/typestyles/pull/9): Add support for attribute selectors in nested styles. You can now use `[data-variant]`, `[disabled]`, `[data-size="lg"]` and other attribute selectors directly in style definitions:

  ```typescript
  styles.create('button', {
    padding: '8px',
    '[data-variant="primary"]': { backgroundColor: 'blue' },
    '[disabled]': { opacity: 0.5 },
  });
  ```

- [#10](https://github.com/type-styles/typestyles/pull/10): Fix lint errors and TypeScript issues
  - Replace `any` types with `unknown` in type definitions
  - Fix empty object types `{}` in defineProperties
  - Add proper generic type parameters to functions
  - Prefix unused parameters with underscore
  - Add eslint ignores for generated docs files and scripts
  - Fix test assertions to use proper types

### Patch Changes

- [#13](https://github.com/type-styles/typestyles/pull/13): Add CI workflow for lint, typecheck, and test

## 0.2.0

### Minor Changes

- [#6](https://github.com/type-styles/typestyles/pull/6): Add new `@typestyles/props` package for type-safe atomic CSS utility generation, with `defineProperties()` and `createProps()` APIs supporting responsive conditions, shorthand properties, and automatic CSS injection.

  Add `compose` to `styles` namespace for composing multiple selector functions or class strings. Add `createVar()` and `assignVars()` for CSS custom property management. Export `insertRules`, `reset`, and `flushSync` utilities from the sheet module. Add `CSSVarRef` and `RecipeVariants` type exports.

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
