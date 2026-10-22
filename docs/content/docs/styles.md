---
title: Styles
description: Create and compose style variants with recipe
---

The TypeStyles **`style`** and **`recipe`** APIs let you define named style variants and compose them at the call site. Create one runtime per app or package with **`createTypeStyles`**.

`recipe()` takes one object. Boolean toggles and enum axes are both `variants` (`variant.boolean` / `variant.enum`); option styles live in `styles`. For slots, compounds, and vars, see [Components](/docs/components).

## How TypeStyles runs

1. **Registration** — When your module loads, definitions are registered. Nothing paints until a class is actually used.
2. **First use** — The first time a returned class name is applied, TypeStyles injects the rules into a managed `<style>` tag (lazy injection, batched for performance).
3. **Stable names** — Class strings are deterministic from your namespace and variant keys, which keeps SSR and tests predictable when [collection APIs](/docs/ssr) wrap your render.
4. **Production** — You can keep this model, or switch to extracted CSS and a no-op runtime via the [zero-runtime](/docs/zero-runtime) path when you are ready.

## Choosing an API

| You want to…                                                            | Use                          | Why                                                                                            |
| ----------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Style a component with base + boolean toggles (`elevated`, `compact`)   | `recipe` + `variant.boolean` | Base applies on every call. The toggle is `elevated: true`.                                    |
| Build typed variant axes (`intent`, `size`) with defaults and compounds | `recipe` + `variant.enum`    | Axes are declared up front. `styles.variants` and `compoundVariants` are checked against them. |
| One reusable class from a single style object                           | `style`                      | One class string, no variant machinery.                                                        |
| Merge several style groups                                              | `compose`                    | Reuse groups without repeating objects.                                                        |
| Join class names conditionally                                          | `cx()` from `'typestyles'`   | Filters falsy values; pairs well with props from parents (not tied to a TypeStyles instance).  |

**Practical default:** one [`createTypeStyles`](/docs/api-reference#createtypestyles-options) module per app or package; then use `recipe` for UI components, `style` for one-off utilities, and `import { cx } from 'typestyles'` when you merge external `className` strings.

## Creating styles (flat config)

Pass `name`, the axes, and `styles`:

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const card = recipe({
  name: 'card',
  variants: { elevated: variant.boolean({ default: false }) },
  styles: {
    base: {
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #e5e5e5',
    },
    variants: {
      elevated: {
        true: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
        false: {},
      },
    },
  },
});
```

The call returns `{ className, attrs, props }`. Base styles are always included:

```ts
card().className; // "card"
card({ elevated: true }).className; // "card card--elevated-true"
```

Class names are deterministic: `card`, `card--elevated`.

To use **hashed** or **hash-only** class strings instead (for example in a design system package), see [Class naming](/docs/class-naming).

## Creating styles (dimensioned config)

For typed variant dimensions, use the full variant config:

```ts
import { variant } from 'typestyles';
const button = recipe({
  name: 'button',
  variants: {
    intent: variant.enum(['primary', 'secondary'], { default: 'primary' }),
    size: variant.enum(['sm', 'lg'], { default: 'sm' }),
  },
  styles: {
    base: { padding: '8px 16px', borderRadius: '6px' },
    variants: {
      intent: {
        primary: { backgroundColor: '#0066ff', color: '#fff' },
        secondary: { backgroundColor: '#6b7280', color: '#fff' },
      },
      size: {
        sm: { fontSize: '14px' },
        lg: { fontSize: '18px' },
      },
    },
  },
});

// Base styles auto-applied; pass variant overrides:
button(); // base + primary + sm
button({ intent: 'secondary' }); // base + secondary + sm
button({ size: 'lg' }); // base + primary + lg
```

See [Components](/docs/components) for `compoundVariants`, boolean variants, and multipart `slots`.

## Selectors

Use the `&` prefix for pseudo-classes and nested selectors, just like in CSS:

```ts
const button = recipe({
  name: 'button',
  styles: {
    base: {
      padding: '8px 16px',
      '&:hover': { opacity: 0.9 },
      '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
    },
  },
});
```

### Data and ARIA attribute selectors

Attribute selectors work with `&`-prefixed nested selectors, including all CSS attribute selector operators:

```ts
const trigger = recipe({
  name: 'trigger',
  styles: {
    base: {
      // exact match
      '&[data-state="open"]': { opacity: 1 },

      // starts with / ends with / contains
      '&[data-side^="top"]': { marginTop: '4px' },
      '&[data-size$="-lg"]': { padding: '12px' },
      '&[data-name*="admin"]': { fontWeight: 700 },

      // whitespace-separated token / language-style match
      '&[data-flags~="selected"]': { borderStyle: 'solid' },
      '&[lang|="en"]': { fontFamily: 'system-ui' },

      // accessibility state hooks
      '&[aria-expanded="true"]': { backgroundColor: '#1d4ed8' },
      '&[aria-selected="true"]': { color: 'white' },
    },
  },
});
```

### `:has()`, `:is()`, and `:where()` helpers

For grouped or low-specificity pseudos, use **`has`**, **`is`**, and **`where`** from your TypeStyles instance (or import `has`, `is`, `where` from `typestyles`). They mirror the ergonomics of **`container()`** and **`supports()`** for at-rule queries: small builders that return typed nested keys and infer **literal** templates from your arguments, so you can mix them with ordinary properties without `as CSSProperties`.

```ts
const { style, where, has, is } = createTypeStyles({ scopeId: 'app' });

const nav = style('nav', {
  display: 'flex',
  [where('.nav')]: { gap: '8px' },
  [has('.active')]: { borderBottom: '2px solid blue' },
  [is(':hover', ':focus-visible')]: { outline: '2px solid dodgerblue' },
});
```

`:where()` is especially useful for design-system defaults (zero specificity). See [Custom selectors & at-rules](/docs/custom-at-rules) for TypeScript notes and more examples.

## Composing styles

Use `compose()` to combine multiple component style functions or class strings:

```ts
const { recipe, compose } = createTypeStyles({ scopeId: 'app' });

const base = recipe({
  name: 'base',
  styles: { base: { padding: '8px', borderRadius: '4px' } },
});

const primary = recipe({
  name: 'primary',
  styles: { base: { backgroundColor: '#0066ff', color: 'white' } },
});

const button = compose(base, primary);
```

See the [Style Composition](/docs/compose) guide for more details.

## Joining classes with cx()

Use the built-in `cx()` utility to conditionally join class strings:

```ts
import { variant } from 'typestyles';
import { createTypeStyles, cx } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const card = recipe({
  name: 'card',
  variants: { elevated: variant.boolean({ default: false }) },
  styles: {
    base: { padding: '16px' },
    variants: {
      elevated: { true: { boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }, false: {} },
    },
  },
});

const { base, elevated } = card;

// Conditionally join classes:
cx(base, isElevated && elevated, customClassName);
```

## Utility shortcuts

Define reusable shorthand properties (similar to Stitches `utils`) on your **`createTypeStyles`** instance so class names, scope, and layers stay on one API — no global registration.

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({
  scopeId: 'my-app',
  utils: {
    marginX: (value: string | number) => ({
      marginLeft: value,
      marginRight: value,
    }),
    paddingY: (value: string | number) => ({
      paddingTop: value,
      paddingBottom: value,
    }),
    size: (value: string | number) => ({
      width: value,
      height: value,
    }),
  },
});

const avatar = style('avatar', {
  size: 40,
  marginX: 8,
});

const button = recipe({
  name: 'button',
  variants: { compact: variant.boolean({ default: false }) },
  styles: {
    base: { paddingY: 8 },
    variants: { compact: { true: { paddingY: 4 }, false: {} } },
  },
});
```

The returned API is utility-aware (`style`, `hash`, and `recipe` accept your utility keys).

Utility keys are fully typed from your utility definitions and can be mixed with normal CSS properties.

## Composing with tokens

Use token references (e.g. from `tokens.create()`) in your style values. They compile to `var(--name-key)` and work with themes.

If you are migrating from CVA, Stitches, vanilla-extract, StyleX, or Panda recipes, see the [Migration Guide](/docs/migration#coming-from-cheat-sheet).
