---
title: Framework comparison
description: How TypeStyles compares to StyleX, Panda CSS, vanilla-extract, Stitches, Emotion, CSS Modules, and plain CSS—with a shared button example and a topic-by-topic comparison
---

This page is a **decision lens**: same button pattern across ecosystems, then a **topic-by-topic** comparison (easier to scan on a laptop than a wide grid of cards or a seven-column table). For API-by-API moves, use the [Migration guide](/docs/migration). For install and your first component, see [Getting started](/docs/getting-started).

## Compared at a glance

Each subsection below is one decision axis. Lists use normal body typography—**tool names** and `inline code` carry the emphasis.

### Build

- **TypeStyles** — Optional; runtime by default, [zero-runtime](/docs/zero-runtime) when you want.
- **StyleX** — **Required** compiler (Babel / SWC).
- **Panda CSS** — **Required** codegen + config.
- **vanilla-extract** — **Required** `.css.ts` + bundler.
- **Emotion / styled-components** — Bundler only; runtime in the loop.
- **CSS Modules** — Bundler maps your authored class names to **per-file scoped** output.
- **Plain CSS** — None for CSS itself.

### Typical DOM classes

- **TypeStyles** — Readable names (`button--intent-primary`); scoped `--scope-token-*`.
- **StyleX** — Atomic, hashed.
- **Panda CSS** — Utilities / recipes from your preset.
- **vanilla-extract** — Usually hashed / scoped.
- **Emotion / styled-components** — Hashed.
- **CSS Modules** — You choose readable names in CSS; the bundler emits **scoped** class strings in the DOM, **usually with a short content hash** so files cannot collide (for example `._primary_abc123`).
- **Plain CSS** — Whatever you author.

### Tokens

- **TypeStyles** — `tokens.create` → real CSS variables.
- **StyleX** — `defineVars` + compiler.
- **Panda CSS** — Config-first scales (`blue.600`, etc.).
- **vanilla-extract** — You wire CSS vars / contracts.
- **Emotion / styled-components** — Theme objects / your own vars.
- **CSS Modules** — Your globals / vars.
- **Plain CSS** — Your conventions.

### Good fit when…

- **TypeStyles** — TS variants **and** inspectable CSS **without** a compiler on day one.
- **StyleX** — Meta stack, static guarantees, atomic output.
- **Panda CSS** — You want Panda’s pipeline and strict token schema.
- **vanilla-extract** — **Zero runtime by default**, file-based CSS.
- **Emotion / styled-components** — Classic styled API; fine with runtime (or separate extraction).
- **CSS Modules** — Mostly hand-written CSS; variants via `clsx` / toggles.
- **Plain CSS** — Maximum portability; TS ergonomics are DIY.

**SSR / production CSS:** TypeStyles can [collect styles for SSR](/docs/ssr) and optionally [extract static CSS](/docs/zero-runtime). StyleX, Panda, and vanilla-extract generally emit CSS at build time. Emotion’s story depends on your bundler and extraction setup. CSS Modules and plain CSS ship as stylesheets like any static asset.

---

## Same button: primary vs ghost

Each snippet is a **typed** `intent` (`primary` = filled, `ghost` = outline). Real apps add focus, sizing, and tokens; lengths are trimmed.

### TypeStyles (recommended shape)

[`createTypeStyles`](/docs/api-reference#createtypestyles-options) keeps **styles** and **tokens** on one **`scopeId`** (see [Getting started](/docs/getting-started)).

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe, tokens } = createTypeStyles({ scopeId: 'app' });
const color = tokens.create('color', { primary: '#2563eb', surface: '#ffffff' });

export const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary', 'ghost'], { default: 'primary' }) },
  styles: {
    base: {
      padding: '8px 16px',
      borderRadius: '6px',
      fontWeight: 500,
      border: 'none',
      cursor: 'pointer',
    },
    variants: {
      intent: {
        primary: { backgroundColor: color.primary, color: color.surface },
        ghost: {
          backgroundColor: 'transparent',
          color: color.primary,
          border: `1px solid ${color.primary}`,
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

### StyleX (compiler, atomic classes)

Author-time objects; **`stylex.props`** merges styles at compile time. Hashed atomic classes in the DOM.

```ts
import * as stylex from '@stylexjs/stylex';

const s = stylex.create({
  base: {
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
  },
  primary: { backgroundColor: '#2563eb', color: '#fff' },
  ghost: {
    backgroundColor: 'transparent',
    color: '#2563eb',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#2563eb',
  },
});
```

```tsx
<button type="button" {...stylex.props(s.base, intent === 'ghost' ? s.ghost : s.primary)}>
  {children}
</button>
```

### Panda CSS (`cva` / recipes)

Codegen from **`panda.config`**; import paths vary (`../styled-system/css` here is illustrative). Token strings like `blue.600` are **your** scale.

```ts
import { cva } from '../styled-system/css';

export const button = cva({
  base: { px: '4', py: '2', rounded: 'md', fontWeight: 'medium', cursor: 'pointer' },
  variants: {
    intent: {
      primary: { bg: 'blue.600', color: 'white', borderWidth: '0' },
      ghost: {
        bg: 'transparent',
        color: 'blue.600',
        borderWidth: '1px',
        borderColor: 'blue.600',
      },
    },
  },
  defaultVariants: { intent: 'primary' },
});
```

```tsx
<button type="button" className={button({ intent })}>
  {children}
</button>
```

### vanilla-extract (`recipe`)

**`.css.ts`** files; bundler emits **static CSS**. Typed variants; class strings usually **hashed**.

```ts
import { recipe } from '@vanilla-extract/recipes';

export const button = recipe({
  base: {
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
  },
  variants: {
    intent: {
      primary: { background: '#2563eb', color: '#fff' },
      ghost: {
        background: 'transparent',
        color: '#2563eb',
        border: '1px solid #2563eb',
      },
    },
  },
  defaultVariants: { intent: 'primary' },
});
```

```tsx
<button type="button" className={button({ intent })}>
  {children}
</button>
```

### Emotion / styled-components

**Styled component** or `css` prop; **hashed** classes; **tokens** are usually theme objects or vars you wire.

```tsx
import styled from '@emotion/styled';

export const Button = styled.button<{ intent?: 'primary' | 'ghost' }>`
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  ${(p) =>
    p.intent === 'ghost'
      ? `background: transparent; color: #2563eb; border: 1px solid #2563eb;`
      : `background: #2563eb; color: #fff;`}
`;
```

```tsx
<Button intent={intent}>{children}</Button>
```

### CSS Modules

**Plain CSS** in `.module.css`; bundler scopes names. Variants are **manual** (`clsx`, toggles, BEM).

```css
/* Button.module.css */
.base {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}
.primary {
  background: #2563eb;
  color: #fff;
}
.ghost {
  background: transparent;
  color: #2563eb;
  border: 1px solid #2563eb;
}
```

```tsx
import styles from './Button.module.css';
import clsx from 'clsx';

<button
  type="button"
  className={clsx(styles.base, intent === 'ghost' ? styles.ghost : styles.primary)}
>
  {children}
</button>;
```

### Plain CSS

Global stylesheets, BEM modifiers, or attribute selectors—**no** TS variant layer unless you add one yourself. Maximum portability; colocation and typing are DIY.

---

## Theming architecture: TypeStyles vs. StyleX (and Astryx)

Theming is where compiler restrictions surface in practice. **Astryx**—Meta's design system for internal tools, built on **StyleX**—has a genuinely flexible theming story, but it gets there by working _around_ StyleX's constraints. TypeStyles never had those constraints, so the workaround layer doesn't exist. Four concrete differences:

### Token variables: plain custom properties vs. compiler-managed vars

- **TypeStyles** — [`tokens.create`](/docs/tokens) emits **plain CSS custom properties** with predictable names (`--app-color-primary` under `scopeId: 'app'`) from any ordinary TypeScript module. Themes are [`tokens.createTheme`](/docs/theming-patterns) surfaces: a stable `theme-{name}` class whose properties override token values for that subtree. Because the variables are just CSS, any stylesheet—yours, legacy, third-party—can read or set them directly.
- **StyleX** — `defineVars` also compiles to custom properties, but with **hashed names the compiler owns**, and variable definitions **must live in `.stylex.ts` / `.stylex.js` files** so imports can be resolved statically; theming (`createTheme`) flows through those same files. Astryx's theming flexibility is built by routing around these rules. With TypeStyles there is **no compiler restriction to route around**.

TypeStyles theme surfaces also carry a general condition engine—`tokens.when` (media queries, attributes, class names, `or` / `and` / `not` combinators) plus [`tokens.colorMode`](/docs/theming-patterns#light-dark-system-on-data) presets—so "dark when the OS prefers it, unless `data-color-mode="light"` wins" is a declaration, not bespoke infrastructure on top of fixed light/dark modes.

### Distribution: build-always vs. runtime injection with a warning

- **TypeStyles** — Token and theme CSS goes through the **same pipeline as every other style**: runtime injection in dev, static CSS via [zero-runtime extraction](/docs/zero-runtime) when you want it. There is no dedicated theme-build command, because none is needed—and therefore no "did you forget to build your theme" state to warn about.
- **Astryx** — Themes that weren't compiled ahead of time are **injected at runtime with a console warning**, and users are pushed toward a separate `astryx theme build` step to get static CSS.

### Component overrides: plain CSS vs. a config DSL

- **TypeStyles** — [`recipe`](/docs/components) emits **semantic, deterministic class names** (`button--intent-primary`). A consumer restyling a component writes ordinary CSS targeting that class—any property, any selector, any stylesheet—and [cascade layers](/docs/cascade-layers) keep override order predictable.
- **StyleX / Astryx** — Hashed atomic classes can't be targeted from outside the compiler, so Astryx exposes overrides through an **`@scope` + data-attribute configuration DSL**: you can override what the DSL anticipates, in the shapes it anticipates.

### Animatable typed tokens: `@property` vs. unsupported

- **TypeStyles** — `tokens.create` leaves and [`property`](/docs/api-reference#styles) accept `{ value, syntax, inherits }` and emit a real **`@property`** rule for that custom property. A typed token (`<color>`, `<angle>`, `<number>`, …) is interpolated by the browser directly — including inside values a `transition` on an ordinary CSS property can't reach, like a gradient's angle. See [Animating typed tokens with `@property`](/docs/theming-patterns#animating-typed-tokens-with-property) for a worked theme-switch example.
- **StyleX / Astryx** — StyleX's own documented capability list marks explicit `@property` output as unsupported ("compiles but invalid CSS output"). A smoothly animating gradient angle or color token on theme switch is structurally unavailable to a compiled StyleX/Astryx theme, independent of how the rest of its theming DSL evolves.

The pattern across all four: a StyleX-based system must **generate an escape hatch** for each theming capability its compiler forecloses—or simply cannot reach it. TypeStyles ships the underlying primitives—real custom properties, readable class names, cascade layers, typed `@property`—so the capability is the default, not the workaround.

---

## When TypeStyles is a strong default

- **Readable classes** and **scoped CSS variables** for DevTools, legacy CSS, and third-party markup.
- **Typed variants** (CVA-/recipe-like) **without** a compiler on day one.
- **Incremental adoption** and **`createTypeStyles` + `scopeId`** for libraries or micro-frontends.
- Comfortable with **runtime injection in dev**, with an **optional** [zero-runtime](/docs/zero-runtime) path when you need static CSS.

## When another tool might win

- **StyleX** — Standardized on Meta’s compiler; want static guarantees and atomic output.
- **Panda CSS** — Want codegen utilities and a strict config-first token pipeline.
- **vanilla-extract** — Want **zero runtime by default** and are fine with `.css.ts` contracts.
- **Emotion / styled-components** — Want the classic styled API and accept runtime (or a separate extraction story).
- **CSS Modules** — Mostly hand-written CSS; no first-class variant API in the styling layer.
- **Plain CSS** — Zero JS styling layer; maximum portability.

## Practical migration

Start with [Migration](/docs/migration) — jump links for the common compilers:

- [From StyleX](/docs/migration#from-stylex) — `create` / `defineVars` / `createTheme`
- [From Panda CSS](/docs/migration#from-panda-css) — `cva`, tokens, semantic `_dark`
- [From vanilla-extract](/docs/migration#from-vanilla-extract) — `recipe`, theme contracts
- [From Stitches](/docs/migration#from-stitches) — variants, `$tokens`, `createTheme`

Panda- and CVA-like APIs map closely to **`recipe`**. Emotion and CSS Modules map well to **`style`** plus [`cx`](/docs/compose) from `'typestyles'`.

## Related docs

- [Getting started](/docs/getting-started)
- [Design system with tokens](/docs/design-system)
- [Theming patterns](/docs/theming-patterns)
- [Cascade layers](/docs/cascade-layers)
- [Zero-runtime extraction](/docs/zero-runtime)
- [Component library setup](/docs/component-library)
