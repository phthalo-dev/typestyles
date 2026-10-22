---
title: Cascade layers (@layer)
description: Opt-in CSS cascade layers for predictable specificity against global CSS
---

By default, TypeStyles emits **flat** rules (no `@layer`), matching legacy behavior and keeping the API surface small.

When you opt in with a **`layers`** config on `createStyles`, `createTokens`, or the unified **`createTypeStyles`** factory, TypeStyles:

1. Registers a single **`@layer a, b, c;`** preamble (once per distinct stack) so order is deterministic.
2. Wraps each emitted rule block in **`@layer <name> { … }`** for the `layer` you pass on each style call (runtime CSSOM still inserts one block at a time).
3. When reading CSS via **`getRegisteredCss()`**, SSR collection, or build extraction, consolidates same-named `@layer` blocks into one block per layer and hoists `@property` rules after the order preamble.
4. When **`createTokens({ layers, tokenLayer })`** is used, `:root` custom properties and **theme** rules go into `tokenLayer` so utilities and components can override tokens predictably.

## `createTypeStyles` (recommended for design systems)

One config object gives you matching **`scopeId`**, **`layers`**, and default layers for both class CSS and token/theme CSS:

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { style, recipe, tokens } = createTypeStyles({
  scopeId: 'ds',
  mode: 'semantic',
  layers: {
    order: ['reset', 'tokens', 'components', 'utilities'] as const,
    token: 'tokens',
    style: 'components',
  },
});

const reset = style('reset', { margin: 0, padding: 0 }, { layer: 'reset' });

const button = recipe({
  name: 'button',
  layer: 'components',
  variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
  styles: {
    base: { padding: '8px 16px' },
    variants: { intent: { primary: { backgroundColor: '#0066ff' } } },
  },
});

tokens.create('color', { primary: '#0066ff' });
```

Conceptual output:

```css
@layer reset, tokens, components, utilities;
@layer tokens {
  :root {
    /* --ds-color-* */
  }
}
@layer reset {
  .reset {
    margin: 0;
    padding: 0;
  }
}
@layer components {
  .button {
    padding: 8px 16px;
  }
}
```

## `createStyles` only

Pass **`layers`** as a `const` tuple (or as `{ order, prependFrameworkLayers? }`) plus **`styleLayer`** for the default. Layer names must appear in the stack (not in `prependFrameworkLayers`, which only affects ordering against external frameworks). Override per call with **`{ layer: '…' }`**.

```ts
const styles = createStyles({
  layers: { order: ['components'], prependFrameworkLayers: ['bootstrap'] },
  styleLayer: 'components',
});

styles.class('card', { padding: '1rem' });
```

## `createTokens` with layers

When **`layers`** is set, **`tokenLayer`** is **required**. Token and theme CSS is wrapped in that layer.

```ts
const tokens = createTokens({
  scopeId: 'app',
  layers: ['tokens', 'components'] as const,
  tokenLayer: 'tokens',
});
```

## Default (no layers)

Omit **`layers`** everywhere: no `@layer` in output, and there is no `layer` option on style APIs.

## Notes

- **Multiple instances:** Each factory that passes **`layers`** owns its own stack; preamble keys include **`scopeId`** and full order so different design systems on one page stay distinct.
- **Build / SSR:** Preamble rules are inserted at the **front** of the virtual sheet so `getRegisteredCss()` and extraction see ordering before wrapped blocks.
- **jsdom:** Older parsers may log warnings for `@layer`; real browsers support cascade layers.

See also [Class naming](/docs/class-naming).
