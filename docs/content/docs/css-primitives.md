---
title: CSS primitives
description: Progressive-disclosure ladder for custom properties — tokens, component vars, scoped properties, and exact-name css.*
---

TypeStyles exposes several APIs for CSS custom properties and `@property` registration. Each tier is a thin wrapper over the one below — use the highest rung that fits your job and drop down only when you need more control.

## The ladder

```
tokens.declare / tokens.create        ← design systems, themes, forward refs
        ↓ component-scoped or non-token properties
ctx.vars.declare / ctx.var            ← component internal custom properties
property.declare / .set        ← global, scoped to a styles instance
        ↓ exact --names, no prefixing
css.atProperty / css.customProperty   ← mirrors the cascade spec
        ↓ unanticipated at-rules
insertRules(rules)                    ← escape hatch (already exists)
```

## When to use which tier

```
Is it a design token (colors, space, themes)?
  └─ yes → tokens.declare / tokens.create  ([Tokens](/docs/tokens))

Is it internal to one component (variant-driven values)?
  └─ yes → ctx.vars.declare / ctx.var  ([Components](/docs/components))

Is it global but scoped to your styles instance?
  └─ yes → property.declare / .set

Do you need exact --names (Style Dictionary, legacy CSS, third-party)?
  └─ yes → css.atProperty / css.customProperty  (typestyles/css)

Unanticipated at-rule not covered above?
  └─ yes → insertRules  ([API reference](/docs/api-reference#sheet-and-testing-utilities))
```

**Design systems** should stay on [Tokens](/docs/tokens) — `tokens.declare` / `tokens.create` handle namespaces, themes, forward references, and `nameTemplate` for Style Dictionary interop.

**Component authors** use `ctx.vars.declare` when typed `@property` registration is needed but default values live in variants rather than at declare time.

**Migration and interop** use `typestyles/css` when variable names must match an existing stylesheet exactly, with no scope prefixing.

## `atProperty` presets

Named `@property` registration presets for common syntaxes — spread, override, or pass directly to any tier:

```ts
import { atProperty } from 'typestyles';
// or: import { atProperty } from 'typestyles/css';

tokens.declare('color', {
  accent: { default: atProperty.color },
  border: { ...atProperty.color, inherits: true },
  hue: { syntax: atProperty.angle.syntax },
});

css.atProperty('--ds-accent', atProperty.color);
property.declare('overlay-opacity', atProperty.number);
```

Each preset is `{ syntax, inherits, initial }` — the same shape as `PropertyRegistration`. Helpers:

- `atProperty.list(atProperty.color)` → `{ syntax: '<color>+', … }`
- `atProperty.union(atProperty.length, atProperty.percentage)` → `{ syntax: '<length> | <percentage>', … }`

Available presets: `color`, `number`, `integer`, `length`, `percentage`, `lengthPercentage`, `angle`, `time`, `resolution`.

## `typestyles/css`

Import from the dedicated subpath — no `scopeId`, no namespace prefixing:

```ts
import { css } from 'typestyles/css';
```

| Method                                       | Purpose                                                       |
| -------------------------------------------- | ------------------------------------------------------------- |
| `css.atProperty(name, registration)`         | Emit `@property` only (no value declaration)                  |
| `css.customProperty(name, value, options?)`  | Emit a single custom property on a selector (default `:root`) |
| `css.customProperties(selector, properties)` | Batch-emit multiple properties in one rule                    |
| `css.var(name)`                              | Return a ref without emitting anything                        |

Registration metadata (`syntax`, `inherits`, `initial`) is separate from values — the same split as `tokens.declare` / `tokens.create`.

### Exact-name custom properties

```ts
import { css } from 'typestyles/css';

// Match existing global stylesheet names exactly
css.atProperty('--ds-color-accent', atProperty.color);
css.customProperty('--ds-color-accent', '#0066ff');

const accent = css.var('--ds-color-accent');
// style('hero', { color: accent.var })

// Dependent value: declare with placeholder, set real value separately
css.atProperty('--ds-color-accent-subtle', { syntax: '<color>', inherits: false });
css.customProperty(
  '--ds-color-accent-subtle',
  `color-mix(in oklch, ${accent.var} 24%, transparent)`,
);
```

`css.customProperty` does **not** emit `@property` — call `css.atProperty` separately when typed registration is needed.

### Style Dictionary migration

When Style Dictionary (or another build step) already defines exact `--*` names and optional `@property` metadata, wire them through `typestyles/css` instead of re-prefixing with `tokens.create`:

```ts
import { css } from 'typestyles/css';

for (const [name, meta] of Object.entries(sdPropertyMetadata)) {
  if (meta.syntax) css.atProperty(name as `--${string}`, meta);
}
css.customProperties(':root', sdValues);
```

For greenfield TypeStyles apps, prefer `tokens.create` with `nameTemplate` — see [Style Dictionary & W3C tokens](/docs/style-dictionary#matching-external-css-names).

## `property.declare` / `.set`

Global custom properties scoped to a `createStyles` / `createTypeStyles` instance. Names follow `--{scope}-property-{id}` (unchanged from the shorthand).

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

// Split form — declare structure, set value separately
const hue = property.declare('accent-hue', { syntax: '<number>' });
property.set(hue, '220');

// Shorthand (unchanged) — declare + set in one call
const radius = property('corner-radius', {
  syntax: '<length>',
  value: '8px',
});

// Bare ref — no emission
const ref = property('accent-hue');
```

Existing `property(id, { value, syntax, inherits })` call sites continue to work via the shorthand.

See [API reference — `styles`](/docs/api-reference#styles) for the full signature.

## Recipe `vars`

Component-scoped custom properties: `--{scope}-{component}-{path}`. Declare them on the recipe. The style callback receives the ref tree, and values are set with `[ref.name]` or `ref.var` inside `styles`.

```ts
import { variant } from 'typestyles';

const badge = recipe({
  name: 'badge',
  variants: { tone: variant.enum(['neutral', 'danger'], { default: 'neutral' }) },
  vars: {
    textColor: { syntax: '<color>', inherits: false, value: '#333' },
    borderWidth: '1px',
  },
  styles: ({ vars }) => ({
    base: {
      color: vars.textColor.var,
      borderStyle: 'solid',
      borderWidth: vars.borderWidth.var,
    },
    variants: {
      tone: {
        neutral: { [vars.textColor.name]: '#333' },
        danger: { [vars.textColor.name]: '#900' },
      },
    },
  }),
});
```

A leaf is a string, a number, or `{ value, syntax?, inherits? }`. For an `@property` that should not carry a recipe default, use `property.declare` and reference it from `styles`.

See [Components — Expose themeable properties as vars](/docs/components#expose-themeable-properties-as-vars).

## Relationship to tokens

[tokens.declare](/docs/tokens#forward-referencing-tokens-tokensdeclare) / [tokens.create](/docs/tokens#creating-tokens) is the design-system tier. It adds namespace batching, theme integration, forward references, and optional `nameTemplate` on top of the same underlying `@property` and custom-property emitters.

Reach for lower tiers only when tokens' namespace model doesn't fit — for example component-internal vars or exact global names during migration.

## Escape hatch

When you need an at-rule or selector pattern not covered by the ladder (`@starting-style`, bespoke `@layer` stacks, etc.), use low-level rule insertion via [`insertRules`](/docs/api-reference#sheet-and-testing-utilities) from the main `typestyles` entry. All `css.*` calls route through the same sheet internally.
