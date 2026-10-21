---
title: End-to-end theming
description: Build and apply a TypeStyles theme — tokens, createTheme, override, and mount
---

A complete theming setup with TypeStyles: design tokens, a theme surface class, recipe overrides, and mounting in the DOM. Consumers can customize with TypeStyles APIs or plain CSS that targets the same class names and custom properties.

For more patterns (multi-brand, condition scopes, `@property` animation), see [Theming patterns](/docs/theming-patterns). Coming from StyleX / Panda / vanilla-extract / Stitches? See [Migration](/docs/migration#coming-from-cheat-sheet).

## What you get

| Piece                             | CSS / DOM                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `tokens.create` / `declare`       | `:root { --app-color-… }`                                                         |
| `tokens.createTheme({ name, … })` | `.theme-app-brand { --app-color-… }` (+ optional `light-dark()`, `@media`, attrs) |
| `recipe`                          | Readable recipe classes (`button--intent-primary`)                                |
| `override(…, { selectorPrefix })` | `.theme-app-brand .button { … }`                                                  |
| Plain CSS                         | Same class and `--*` names — consumers can theme without TypeStyles               |

## Walkthrough

Defaults live on `:root` via `tokens.create`. Themes only set **what changes** under a theme class — brand accents, theme-local namespaces, recipe overrides. Unchanged paths inherit through the cascade.

Light and dark belong on the **token leaves** (`{ light, dark }`) when you register `colorModes` — not as parallel untyped constants. Passing `{ decl }` types those values against the schema.

### 1. Shared runtime

```ts
// typestyles.ts
import { colorModes, createTypeStyles } from 'typestyles';

export const { recipe, tokens, override } = createTypeStyles({
  scopeId: 'app',
  colorModes,
  layers: {
    order: ['tokens', 'components', 'overrides'] as const,
    token: 'tokens',
    style: 'components',
  },
});
```

### 2. Color tokens

```ts
// tokens/color.ts
import { atProperty } from 'typestyles';
import { tokens } from '../typestyles';

const colorDecl = tokens.declare('color', {
  text: atProperty.color,
  surface: atProperty.color,
  accent: { default: atProperty.color },
});

/** `:root` defaults — mode-aware leaves compile to `light-dark()` when `colorModes` is set. */
export const color = tokens.create(
  'color',
  {
    text: { light: '#111827', dark: '#e5e7eb' },
    surface: { light: '#ffffff', dark: '#0f172a' },
    accent: { default: { light: '#2563eb', dark: '#60a5fa' } },
  },
  { decl: colorDecl },
);
```

`atProperty.color` is `{ syntax: '<color>', initial: 'transparent' }` — spread or override per leaf (`{ ...atProperty.color, inherits: false }`). Same presets exist for `length`, `time`, `angle`, and more; see [CSS primitives — atProperty presets](/docs/css-primitives#atproperty-presets).

`color.text` / `color.accent.default` are typed `var(--…)` refs (syntax-branded). Use them in recipes — do not feed them back into `createTheme({ tokens })` as values.

### 3. Button recipe

```ts
import { variant } from 'typestyles';
// components/button.ts
import { recipe } from '../typestyles';
import { color } from '../tokens/color';

export const button = recipe({
  name: 'button',
  layer: 'components',
  variants: { intent: variant.enum(['primary', 'ghost'], { default: 'primary' }) },
  styles: {
    base: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: color.accent.default,
      color: color.text,
    },
    variants: {
      intent: {
        primary: {},
        ghost: {
          backgroundColor: 'transparent',
          color: color.accent.default,
          border: `1px solid ${color.accent.default}`,
        },
      },
    },
  },
});
```

### 4. Brand theme

```ts
// themes/brand.ts
import { tokens } from '../typestyles';
// Recipe must be registered before createTheme({ components })
import '../components/button';

/**
 * Theme-class deltas only. Root still supplies text/surface via cascade;
 * this surface retints accent and adds a theme-local `brand` namespace.
 */
export const brand = tokens.createTheme({
  name: 'brand',
  tokens: {
    color: {
      accent: { default: { light: '#7c3aed', dark: '#a78bfa' } },
    },
    brand: {
      glow: { default: '#a78bfa' },
    },
  },
  // Same as override(button, …, { selectorPrefix: `.${brand.className}` })
  components: {
    button: ({ tokens: t }) => ({
      base: { boxShadow: `0 0 0 3px ${t.brand.glow.default}` },
    }),
  },
});
```

`brand.className` is something like `theme-app-brand`. `brand.tokens.brand.glow.default` is a `var(--…)` string — the same shape as `tokens.use('color')`. Define additional themes the same way and switch by swapping `className` on a parent — see [Multi-brand theming](/docs/theming-patterns#multi-brand-theming).

Side-effect-import these modules from your [typestyles entry](/docs/zero-runtime) so extraction sees every registration.

### Optional: override without `components`

```ts
// themes/brand-overrides.ts
import { override } from '../typestyles';
import { button } from '../components/button';
import { brand } from './brand';

override({
  recipe: button,
  layer: 'overrides',
  selectorPrefix: `.${brand.className}`,
  styles: { variants: { intent: { ghost: { textDecoration: 'underline' } } } },
});
```

Sharing one root theme across many brands? Use [`Theme.override`](/docs/theming-patterns#deriving-child-themes-override).

## Mount (React)

Root mode-aware tokens compile to `light-dark()`. With `colorModes` configured, `createTheme` also emits `color-scheme: light dark` on the theme class. Values that cannot use `light-dark()` fall back on `data-color-mode` (see [Mode-aware token leaves](/docs/tokens#mode-aware-token-leaves)). For an explicit attribute toggle, see [condition scopes](/docs/theming-patterns#condition-scopes-self-ancestor-descendant) or [attribute-driven modes](/docs/theming-patterns#light--dark--system-on-data).

```tsx
// App.tsx
import { button } from './components/button';
import { brand } from './themes/brand';

export function App() {
  return (
    <div className={brand.className}>
      <button type="button" className={button().className}>
        Primary
      </button>
      <button type="button" className={button({ intent: 'ghost' }).className}>
        Ghost
      </button>
    </div>
  );
}
```

## Mount (HTML)

```html
<div class="theme-app-brand">
  <button class="button button--intent-primary">Primary</button>
</div>
```

Or override tokens from **plain CSS** (no TypeStyles in the consumer app):

```css
.theme-app-brand {
  --app-color-accent-default: #059669;
}
.theme-app-brand .button--intent-primary {
  border-radius: 999px;
}
```

## Selector prefix convention

Theme-scoped recipe restyles use a **descendant** prefix (not CSS `@scope`):

```ts
override({
  recipe: button,
  layer: 'overrides',
  selectorPrefix: `.${brand.className}`,
  styles: { base: { borderRadius: '999px' } },
});
```

Prefer this (or `createTheme({ components })`) over hand-written class strings. Cascade layers keep override order predictable — see [Cascade layers](/docs/cascade-layers).

## Related APIs

| Need                                  | API                                                                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deep-merge override trees / leaf refs | [`mergeThemeOverrides`](/docs/theming-patterns#optional-mergethemeoverrides-helpers)                                                                       |
| Fork a root theme for brands / apps   | [`Theme.override`](/docs/theming-patterns#deriving-child-themes-override)                                                                                  |
| Media / attr / class conditions       | [`tokens.when`](/docs/theming-patterns#condition-scopes-self-ancestor-descendant), [`tokens.colorMode.*`](/docs/tokens#preset-mode-layers-tokenscolormode) |
| Zero-runtime extract of all recipes   | [`getRegisteredComponentRefs`](/docs/zero-runtime#design-systems-with-many-recipes) + Vite `extract.registeredComponentsModule`                            |

## Checklist for design-system authors

1. Export a shared `createTypeStyles({ scopeId, colorModes })` runtime.
2. `tokens.declare` the schema, then `tokens.create(…, { decl })` with mode-aware `{ light, dark }` leaves for defaults.
3. Register recipes with `recipe` on that same runtime.
4. Document that apps call `tokens.createTheme({ name, tokens, … })` with **overrides only**, then apply `theme.className`.
5. Document `selectorPrefix: \`.${theme.className}\``(or theme`components`) for recipe restyles.
6. Keep class and `--*` names stable so consumers can also theme from plain CSS.
