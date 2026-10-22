---
title: Atomic CSS Utilities
description: Type-safe atomic CSS utilities with @typestyles/props
---

The `@typestyles/props` package provides a type-safe way to generate atomic CSS utility classes, similar to Tailwind CSS but with full TypeScript inference and zero runtime overhead.

Runtime APIs such as `style`, `recipe`, and `hash` use a separate naming system; to change those class strings (semantic vs hashed), see [Class naming](/docs/class-naming).

**Compare approaches:** this package (`defineProperties` + `createProps`) powers layout utilities on the docs site ([`docs/src/atoms.ts`](https://github.com/type-styles/typestyles/blob/main/docs/src/atoms.ts)). For hand-written `style` utilities (Tailwind-style), see [examples/typewind](https://github.com/type-styles/typestyles/blob/main/examples/typewind/README.md).

## Installation

```bash
npm install @typestyles/props
```

## Quick Start

```ts
import { defineProperties, createProps } from '@typestyles/props';

// Define your atomic utilities
const atoms = createProps(
  'atom',
  defineProperties({
    properties: {
      display: ['flex', 'block', 'grid', 'none'],
      padding: { 0: '0', 1: '4px', 2: '8px', 3: '16px' },
      gap: { 0: '0', 1: '4px', 2: '8px', 3: '16px' },
    },
  }),
);

// Use them with full type safety
atoms({
  display: 'flex',
  padding: 2,
  gap: 1,
});
// Returns: "atom-display-flex atom-padding-2 atom-gap-1"
```

## Defining Properties

Use `defineProperties()` to define a collection of CSS properties with their allowed values:

### Array-Based Values

For enumerated values like display modes:

```ts
const utilities = defineProperties({
  properties: {
    display: ['flex', 'block', 'grid', 'none', 'inline-flex'],
    flexDirection: ['row', 'column', 'row-reverse', 'column-reverse'],
    alignItems: ['start', 'center', 'end', 'stretch', 'baseline'],
  },
});
```

### Object-Based Values

For scale-based values like spacing or font sizes:

```ts
const utilities = defineProperties({
  properties: {
    padding: {
      0: '0',
      1: '0.25rem',
      2: '0.5rem',
      3: '0.75rem',
      4: '1rem',
      8: '2rem',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
  },
});
```

## Responsive Conditions

Add breakpoints and other conditional styles:

```ts
const responsive = defineProperties({
  conditions: {
    mobile: { '@media': '(min-width: 640px)' },
    tablet: { '@media': '(min-width: 768px)' },
    desktop: { '@media': '(min-width: 1024px)' },
  },
  properties: {
    display: ['flex', 'block', 'grid'],
    flexDirection: ['row', 'column'],
  },
});

const atoms = createProps('atom', responsive);

// Apply responsive values
atoms({
  display: 'block', // Base value
  flexDirection: { mobile: 'column', desktop: 'row' }, // Responsive
});
// Returns: "atom-display-block atom-flexDirection-mobile-column atom-flexDirection-desktop-row"
```

### Condition Types

**Media Queries:**

```ts
{ mobile: { '@media': '(min-width: 768px)' } }
```

**Container Queries:**

```ts
{ wide: { '@container': '(min-width: 400px)' } }
```

**Feature Queries:**

```ts
{ supportsGrid: { '@supports': '(display: grid)' } }
```

**Custom Selectors:**

```ts
{
  hover: {
    selector: '&:hover';
  }
}
{
  dark: {
    selector: '[data-theme="dark"] &';
  }
}
```

## Shorthands

Define shorthands that expand to multiple properties:

```ts
const spacing = defineProperties({
  properties: {
    paddingTop: { 0: '0', 1: '4px', 2: '8px' },
    paddingRight: { 0: '0', 1: '4px', 2: '8px' },
    paddingBottom: { 0: '0', 1: '4px', 2: '8px' },
    paddingLeft: { 0: '0', 1: '4px', 2: '8px' },
  },
  shorthands: {
    padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
    paddingX: ['paddingLeft', 'paddingRight'],
    paddingY: ['paddingTop', 'paddingBottom'],
  },
});

const atoms = createProps('atom', spacing);

atoms({ padding: 2 });
// Expands to: paddingTop, paddingRight, paddingBottom, paddingLeft all set to 2
// Returns: "atom-paddingTop-2 atom-paddingRight-2 atom-paddingBottom-2 atom-paddingLeft-2"

atoms({ paddingX: 1, paddingY: 2 });
// Returns: "atom-paddingLeft-1 atom-paddingRight-1 atom-paddingTop-2 atom-paddingBottom-2"
```

## Combining Property Collections

Merge multiple property collections into one props function:

```ts
const layout = defineProperties({
  properties: {
    display: ['flex', 'block', 'grid'],
    position: ['relative', 'absolute', 'fixed', 'sticky'],
  },
});

const spacing = defineProperties({
  properties: {
    padding: { 0: '0', 1: '4px', 2: '8px' },
    margin: { 0: '0', 1: '4px', 2: '8px', auto: 'auto' },
  },
});

const colors = defineProperties({
  properties: {
    color: { primary: '#0066ff', secondary: '#6b7280' },
    backgroundColor: { white: '#ffffff', gray: '#f3f4f6' },
  },
});

// Combine all collections
const atoms = createProps('atom', layout, spacing, colors);

// Use properties from any collection
atoms({
  display: 'flex',
  padding: 2,
  color: 'primary',
});
```

## Default Conditions

Set a default condition for all property values:

```ts
const mobileFirst = defineProperties({
  conditions: {
    tablet: { '@media': '(min-width: 768px)' },
    desktop: { '@media': '(min-width: 1024px)' },
  },
  defaultCondition: false, // No condition by default (mobile-first)
  properties: {
    fontSize: { sm: '14px', base: '16px', lg: '18px' },
  },
});

const desktopFirst = defineProperties({
  conditions: {
    mobile: { '@media': '(max-width: 768px)' },
  },
  defaultCondition: 'mobile', // All values get mobile condition by default
  properties: {
    fontSize: { sm: '14px', base: '16px', lg: '18px' },
  },
});
```

## SSR Support

CSS is automatically injected and available for SSR:

```ts
import { getRegisteredCss } from 'typestyles';

// Define and create your atoms
const atoms = createProps(
  'atom',
  defineProperties({
    /* ... */
  }),
);

// CSS is automatically registered
const css = getRegisteredCss();
// Contains all atomic utility classes
```

## Composing with Component Styles

Combine atomic utilities with component-specific styles using `styles.compose()`:

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { createProps, defineProperties } from '@typestyles/props';

const atoms = createProps(
  'atom',
  defineProperties({
    properties: {
      display: ['flex', 'grid'],
      gap: { 0: '0', 1: '4px', 2: '8px' },
      padding: { 0: '0', 1: '4px', 2: '8px', 3: '16px' },
    },
  }),
);

const card = recipe({
  name: 'card',
  styles: {
    base: {
      borderRadius: '8px',
      border: '1px solid #e5e5e5',
      background: 'white',
    },
  },
});

// Compose together
const flexCard = styles.compose(card, atoms({ display: 'flex', gap: 2, padding: 3 }));

flexCard();
// "card atom-display-flex atom-gap-2 atom-padding-3"
```

## Real-World Example

Building a complete design system:

```ts
import { defineProperties, createProps } from '@typestyles/props';

// Define responsive breakpoints and utilities
const atoms = createProps(
  'ds',
  defineProperties({
    conditions: {
      sm: { '@media': '(min-width: 640px)' },
      md: { '@media': '(min-width: 768px)' },
      lg: { '@media': '(min-width: 1024px)' },
      xl: { '@media': '(min-width: 1280px)' },
      dark: { selector: '[data-theme="dark"] &' },
      hover: { selector: '&:hover' },
    },
    properties: {
      // Layout
      display: ['none', 'flex', 'block', 'grid', 'inline-flex'],
      flexDirection: ['row', 'column'],
      alignItems: ['start', 'center', 'end', 'stretch'],
      justifyContent: ['start', 'center', 'end', 'between', 'around'],

      // Spacing
      gap: { 0: '0', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem' },
      padding: { 0: '0', 1: '0.25rem', 2: '0.5rem', 4: '1rem', 8: '2rem' },
      margin: { 0: '0', auto: 'auto', 1: '0.25rem', 2: '0.5rem' },

      // Typography
      fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem' },
      fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },

      // Colors
      color: { primary: '#3b82f6', secondary: '#64748b', muted: '#94a3b8' },
      backgroundColor: { white: '#fff', gray: '#f1f5f9', transparent: 'transparent' },
    },
    shorthands: {
      p: ['padding'],
      px: ['paddingLeft', 'paddingRight'],
      py: ['paddingTop', 'paddingBottom'],
      m: ['margin'],
    },
  }),
);

// Use in components
export function Button() {
  return (
    <button
      className={atoms({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        px: 4,
        py: 2,
        fontSize: { sm: 'sm', md: 'base' },
        fontWeight: 'semibold',
        color: 'white',
        backgroundColor: { _: 'primary', hover: 'secondary', dark: 'gray' },
      })}
    >
      Click me
    </button>
  );
}
```

## Class Naming

Classes follow a predictable pattern:

```
{namespace}-{property}-{value}
{namespace}-{property}-{condition}-{value}
```

Examples:

- `atom-display-flex`
- `atom-display-mobile-block`
- `atom-padding-2`
- `atom-padding-desktop-4`

## TypeScript

Full type inference and autocomplete for:

- Property names
- Property values
- Condition names
- Shorthand names

```ts
const atoms = createProps(
  'atom',
  defineProperties({
    properties: {
      display: ['flex', 'block'],
    },
  }),
);

atoms({ display: 'flex' }); // ✅
atoms({ display: 'grid' }); // ❌ Type error: 'grid' not in ['flex', 'block']
atoms({ fontSize: '16px' }); // ❌ Type error: 'fontSize' not defined
```

## Inspecting Properties

Check which properties are available:

```ts
const atoms = createProps(
  'atom',
  defineProperties({
    properties: { display: ['flex', 'block'] },
    shorthands: { d: ['display'] },
  }),
);

atoms.properties.has('display'); // true
atoms.properties.has('d'); // true (shorthand)
atoms.properties.has('fontSize'); // false
```

## Performance

- **Zero runtime overhead** - All CSS is pre-generated at module load time
- **Automatic deduplication** - Classes are only generated once
- **Small bundle size** - Only the props function and a lookup map are included
- **Fast runtime** - Just string concatenation, no CSS generation at runtime
