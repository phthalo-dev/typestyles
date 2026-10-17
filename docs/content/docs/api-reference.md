---
title: API Reference
description: Complete API reference for typestyles
---

Auto-generated documentation for all typestyles APIs.

## Core Exports

### `createTypeStyles(options?)`

**Preferred entry point.** Returns a flat **`TypeStylesApi`**: `{ style, recipe, tokens, global, compose, override, scope, property, container, … }` with one shared **`scopeId`** (and optional **`mode`**, **`prefix`**, **`utils`**, **`breakpoints`**, **`colorModes`**, **`layers`**).

```ts
import { createTypeStyles } from 'typestyles';

export const { style, recipe, tokens, global } = createTypeStyles({ scopeId: 'app' });
```

**Style surface:**

- `style(name, properties, options?)`: Create a single named class (was `styles.class`)
- `hash(properties, options?)`: Deterministic hashed class (was `styles.hashClass`); `options` may include `label` and `layer`
- `recipe(namespace, config, options?)`: Multi-variant / slot recipe (was `styles.component`); optional `{ layer?, themeable? }`. Also accepts the **schema-first** shape `recipe(namespace, definition, callback, options?)` — see [`variant`](#variant-schema-axes) and [Schema-first recipes](/docs/schema-recipes)
- `compose(...fns)`: Compose multiple style functions
- `override(component, config, options?)`: Recipe-shaped typed overrides from component `__tsMeta`, including typed **`vars`** (see [Theming patterns](/docs/theming-patterns#override-component-internal-vars))
- `scope(opts, className, overrides)`: Proximity-correct overrides via CSS `@scope`
- `property(id, options?)` / `property.declare` / `property.set`: Standalone CSS custom properties (optional `@property` when `syntax` is set)
- `container(…)`, `supports(…)`, `has(…)`, `is(…)`, `where(…)`, `atRuleBlock(…)`, `when(…)`, `breakpoint(…)`, `media(…)`, `containerRef(label)`: Nested-selector / at-rule helpers (also available as top-level named exports)
- `classNaming`: Read-only resolved naming config
- Component registry: `getComponent(namespace)`, `getThemeableComponents()`, `listComponentNamespaces()` — recipes register on `recipe()`; pass `{ themeable: false }` to exclude utilities from theme override maps

**Cascade layers:** Pass nested **`layers: { order, token, style, global? }`**. `token` / `style` (and optional `global`) are the defaults so call sites rarely need `{ layer }` — see [Cascade layers](/docs/cascade-layers).

**Related exports:** `colorModes` (`['light', 'dark']`), `conditional(when, style, id?)`, `whenStyle(condition, style)`, `StylableOverride`, `ConditionalOverride`, `ModeAwareValue`, `container`, `createContainerRef`, `supports`, `atRuleBlock`, `createBreakpointMediaFn`, `createMediaFn`, `resolveBreakpointMediaKey`, `has`, `is`, `where`.

**Helpers:** `getComponentMeta(component)` — read public component metadata attached by `recipe()` (including `schema` for [schema-first recipes](/docs/schema-recipes)).

**Related types:** `TypeStylesApi`, `TypeStylesLayersConfig`, `OverrideConfig`, `OverrideConfigFor`, `InferVarDefinitions`, `ComponentVarValues`, `ComponentVarAssignValue`, `ComponentCreateOptions`, `OverrideOptions`, `OverrideFn`, `ComponentMeta`, `ComponentVarRegistry`, `VariantOptionKey`, `CompoundSelectionValue`, `ContainerQueryKey`, `ContainerObjectKey`, `HasNestedKey`, `IsNestedKey`, `WhereNestedKey`, `IsPseudoArg`. See [Custom selectors & at-rules](/docs/custom-at-rules) and [TypeScript tips](/docs/typescript-tips).

### `variant` (schema axes)

`variant.enum(options, { default })` and `variant.boolean({ default })` build branded axes for [schema-first recipes](/docs/schema-recipes). Pass a definition `{ slots?, variants }` as the second `recipe` argument so the style callback is contextually typed from known keys.

```ts
import { createTypeStyles, variant } from 'typestyles';

const { recipe } = createTypeStyles({ mode: 'attribute' });

const controlSize = variant.enum(['sm', 'md', 'lg'], { default: 'md' });

const button = recipe(
  'button',
  { variants: { size: controlSize, elevated: variant.boolean({ default: false }) } },
  () => ({
    variants: {
      size: { sm: {}, md: {}, lg: {} },
      elevated: { true: {}, false: {} },
    },
  }),
);

button.defaults; // { size: 'md', elevated: false }
```

**Related types:** `VariantAxis`, `EnumVariantAxis`, `BooleanVariantAxis`, `VariantOptions`, `RecipeDefinition`, `RecipeStyles`, `RecipeHandle`, `RecipeVariants`, `RecipeDefaults`, `RecipeVariantSelections`, `SchemaRecipeOptions`. Also `recipeAxisBrand` (runtime brand).

### `tokens` (from `createTypeStyles` / `createTokens`)

Token + theme API bound to an optional `scopeId`. Prefer the `tokens` from **`createTypeStyles`** so styles and tokens share one scope.

**Methods:**

- `tokens.create(namespace, values, options?)`: Creates CSS custom properties; returns a branded `CreatedTokenRef`. Values are plain `string | number`, or `{ light, dark }` leaves when `colorModes` is configured (see [Tokens — Mode-aware token leaves](/docs/tokens#mode-aware-token-leaves)). Multiple calls on the same namespace merge values. Pass `{ decl }` (the return value of `tokens.declare`) for typed partial fills, dev-mode namespace alignment, and syntax-aware value checking when the schema uses `syntax` leaves.
- `tokens.declare(namespace, schema, options?)`: Declares a namespace schema, emits `@property` for `syntax` leaves, and returns a typed forward-reference proxy usable before `tokens.create()`. Schema leaves are `{ syntax, inherits?, initial? }` or `true` (plain path). Syntax leaves return `SyntaxRef<'<color>'>` (etc.) for compile-time property and cross-token ref checking — see [Tokens — Syntax-typed tokens](/docs/tokens#syntax-typed-tokens). Optional `nameTemplate` must match later `create()` calls (dev-mode throw on mismatch). See [Tokens — Forward-referencing tokens](/docs/tokens#forward-referencing-tokens-tokensdeclare).
- `tokens.use(namespace | createdRef | declRef)`: References existing tokens; infers types from a `tokens.create()` return value, a `tokens.declare()` return value (`SyntaxRef` brands preserved), or a `createTokens<Registry>()` generic
- `tokens.createTheme(input)`: Single object with **`name`**, **`tokens`** (per-namespace overrides on the theme class), optional **`colorMode`**, **`modes`**, **`components`**, **`replace`** (default `true`). Prefer `:root` defaults via `tokens.create` and theme **deltas**; see [End-to-end theming](/docs/theming-end-to-end). Fork child themes with **`Theme.override`**: [Deriving child themes](/docs/theming-patterns#deriving-child-themes-override).
- `tokens.disposeTheme(name, options?)`: Unregister a theme by name (dedupe keys + live CSSOM). Useful for HMR and live theme editors — most apps define themes once and switch with `className`. HMR prefixes: `theme:{segment}:*` and, with layers, `layer:{tokenLayer}:theme:{segment}:*`.
- **`components`**: map of component **namespace** → override config (or `(ctx) => config`). Requires `createTypeStyles`. **`tokens`**: namespace map registered for this theme; `Theme.tokens` exposes refs (`theme.tokens.brand`, …). Use `as const` on `tokens` for the sharpest inference on `ctx.tokens` in factories.
- `tokens.ensureNamespace(namespace, values)`: create-if-absent, then return `tokens.use(namespace)`.
- **`Theme.override(input)`**: typed deep-merge fork of a root theme (`name`, optional `tokens` / `colorMode` / `modes` / `components` / `replace`). Closed against the root token tree.
- `tokens.createDarkMode(name, darkOverrides)`: Shorthand theme with a single dark `@media` branch
- `tokens.when` / `tokens.colorMode`: Condition helpers for themes
- `tokens.scopeId`: The scope passed to `createTokens` / `createTypeStyles`, if any

### `createTokens(options?)`

Lower-level factory for a token + theme API alone. When `scopeId` is set, `tokens.create('color', …)` emits `--{scopeId}-color-*` variables and `tokens.createTheme({ name: 'dark', … })` registers `.theme-{scopeId}-dark` (sanitized segments). With **`layers`**, **`tokenLayer`** is required and token/theme CSS is wrapped in that layer. Optional **`nameTemplate`** on the instance or per `tokens.create` call controls emitted `--*` names (see [Tokens](/docs/tokens#custom-css-variable-names-nametemplate)). Optional **`colorModes`** registers mode keys for `{ light, dark }` token leaves and theme `colorMode` patches (`light-dark()` emission); use the **`colorModes`** constant from `typestyles` (`['light', 'dark']`).

Exported types: **`TokenNameContext`**, **`TokenNameTemplate`**, **`FlatTokenPathEntry`**, **`TokenSchema`**, **`TokenSchemaLeaf`**, **`DeclaredTokenRef`**, **`CreateTokenValues`**, **`TokenDescriptor`** (for `ctx.vars()` / `property`), **`SyntaxRef`**, **`CssSyntax`**, **`SyntaxRefAccepts`**, **`CreateValueForSyntax`**, **`CompatibleSourceSyntax`**, **`SyntaxAwareLonghands`**, **`CSSPropertyValue`**, **`InferFromSchema`**, **`InferValuesFromSchema`**. Helper: **`flattenTokenPaths`** (segment-preserving flatten for custom templates).

### `createStyles(options?)`

Lower-level styles-only factory (`styles.class` / `styles.component` / …). Prefer **`createTypeStyles`** for app and library code. Pass `Partial<ClassNamingConfig>`: `mode` (`'semantic' | 'hashed' | 'compact' | 'atomic' | 'attribute' | 'bem' | 'template'`), `prefix`, `scopeId`. Optionally pass **`utils`**, **`layers`** + **`tokenLayer`** / **`styleLayer`**, and **`colorModes`** — see [Cascade layers](/docs/cascade-layers) and [Theming patterns — mode-aware overrides](/docs/theming-patterns#mode-aware-property-values-colormodes).

### `keyframes`

Keyframe animation API.

**Methods:**

- `keyframes.create(name, stops)`: Creates @keyframes animation

### `color` (`typestyles/color`)

Type-safe CSS color function helpers, on a **separate subpath** so the main `typestyles` entry stays lean. Import `color` (namespace) or named functions from `typestyles/color`.

Each function returns a plain CSS color string — no runtime color math.
Composes naturally with token references.

**Functions:**

- `color.rgb(r, g, b, alpha?)`: RGB color
- `color.hsl(h, s, l, alpha?)`: HSL color
- `color.oklch(l, c, h, alpha?)`: OKLCH color
- `color.oklab(l, a, b, alpha?)`: OKLAB color
- `color.lab(l, a, b, alpha?)`: LAB color
- `color.lch(l, c, h, alpha?)`: LCH color
- `color.hwb(h, w, b, alpha?)`: HWB color
- `color.mix(c1, c2, p?, space?)`: Mix two colors
- `color.lightDark(light, dark)`: Light/dark mode color
- `color.alpha(color, opacity, space?)`: Adjust opacity

See [Color](/docs/color).

### `atProperty` presets

Import: `import { atProperty } from 'typestyles'` or `import { atProperty } from 'typestyles/css'`

Spreadable `@property` registration presets (`color`, `angle`, `number`, `length`, …) for `tokens.declare`, `ctx.vars.declare`, `styles.property.declare`, and `css.atProperty`. Helpers: `atProperty.list(preset)`, `atProperty.union(...presets)`.

See [CSS primitives](/docs/css-primitives#atproperty-presets).

### `typestyles/css`

Import: `import { css, atProperty } from 'typestyles/css'`

CSS-faithful custom property emitters with exact `--name` control — no `scopeId`, no namespace prefixing. See [CSS primitives](/docs/css-primitives).

- `css.atProperty(name, registration)` — emit `@property` only
- `css.customProperty(name, value, options?)` — emit value declaration (default selector `:root`)
- `css.customProperties(selector, properties)` — batch emit on one selector
- `css.var(name)` — ref without emitting

### `color-scale` (`typestyles/color-scale`)

OKLCH ramp generation and WCAG contrast math, on a **separate subpath** (zero impact on main bundle size).

**Functions:**

- `parseColor(hex)`: Hex → `{ l, c, h }` in OKLCH units (hex only in v1)
- `generateRamp({ hue, chroma, steps?, lightnessRange? })`: Perceptual OKLCH ramp (lightest → darkest)
- `contrastRatio(colorA, colorB)`: WCAG relative luminance ratio (hex or `oklch()` strings)

See [Theming Patterns — Generating a theme from one accent color](/docs/theming-patterns#generating-a-theme-from-one-accent-color).

### `token-scale` (`typestyles/token-scale`)

Generic numeric ramp generators for type/motion/radius ladders, on a **separate subpath** (zero impact on main bundle size). Pure numbers in, pure numbers out — naming steps is a design-system concern.

**Functions:**

- `generateGeometricScale({ base, ratio, steps, round? })`: `base * ratio ** offset` for each signed integer offset in `steps` (font-size-style ladders)
- `generateLinearScale({ base, multiplier, steps, round? })`: `base * step * multiplier` for each ordinal in `steps` (radius-style ladders)
- `expandDurationBand({ base, ratio, roundTo? })`: `{ min, base, max }` motion band (`min = base * ratio`, `max = base / ratio`, rounded to nearest 5 by default)

See [Theming Patterns — Generating type, motion, and radius scales](/docs/theming-patterns#generating-type-motion-and-radius-scales).

### `calc` and `clamp`

Helpers for CSS `calc()` and `clamp()` that always emit balanced outer parentheses:

- **`calc`** — tagged template: `` calc`100vh - ${token}` `` → `calc(100vh - …)`
- **`clamp(min, preferred, max)`** — three arguments → `clamp(min, preferred, max)`

### Trigonometric and exponential functions

Thin wrappers for CSS math functions, same "no validation of inner syntax" stance as `calc` / `clamp`:

- **`sin(value)`**, **`cos(value)`**, **`tan(value)`**
- **`atan2(y, x)`**
- **`pow(base, exponent)`**, **`sqrt(value)`**, **`hypot(...values)`**

```ts
import { sin, pow, hypot } from 'typestyles';

sin('45deg'); // "sin(45deg)"
pow('2', '8'); // "pow(2, 8)"
hypot('3px', '4px'); // "hypot(3px, 4px)"
```

See [TypeScript Tips — Complex CSS values](/docs/typescript-tips).

### Cascade layers (types)

Exported types include **`TypeStylesLayersConfig`**, **`CascadeLayersInput`**, **`CascadeLayersObjectInput`**, **`ResolvedCascadeLayers`**, and **`ThemeEmitLayerContext`** (theme emission with layers).

### `global` (from `createTypeStyles` / `createGlobal`)

Global CSS helpers (not scoped to a component class). Prefer `global` from **`createTypeStyles`** so it shares `scopeId` and cascade layers.

- `global.rule(selector, properties, options?)`: Insert rules for a single selector. Rules dedupe by an internal key (`scopeId` + selector + layer when layered). A second call with the **same** key and **different** CSS is skipped; in non-`production` builds, TypeStyles logs a **console warning**. Also accepts a recipe tuple from `typestyles/globals`.
- `global.rules(styles, options?)`: Insert rules for many selectors in one call (shared optional `{ layer }`).
- `global.apply(...tuples)`: Apply multiple `typestyles/globals` recipe tuples.
- `global.fontFace(family, props)`: Register `@font-face` (supports `src` as a string or array of fragments, variable font weight ranges, `font-display`, `unicode-range`, and metric overrides — see [Fonts](/docs/fonts))

Lower-level: **`createGlobal(options?)`** returns the same surface without pairing styles/tokens.

### `cx(...parts)`

Joins class name parts into a single string, filtering out falsy values (`false`, `undefined`, `null`, `0`, `''`).

Use `cx` to combine TypeStyles classes with external class strings and conditional expressions.

In development, passing a `ComponentAttrsResult` from attribute mode logs a warning — variant attrs are not applied. Use [`mergeProps`](#mergepropsresult-classnames) or [`combine`](#combineparts) instead. See [Attribute mode — React & Astro](/docs/attribute-mode-react).

```ts
import { createTypeStyles, cx } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const card = recipe('card', {
  base: { padding: '16px' },
  elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
});

cx(card(), isElevated && card.elevated, externalClassName);
```

### `mergeProps(result, ...classNames)`

Merge a recipe result (or plain class string) with optional extra class names, returning a flat props bag for DOM spread.

```ts
import { mergeProps } from 'typestyles';

const s = button({ tone: 'accent' });
<button {...mergeProps(s, className)}>Save</button>;
```

See [Attribute mode — React & Astro](/docs/attribute-mode-react).

### `combine(...parts)`

Merge multiple recipe results onto one element — union of class names and compatible attrs. Accepts an optional trailing `{ className }` for consumer overrides.

```ts
import { combine } from 'typestyles';

<a {...combine(c.root, c.linkRoot, className)} href={href}>…</a>
```

See [Attribute mode — React & Astro](/docs/attribute-mode-react).

### CSS variables (dynamic styling)

- [`createVar(name?, fallback?)`](/docs/dynamic-styles), [`assignVars(vars)`](/docs/dynamic-styles): Typed custom property helpers for per-instance dynamic values. Pass a debug name (e.g. `createVar('cardBg')`) for readable DevTools property names.

### Sheet and testing utilities

- `getRegisteredCss()`: Returns all CSS registered so far (useful with SSR or diagnostics)
- `subscribeRegisteredCss(listener)`: Subscribe to CSS registration changes; returns an unsubscribe function. Compatible with React `useSyncExternalStore` (used by `@typestyles/next` `useTypestyles`)
- `reset()`, `flushSync()`, `ensureDocumentStylesAttached()`: Primarily for tests and advanced setup; see [Testing](/docs/testing)
- `insertRules(rules)`: Low-level rule insertion (mainly for library authors)

### SSR helpers (`typestyles/server`)

- `collectStyles(renderFn)`: Wrap a sync or async render; returns `{ html, css }`. Request-isolated on Node via `AsyncLocalStorage`. See [SSR](/docs/ssr).
- `TYPESTYLES_STYLE_ID`: Stable `"typestyles"` id for the managed `<style>` element (must match client hydration)
- `typestylesStyleHtml(css)`: Render `<style id="typestyles">…</style>` (empty string when `css` is empty)
- `injectStylesIntoHtml(html, css)`: Insert collected CSS before `</head>`
- `streamingDocumentShell(css)`: Open doctype + `<head>` + `<body>` for `renderToPipeableStream` (pair with `collectStyles` for the CSS pass)

### Class naming helpers

- `mergeClassNaming(partial?)`: Build a full `ClassNamingConfig` from partial options
- `defaultClassNamingConfig`: Default `mode`, `prefix`, and `scopeId`
- `scopedTokenNamespace(scopeId, logicalNamespace)`: CSS variable namespace segment for scoped token instances

Exported types: **`ClassNamingMode`**, **`ClassNamingConfig`**, **`ClassNameContext`**, **`ClassNameTemplate`** — the last two type `classNameTemplate` for `mode: 'template'` (and its `mode: 'bem'` preset). See [Class naming](/docs/class-naming).

## Usage Examples

### Creating styles

```ts
import { createTypeStyles } from 'typestyles';

const { recipe, tokens } = createTypeStyles({ scopeId: 'app' });

const button = recipe('button', {
  base: { padding: '8px 16px' },
  variants: {
    intent: { primary: { backgroundColor: '#0066ff' } },
  },
  defaultVariants: { intent: 'primary' },
});

button(); // "app-button app-button--intent-primary"
button({ intent: 'primary' }); // same
const { base } = button; // destructure class strings
```

### Creating tokens

```ts
const color = tokens.create('color', {
  primary: '#0066ff',
  secondary: '#6b7280',
});

color.primary; // "var(--app-color-primary)"
```

### Scoped instances (libraries / micro-frontends)

```ts
import { createTypeStyles } from 'typestyles';

export const { style, recipe, tokens, global } = createTypeStyles({
  scopeId: 'my-ds',
  mode: 'hashed',
  prefix: 'ds',
});
```

### `:has()`, `:is()`, `:where()` (nested selectors)

Use the helpers as **computed keys** so you keep normal CSS semantics (including `:where`’s zero specificity) with the same “small builder” ergonomics as `container()`:

```ts
import { createTypeStyles } from 'typestyles';

const { style, where, has, is } = createTypeStyles({ scopeId: 'app' });

const nav = style('nav', {
  display: 'flex',
  [where('.nav')]: { gap: '8px' },
  [has('.active')]: { borderBottom: '2px solid blue' },
  [is(':hover', ':focus-visible')]: { outline: '2px solid blue' },
});
```

The named exports `has`, `is`, and `where` are identical to the helpers on a `createTypeStyles` instance. The `IsPseudoArg` type documents common pseudos for `:is()` groups.

### Creating Animations

```ts
import { keyframes } from 'typestyles';

const fadeIn = keyframes.create('fadeIn', {
  from: { opacity: 0 },
  to: { opacity: 1 },
});

// Use in styles
animation: `${fadeIn} 300ms ease`;
```

---

_This API reference was auto-generated from source code._
_Last updated: 2026-04-06_
