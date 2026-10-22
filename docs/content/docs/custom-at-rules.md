---
title: Custom Selectors & At-Rules
description: Using @container, @supports, and other CSS features
---

TypeStyles supports all CSS at-rules and advanced selectors through special key prefixes.

## Pseudo-classes and pseudo-elements

Use the `&` prefix for pseudo-classes:

```ts
const button = recipe({
  name: 'button',
  styles: {
    base: {
      padding: '8px 16px',
      backgroundColor: '#0066ff',
      color: 'white',

      // Hover state
      '&:hover': {
        backgroundColor: '#0052cc',
      },

      // Focus state
      '&:focus': {
        outline: '2px solid #0066ff',
        outlineOffset: '2px',
      },

      // Active/pressed state
      '&:active': {
        transform: 'scale(0.98)',
      },

      // Disabled state
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
      },

      // Pseudo-elements
      '&::before': {
        content: '""',
        display: 'inline-block',
        width: '16px',
        height: '16px',
      },

      '&::after': {
        content: '" →"',
      },
    },
  },
});
```

### Form-related pseudo-classes

```ts
const input = recipe({
  name: 'input',
  styles: {
    base: {
      border: '1px solid #e5e7eb',

      // Checked state (checkboxes, radios)
      '&:checked': {
        backgroundColor: '#0066ff',
      },

      // Placeholder text
      '&::placeholder': {
        color: '#9ca3af',
      },

      // Invalid state
      '&:invalid': {
        borderColor: '#ef4444',
      },

      // Valid state
      '&:valid': {
        borderColor: '#10b981',
      },

      // Required field
      '&:required': {
        borderColor: '#f59e0b',
      },
    },
  },
});
```

### Structural pseudo-classes

```ts
const list = recipe({
  name: 'list',
  slots: ['item'] as const,
  styles: {
    base: {
      item: {
        padding: '8px 0',
        borderBottom: '1px solid #e5e7eb',

        // First child
        '&:first-child': {
          paddingTop: 0,
        },

        // Last child
        '&:last-child': {
          paddingBottom: 0,
          borderBottom: 'none',
        },

        // Every other item
        '&:nth-child(even)': {
          backgroundColor: '#f9fafb',
        },

        // First 3 items
        '&:nth-child(-n+3)': {
          fontWeight: 600,
        },

        // Only child
        '&:only-child': {
          border: 'none',
        },
      },
    },
  },
});
```

## Descendant and sibling selectors

### Child selectors

```ts
import { variant } from 'typestyles';
const card = recipe({
  name: 'card',
  variants: {
    '& > header': variant.boolean({ default: false }),
    '& .content': variant.boolean({ default: false }),
    '& p': variant.boolean({ default: false }),
    '& h1, & h2, & h3': variant.boolean({ default: false }),
  },
  styles: {
    base: {
      padding: '16px',
    },
    variants: {
      '& > header': {
        true: {
          marginBottom: '12px',
          fontWeight: 600,
        },
        false: {},
      },
      '& .content': {
        true: {
          lineHeight: 1.6,
        },
        false: {},
      },
      '& p': {
        true: {
          marginBottom: '8px',
        },
        false: {},
      },
      '& h1, & h2, & h3': {
        true: {
          marginTop: 0,
        },
        false: {},
      },
    },
  },
});
```

### Sibling selectors

```ts
import { variant } from 'typestyles';
const form = recipe({
  name: 'form',
  variants: {
    '& > * + *': variant.boolean({ default: false }),
    '& input ~ .error': variant.boolean({ default: false }),
    '& input:invalid ~ .error': variant.boolean({ default: false }),
  },
  styles: {
    base: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    variants: {
      '& > * + *': {
        true: {
          // Adds margin between consecutive children (owl selector)
          marginTop: '16px',
        },
        false: {},
      },
      '& input ~ .error': {
        true: {
          display: 'none',
        },
        false: {},
      },
      '& input:invalid ~ .error': {
        true: {
          display: 'block',
          color: '#ef4444',
        },
        false: {},
      },
    },
  },
});
```

## Attribute selectors

```ts
const link = recipe({
  name: 'link',
  styles: {
    base: {
      color: '#0066ff',
      textDecoration: 'none',

      // External links
      '&[href^="http"]': {
        '&::after': {
          content: '" ↗"',
        },
      },

      // Download links
      '&[download]': {
        '&::after': {
          content: '" ↓"',
        },
      },

      // Links with specific target
      '&[target="_blank"]': {
        '&::after': {
          content: '" (opens in new tab)"',
        },
      },

      // Selector list support (both selectors scoped to .link-base)
      '[data-state="open"], [aria-expanded="true"]': {
        fontWeight: 600,
      },
    },
  },
});
```

All CSS attribute selector operators are supported:

- exact match: `[attr="value"]`
- contains token: `[attr~="token"]`
- starts with / language: `[attr|="en"]`
- starts with: `[attr^="prefix"]`
- ends with: `[attr$="suffix"]`
- contains substring: `[attr*="part"]`

## `:has()`, `:is()`, and `:where()` helpers

Use **`has`**, **`is`**, and **`where`** (or the named exports `has`, `is`, `where` from `typestyles`) to build `&`-nested keys the same way **`container`** builds `@container` keys. Each helper returns a string suitable as an object key; multiple arguments become a comma-separated list inside the pseudo-class.

- **`:where()`** — wraps a selector list at **zero specificity**, so library defaults are easy for consumers to override.
- **`:is()`** — groups selectors; specificity is that of the most specific argument in the list.
- **`:has()`** — accepts a [relative selector list](https://drafts.csswg.org/selectors/#relative-real-selector-list) (parent / descendant-aware styling).

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const nav = style('nav', {
  display: 'flex',
  [where('.nav')]: { gap: '8px' },
  [has('.active')]: { borderBottom: '2px solid blue' },
  [is(':hover', ':focus-visible')]: { outline: '2px solid blue' },
});
```

You can still author raw nested keys (e.g. `'&:has(.active)'`, `'&:is(:hover, :focus)'`). The **`IsPseudoArg`** type lists common pseudos for `:is()` groups. See [API Reference](/docs/api-reference) for exported types (`HasNestedKey`, `IsNestedKey`, `WhereNestedKey`).

**TypeScript:** literal arguments narrow to a concrete `` `&:…` `` template so computed keys mix cleanly with longhands; for dynamic selector strings, prefer plain `'&…'` keys or a small wrapper object you spread.

## Media queries

Use the `@` prefix for media queries:

```ts
const layout = recipe({
  name: 'layout',
  slots: ['container'] as const,
  styles: {
    base: {
      container: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '16px',

        // Tablet
        '@media (min-width: 768px)': {
          gridTemplateColumns: 'repeat(2, 1fr)',
        },

        // Desktop
        '@media (min-width: 1024px)': {
          gridTemplateColumns: 'repeat(3, 1fr)',
        },

        // Wide screens
        '@media (min-width: 1440px)': {
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px',
        },
      },
    },
  },
});
```

### Complex media queries

```ts
const hero = recipe({
  name: 'hero',
  styles: {
    base: {
      padding: '48px 16px',

      // High DPI screens
      '@media (min-resolution: 192dpi)': {
        backgroundImage: 'url(hero@2x.jpg)',
      },

      // Dark mode preference
      '@media (prefers-color-scheme: dark)': {
        backgroundColor: '#1a1a2e',
        color: '#e0e0e0',
      },

      // Reduced motion preference
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
        transition: 'none',
      },

      // Print styles
      '@media print': {
        background: 'none',
        color: 'black',
      },
    },
  },
});
```

### Combining media queries with pseudo-classes

```ts
const button = recipe({
  name: 'button',
  styles: {
    base: {
      padding: '8px 16px',

      // Hover only on devices that support it
      '@media (hover: hover)': {
        '&:hover': {
          backgroundColor: '#0052cc',
        },
      },

      // Touch device adjustments
      '@media (pointer: coarse)': {
        padding: '12px 20px', // Larger touch target
      },
    },
  },
});
```

### Media query constants (`mediaQueries`)

`typestyles` exports a `mediaQueries` constant with ready-to-use `@media (...)` strings for common features that don't come from your configured breakpoints — motion, contrast, and hover/pointer capability preferences. Each value is grouped by feature, then by the literal CSS keyword:

```ts
import { createTypeStyles, mediaQueries } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const card = recipe({
  name: 'card',
  styles: {
    base: {
      transition: 'transform 200ms ease',

      // Respect prefers-reduced-motion
      [mediaQueries.prefersReducedMotion.reduce]: { transition: 'none' },

      // Larger touch target on coarse pointers (e.g. touchscreens)
      [mediaQueries.pointer.coarse]: { padding: '12px 20px' },
    },
  },
});
```

Available groups: `prefersReducedMotion` (`reduce`, `noPreference`), `prefersContrast` (`more`, `less`, `noPreference`), `hover` (`hover`, `none`), `anyHover` (`hover`, `none`), `pointer` (`fine`, `coarse`, `none`), `anyPointer` (`fine`, `coarse`, `none`).

For `prefers-color-scheme`, viewport orientation, or width breakpoints, see [`@typestyles/open-props`'s `media` token map](/docs/open-props#media-queries) or [`tokens.when.prefersDark` / `prefersLight`](/docs/theming-patterns) instead.

### Viewport breakpoints from config

When you register breakpoints on `createTypeStyles` / `createStyles`, use **`breakpoint()`** and **`media()`** for nested viewport rules instead of repeating `` `@media (min-width: …)` `` strings.

```ts
const { recipe, media, breakpoint, atRuleBlock } = createTypeStyles({
  scopeId: 'app',
  breakpoints: {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
  },
});

const layout = recipe({
  name: 'layout',
  slots: ['container'] as const,
  styles: {
    base: {
      container: {
        display: 'grid',
        gridTemplateColumns: '1fr',

        // Spreadable block helper
        ...media('md', {
          gridTemplateColumns: 'repeat(2, 1fr)',
        }),

        // Same pattern as container queries: breakpoint key + atRuleBlock
        ...atRuleBlock(breakpoint('lg'), {
          gridTemplateColumns: 'repeat(3, 1fr)',
        }),
      },
    },
  },
});
```

`breakpoint(name)` uses the configured media condition as-is. Pass a second argument to target a width/height feature (`min`, `max`, `minHeight`, `maxHeight`) — useful when the stored condition is `(min-width: …)` but you need `(max-width: …)` with the same token value:

```ts
...atRuleBlock(breakpoint('md', 'max'), {
  padding: '12px',
});
```

Feature overrides apply to **single-feature** conditions like `(min-width: 768px)`. Compound queries such as `(min-width: 768px) and (orientation: landscape)` are left unchanged (a dev warning is logged if you pass a feature).

For `media()`, use the **three-argument** form when the feature is an object — the two-argument form treats the second value as nested styles:

```ts
// ✓ feature override + block
...media('md', { max: true }, { padding: '12px' }),

// ✗ `{ max: true }` is treated as CSS properties, not a feature
...media('md', { max: true }),
```

**TypeScript:** breakpoint names are typed from your `breakpoints` map when it is a `const` object; `breakpoint('md')` infers a literal `@media …` key like `container()`. For dynamic names, spread `atRuleBlock(breakpoint(name), nested)` or use a plain `'@media …'` key.

## Container queries

Container queries respond to the size of a container, not the viewport. You can write plain `'@container …'` keys (they serialize like `@media`), or use **`container()`** / **`container()`** for typed size features and named containers.

### Typed keys with `container()`

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const card = style('card', {
  containerType: 'inline-size',
  padding: '16px',

  [container({ minWidth: 400 })]: {
    padding: '24px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
  },
});
```

`container({ … })` accepts camelCase size features (`minWidth`, `maxInlineSize`, `orientation`, …). Numbers become `px` (except `aspectRatio`, where a number is emitted as-is—prefer a string like `'16 / 9'` when needed). Multiple features compile to one condition joined with `and`.

**TypeScript:** object and two-argument forms infer a **literal** `` `@container …` `` template, so **`[container(…)]`** can sit next to longhands (`padding`, `display`, …) without `as CSSProperties`. When the `@container` text is only known as a generic **`string`** at compile time, spread **`atRuleBlock(key, nested)`** (or the `atRuleBlock` export) instead. A **string literal** one-arg call also narrows, e.g. `[container('(min-width: 1px)')]: { … }`.

### Named container queries

Set `containerName` on the element that establishes the container, then target it by name:

```ts
const sidebar = style('sidebar', {
  containerType: 'inline-size',
  containerName: 'sidebar',
  width: '280px',
});

const sidebarItem = style('sidebar-item', {
  // Either form:
  [container('sidebar', { minWidth: 250 })]: {
    flexDirection: 'row',
  },
  // [container({ name: 'sidebar', minWidth: 250 })]: { ... },
});
```

### Typed container names (`containerRef` / `createContainerRef`)

**`containerRef(label)`** returns a **human-readable** `container-name` you can reuse in TypeScript instead of repeating string literals: **`{scopeId}-{label}`** when `scopeId` is set on the styles instance, otherwise **`{prefix}-{label}`** (same defaults as `createStyles`). Use that value for both `containerName` and the first argument to `container(…)`.

```ts
const shell = containerRef('product-shell');

const root = style('shell-root', {
  containerType: 'inline-size',
  containerName: shell,
});

const body = style('shell-body', {
  display: 'flex',
  flexDirection: 'column',
  ...atRuleBlock(container(shell, { minWidth: 480 }), {
    flexDirection: 'row',
  }),
});
```

Without a `styles` instance, call **`createContainerRef('product-shell', { scopeId: 'my-app' })`** — or with an empty scope, **`{ prefix: 'acme' }`** so names become `acme-product-shell`.

A full copy-paste example lives in the design-system package: [`namedContainerQuery.ts`](https://github.com/type-styles/typestyles/blob/main/examples/design-system/src/components/namedContainerQuery.ts).

### Raw string keys (style queries, `not`, scroll state)

For anything beyond the typed helper (e.g. `style()`, `not (…)`), pass a single string—the part of the rule after `@container`:

```ts
{
  [container('style(--theme: dark)')]: { color: '#fff' },
}
```

### Manual keys (equivalent)

```ts
const card = style('card', {
  containerType: 'inline-size',
  containerName: 'card',
  padding: '12px',

  '@container (min-width: 400px)': {
    padding: '24px',
    display: 'flex',
    gap: '16px',
  },

  '@container (min-width: 600px)': {
    padding: '32px',
  },
});
```

## Supports queries

Feature detection with `@supports`. You can write plain `'@supports …'` keys (they serialize like `@media`), or use **`supports()`** / **`supports()`** for typed declaration features and raw conditions.

### Typed keys with `supports()`

```ts
const backdrop = recipe({
  name: 'backdrop',
  styles: {
    base: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',

      [supports({ backdropFilter: 'blur(4px)' })]: {
        backdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      },
    },
  },
});
```

`supports({ … })` accepts camelCase CSS properties (`display`, `backdropFilter`, `gridTemplateColumns`, …). Multiple declarations compile to one condition joined with `and`.

**TypeScript:** single-declaration object forms and string-literal raw conditions infer a **literal** `` `@supports …` `` template, so **`[supports(…)]`** can sit next to longhands without `as CSSProperties`. When the `@supports` text is only known as a generic **`string`** at compile time, spread **`atRuleBlock(key, nested)`** instead.

### Complex supports queries

```ts
const grid = recipe({
  name: 'grid',
  styles: {
    base: {
      // Fallback layout
      display: 'flex',
      flexWrap: 'wrap',

      // Use grid if supported
      [supports({ display: 'grid' })]: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      },

      // Use subgrid if supported
      [supports({ gridTemplateColumns: 'subgrid' })]: {
        gridTemplateColumns: 'subgrid',
      },
    },
  },
});
```

For `not`, `selector()`, or other syntax that does not map to a single declaration object, pass a raw condition string:

```ts
[supports('not (display: grid)')]: { display: 'flex' },
```

## Layer (cascade layers)

CSS cascade layers for organizing styles:

```ts
const reset = recipe({
  name: 'reset',
  styles: {
    base: {
      // Apply to @layer reset
      '@layer reset': {
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      },
    },
  },
});

const components = recipe({
  name: 'components',
  slots: ['button'] as const,
  styles: {
    base: {
      button: {
        '@layer components': {
          padding: '8px 16px',
          backgroundColor: '#0066ff',
        },
      },
    },
  },
});
```

## Nesting depth

While typestyles supports deep nesting, it's best to keep it shallow:

```ts
// ✅ Good - 2-3 levels deep
const nav = recipe({
  name: 'nav',
  styles: {
    base: {
      display: 'flex',

      '& li': {
        position: 'relative',

        '&:hover > ul': {
          display: 'block', // 3 levels, acceptable
        },
      },
    },
  },
});

// ❌ Avoid - too deep, hard to maintain
const deep = recipe({
  name: 'deep',
  styles: {
    base: {
      '& div': {
        '& span': {
          '& a': {
            '&:hover': {
              color: 'red', // 5 levels, problematic
            },
          },
        },
      },
    },
  },
});
```

## Complex real-world example

```ts
const dataTable = recipe({
  name: 'data-table',
  slots: ['container', 'table', '@media print'] as const,
  styles: {
    base: {
      container: {
        overflowX: 'auto',
        containerType: 'inline-size',
        containerName: 'data-table',
      },
      table: {
        width: '100%',
        borderCollapse: 'collapse',

        // Responsive adjustments
        '@container (max-width: 600px)': {
          fontSize: '14px',
        },

        // Sticky header
        '& thead': {
          position: 'sticky',
          top: 0,
          backgroundColor: '#f9fafb',

          '& th': {
            padding: '12px',
            textAlign: 'left',
            fontWeight: 600,

            '&:hover': {
              backgroundColor: '#e5e7eb',
              cursor: 'pointer',
            },
          },
        },

        // Body rows
        '& tbody tr': {
          borderBottom: '1px solid #e5e7eb',

          '&:last-child': {
            borderBottom: 'none',
          },

          '&:hover': {
            backgroundColor: '#f9fafb',
          },

          '& td': {
            padding: '12px',
          },

          // Selected row
          '&[data-selected="true"]': {
            backgroundColor: '#eff6ff',
          },
        },
      },
      '@media print': {
        container: {
          overflow: 'visible',
        },

        table: {
          '& thead': {
            position: 'static',
          },
        },
      },
    },
  },
});
```

## Generated CSS

TypeStyles converts these nested objects to flat CSS:

**Input:**

```ts
const button = recipe({
  name: 'button',
  styles: {
    base: {
      padding: '8px',
      '&:hover': {
        backgroundColor: 'blue',
      },
      '@media (min-width: 768px)': {
        padding: '12px',
      },
    },
  },
});
```

**Generated CSS:**

```css
.button {
  padding: 8px;
}

.button:hover {
  background-color: blue;
}

@media (min-width: 768px) {
  .button {
    padding: 12px;
  }
}
```

## Best practices

1. **Keep nesting shallow** - Max 3 levels deep
2. **Use container queries** - For component-level responsiveness
3. **Use media queries** - For viewport-level changes
4. **Combine selectors wisely** - Avoid overly complex selectors
5. **Test in real browsers** - Some selectors have varying support
6. **Consider progressive enhancement** - Use `@supports` for new features
