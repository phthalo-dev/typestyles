---
title: Components
description: Build typed variant APIs with recipe
---

`recipe()` is the API for component styling. It takes one object. Declare `slots`, variant axes, and component `vars` on that object, and put the CSS in `styles`. `styles` is an object or `({ vars }) => object`, and it is checked against those fields. Tokens are imported; they are not passed into the style callback.

- `styles.base` — always-on styles. With `slots`, each slot's styles nest under `base` (`'& > *'` is legal on a flat `base`, and is not a sibling of a slot).
- `variants` — `variant.enum` / `variant.boolean` axes. Option styles live in `styles.variants`, and every declared option is required.
- `styles.compoundVariants` — styles that apply for a combination of axis values.
- `vars` — component custom properties (`{ syntax, value }`). The callback receives the ref tree (`.name`, `.var`).

The call always returns `{ className, attrs, props }`. `String(button())` and `cx(button(), className)` use that class string. When `slots` is set, the call returns one result per slot, and each slot name is also a class string on the function (`tabs.root`).

For one-off rules with no variants, see [Styles](/docs/styles).

```ts
import { createTypeStyles } from 'typestyles';

export const { recipe, style, override, tokens } = createTypeStyles({ scopeId: 'app' });
```

## Basic component

The live example defines a dimensioned `button` with `intent` and `size` variants, then shows how to call it. Class strings follow the global [class naming](/docs/class-naming) configuration (`semantic` by default).

<!-- doc-live-demo id="components-variants" -->

## Compound variants

Use `compoundVariants` for styles that should apply only when multiple variant values match.

```ts
import { variant } from 'typestyles';
const badge = recipe({
  name: 'badge',
  variants: {
    tone: variant.enum(['success', 'warning', 'danger'], { default: 'success' }),
    size: variant.enum(['sm', 'lg'], { default: 'sm' }),
  },
  styles: {
    compoundVariants: [
      {
        variants: { tone: ['success', 'warning'], size: 'lg' },
        style: { fontWeight: 700 },
      },
    ],
    variants: {
      tone: {
        success: { color: '#166534' },
        warning: { color: '#92400e' },
        danger: { color: '#991b1b' },
      },
      size: {
        sm: { fontSize: '12px' },
        lg: { fontSize: '14px' },
      },
    },
  },
});

badge({ tone: 'success', size: 'lg' }); // "badge badge--tone-success badge--size-lg"
badge({ tone: 'danger', size: 'lg' }); // no matching compound rule
```

`compoundVariants` supports:

- single values: `{ size: 'lg' }`
- multi-value arrays: `{ tone: ['success', 'warning'] }`

## Boolean variants

Declare a boolean axis with `variant.boolean`. The callable prop is a `boolean`. The style map still uses `"true"` / `"false"` keys, one per CSS branch.

```ts
import { variant } from 'typestyles';
const input = recipe({
  name: 'input',
  variants: { invalid: variant.boolean({ default: false }) },
  styles: {
    base: { border: '1px solid #d1d5db' },
    variants: {
      invalid: {
        true: { borderColor: '#ef4444' },
        false: { borderColor: '#d1d5db' },
      },
    },
  },
});

input().className; // "input input--invalid-false"
input({ invalid: true }).className; // "input input--invalid-true"
```

## Multipart `slots`

Pass a `slots` array for components with multiple parts (for example root, trigger, and panel). Slot styles nest under `styles.base`. Variant option styles and `compoundVariants` target those same slot keys.

An inline `slots` array is inferred as a tuple, so `tabs.root` is a class string and an unknown slot is an error. `as const` is for a slots array that lives in its own variable.

```ts
import { variant } from 'typestyles';
const tabs = recipe({
  name: 'tabs',
  slots: ['root', 'trigger', 'content'] as const,
  variants: { size: variant.enum(['sm', 'lg'], { default: 'sm' }) },
  styles: {
    base: {
      root: { display: 'grid' },
      trigger: { cursor: 'pointer' },
    },
    variants: {
      size: {
        sm: {
          trigger: { fontSize: '12px' },
          content: { padding: '8px' },
        },
        lg: {
          trigger: { fontSize: '16px' },
          content: { padding: '12px' },
        },
      },
    },
  },
});

const c = tabs();
c.root.className; // class string for the root element
tabs.root; // the same class, without calling
c.trigger.className;
c.content.className;
```

A slots array stored in a variable needs `as const` so the names stay a tuple. Axes are declared on `variants`, not inferred from `styles`:

```ts
import { variant } from 'typestyles';

const APP_SHELL_SLOTS = ['root', 'header', 'main'] as const;

export const appShell = recipe({
  name: 'app-shell',
  slots: APP_SHELL_SLOTS,
  variants: {
    density: variant.enum(['compact', 'comfortable'], { default: 'compact' }),
  },
  styles: {
    base: { root: { display: 'grid' } },
    variants: {
      density: {
        compact: { root: { gap: '4px' } },
        comfortable: { root: { gap: '12px' } },
      },
    },
  },
});
```

`slots`, `variants`, and `vars` are not inferred from the `styles` callback. A selector such as `'& > *'` belongs inside a slot's style object, not beside the slot names.

For **class-based** modes (`semantic` / `bem` / `template`), a `compoundVariants` entry whose `style` targets a slot only includes dimensions that actually emitted a modifier class for that slot. If a dimension option never styles the slot, that constraint is omitted from the chained selector and the compound can apply more broadly than the `variants` object suggests. Give every compounded dimension a style on that slot, or prefer `mode: 'attribute'` (attrs land on every slot).

## Data and ARIA selectors

`recipe` supports all CSS selectors:

```ts
const accordionTrigger = recipe({
  name: 'accordion-trigger',
  styles: {
    base: {
      '&[data-state="open"]': { fontWeight: 600 },
      '&[aria-expanded="true"]': { color: '#1d4ed8' },
    },
  },
});
```

## Attribute-driven variants

Some design systems want variant state expressed as `data-*` attributes on the DOM
(Radix/shadcn-style: one stable class, `data-variant`/`data-size` legible in the
markup) rather than as discrete classes. Set `mode: 'attribute'` on
`createStyles`/`createTypeStyles`; every dimensioned component then compiles each
option to a selector on its single semantic base class:

```ts
import { variant } from 'typestyles';
const { recipe, style } = createTypeStyles({ mode: 'attribute' });

const button = recipe({
  name: 'button',
  variants: {
    variant: variant.enum(['primary', 'secondary'], { default: 'primary' }),
    size: variant.enum(['small', 'large'], { default: 'small' }),
  },
  styles: {
    base: { padding: '8px 16px', borderRadius: '6px' },
    variants: {
      variant: {
        primary: { backgroundColor: '#0066ff', color: '#fff' },
        secondary: { backgroundColor: '#6b7280', color: '#fff' },
      },
      size: {
        small: { fontSize: '14px' },
        large: { fontSize: '18px' },
      },
    },
  },
});

const b = button({ variant: 'primary', size: 'small' });
b.className; // "button"
b.attrs; // { 'data-variant': 'primary', 'data-size': 'small' }
b.props; // { className: 'button', 'data-variant': 'primary', 'data-size': 'small' }

<button {...b.props}>...</button>;
// <button class="button" data-variant="primary" data-size="small">
```

`String(b)` / template-literal coercion and `cx(b, 'extra')` still return `"button"`,
same as a plain class string.

Boolean dimensions (option keys exactly `{ true, false }`) are presence-based rather than value-matched: `true` compiles to `&[data-disabled]` and sets `data-disabled` with an empty value; `false` compiles to `&:not([data-disabled])` and omits the attribute entirely.

```ts
variants: {
  disabled: {
    true: { opacity: 0.5, cursor: 'not-allowed' },
    false: {},
  },
},
```

`compoundVariants` still work — each condition compiles to a single combined attribute
selector (`.button[data-variant="primary"][data-size="large"]`) with no extra compound
class and no runtime matching; an array of allowed values for one dimension
(`{ tone: ['success', 'warning'], size: 'lg' }`) compiles to a `:is(...)` group ANDed
with the rest of the condition.

`mode` is an instance-wide setting on `createStyles`/`createTypeStyles`, like `semantic`/`hashed`/`compact`/`atomic` — there is no per-component override. A design system that wants both attribute-based and class-based (or BEM-based) components creates two instances.

**Trade-offs:**

- No per-option class hooks — `button['variant-primary']` doesn't exist in attribute
  mode, since there is no discrete class to expose. `button.base` exposes the stable
  base class.
- Attribute slot recipes are supported. The call returns
  `{ className, attrs, props }` for every declared slot, so spread that slot's `.props`
  on the matching element. `dialog.root` is the slot's class string.
- Attribute names are kebab-cased. For example, `fontWeight` becomes
  `data-font-weight`, which also round-trips through `element.dataset.fontWeight`.

### Attribute slots

```ts
import { variant } from 'typestyles';
const dialog = recipe({
  name: 'dialog',
  slots: ['root', 'content'] as const,
  variants: { size: variant.enum(['lg'], { default: 'lg' }) },
  styles: {
    base: { root: { display: 'grid' }, content: { padding: '8px' } },
    variants: {
      size: {
        lg: { content: { padding: '16px' } },
      },
    },
  },
});

const d = dialog({ size: 'lg' });
// d.root.props    -> { className: 'dialog', 'data-size': 'lg' }
// d.content.props -> { className: 'dialog__content', 'data-size': 'lg' }
```

Attributes go on every declared slot. TypeStyles cannot assume one slot is a
descendant of another, so it emits each slot's selector locally rather than inventing
a descendant selector.

## BEM variant naming

Some design systems author class names as BEM (Block Element Modifier). Set `mode: 'bem'` and dimensioned/slot `recipe()` variants compile to BEM modifier classes instead of the default `{namespace}-{dimension}-{option}` naming:

```ts
import { variant } from 'typestyles';
const { recipe, style } = createTypeStyles({ mode: 'bem' });

const button = recipe({
  name: 'button',
  variants: {
    variant: variant.enum(['primary', 'secondary'], { default: 'primary' }),
    size: variant.enum(['small', 'large'], { default: 'small' }),
  },
  styles: {
    base: { padding: '8px 16px', borderRadius: '6px' },
    compoundVariants: [
      { variants: { variant: 'primary', size: 'large' }, style: { fontWeight: 700 } },
    ],
    variants: {
      variant: {
        primary: { backgroundColor: '#0066ff', color: '#fff' },
        secondary: { backgroundColor: '#6b7280', color: '#fff' },
      },
      size: {
        small: { fontSize: '14px' },
        large: { fontSize: '18px' },
      },
    },
  },
});

button({ variant: 'primary', size: 'large' });
// "button button--primary button--large"

button.base; // "button" — no "-base" suffix; the bare block class IS the base state
button['variant-primary']; // "button--primary" — no dimension name in the modifier
```

Compound variants compile to a chained modifier-class selector (`.button--primary.button--large`) with no synthetic compound class and no runtime matching — the browser resolves it once both modifier classes are present, the same way `mode: 'attribute'` handles compounds via chained attribute selectors.

**Multi-part components** work via `slots`, mapping onto the `root`/`trigger`/`content` convention already used elsewhere in this doc: the `root` slot is the bare block class; every other slot is a BEM element (`block__element`):

```ts
import { variant } from 'typestyles';
const dialog = recipe({
  name: 'dialog',
  slots: ['root', 'trigger', 'content'] as const,
  variants: { size: variant.enum(['sm', 'lg'], { default: 'sm' }) },
  styles: {
    base: { root: { display: 'grid' }, trigger: { cursor: 'pointer' } },
    variants: {
      size: {
        sm: { trigger: { fontSize: '12px' }, content: { padding: '8px' } },
        lg: { trigger: { fontSize: '16px' }, content: { padding: '12px' } },
      },
    },
  },
});

const d = dialog({ size: 'lg' });
d.root.className; // "dialog"
d.trigger.className; // "dialog__trigger dialog__trigger--lg"
d.content.className; // "dialog__content dialog__content--lg"
```

**The collision caveat:** BEM has no dimension namespace, so two _different_ dimensions producing the same option string collide on the identical class name (e.g. `intent: 'primary'` and `theme: 'primary'` both want `button--primary`). This is inherent to BEM, not a typestyles limitation — `recipe()` warns in dev when it happens, rather than silently letting one CSS rule clobber the other in the cascade. Choose non-colliding option names across a component's dimensions.

Like [`mode: 'attribute'`](#attribute-driven-variants), `mode: 'bem'` is an
instance-wide setting — no per-component override. `style()` is unaffected;
flat (non-dimensioned) `recipe()` configs retain their historical hyphen
names under `bem`, rather than the semantic `card` / `card--elevated` grammar.

## Generic classname template

`mode: 'bem'` is itself a preset of a more general mechanism: `mode: 'template'` lets you supply your own `classNameTemplate: (ctx) => string` function, so any block/element/modifier naming convention — SUIT CSS, a prefixed/ITCSS scheme, a house style — works without waiting for `typestyles` to ship a named mode for it.

```ts
const { recipe, style } = createTypeStyles({
  mode: 'template',
  classNameTemplate: ({ scope, namespace, element, dimension, modifier }) => {
    const base = element ? `${scope}${namespace}__${element}` : `${scope}${namespace}`;
    return modifier ? `${base}--${modifier}` : base;
  },
});
```

`classNameTemplate` is called once per emitted class for dimensioned and slot/multi-slot
`recipe()` configs — never for `style()` or flat (non-dimensioned)
configs, which retain their historical hyphen naming in template mode. It receives:

- `scope` — the sanitized `scopeId` prefix (already includes a trailing `-`), `''` when unscoped.
- `namespace` — the `recipe()` name, e.g. `'button'`.
- `element` — the slot name for slot/multi-slot components (`undefined` for the `root` slot or non-slot components).
- `dimension` — the variant dimension name, `undefined` when naming a base/block/element class.
- `modifier` — the variant option value, `undefined` when naming a base/block/element class.

`classNameTemplate` is **required** when `mode: 'template'` — `createTypeStyles` throws immediately without it.

### SUIT CSS

```ts
import { variant } from 'typestyles';
const { recipe, style } = createTypeStyles({
  mode: 'template',
  classNameTemplate: ({ scope, namespace, element, modifier }) => {
    const Block = `${scope}${namespace[0].toUpperCase()}${namespace.slice(1)}`;
    if (element) return modifier ? `${Block}-${element}--${modifier}` : `${Block}-${element}`;
    return modifier ? `${Block}--${modifier}` : Block;
  },
});

const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
  styles: {
    base: { padding: '8px' },
    variants: { intent: { primary: { color: '#0066ff' } } },
  },
});
button.base; // "Button"
button['intent-primary']; // "Button--primary"
```

### Prefixed / ITCSS convention

```ts
const { recipe, style } = createTypeStyles({
  mode: 'template',
  classNameTemplate: ({ scope, namespace, element, modifier }) => {
    const base = element ? `c-${scope}${namespace}-${element}` : `c-${scope}${namespace}`;
    return modifier ? `${base}--${modifier}` : base;
  },
});
```

### Avoiding BEM's collision problem

`mode: 'bem'`'s modifier classes have no dimension namespace, so two dimensions sharing an option name collide (see the collision caveat above). A `classNameTemplate` can fold `dimension` into the class name to avoid this entirely:

```ts
const { recipe, style } = createTypeStyles({
  mode: 'template',
  classNameTemplate: ({ scope, namespace, element, dimension, modifier }) => {
    const base = element ? `${scope}${namespace}__${element}` : `${scope}${namespace}`;
    return modifier ? `${base}--${dimension}-${modifier}` : base;
  },
});
// variant: { primary } and size: { primary } no longer collide:
// "button--variant-primary" vs "button--size-primary"
```

Like `mode: 'bem'` and `mode: 'attribute'`, `mode: 'template'` is an instance-wide setting — no per-component override.

## Migration quick-start

### From CVA

CVA config maps directly:

- `cva(base, { variants, compoundVariants, defaultVariants })`
- to `recipe({ name, variants: axes, styles: { base, variants, compoundVariants } })`

Axis defaults replace `defaultVariants`. `variant.enum` / `variant.boolean` declare the options; the style map under `styles.variants` supplies the CSS.

The main difference is class generation/injection is handled by typestyles.

See the [Migration Guide](/docs/migration) for library-specific examples.

## Expose themeable properties as vars

If you expect a property to vary by theme region, declare it on `vars` instead of
hard-coding the value in `styles`. The style callback receives `{ vars }`, a ref tree
with `.var` and `.name`. `.vars` is on the recipe function only when `vars` was declared,
and `OverrideConfigFor<typeof recipe>` reads those keys.

```ts
export const sideNav = recipe({
  name: 'side-nav',
  slots: ['root', 'heading'] as const,
  vars: {
    border: { value: '1px solid #ccc', syntax: '<color>' as const },
    headingColor: { value: '#111', syntax: '<color>' as const },
  },
  styles: ({ vars }) => ({
    base: {
      root: { borderColor: vars.border.var },
      heading: { color: vars.headingColor.var },
    },
  }),
});

// After creation — same logical tree as override `vars`, but `.var` / `.name` refs:
sideNav.vars.border.var; // "var(--side-nav-border)"
sideNav.vars.headingColor.name; // "--side-nav-heading-color"
```

Export definitions once when you reuse them across packages or want a named schema:

```ts
export const sideNavVarDefinitions = {
  border: { value: '1px solid #ccc', syntax: '<color>' as const },
  headingColor: { value: '#111', syntax: '<color>' as const },
} as const;

export const sideNav = recipe({
  name: 'side-nav',
  slots: ['root', 'heading'] as const,
  vars: sideNavVarDefinitions,
  styles: ({ vars }) => ({
    base: {
      root: { borderColor: vars.border.var },
      heading: { color: vars.headingColor.var },
    },
  }),
});
```

Object `styles` can also refer to the custom properties with `var(--…)` literals:

```ts
const chip = recipe({
  name: 'chip',
  vars: {
    background: { value: '#fff', syntax: '<color>' as const },
    foreground: { value: '#111', syntax: '<color>' as const },
  },
  styles: {
    base: {
      backgroundColor: 'var(--chip-background)',
      color: 'var(--chip-foreground)',
    },
  },
});

chip.vars.background.var; // "var(--chip-background)"
```

The [design-system example](/docs/design-system) uses this pattern throughout
(`examples/design-system/src/components/button.ts`).

When a custom property should exist without an initial value in the recipe, register it
with [`property.declare`](/docs/css-primitives) and read the ref from there. Recipe `vars`
are the declarations that belong to the component and show up on `.vars`.

See [CSS primitives](/docs/css-primitives) for the full progressive-disclosure ladder.

### Override internal vars in themes

Theme consumers use the same top-level **`vars`** key on `override()` — assignment
leaves instead of descriptor leaves.

```ts
override({
  recipe: sideNav,
  layer: 'overrides',
  selectorPrefix: '.theme-forest',
  vars: {
    border: 'transparent',
    headingColor: tokens.color.text.primary,
    padding: { outer: { x: '24px', y: '16px' } },
  },
  styles: {
    base: {
      root: { margin: tokens.space[2].var, borderRadius: tokens.radius.lg.var },
    },
  },
});
```

**Typing:** a recipe that declares `vars` makes `OverrideConfigFor<typeof sideNav>` infer the allowed keys.

```ts
import type { OverrideConfigFor } from 'typestyles';

export type SideNavThemeOverride = OverrideConfigFor<typeof sideNav>;
```

Notes:

- **`vars` always targets the var host slot** — `base` for dimensioned/flat recipes,
  `root` (or the first slot when there is no `root`) for slotted recipes. Layout
  overrides stay in `base` / slot blocks.
- **Nested paths** flatten to dashed custom properties (`padding.outer.x` →
  `padding-outer-x`). Dotted keys (`'padding.outer.x'`) are also accepted.
- **Values:** strings, numbers, `var(--…)` refs, and `{ light, dark }` when
  `colorModes` is configured — same as other override style blocks.
- **Collisions:** if `vars.border` and `base['--…-border']` both set the same
  property, **`base` wins** (emitted later).
- Unknown var keys log a dev warning and are skipped; recipes with no registered
  vars warn when override `vars` is set.

See [Theming patterns — override vars](/docs/theming-patterns#override-component-internal-vars).

## Responsive property values

Register breakpoints once on your TypeStyles instance, then use `{ base, md, lg }` shorthand on individual CSS properties instead of repeating full `@media` keys beside every property.

```ts
const { recipe } = createTypeStyles({
  scopeId: 'app',
  breakpoints: {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
  },
});

const container = recipe({
  name: 'container',
  styles: {
    base: {
      width: '100%',
      paddingLeft: { base: '1rem', md: '1.5rem' },
      paddingRight: { base: '1rem', md: '1.5rem' },
      maxWidth: {
        base: '100%',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
});
```

This compiles to the same CSS you would write with explicit `'@media (min-width: …)'` object keys — one base declaration per property, plus nested `@media` blocks per breakpoint.

**Conventions:**

- `base` is the mobile-first default; `_` is an alias (Panda migration).
- Breakpoint values are media conditions **without** the `@media` wrapper — same strings as `@typestyles/props` `{ '@media': '(min-width: 640px)' }`.
- Values must be scalars (`string | number`); for nested style blocks per breakpoint, use [`media()` / `breakpoint()`](/docs/custom-at-rules#viewport-breakpoints-from-config) instead of hand-written `@media` keys.
- Responsive objects work in `style`, `recipe`, `scope`, and `createTypeStyles({ breakpoints }).global.rule` (or `createGlobal({ breakpoints }).rule`). Use a `createTypeStyles` / `createGlobal` instance — there is no root singleton.

**Before (manual media keys):**

```ts
base: {
  padding: '1rem',
  '@media (min-width: 768px)': { padding: '1.5rem' },
  '@media (min-width: 1024px)': { padding: '2rem' },
}
```

**After:**

```ts
base: {
  padding: { base: '1rem', md: '1.5rem', lg: '2rem' },
}
```

For atomic utility props with responsive class names, use [`@typestyles/props`](/docs/atomic-css#responsive-conditions) — that system resolves to utility classes at runtime. Responsive property values are for declarative style objects that compile to plain CSS rules.

You can derive breakpoints from media tokens:

```ts
const { recipe, tokens } = createTypeStyles({ scopeId: 'app' });
const media = tokens.create('media', {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
});

const { recipe: recipeWithMedia } = createTypeStyles({
  scopeId: 'app',
  breakpoints: { fromTokens: media, lg: '(min-width: 1024px)' },
});
```

## Public class name stability

Semantic class names (`button`, `button--intent-primary`, …) are public API for
consumers theming your package. Do not rename namespaces or variant keys without a
major semver bump. Opt into snapshot + ESLint guardrails described in
[Publishing Packages — guard public class names](/docs/publishing-packages#guard-public-class-names).

## Related docs

- [End-to-end theming](/docs/theming-end-to-end) — tokens, theme surfaces, and recipe overrides
- [Theming Patterns — component overrides](/docs/theming-patterns#component-overrides-two-tier-model)

- [Styles](/docs/styles)
- [Migration Guide](/docs/migration)
- [Custom Selectors & At-Rules](/docs/custom-at-rules)
