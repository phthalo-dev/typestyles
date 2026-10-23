---
title: Publishing a Package with TypeStyles
description: Safe defaults and collision-proof patterns for npm-published libraries using TypeStyles
---

If you publish a package that ships TypeStyles components, you need class-name
isolation out of the box. Two npm packages that both call
`recipe({ name: 'button' })` without a `scopeId` will silently overwrite each
other's CSS in the consuming app.

This guide covers the setup that prevents that.

## The problem

Calling `createTypeStyles()` without a `scopeId` (or importing unscoped helpers) uses an empty scope. In semantic
mode (the default), `recipe({ name: 'button' })` emits class names like
`button`. If a consumer installs two packages that both define a `'button'`
namespace, the later import wins — no error, no warning, just broken styles.

Even in `hashed` mode the hash is derived from the namespace and declarations.
Two packages with different styles but the same namespace will hash differently
and not collide — but two with identical declarations _will_.

`scopeId` solves this: it prefixes semantic names and mixes into hashes, making
collisions across packages structurally impossible.

## Recommended setup

Use `createTypeStyles` with your package name as `scopeId` and `hashed` mode:

```ts
// src/styles.ts
import { createTypeStyles } from 'typestyles';

export const { style, recipe, tokens, global } = createTypeStyles({
  scopeId: '@acme/ui',
  mode: 'hashed',
});
```

Then import `recipe`, `style`, and `tokens` from this module throughout your package:

```ts
import { variant } from 'typestyles';
// src/components/Button.styles.ts
import { recipe } from '../styles';

export const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary', 'secondary'], { default: 'primary' }) },
  styles: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      cursor: 'pointer',
    },
    variants: {
      intent: {
        primary: { backgroundColor: '#0066ff', color: '#fff' },
        secondary: { backgroundColor: '#e5e7eb', color: '#111' },
      },
    },
  },
});
```

Class names will look like `ts-button-1a2b3c` instead of `button` — unique
to your package by construction.

### Why `hashed` mode?

| Mode       | Output                                      | Collision risk                                                                                                |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `semantic` | `acme-ui-button`                            | Low with `scopeId`, but still human-readable names that _could_ overlap if two packages choose the same scope |
| `hashed`   | `ts-button-1a2b3c`                          | Hash includes `scopeId` — collision requires identical scope, namespace, and declarations                     |
| `compact`  | `ts-1a2b3c`                                 | Same hash safety as `hashed`, shortest output                                                                 |
| `atomic`   | One class per declaration, deduped globally | Safe; declarations dedupe intentionally                                                                       |

For libraries, `hashed` is the sweet spot: hash-safe, but the namespace slug is
still visible in class names for debugging.

## Tokens

The same `createTypeStyles` call scopes your tokens too. Custom property names
include the scope:

```ts
const color = tokens.create('color', {
  primary: '#0066ff',
  surface: '#ffffff',
});
// --acme-ui-color-primary: #0066ff;
// --acme-ui-color-surface: #ffffff;
```

Consumers can theme your package by overriding these properties without any
risk of colliding with their own or other packages' tokens.

## ESLint enforcement

The `@typestyles/eslint-plugin` includes a `no-default-scope-in-package` rule
that flags `createTypeStyles()` / `createStyles()` calls that omit `scopeId`
(and legacy unscoped `styles.class` / `styles.component` usage). Enable it in
your package's ESLint config:

```js
// eslint.config.js
import typestyles from '@typestyles/eslint-plugin';

export default [
  typestyles.configs.package,
  // ... your other config
];
```

Or enable the rule individually:

```js
export default [
  typestyles.configs.recommended,
  {
    rules: {
      '@typestyles/no-default-scope-in-package': 'error',
    },
  },
];
```

Recommended package setup is fine: create a scoped factory once, then call
`style` / `recipe` / `hash` from that instance (including via re-exports from a
`runtime.ts`). The rule watches the factory call, not every `style(…)` site.

## Checklist

Before publishing a package that uses TypeStyles:

1. **Create a scoped factory** — `createTypeStyles({ scopeId: pkg.name })` at
   the root of your styles
2. **Choose a non-semantic mode** — `hashed` (readable + safe) or `compact`
   (shortest output)
3. **Enable the ESLint rule** — `@typestyles/no-default-scope-in-package` to
   catch unscoped usage
4. **Export tokens explicitly** — so consumers can theme without reaching into
   internals
5. **Document your `scopeId`** — mention it in your README so consumers know
   which CSS custom properties to override

## Example

A complete library setup:

```ts
// src/styles.ts
import { createTypeStyles } from 'typestyles';

export const { style, recipe, tokens, global } = createTypeStyles({
  scopeId: '@acme/ui',
  mode: 'hashed',
});
```

```ts
// src/tokens/color.ts
import { tokens } from '../styles';

export const color = tokens.create('color', {
  primary: '#0066ff',
  primaryHover: '#0052cc',
  surface: '#ffffff',
  text: '#111827',
});
```

```ts
import { variant } from 'typestyles';
// src/components/Button.styles.ts
import { recipe } from '../styles';
import { color } from '../tokens/color';

export const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary', 'secondary'], { default: 'primary' }) },
  styles: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 500,
    },
    variants: {
      intent: {
        primary: { backgroundColor: color.primary, color: '#fff' },
        secondary: { backgroundColor: 'transparent', border: '1px solid currentColor' },
      },
    },
  },
});
```

The consumer's app can install `@acme/ui` alongside any other TypeStyles package
with zero class-name or token collisions.

## Guard public class names

Publishable component libraries should treat semantic class names as semver surface
area. Opt in with:

1. Add `@typestyles/cli` as a dev dependency, then generate a snapshot:
   `typestyles snapshot --write` (writes
   `.typestyles-public-classnames.json` in the project root).
2. Enable `@typestyles/no-removed-public-classname` in ESLint (not part of the
   recommended preset):

```js
// eslint.config.js
import typestyles from '@typestyles/eslint-plugin';

export default [
  {
    plugins: { '@typestyles': typestyles },
    rules: {
      '@typestyles/no-removed-public-classname': [
        'error',
        { snapshotFile: '.typestyles-public-classnames.json' },
      ],
    },
  },
];
```

Adding new class names never fails the rule — only removals or renames do. After an
intentional breaking rename, bump semver and regenerate the snapshot with
`typestyles snapshot --write`.

The rule reports **once per ESLint run** (project-level), not at individual call
sites. Snapshot scanning is static and best-effort: string-literal namespaces only,
direct `recipe()` / `style()` calls, and a single inferred
`scopeId` when all `createStyles` configs match. See the
[`@typestyles/no-removed-public-classname` README](https://github.com/phthalo-dev/typestyles/tree/main/packages/eslint-plugin#typestylesno-removed-public-classname-opt-in)
for full limits.

See [Theming Patterns — public semantic class names](/docs/theming-patterns#public-semantic-class-names)
and [Components — expose themeable properties as vars](/docs/components#expose-themeable-properties-as-vars).
