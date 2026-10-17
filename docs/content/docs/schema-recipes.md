---
title: Schema-first recipes
description: Define a recipe's visual props once with variant axes and let TypeScript type the style map
---

A **schema-first recipe** declares its visual props — the variant axes and the slots —
as an explicit definition _before_ the style callback. The callback is then contextually
typed from that definition, so every option is required, boolean props are real
`boolean`s, and the callable, `RecipeVariants`, and docs all read the same definition.

This is an **additive** call shape. `recipe(namespace, config)` and
`recipe(namespace, config, { layer })` keep working exactly as before; see
[Components](/docs/components).

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

Pass the definition as the second argument and the style callback third. `slots` lives on
the definition, so the callback can no longer drop the slot names.

```ts
const alert = recipe(
  'alert',
  {
    slots: ['root', 'icon', 'body', 'title', 'content', 'action', 'actionLink'] as const,
    variants: {
      tone: variant.enum(['info', 'success', 'warning', 'danger', 'tip'], { default: 'info' }),
      appearance: surfaceAppearance,
      contentGap: variant.enum(['spaced', 'flush'], { default: 'spaced' }),
    },
  },
  (c) => {
    const v = c.vars({ surface: '#fff' });
    return {
      vars: v,
      base: { root: { display: 'flex' } },
      variants: {
        tone: {
          info: { root: { backgroundColor: v.surface.var } },
          success: {
            root: {
              /* … */
            },
          },
          warning: {
            root: {
              /* … */
            },
          },
          danger: {
            root: {
              /* … */
            },
          },
          tip: {
            root: {
              /* … */
            },
          },
        },
        appearance: {
          subtle: {
            root: {
              /* … */
            },
          },
          solid: {
            root: {
              /* … */
            },
            title: { color: 'inherit' },
          },
          outline: {
            root: {
              /* … */
            },
          },
        },
        contentGap: {
          spaced: { content: { marginTop: '4px' } },
          flush: { content: { marginTop: 0 } },
        },
      },
    };
  },
  { layer: 'components' },
);

alert({ tone: 'tip', appearance: 'solid' });
alert.defaults.tone; // 'info'
```

A **single-target** recipe omits `slots`:

```ts
const button = recipe(
  'button',
  {
    variants: {
      size: controlSize,
      elevated: variant.boolean({ default: false }),
    },
  },
  () => ({
    base: {
      /* … */
    },
    variants: {
      size: {
        sm: {
          /* … */
        },
        md: {
          /* … */
        },
        lg: {
          /* … */
        },
      },
      elevated: { true: { boxShadow: 'var(--shadow-md)' }, false: {} },
    },
  }),
  { layer: 'components' },
);

button({ size: 'sm', elevated: true });
```

### What the definition checks

Because `RecipeStyles<Def>` is a target type, TypeScript reports:

- **A missing option** — every enum option and both boolean branches must be styled.
- **A slot style on the wrong slot** — each option's style is a `Partial<Record<Slot, …>>`.
- **Unknown options on the callable** — `alert({ tone: 'nope' })` and `alert({ material: 'x' })`
  are errors.

**Note:** unknown keys added to a style map (a typo like
`variants: { tone: { … }, nope: { … } }`) are not flagged: TypeScript does not perform
excess-property checks on object literals returned from a function. Keep the definition and
the callback in sync by importing shared axes.

## Boolean axes

`variant.boolean()` is `boolean` on the callable and on `RecipeVariants` — never
`'true' | 'false'`. The style map keeps the two string branches because that is what the
attribute selector compiles to.

```ts
variant.boolean({ default: false });
// callable:     elevated?: boolean
// style map:    elevated: { true: { … }, false: { … } }
```

In `mode: 'attribute'`, `true` emits the presence attribute (`data-elevated`) with an empty
value and `false` omits it — the same behavior as today's `{ true, false }` option keys.

## Derived types

```ts
import type { RecipeDefaults, RecipeVariants, VariantOptions } from 'typestyles';

type AlertProps = RecipeVariants<typeof alert>;
// {
//   tone?: 'info' | 'success' | 'warning' | 'danger' | 'tip';
//   appearance?: 'subtle' | 'solid' | 'outline';
//   contentGap?: 'spaced' | 'flush';
// }

type AlertDefaults = RecipeDefaults<typeof alert>;
// { tone: 'info'; appearance: 'subtle'; contentGap: 'spaced' }

type SurfaceAppearance = VariantOptions<typeof surfaceAppearance>;
// 'subtle' | 'solid' | 'outline'
```

`RecipeVariants` matches the callable, including `boolean` for `variant.boolean()`. React and
Astro components extend it directly and read defaults from the handle:

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

## Signed off by the schema metadata

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

`meta.schema` is absent for recipes created with the legacy call shapes, so existing docs
pipelines are unaffected.

## Interop

- Legacy `recipe(namespace, config)` and `recipe(namespace, config, { layer })` calls are
  unchanged.
- `c.vars()` / `c.var()` remain available on the callback context, and `.vars` is still
  exposed on the handle.
- `compoundVariants` is allowed in the callback and is checked against the schema's option
  unions.
- Schema recipes do **not** take `defaultVariants` — defaults live on the axes, and the
  handle exposes `.defaults`.

## Related docs

- [Components](/docs/components) — the general `recipe` reference
- [Attribute mode (React & Astro)](/docs/attribute-mode-react)
- [API Reference](/docs/api-reference)
