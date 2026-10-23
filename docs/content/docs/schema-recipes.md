---
title: Schema-first recipes
description: Define a recipe's visual props once with variant axes and let TypeScript type the style map
---

A recipe declares its visual props — the variant axes and the slots — on the same object
as `styles`. `styles` is then checked against that declaration, so every option is
required, boolean props are real `boolean`s, and the callable, `RecipeVariants`, and docs
all read the same fields. See [Components](/docs/components) for the full call.

```ts
import { createTypeStyles, variant } from 'typestyles';

const { recipe } = createTypeStyles({ mode: 'attribute' });
```

## Axes

An axis is a branded value describing one visual prop: its options and its default.

```ts
import { variant } from 'typestyles';

const surfaceAppearance = variant.enum(['subtle', 'solid', 'outline'], {
  default: 'subtle',
});

const controlSize = variant.enum(['sm', 'md', 'lg'], { default: 'md' });

const elevated = variant.boolean({ default: false });
```

- `variant.enum(options, { default })` — `options` is a non-empty array of unique string
  literals; `default` must be one of them. The callable prop is `Options[number]`.
- `variant.boolean({ default })` — the callable prop is `boolean`. The style map is keyed
  `true` / `false`, because those are the two CSS branches (see
  [boolean axes](#boolean-axes)).

Axes are plain values, not bound to a `createTypeStyles` instance, so a design system can
export `controlSize` / `surfaceAppearance` from one module and pass them into many recipes.

## A slot recipe

`slots` and `variants` are fields on the object. `styles` is checked against them, so the
callback cannot invent a slot or drop an option.

```ts
import { variant } from 'typestyles';
const alert = recipe({
  name: 'alert',
  layer: 'components',
  slots: ['root', 'icon', 'body', 'title', 'content', 'action', 'actionLink'] as const,
  variants: {
    tone: variant.enum(['info', 'success', 'warning', 'danger', 'tip'], {
      default: 'info',
    }),
    appearance: surfaceAppearance,
    contentGap: variant.enum(['spaced', 'flush'], { default: 'spaced' }),
  },
  vars: { surface: '#fff' },
  styles: ({ vars }) => ({
    base: { root: { display: 'flex', backgroundColor: vars.surface.var } },
    variants: {
      tone: {
        info: { root: { color: vars.surface.var } },
        success: {
          root: {/* … */},
        },
        warning: {
          root: {/* … */},
        },
        danger: {
          root: {/* … */},
        },
        tip: {
          root: {/* … */},
        },
      },
      appearance: {
        subtle: {
          root: {/* … */},
        },
        solid: {
          root: {/* … */},
          title: { color: 'inherit' },
        },
        outline: {
          root: {/* … */},
        },
      },
      contentGap: {
        spaced: { content: { marginTop: '4px' } },
        flush: { content: { marginTop: 0 } },
      },
    },
  }),
});

alert({ tone: 'tip', appearance: 'solid' });
alert.defaults.tone; // 'info'
```

A **single-target** recipe omits `slots`:

```ts
import { variant } from 'typestyles';
const button = recipe({
  name: 'button',
  layer: 'components',
  variants: { size: controlSize, elevated: variant.boolean({ default: false }) },
  styles: () => ({
    base: {/* … */},
    variants: {
      size: {
        sm: {/* … */},
        md: {/* … */},
        lg: {/* … */},
      },
      elevated: { true: { boxShadow: 'var(--shadow-md)' }, false: {} },
    },
  }),
});

button({ size: 'sm', elevated: true });
```

### What the definition checks

TypeScript checks the callback's return against the definition:

- **A missing option** — every enum option and both boolean branches must be styled.
- **A slot style on the wrong slot** — each option's style is a `Partial<Record<Slot, …>>`.
- **An unknown axis or option key** — `variants: { tone, nope }` and `tone: { info, extra }`
  are errors, so a typo cannot silently drop a branch.
- **Unknown options on the callable** — `alert({ tone: 'nope' })` and `alert({ material: 'x' })`
  are errors.

## Boolean axes

`variant.boolean()` is `boolean` on the callable and on `RecipeVariants` — never
`'true' | 'false'`. The style map keeps the two string branches because that is what the
attribute selector compiles to.

```ts
import { variant } from 'typestyles';
variant.boolean({ default: false });
// callable:     elevated?: boolean
// style map:    elevated: { true: { … }, false: { … } }
```

In `mode: 'attribute'`, `true` emits the presence attribute (`data-elevated`) with an empty
value and `false` omits it — the same behavior as today's `{ true, false }` option keys.

**Note:** avoid `variant.enum(['true', 'false'])`. In attribute mode those two literals are
emitted as the **presence boolean** above (the attribute is present or absent, not valued),
which is almost never what you want — reach for `variant.boolean()` instead.

## Derived types

```ts
import type { RecipeDefaultsOf, RecipeVariants, VariantOptions } from 'typestyles';

type AlertProps = RecipeVariants<typeof alert>;
// {
//   tone?: 'info' | 'success' | 'warning' | 'danger' | 'tip';
//   appearance?: 'subtle' | 'solid' | 'outline';
//   contentGap?: 'spaced' | 'flush';
// }

type AlertDefaults = RecipeDefaultsOf<typeof alert>;
// { tone: 'info'; appearance: 'subtle'; contentGap: 'spaced' }

type SurfaceAppearance = VariantOptions<typeof surfaceAppearance>;
// 'subtle' | 'solid' | 'outline'
```

`RecipeVariants` is the shape to build React/Astro props from. It matches the callable
including `boolean` for `variant.boolean()` — but **without `null`**, so
`alert({ tone: null })` is accepted by the callable while `tone={null}` fails a prop typed
as `AlertProps`. Defaults come from the handle:

```tsx
import type { RecipeVariants } from 'typestyles';

export type CodeBlockProps = RecipeVariants<typeof codeBlock> & {
  code: string;
  language?: string;
};

export function CodeBlock({ variant = codeBlock.defaults.variant, code }: CodeBlockProps) {
  const cb = codeBlock({ variant });
  // …
}
```

When the recipe declares `vars`, `.vars` is on the handle and typed with those leaves:

```ts
const v = alert.vars; // ComponentVarRefTree<{ surface: string }> | undefined
v?.surface.var; // 'var(--alert-surface)'
```

## Schema metadata

Docs generators read the schema instead of hand-written prop tables. For recipes created
with the schema call shape, `getComponentMeta(recipe).schema` records the slots, each axis's
kind, its options, and its default:

```ts
import { getComponentMeta } from 'typestyles';

getComponentMeta(alert)?.schema;
// {
//   slots: ['root', 'icon', 'body', 'title', 'content', 'action', 'actionLink'],
//   variants: {
//     tone: { kind: 'enum', options: ['info', …], default: 'info' },
//     appearance: { kind: 'enum', options: ['subtle', 'solid', 'outline'], default: 'subtle' },
//   },
// }
```

`getComponentMeta(recipe).schema` records the slots and axes for every `recipe()` call.

## Interop

- `styles` may be an object or `({ vars }) => object`. `compoundVariants` is checked
  against the axis options.
- `.vars` is on the handle when the recipe declares `vars`.
- `override()` and `OverrideConfigFor<typeof recipe>` follow the recipe's axes and
  slots, including boolean axes and `vars` keys.
- Defaults live on the axes (`variant.enum` / `variant.boolean`). The handle exposes
  `.defaults`. There is no `defaultVariants` field.

## Related docs

- [Components](/docs/components) — the general `recipe` reference
- [Attribute mode (React & Astro)](/docs/attribute-mode-react)
- [API Reference](/docs/api-reference)
