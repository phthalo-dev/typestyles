---
title: Migration Guide
description: Migrate to typestyles from StyleX, Panda CSS, vanilla-extract, Stitches, and other CSS-in-JS libraries
---

Switching to typestyles from other styling solutions is straightforward. This guide covers the most common migration paths.

If you are adopting the variant API, start with [Components](/docs/components). For tokens and themes, see [Tokens](/docs/tokens) and [Theming patterns](/docs/theming-patterns).

## Coming from… (cheat sheet)

| If you know…                    | Start here                                                                   | Closest TypeStyles concepts                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **StyleX**                      | [From StyleX](#from-stylex)                                                  | `stylex.create` → `recipe` / `style`; `defineVars` → `tokens.create`; `createTheme` → `tokens.createTheme`            |
| **Panda CSS**                   | [From Panda CSS](#from-panda-css)                                            | `cva` / recipes → `recipe`; config tokens → `tokens.create`; semantic / `_dark` → `createTheme` or mode-aware leaves  |
| **vanilla-extract**             | [From vanilla-extract](#from-vanilla-extract)                                | `recipe` → `recipe`; `createThemeContract` → `tokens.declare` / `tokens.create`; `createTheme` → `tokens.createTheme` |
| **Stitches**                    | [From Stitches](#from-stitches)                                              | `styled` + variants → `recipe`; theme + `$token` → `tokens.create`; `createTheme` → `tokens.createTheme`              |
| **CVA**                         | [From CVA](#from-cva-class-variance-authority)                               | Same variant shape; TypeStyles emits the CSS                                                                          |
| **Emotion / styled-components** | [From Emotion](#from-emotion) / [styled-components](#from-styled-components) | Tagged templates → style objects + recipes                                                                            |

**Mental model shared across all four:** TypeStyles themes are **CSS custom properties on a stable class** (`.theme-{name}`), not a closed compiler vocabulary. Consumers can override with TypeStyles **or** plain CSS (`--*` / class selectors). Readable recipe classes (`button--intent-primary`) stay targetable outside the framework.

## Upgrading to the object `recipe()`

`recipe()` and `override()` take one object. These positional calls throw:

- `recipe(name, config, options?)`
- `recipe(name, definition, callback, options?)`
- `override(component, config, options?)`

```ts
const button = recipe({
  name: 'button',
  layer: 'components',
  variants: { intent: variant.enum(['primary', 'ghost'], { default: 'primary' }) },
  styles: {
    base: { padding: '8px' },
    variants: {
      intent: {
        primary: { backgroundColor: 'blue' },
        ghost: { backgroundColor: 'transparent' },
      },
    },
  },
});

button({ intent: 'primary' }).className;

override({
  recipe: button,
  layer: 'overrides',
  selectorPrefix: '.theme-classic',
  styles: { base: { color: 'rebeccapurple' } },
});
```

Every call returns `{ className, attrs, props }`. `String(result)` is the class name. A slotted recipe returns one of those objects per slot, and the static slot class stays on the function (`layout.stack`).

Theme component patches use the same object. The component key replaces `recipe`:

```ts
tokens.createTheme({
  name: 'brand',
  components: {
    button: {
      styles: ({ tokens }) => ({
        base: { color: tokens.color.text.primary.var },
      }),
    },
  },
});
```

A bare `button: (ctx) => ({ base })` is not a patch. `styles` holds the partial style object or the callback.

## Upgrading to 0.10 (semantic + attribute naming)

`0.10` changes the default `mode: 'semantic'` class grammar and finishes `mode: 'attribute'`.
This is a pre-1.0 breaking change for **emitted class strings** and for hand-written CSS /
snapshots that targeted the old names.

| Shape          | Before (`≤0.9`)                   | After (`0.10`)                                                         |
| -------------- | --------------------------------- | ---------------------------------------------------------------------- |
| Component base | `button-base`                     | `button`                                                               |
| Variant        | `button-intent-primary`           | `button--intent-primary`                                               |
| Slot           | `dialog-content`                  | `dialog__content`                                                      |
| Flat modifier  | `card-elevated`                   | `card--elevated`                                                       |
| Compound       | `button-compound-0` (extra class) | chained `.button--intent-primary.button--size-lg` (no synthetic class) |

Attribute mode changes:

- Variant dimensions become kebab-case `data-*` attributes (`fontWeight` → `data-font-weight`).
- Slots are supported; each slot returns `{ className, attrs, props }`.
- Flat configs still return class strings (`card`, `card--elevated`).

**Checklist**

1. Regenerate `@typestyles/cli` public-classname snapshots and update ESLint fixtures.
2. Search tests / e2e selectors for `-base`, `-compound-`, and old hyphen slot names.
3. Update any hand-written CSS that targeted the old public classes.
4. Prefer distinct namespaces for `style` vs `recipe` when they would share a base string — both emit `button` for `'button'`, and the sheet keeps only the first base rule.

See [Class naming](/docs/class-naming) and [Attribute-driven variants](/docs/components#attribute-driven-variants).

## From Panda CSS

Panda and typestyles share many concepts (component variants, tokens, utilities), so migration is mostly API shape changes rather than a full styling rewrite.

### `css()` to `style()` or `recipe()`

**Before (Panda CSS):**

```tsx
import { css } from '../styled-system/css';

const className = css({
  display: 'flex',
  gap: '4',
  '&:hover': { opacity: 0.9 },
});
```

**After (typestyles):**

```tsx
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const className = style('card', {
  display: 'flex',
  gap: '16px',
  '&:hover': { opacity: 0.9 },
});
```

For reusable variant families, prefer `recipe()` instead of a single class.

### `cva()` / `defineRecipe()` to `recipe()`

**Before (Panda CSS):**

```ts
import { cva } from '../styled-system/css';

const button = cva({
  base: { fontWeight: 'medium' },
  variants: {
    intent: {
      solid: { bg: 'blue.500', color: 'white' },
      ghost: { bg: 'transparent' },
    },
  },
  defaultVariants: { intent: 'solid' },
});
```

**After (typestyles):**

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['solid', 'ghost'], { default: 'solid' }) },
  styles: {
    base: { fontWeight: 500 },
    variants: {
      intent: {
        solid: { backgroundColor: '#2563eb', color: 'white' },
        ghost: { backgroundColor: 'transparent' },
      },
    },
  },
});

// Call as function (base auto-applied):
button(); // base + solid
button({ intent: 'ghost' }); // base + ghost

// Or destructure:
const { base } = button;
```

### `theme.tokens` / semantic tokens to `tokens.create()` + `tokens.createTheme()`

**Before (Panda CSS):**

```ts
// panda.config.ts
theme: {
  tokens: {
    colors: {
      primary: { value: '#0FEE0F' }
    }
  },
  semanticTokens: {
    colors: {
      danger: { value: { base: '{colors.red.500}', _dark: '{colors.red.200}' } }
    }
  }
}
```

**After (typestyles):**

```ts
import { createTypeStyles, colorModes } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app', colorModes });

// Primitive / semantic scales — same nested shape as your config, without `{ value: … }`
export const color = tokens.create('color', {
  primary: '#0FEE0F',
  danger: { light: '#ef4444', dark: '#fca5a5' }, // mode-aware leaf → light-dark() when colorModes is set
});

// Or a theme class for brand / dark overrides (apply `.theme-app-dark` on a parent):
export const dark = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: {
      danger: '#fca5a5',
    },
  },
});
```

| Panda                                 | TypeStyles                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `tokens` in `panda.config`            | `tokens.create('color', { … })` — emits `--app-color-…` with `scopeId`            |
| `semanticTokens` + `_dark`            | Mode-aware `{ light, dark }` leaves, and/or `tokens.createTheme({ tokens })`      |
| Token strings (`blue.500`) in recipes | Import the ref tree: `color.primary` → `var(--…)`                                 |
| Codegen + `@pandacss/dev`             | No codegen for tokens; optional [zero-runtime](/docs/zero-runtime) for static CSS |

Apply `dark.className` (or `String(dark)`) on a parent container to scope theme values. Plain CSS can set the same `--app-color-*` variables under `.theme-app-dark`.

See [Theming patterns](/docs/theming-patterns) for `Theme.override` and `components` recipe overrides.

### Panda utility props to `@typestyles/props`

```ts
import { defineProperties, createProps } from '@typestyles/props';

const atoms = createProps(
  'atom',
  defineProperties({
    conditions: {
      sm: { '@media': '(min-width: 640px)' },
      dark: { selector: '[data-theme="dark"] &' },
    },
    properties: {
      display: ['flex', 'grid', 'block'],
      gap: { 1: '4px', 2: '8px', 3: '12px' },
    },
  }),
);

atoms({
  display: 'flex',
  gap: { _: 2, sm: 3 },
});
```

### Slot components (Panda `sva`)

If you use Panda `sva` (multipart slot variants), use `recipe` with a `slots` configuration so each part maps to a named slot. See [Components](/docs/components).

## From styled-components

### Component structure

**Before (styled-components):**

```tsx
import styled from 'styled-components';

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  background-color: ${(props) => (props.primary ? '#0066ff' : '#6b7280')};
  color: white;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

<Button primary>Click me</Button>;
```

**After (typestyles):**

```tsx
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe, tokens } = createTypeStyles({ scopeId: 'app' });

const color = tokens.use('color');

const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary', 'secondary'], { default: 'primary' }) },
  styles: {
    base: {
      padding: '8px 16px',
      borderRadius: '6px',
      color: 'white',
      '&:hover': { opacity: 0.9 },
      '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
    },
    variants: {
      intent: {
        primary: { backgroundColor: color.primary },
        secondary: { backgroundColor: color.secondary },
      },
    },
  },
});

function Button({ primary, children }) {
  return (
    <button className={button({ intent: primary ? 'primary' : 'secondary' })}>{children}</button>
  );
}
```

### Key differences

1. **No component wrapper** - typestyles returns class names, not React components
2. **Explicit props handling** - Logic moves from template literals to regular JavaScript
3. **Static styles** - Dynamic values become explicit variants or are passed via inline styles
4. **CSS nesting** - Use `&` prefix for pseudo-classes like `&:hover`

### Dynamic values

**Before:**

```tsx
const Box = styled.div`
  width: ${(props) => props.width}px;
  height: ${(props) => props.height}px;
`;
```

**After:**

```tsx
const box = recipe({
  name: 'box',
  styles: {
    base: {
      display: 'inline-block',
    },
  },
});

function Box({ width, height, children }) {
  return (
    <div className={box()} style={{ width, height }}>
      {children}
    </div>
  );
}
```

Dynamic values that change frequently should use inline styles. Static styles should use typestyles variants.

## From Emotion

Emotion's API is similar to styled-components, so the migration path is nearly identical.

### css prop

**Before (Emotion):**

```tsx
/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';

function Button({ children }) {
  return (
    <button
      css={css`
        padding: 8px 16px;
        background-color: #0066ff;
        color: white;
        &:hover {
          background-color: #0052cc;
        }
      `}
    >
      {children}
    </button>
  );
}
```

**After (typestyles):**

```tsx
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const button = recipe({
  name: 'button',
  styles: {
    base: {
      padding: '8px 16px',
      backgroundColor: '#0066ff',
      color: 'white',
      '&:hover': {
        backgroundColor: '#0052cc',
      },
    },
  },
});

function Button({ children }) {
  return <button className={button()}>{children}</button>;
}
```

### cx utility

**Before:**

```tsx
import { css, cx } from '@emotion/css';

const base = css`padding: 8px;`;
const primary = css`background: blue;`;
const large = css`font-size: 18px;`;

className={cx(base, isPrimary && primary, isLarge && large)}
```

**After:**

When all classes come from one `recipe` recipe, you can call it with variant overrides or combine pieces with `cx()`:

```tsx
import { variant } from 'typestyles';
import { createTypeStyles, cx } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const button = recipe({ name: 'button', variants: { intent: variant.enum(["primary"], { default: "primary" }), size: variant.enum(["large"], { default: "large" }) }, styles: { base: { padding: '8px' }, variants: { intent: {
      primary: { backgroundColor: 'blue' },
    }, size: {
      large: { fontSize: '18px' },
    } } } });

// Option 1: Call with variant overrides
className={button({ intent: isPrimary ? 'primary' : undefined, size: isLarge ? 'large' : undefined })}

// Option 2: Destructure dimensioned variant classes and use cx()
const { base, 'intent-primary': intentPrimary, 'size-large': sizeLarge } = button;
className={cx(base, isPrimary && intentPrimary, isLarge && sizeLarge)}
```

When you need to combine classes from different sources (multiple style groups, external class strings, or conditional expressions), use the built-in `cx` utility:

```tsx
import { variant } from 'typestyles';
import { createTypeStyles, cx } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const card = style('card', { padding: '16px' });
const button = recipe({ name: 'button', variants: { primary: variant.boolean({ default: false }) }, styles: { base: { padding: '8px' }, variants: { primary: { true: { backgroundColor: 'blue' }, false: {} } } } });
const { primary } = button;

className={cx(card, button(), isPrimary && primary, isActive && 'active', externalClassName)}
```

## From CVA (Class Variance Authority)

`recipe` maps closely to CVA's mental model:

- `variants`
- `compoundVariants`
- `defaultVariants`

### Basic mapping

**Before (CVA):**

```ts
import { cva } from 'class-variance-authority';

export const button = cva('inline-flex rounded font-medium', {
  variants: {
    intent: {
      primary: 'bg-blue-600 text-white',
      ghost: 'bg-transparent text-gray-900',
    },
    size: {
      sm: 'px-2 py-1 text-sm',
      lg: 'px-4 py-2 text-base',
    },
  },
  compoundVariants: [
    {
      intent: ['primary', 'ghost'],
      size: 'lg',
      class: 'uppercase',
    },
  ],
  defaultVariants: {
    intent: 'primary',
    size: 'sm',
  },
});
```

**After (typestyles):**

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

export const button = recipe({
  name: 'button',
  variants: {
    intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
    size: variant.enum(['sm', 'lg'], { default: 'sm' }),
  },
  styles: {
    base: {
      display: 'inline-flex',
      borderRadius: '8px',
      fontWeight: 500,
    },
    compoundVariants: [
      {
        variants: {
          intent: ['primary', 'ghost'],
          size: 'lg',
        },
        style: {
          textTransform: 'uppercase',
        },
      },
    ],
    variants: {
      intent: {
        primary: { backgroundColor: '#2563eb', color: 'white' },
        ghost: { backgroundColor: 'transparent', color: '#111827' },
      },
      size: {
        sm: { padding: '4px 8px', fontSize: '14px' },
        lg: { padding: '8px 16px', fontSize: '16px' },
      },
    },
  },
});

// Usage -- base is auto-applied, defaults kick in:
button(); // base + primary + sm
button({ intent: 'ghost' }); // base + ghost + sm
button({ size: 'lg' }); // base + primary + lg
```

### Key differences

1. CVA returns composed class strings from existing class tokens; typestyles generates and injects CSS from style objects.
2. CVA `class` in `compoundVariants` becomes typestyles `style`.
3. You can keep readable deterministic class output (`button--intent-primary`, etc.).
4. The return is both callable AND destructurable (CVA-style).

## From Stitches

### Variants → `recipe()`

**Before (Stitches):**

```ts
import { styled } from '@stitches/react';

const Button = styled('button', {
  padding: '8px 12px',
  variants: {
    intent: {
      primary: { backgroundColor: 'dodgerblue', color: 'white' },
      ghost: { backgroundColor: 'transparent' },
    },
    outlined: {
      true: { border: '1px solid currentColor' },
    },
  },
  compoundVariants: [
    {
      intent: 'primary',
      outlined: true,
      css: { borderColor: 'blue' },
    },
  ],
  defaultVariants: {
    intent: 'primary',
  },
});
```

**After (typestyles):**

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const button = recipe({
  name: 'button',
  variants: {
    intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
    outlined: variant.boolean({ default: false }),
  },
  styles: {
    base: {
      padding: '8px 12px',
    },
    compoundVariants: [
      {
        variants: {
          intent: 'primary',
          outlined: true,
        },
        style: {
          borderColor: 'blue',
        },
      },
    ],
    variants: {
      intent: {
        primary: { backgroundColor: 'dodgerblue', color: 'white' },
        ghost: { backgroundColor: 'transparent' },
      },
      outlined: {
        true: { border: '1px solid currentColor' },
        false: { border: 'none' },
      },
    },
  },
});
```

Usage shifts from `<Button intent="primary" />` (styled component) to
`<button className={button({ intent: 'primary' })} />` (or wrap with your own React component).
See [React integration](/docs/react-integration).

### Theme + `$tokens` → `tokens.create` / `createTheme`

**Before (Stitches):**

```ts
import { createStitches } from '@stitches/react';

export const { styled, css, theme, createTheme } = createStitches({
  theme: {
    colors: {
      primary: 'blue',
      text: 'black',
    },
  },
});

const darkTheme = createTheme({
  colors: {
    primary: 'lightblue',
    text: 'white',
  },
});

const Button = styled('button', {
  backgroundColor: '$primary',
  color: '$text',
});
```

**After (typestyles):**

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe, tokens } = createTypeStyles({ scopeId: 'app' });

const color = tokens.create('color', {
  primary: 'blue',
  text: 'black',
});

const dark = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: {
      primary: 'lightblue',
      text: 'white',
    },
  },
});

const button = recipe({
  name: 'button',
  styles: {
    base: {
      backgroundColor: color.primary, // → var(--app-color-primary)
      color: color.text,
    },
  },
});
```

| Stitches                            | TypeStyles                                              |
| ----------------------------------- | ------------------------------------------------------- |
| `theme.colors.primary` / `$primary` | `tokens.create('color', { primary })` → `color.primary` |
| `createTheme({ colors })`           | `tokens.createTheme({ name, tokens: { color: … } })`    |
| Theme class on a provider / wrapper | Apply `dark.className` on a parent (or `String(dark)`)  |
| `utils` on `createStitches`         | `utils` on [`createStyles`](/docs/styles#utils)         |

Stitches themes are a JS object layered through `$` refs. TypeStyles themes are **CSS custom properties** on `.theme-app-dark` — same nesting shape, but consumers can also override `--app-color-primary` in plain CSS.

## From vanilla-extract

### `recipe()` → `recipe()`

**Before (vanilla-extract `recipe`):**

```ts
import { recipe } from '@vanilla-extract/recipes';

export const button = recipe({
  base: {
    borderRadius: 6,
  },
  variants: {
    tone: {
      neutral: { background: 'white' },
      brand: { background: 'blue', color: 'white' },
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});
```

**After (typestyles):**

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

export const button = recipe({
  name: 'button',
  variants: { tone: variant.enum(['neutral', 'brand'], { default: 'neutral' }) },
  styles: {
    base: {
      borderRadius: '6px',
    },
    variants: {
      tone: {
        neutral: { backgroundColor: 'white' },
        brand: { backgroundColor: 'blue', color: 'white' },
      },
    },
  },
});
```

### Theme contract + `createTheme` → `tokens.create` / `tokens.createTheme`

**Before (vanilla-extract):**

```ts
import { createThemeContract, createTheme, style } from '@vanilla-extract/css';

export const vars = createThemeContract({
  color: {
    brand: null,
    text: null,
  },
});

export const light = createTheme(vars, {
  color: { brand: 'blue', text: 'black' },
});

export const dark = createTheme(vars, {
  color: { brand: 'lightblue', text: 'white' },
});

export const brandText = style({
  color: vars.color.brand,
});
```

**After (typestyles):**

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe, tokens } = createTypeStyles({ scopeId: 'app' });

// Contract + default values (like createTheme that also defines the vars)
const color = tokens.create('color', {
  brand: 'blue',
  text: 'black',
});

// Optional: declare schema first (createThemeContract-like), create later
// const colorDecl = tokens.declare('color', { brand: true, text: true });
// tokens.create('color', { brand: 'blue', text: 'black' }, { decl: colorDecl });

const dark = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: { brand: 'lightblue', text: 'white' },
  },
});

export const brandText = style('brand-text', {
  color: color.brand, // → var(--app-color-brand)
});
```

| vanilla-extract                  | TypeStyles                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `createThemeContract`            | `tokens.declare` (schema) or just `tokens.create` (contract + defaults)             |
| `createTheme(vars, values)`      | `tokens.createTheme({ name, tokens })` — reuses the same `--*` names                |
| `vars.color.brand`               | `color.brand` / `tokens.use('color').brand` / `theme.tokens.color.brand`            |
| Hashed theme class + scoped vars | Readable `.theme-app-dark` + `--app-color-brand` (with `scopeId`)                   |
| `assignInlineVars`               | [`assignVars`](/docs/dynamic-styles) / inline style for dynamic values              |
| `.css.ts` only                   | Ordinary `.ts` / `.tsx`; optional [zero-runtime](/docs/zero-runtime) for static CSS |

**Main trade-offs:** vanilla-extract is build-time-only by default; TypeStyles is runtime-friendly in dev with an optional static extract path. VE hashes variable names for isolation; TypeStyles prefers **inspectable, overrideable** names so design-system consumers can theme from TypeStyles **or** plain CSS.

## From StyleX

StyleX is compiler-first (atomic classes, `.stylex.js` vars). TypeStyles keeps the same _ideas_ — style objects, CSS variables, theme classes — without requiring a Babel/SWC plugin on day one.

### `stylex.create` → `style` / `recipe`

**Before (StyleX):**

```ts
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  base: {
    paddingInline: '16px',
    paddingBlock: '8px',
    borderRadius: 6,
    borderWidth: 0,
    cursor: 'pointer',
  },
  primary: { backgroundColor: '#2563eb', color: '#fff' },
  ghost: {
    backgroundColor: 'transparent',
    color: '#2563eb',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#2563eb',
  },
});
```

```tsx
<button {...stylex.props(styles.base, intent === 'ghost' ? styles.ghost : styles.primary)}>
  {children}
</button>
```

**After (typestyles):**

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary', 'ghost'], { default: 'primary' }) },
  styles: {
    base: {
      paddingInline: '16px',
      paddingBlock: '8px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
    },
    variants: {
      intent: {
        primary: { backgroundColor: '#2563eb', color: '#fff' },
        ghost: {
          backgroundColor: 'transparent',
          color: '#2563eb',
          border: '1px solid #2563eb',
        },
      },
    },
  },
});
```

```tsx
<button type="button" className={button({ intent })}>
  {children}
</button>
```

For one-off style bags without variants, use `style('name', { … })` instead of a recipe.

### `defineVars` + `createTheme` → `tokens.create` + `tokens.createTheme`

**Before (StyleX):**

```ts
// colors.stylex.ts
import * as stylex from '@stylexjs/stylex';

export const colors = stylex.defineVars({
  primary: '#2563eb',
  text: '#111827',
});

export const dark = stylex.createTheme(colors, {
  primary: '#60a5fa',
  text: '#f9fafb',
});
```

**After (typestyles):**

```ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const color = tokens.create('color', {
  primary: '#2563eb',
  text: '#111827',
});

export const dark = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: {
      primary: '#60a5fa',
      text: '#f9fafb',
    },
  },
});
```

| StyleX                                            | TypeStyles                                                      |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `defineVars` in `.stylex.js`                      | `tokens.create` in any module (no special file extension)       |
| Hashed `--x…` names (unless you force `--…` keys) | Predictable `--{scopeId}-{namespace}-…` names                   |
| `createTheme(vars, values)`                       | `tokens.createTheme({ name, tokens: { … } })`                   |
| Themes don't merge (last CSS theme wins)          | `Theme.override` deep-merges typed patches onto a root theme    |
| Atomic hashed classes                             | Semantic `button--intent-primary` (or hashed / attribute modes) |
| Outside overrides need framework escape hatches   | Plain CSS can target classes and `--*` vars                     |

**When StyleX still wins:** you want Meta's compiler guarantees and atomic output as a hard product requirement. **When TypeStyles wins for StyleX migrants:** design-system consumers need to retheme from app CSS, DevTools must stay readable, or you want themes/tokens without a dedicated compiler pipeline. Deeper comparison: [Framework comparison — Theming vs StyleX](/docs/framework-comparison#theming-architecture-typestyles-vs-stylex-and-astryx).

## From Tailwind CSS

### Class-based to object-based

**Before (Tailwind):**

```tsx
function Button({ primary, children }) {
  return (
    <button
      className={`
        px-4 py-2 rounded
        font-medium transition-colors
        ${
          primary
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
        }
      `}
    >
      {children}
    </button>
  );
}
```

**After (typestyles):**

```tsx
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe, tokens } = createTypeStyles({ scopeId: 'app' });

const color = tokens.create('color', {
  primary: '#0066ff',
  primaryHover: '#0052cc',
  secondary: '#6b7280',
  secondaryHover: '#4b5563',
});

const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary', 'secondary'], { default: 'primary' }) },
  styles: {
    base: {
      padding: '8px 16px',
      borderRadius: '6px',
      fontWeight: 500,
      transition: 'background-color 150ms ease',
    },
    variants: {
      intent: {
        primary: {
          backgroundColor: color.primary,
          color: '#fff',
          '&:hover': { backgroundColor: color.primaryHover },
        },
        secondary: {
          backgroundColor: color.secondary,
          color: '#fff',
          '&:hover': { backgroundColor: color.secondaryHover },
        },
      },
    },
  },
});

function Button({ primary, children }) {
  return (
    <button className={button({ intent: primary ? 'primary' : 'secondary' })}>{children}</button>
  );
}
```

### Design tokens

Tailwind's configuration becomes typestyles tokens:

**Before (tailwind.config.js):**

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#0066ff',
        secondary: '#6b7280',
      },
      spacing: {
        4: '16px',
        6: '24px',
      },
    },
  },
};
```

**After (tokens.ts):**

```ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const color = tokens.create('color', {
  primary: '#0066ff',
  secondary: '#6b7280',
});

export const space = tokens.create('space', {
  4: '16px',
  6: '24px',
});
```

### Gradual migration

You can use Tailwind and typestyles together during migration:

```tsx
import { createTypeStyles, cx } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const card = recipe({
  name: 'card',
  styles: {
    base: {
      // New styles with typestyles
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
  },
});

function Card({ children }) {
  return (
    <div className={cx(card(), 'p-4 bg-white rounded')}>
      {/*                       ^ Tailwind classes still work */}
      {children}
    </div>
  );
}
```

## From CSS Modules

### File organization

**Before (Button.module.css):**

```css
.button {
  padding: 8px 16px;
  border-radius: 6px;
}

.primary {
  background-color: #0066ff;
  color: white;
}

.secondary {
  background-color: #6b7280;
  color: white;
}
```

**Before (Button.tsx):**

```tsx
import styles from './Button.module.css';

function Button({ variant, children }) {
  return <button className={`${styles.button} ${styles[variant]}`}>{children}</button>;
}
```

**After (button.styles.ts):**

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

export const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary', 'secondary'], { default: 'primary' }) },
  styles: {
    base: {
      padding: '8px 16px',
      borderRadius: '6px',
    },
    variants: {
      intent: {
        primary: { backgroundColor: '#0066ff', color: 'white' },
        secondary: { backgroundColor: '#6b7280', color: 'white' },
      },
    },
  },
});
```

**After (Button.tsx):**

```tsx
import { button } from './button.styles';

function Button({ variant, children }) {
  return <button className={button({ intent: variant })}>{children}</button>;
}
```

### Global styles

CSS Modules `:global` becomes typestyles without nesting:

**Before:**

```css
:global(.tooltip) {
  position: absolute;
}
```

**After:**

```ts
import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const tooltip = recipe({
  name: 'tooltip',
  styles: {
    base: {
      position: 'absolute',
    },
  },
});

// Use: tooltip()
```

## From plain CSS

Migrating from plain CSS gives you type safety and better organization.

### Step-by-step

1. **Identify components** - Start with your most reused components (buttons, inputs, cards)

2. **Extract tokens** - Move hardcoded values to tokens:

   ```ts
   // Before: colors scattered in CSS files
   // After:
   export const color = tokens.create('color', {
     primary: '#0066ff',
     secondary: '#6b7280',
   });
   ```

````

3. **Create style definitions** - Convert CSS rules to typestyles:

   ```css
   /* Before */
   .btn {
     padding: 8px 16px;
     background: #0066ff;
   }
   .btn:hover {
     background: #0052cc;
   }
````

```ts
// After
const button = recipe({
  name: 'button',
  styles: {
    base: {
      padding: '8px 16px',
      backgroundColor: color.primary,
      '&:hover': {
        backgroundColor: color.primaryHover,
      },
    },
  },
});
```

4. **Update components** - Replace className strings with function calls

5. **Remove old CSS** - Once fully migrated, delete the CSS files

## From styles.create (previous typestyles API)

If you are migrating from the previous `styles.create()` API:

### Basic migration

**Before:**

```ts
import { variant } from 'typestyles';
const button = recipe({
  name: 'button',
  variants: {
    primary: variant.boolean({ default: false }),
    large: variant.boolean({ default: false }),
  },
  styles: {
    base: { padding: '8px 16px' },
    variants: {
      primary: { true: { backgroundColor: '#0066ff' }, false: {} },
      large: { true: { fontSize: '18px' }, false: {} },
    },
  },
});

// Usage:
button('base', 'primary', 'large');
button('base', isPrimary && 'primary');
```

**After (flat config):**

```ts
import { variant } from 'typestyles';
const button = recipe({
  name: 'button',
  variants: {
    primary: variant.boolean({ default: false }),
    large: variant.boolean({ default: false }),
  },
  styles: {
    base: { padding: '8px 16px' },
    variants: {
      primary: { true: { backgroundColor: '#0066ff' }, false: {} },
      large: { true: { fontSize: '18px' }, false: {} },
    },
  },
});

// Base is auto-applied. Destructure for direct access:
const { base, primary, large } = button;
cx(base, primary, large);

// Or use cx() with conditions:
cx(button(), isPrimary && primary);
```

**After (dimensioned config -- recommended for variants like intent/size):**

```ts
import { variant } from 'typestyles';
const button = recipe({
  name: 'button',
  variants: {
    intent: variant.enum(['primary'], { default: 'primary' }),
    size: variant.enum(['large'], { default: 'large' }),
  },
  styles: {
    base: { padding: '8px 16px' },
    variants: {
      intent: {
        primary: { backgroundColor: '#0066ff' },
      },
      size: {
        large: { fontSize: '18px' },
      },
    },
  },
});

// Base auto-applied, defaults kick in:
button();
button({ intent: 'primary', size: 'large' });
```

### Key changes

1. `styles.create()` is removed; use `recipe()` instead.
2. Base styles are auto-applied when calling as a function -- no need to pass `'base'` explicitly.
3. The return is both callable AND destructurable.
4. Use `cx()` (exported from `'typestyles'`) for conditional class joining.
5. Varargs calling patterns like `button('base', 'primary')` are replaced by either the function call with variant object or destructuring.

## General migration tips

### 1. Start small

Don't migrate everything at once. Pick one component or one page and convert it. typestyles works alongside your existing styles during the transition.

### 2. Keep the same names

If you have `.button--primary` in CSS, create a `button` component with a `primary` variant. This makes the migration easier to follow.

### 3. Use tokens early

Define your design tokens before converting components. This ensures consistency and makes the component migration smoother.

### 4. Test class names

In your tests, you may need to update selectors:

**Before:**

```ts
expect(screen.getByRole('button')).toHaveClass('button--primary');
```

**After:**

```ts
expect(screen.getByRole('button')).toHaveClass('button', 'button--intent-primary');
```

### 5. DevTools familiarity

Your generated class names will be human-readable (`button--intent-primary`), so DevTools inspection stays familiar -- actually more readable than hashed class names from other CSS-in-JS libraries.

### 6. Bundle size check

After migration, your JavaScript bundle may be slightly smaller (no CSS parsing runtime) but you'll have a small runtime addition from typestyles itself. Overall size should be similar or smaller.

## Common patterns comparison

| Pattern                  | StyleX                               | Panda                     | vanilla-extract                     | Stitches                    | typestyles                             |
| ------------------------ | ------------------------------------ | ------------------------- | ----------------------------------- | --------------------------- | -------------------------------------- |
| **Variants**             | Multiple `create` styles + `props()` | `cva` / recipes           | `recipe`                            | `styled` + `variants`       | `recipe`                               |
| **Tokens**               | `defineVars`                         | `theme.tokens` in config  | `createThemeContract` / `createVar` | `theme` on `createStitches` | `tokens.create`                        |
| **Themes**               | `createTheme`                        | semantic tokens / `_dark` | `createTheme(vars, …)`              | `createTheme`               | `tokens.createTheme({ name, tokens })` |
| **Token refs in styles** | `vars.color`                         | `blue.500` strings        | `vars.color.brand`                  | `$primary`                  | `color.primary` → `var(--…)`           |
| **Plain-CSS overrides**  | Hard (hashed)                        | Limited (codegen)         | Awkward (hashed)                    | Not the model               | First-class (`--*` + semantic classes) |
| **Class joining**        | `stylex.props`                       | `cx` / recipe result      | `clsx`                              | Component props             | `cx()` from typestyles                 |

## Migration CLI (MVP)

The `@typestyles/migrate` package includes an early CLI to help with static migrations from styled-components and Emotion.

### Scope in this first version

- Converts static tagged templates (`styled.*`, `styled(...)`, and `css\`...\``) into `style(...)`or`recipe(...)` when boolean prop variants are detected.
- Rewrites JSX usage for safely transformable styled components.
- Skips unsupported template interpolations (theme access, non-literal ternaries, etc.) and emits warnings instead of doing unsafe rewrites.
- Converts prop-based interpolations such as `` `${props => props.color}` `` to `createVar` + `assignVars`.
- Converts boolean prop ternaries such as `` `${props => props.primary ? '#0066ff' : '#6b7280'}` `` to `recipe` variants.
- Supports destructured prop params (`` `${({ color }) => color}` ``) and `@media` blocks in static templates.

### Usage

```bash
pnpm --filter @typestyles/migrate typestyles-migrate src
```

By default the command is **dry-run** and prints patch output. Use `--write` to apply changes:

```bash
pnpm --filter @typestyles/migrate typestyles-migrate src --write
```

Useful options:

- `--include <glob>`: only process matching files (repeatable)
- `--exclude <glob>`: ignore matching files (repeatable)
- `--extensions .ts,.tsx`: customize scanned extensions
- `--report migration-report.json`: write a JSON summary and warning report

### Current limitations

- Theme access and other non-literal interpolations are not auto-migrated.
- Exported styled components are skipped to avoid accidental API-shape changes.
- Complex non-JSX references to styled component variables are skipped.

Prop-based interpolations (for example `` `${(props) => props.color}` `` or `` `${props => props.width}px` ``) are converted to `createVar` + `assignVars` at JSX call sites. Boolean prop ternaries become `recipe` variants. Destructured prop params and `@media` blocks in static templates are supported.

## Troubleshooting migration issues

### Styles not applying

- Check that the namespace in `recipe()` is unique
- Verify the component is being rendered (lazy injection means CSS only appears when used)
- Use DevTools to confirm class names are being applied

### Type errors

- Ensure you're importing from `'typestyles'`
- Check that TypeScript knows about the CSS property types (should work out of the box)
- For custom properties, use type assertions: `{ ['--custom' as string]: 'value' }`

### Performance concerns

- Don't create styles inside components (define them at module level)
- Use tokens instead of recreating values
- Static styles only -- dynamic values should use inline styles

If you hit any issues during migration, check the [troubleshooting guide](/docs/troubleshooting) or [open an issue](https://github.com/phthalo-dev/typestyles/issues).
