---
title: Class naming
description: Per-instance semantic, hashed, or atomic class names via createTypeStyles; scoped tokens via createTokens
---

By default, typestyles emits **readable semantic** class names using a BEM-readable grammar: `button`, `button--intent-primary`, and `dialog__content`. You can switch to **hashed**, **compact** (hash-only whole-object), or **atomic** (one class per declaration) names for smaller strings, deduped CSS, or closer parity with CSS-in-JS tools that minify class names. Three more modes target `recipe()` variants specifically: **attribute** (data-attribute selectors instead of discrete classes), **bem** (BEM modifier classes), and **template** (a user-supplied naming function — BEM is a built-in preset of it).

Naming applies to:

- [`style`](/docs/styles)
- [`recipe`](/docs/components) (single-part components and [multipart `slots`](/docs/components))

It does **not** change [`@typestyles/props`](/docs/atomic-css) utility naming; that package uses its own `createProps` namespace pattern.

## Quick start

**Class names** are configured per **`createTypeStyles()`** instance (not with a global singleton). Create one instance per package, design system, or micro-frontend and import that everywhere in the package:

```ts
import { createTypeStyles } from 'typestyles';

export const { style, recipe } = createTypeStyles({
  mode: 'hashed',
  prefix: 'ds',
  scopeId: '@acme/design-system',
});
```

Use `recipe`, `style`, and `hash` from that object. For [utility shortcuts](/docs/styles#utility-shortcuts), pass **`utils`** into `createTypeStyles`.

**Tokens and themes** use the same idea: **`createTypeStyles({ scopeId })`** or **`createTokens({ scopeId })`** so custom properties and theme classes do not collide when multiple bundles share one document:

```ts
import { createTypeStyles } from 'typestyles';

export const { tokens } = createTypeStyles({ scopeId: '@acme/design-system' });
```

With `scopeId` set, `tokens.create('color', …)` emits variables like `--acme-design-system-color-primary` (sanitized), and `tokens.createTheme({ name: 'dark', … })` registers a theme class whose segment includes the scope.

For **CSS cascade layers** (`@layer`) — optional, and off by default — see [Cascade layers](/docs/cascade-layers). Use **`createTypeStyles`** when both class rules and token/theme CSS should share one layer stack and one `scopeId`.

## API

### `createTypeStyles(options?)`

Returns `{ style, recipe, tokens, global, … }` with the same naming options as the lower-level **`createStyles`** factory. Options are a partial **`ClassNamingConfig`** merged onto defaults:

| Option    | Type                                                                                    | Default      | Description                                                                                                                                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`    | `'semantic' \| 'hashed' \| 'compact' \| 'atomic' \| 'attribute' \| 'bem' \| 'template'` | `'semantic'` | How class strings are built (see below).                                                                                                                                                                                                                                   |
| `prefix`  | `string`                                                                                | `'ts'`       | Leading segment for hashed/compact/atomic output and for `hash`.                                                                                                                                                                                                           |
| `scopeId` | `string`                                                                                | `''`         | Optional id (package name, app name) so two packages can reuse the same logical namespace without sharing the same class string. In `semantic` mode the sanitized scope is prefixed onto class names; in `hashed`/`compact`/`atomic` mode it is mixed into the hash input. |
| `layers`  | `{ order, token, style, global? }` or legacy tuple on `createStyles`                    | _(omitted)_  | When set, enables `@layer` output. See [Cascade layers](/docs/cascade-layers).                                                                                                                                                                                             |

The instance also exposes **`classNaming`**: a read-only snapshot of the resolved config (useful for debugging).

### `createStyles(options?)` (advanced)

Lower-level styles-only factory — same naming options, but methods are named `class`, `component`, and `hashClass` on the returned object. Prefer **`createTypeStyles`** for new code.

### `mergeClassNaming(partial?)` and `defaultClassNamingConfig`

Use these when you need the resolved config object without creating a full API (for example tests or tooling).

### `scopedTokenNamespace(scopeId, logicalNamespace)`

Returns the CSS custom property namespace segment used for `tokens.create` when `scopeId` is set (sanitized). Advanced / library use.

## Modes

### `semantic` (default)

Human-readable, stable names use a block/element/modifier grammar. Variant dimensions
are retained in modifiers so equal option values from different dimensions never collide:

| Shape                  | Example                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `style('card', { … })` | `card`                                                     |
| Component base         | `button`                                                   |
| Variant                | `button--intent-primary`                                   |
| Compound               | chained `.button--intent-primary.button--size-lg` selector |
| Root slot              | `dialog`                                                   |
| Named slot             | `dialog__content`                                          |
| Slot variant           | `dialog__content--size-lg`                                 |
| Boolean axis           | `card`, `card--elevated-true`                              |

`style('button')` and the base class from `recipe({ name: 'button' })`
now intentionally use the same string. Give unrelated definitions distinct namespaces
or a `scopeId`. In development, typestyles logs a **class name collision** error when
both APIs emit the same string (their CSS still share one sheet key — first registration
wins). Do not rely on both definitions contributing different base styles under one name.

With **`scopeId`** set, the sanitized scope is prefixed onto every class name — the same way `tokens.create` scopes custom property names:

- `createTypeStyles({ scopeId: 'my-ui' })` + `recipe({ name: 'button', … })` → `my-ui-button`, `my-ui-button--intent-primary`
- `createTypeStyles({ scopeId: '@acme/ds' })` + `style('card', { … })` → `acme-ds-card`

This keeps semantic names readable while making isolation real: two packages can both register `recipe({ name: 'button' })` without their CSS rules overwriting each other. In development, typestyles also logs an error if two different definitions ever emit the same class string (cross-scope collisions, or hash collisions in `hashed`/`compact` mode).

### `hashed`

Deterministic names of the form **`{prefix}-{namespace-slug}-{hash}`**. The hash is computed from (when set) `scopeId`, the namespace, a variant segment (e.g. `base`, `intent-primary`, or a compound segment in hashed mode), and the serialized style object for that rule. Identical definitions produce identical class strings.

Use this when you want shorter, scoped names while still recognizing the namespace in DevTools.

### `compact`

**`{prefix}-{hash}`** only—no namespace slug in the string. Same hash inputs as `hashed`, so behavior is equally deterministic. Each component rule is still **one class per style chunk** (base, variant option, compound rule, etc.).

Use this when you want the shortest hash-only class strings without per-declaration splitting.

### `atomic`

**One class per CSS declaration.** Identical property values share a class across the codebase—CSS size plateaus as you add components instead of growing linearly with every rule chunk.

- `style('card', { padding: '1rem', color: 'red' })` → two classes joined with a space
- `recipe({ name: 'button', styles: { base: { color: 'red', padding: '8px' } } })` → `button.base` is a space-separated list of atomic classes
- Nested selectors (`&:hover`, attribute selectors) and `@media` blocks decompose the same way; each inner declaration gets its own class

Hash inputs include (when set) `scopeId`, the declaration path (property + nested context), and the value. For Tailwind-style **utility prop APIs**, see [`@typestyles/props`](/docs/atomic-css).

#### Migrating from the old `atomic` name

Before P2.10, `atomic` meant hash-only **whole-object** classes (no namespace slug). That mode is now **`compact`**. If you were using `mode: 'atomic'` for short hash-only class strings, switch to **`mode: 'compact'`**. Use **`mode: 'atomic'`** when you want true per-declaration output and dedup.

### `attribute`

Dimensioned `recipe()` variants compile to `&[data-{dimension}="{option}"]`
selectors under one stable semantic base class instead of discrete classes. Attribute
names are kebab-cased: `fontWeight` becomes `data-font-weight` in CSS, `attrs`, and
`props`. The call returns `{ className, attrs, props }` for spreading the resolved
attributes onto the element.

Slots are supported: a slot recipe returns one attrs result per slot, each with its
semantic class (`dialog`, `dialog__content`, and so on) and the same active variant
attributes. Spread the result for the element you render, for example
`<div {...dialog({ size: 'lg' }).content.props} />`. Flat configs retain their plain
string API and use semantic `card` / `card--elevated` names. See
[Attribute-driven variants](/docs/components#attribute-driven-variants).

### `bem`

Dimensioned/slot `recipe()` variants compile to BEM modifier classes (`block--modifier`, `block__element--modifier`); the base/root class drops the `-base` suffix. `style()` remains a bare class. Flat configs retain their historical hyphen names under this opt-in mode. See [BEM variant naming](/docs/components#bem-variant-naming).

### `template`

Like `bem`, but the block/element/modifier class name is decided by a user-supplied `classNameTemplate: (ctx) => string` instead of a fixed convention — `mode: 'bem'` is itself a built-in preset of this same mechanism. `ctx` is a **`ClassNameContext`** (`scope`, `namespace`, `element`, `dimension`, `modifier`). Useful for SUIT CSS, prefixed/ITCSS conventions, or avoiding BEM's dimension-collision problem. `style()` remains a bare class and flat configs retain their historical hyphen names. See [Generic classname template](/docs/components#generic-classname-template).

## `hash`

`hash` on a given instance uses that instance’s **`prefix`** and **`scopeId`**. If **`scopeId`** is empty, the hash input matches the historical behavior (properties only, plus label handling) for the same style shape.

## Monorepos and `scopeId`

Two packages might both use `recipe({ name: 'button' })`. Give each package its own **`createTypeStyles({ scopeId: '…' })`**: in **`semantic`** mode the scope is prefixed onto the class name (`pkg-a-button` vs `pkg-b-button`); in **`hashed`**, **`compact`**, or **`atomic`** mode the scope is mixed into the hash so identical style objects in different packages do not map to the same class string.

For tokens, use **`createTokens({ scopeId })`** or **`createTypeStyles({ scopeId })`** per package so `--color-*` and `.theme-*` rules do not overwrite each other on `:root` or clash by name.

## SSR

Use the **same** `createTypeStyles` / `createTokens` options (including `scopeId`) on the server and the client so class names, custom property names, and injected CSS match.

## Testing

Use a **dedicated** `createTypeStyles({ … })` per test file or suite when you need hashed, compact, or atomic mode. There is no global naming state to reset—only call **`reset()`** (and related sheet helpers) to clear injected CSS between tests.

```ts
import { createTypeStyles, reset } from 'typestyles';

const { style } = createTypeStyles({ mode: 'hashed', prefix: 't', scopeId: 'test-a' });

beforeEach(() => {
  reset();
});
```

If you assert on class strings under **`hashed`**, **`compact`**, or **`atomic`**, prefer stable snapshots or assert on substrings (prefix, absence of semantic segments) rather than hard-coding full hashes unless you fix `scopeId` and styles.

See also [Testing](/docs/testing).

## Related

- [Styles](/docs/styles) — `style`, `compose`, utility shortcuts
- [Components](/docs/components) — `recipe` and `slots`
- [Tokens](/docs/tokens) — `createTokens` and scoped custom properties
- [Atomic CSS Utilities](/docs/atomic-css) — `@typestyles/props` (separate naming scheme)
- [API Reference](/docs/api-reference) — export list
