# @typestyles/props

Type-safe atomic CSS utilities for [typestyles](https://github.com/type-styles/typestyles) — Tailwind-style ergonomics with full TypeScript inference, readable class names, and CSS you can inspect in DevTools.

Define a design-system scale once; get autocomplete, compile-time errors on invalid combinations, and class strings like `atom-display-flex atom-padding-2` instead of hashed atoms.

Full guide: [Atomic CSS utilities](https://typestyles.dev/docs/atomic-css)

## Why this exists

| Approach                | Tradeoff                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Tailwind                | Fast authoring, no type safety, config-driven strings                               |
| Panda CSS               | Build-time codegen, separate pipeline                                               |
| **`@typestyles/props`** | Typed props API, runs with typestyles runtime or extraction, composes with `recipe` |

Utility class naming is separate from `recipe` / `style` — see [Class naming](https://typestyles.dev/docs/class-naming).

## Installation

```bash
npm install @typestyles/props typestyles
```

## Quick start

```ts
import { defineProperties, createProps } from '@typestyles/props';

const atoms = createProps(
  'atom',
  defineProperties({
    properties: {
      display: ['flex', 'block', 'grid', 'none'],
      padding: { 0: '0', 1: '4px', 2: '8px', 3: '16px' },
      gap: { 0: '0', 1: '4px', 2: '8px' },
    },
  }),
);

// Full autocomplete — invalid values are type errors
atoms({ display: 'flex', padding: 2, gap: 1 });
// → "atom-display-flex atom-padding-2 atom-gap-1"
```

Use in JSX:

```tsx
<div className={atoms({ display: 'flex', padding: 3, gap: 2 })} />
```

## Defining properties

### Enumerated values (arrays)

```ts
defineProperties({
  properties: {
    display: ['flex', 'block', 'grid', 'inline-flex'],
    alignItems: ['start', 'center', 'end', 'stretch'],
  },
});
```

### Scales (objects)

```ts
defineProperties({
  properties: {
    padding: { 0: '0', 1: '0.25rem', 2: '0.5rem', 4: '1rem' },
    fontSize: { sm: '0.875rem', base: '1rem', lg: '1.125rem' },
  },
});
```

### Shorthands

Map one prop to several CSS properties:

```ts
defineProperties({
  properties: {
    paddingTop: { 1: '4px', 2: '8px' },
    paddingBottom: { 1: '4px', 2: '8px' },
  },
  shorthands: {
    py: ['paddingTop', 'paddingBottom'],
  },
});
```

## Responsive and conditional variants

```ts
const responsive = defineProperties({
  conditions: {
    mobile: '@media (max-width: 768px)',
    dark: '[data-theme="dark"] &',
  },
  properties: {
    padding: { 1: '4px', 2: '8px', 4: '16px' },
  },
});

const props = createProps('ui', responsive);

props({ padding: { mobile: 2, default: 4 } });
// → "ui-padding-mobile-2 ui-padding-4"
```

## Compose with component styles

Utilities and components work together via `cx`:

```tsx
import { createTypeStyles, cx } from 'typestyles';
import { createProps, defineProperties } from '@typestyles/props';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const atoms = createProps(
  'atom',
  defineProperties({
    properties: { display: ['flex'], gap: { 2: '8px' } },
  }),
);

const card = recipe({
  name: 'card',
  styles: { base: { borderRadius: '8px', backgroundColor: 'white' } },
});

<div className={cx(card(), atoms({ display: 'flex', gap: 2 }))} />;
```

## Split design-system modules

Define tokens per domain, merge at the app boundary:

```ts
// spacing.ts
export const spacingProps = defineProperties({
  properties: { padding: { 1: '4px', 2: '8px' } },
});

// layout.ts
export const layoutProps = defineProperties({
  properties: { display: ['flex', 'grid'] },
});

// app/atoms.ts
import { createProps } from '@typestyles/props';
import { spacingProps } from './spacing';
import { layoutProps } from './layout';

export const atoms = createProps('atom', spacingProps, layoutProps);
```

## How it works

1. **`defineProperties`** describes allowed props, values, conditions, and shorthands
2. **`createProps(namespace, ...collections)`** generates all CSS rules upfront and injects them via typestyles
3. Calling the returned function resolves prop values to pre-generated class names — no runtime style parsing

CSS is included in zero-runtime extraction when your [convention entry](https://typestyles.dev/docs/zero-runtime) imports the module that calls `createProps`.

## API

| Export                                   | Description                                   |
| ---------------------------------------- | --------------------------------------------- |
| `defineProperties(config)`               | Define a property collection                  |
| `createProps(namespace, ...collections)` | Merge collections into a typed props function |

The props function exposes `.properties` — a `Set` of all prop names for tooling and docs.

Types: `PropertyDefinitions`, `ConditionDefinitions`, `PropsFunction`, `ExtractProps`, and more from the package entry.

## Docs site example

The typestyles documentation site uses `@typestyles/props` for layout utilities — see [`docs/src/atoms.ts`](../../docs/src/atoms.ts).

## Related packages

| Package                                   | Role                              |
| ----------------------------------------- | --------------------------------- |
| [`typestyles`](../typestyles)             | Core `styles`, `tokens`, `cx`     |
| [`@typestyles/open-props`](../open-props) | Pre-built Open Props token scales |
| [`@typestyles/vite`](../vite)             | HMR + production extraction       |

## License

Apache-2.0
