# typestyles

CSS-in-TypeScript that embraces CSS instead of hiding from it.

TypeStyles gives you the developer experience of type-safe styles in TypeScript while producing clean, readable, inspectable output in the DOM. No gibberish class names. No build step required. No all-or-nothing adoption. Just CSS, with types.

Full documentation: [typestyles.dev](https://typestyles.dev) · Monorepo overview: [README on GitHub](https://github.com/type-styles/typestyles/blob/main/README.md)

**For AI coding agents:** read [`llms.txt`](./llms.txt) in this package (API patterns, common mistakes, doc links) or query the live docs via MCP at [typestyles.dev/mcp](https://typestyles.dev/mcp).

## Why TypeStyles?

Most CSS-in-JS libraries fall into two camps:

1. **Runtime libraries** (styled-components, Emotion) that generate unreadable class names and add runtime overhead
2. **Static extraction** (StyleX, Vanilla Extract) that impose rigid authoring constraints and require specific build tooling

TypeStyles takes a different approach: write CSS in TypeScript with full type safety, get human-readable class names, and use CSS custom properties as first-class design tokens. It works alongside your existing CSS files and can be adopted one component at a time.

## Quick Start

```bash
npm install typestyles
```

```tsx
import { variant } from 'typestyles';
import { createTypeStyles, cx } from 'typestyles';

const { style, recipe, tokens } = createTypeStyles({ scopeId: 'app' });

// Define design tokens as CSS custom properties
const color = tokens.create('color', {
  primary: '#0066ff',
  secondary: '#6b7280',
  surface: '#ffffff',
  text: '#111827',
});

// Create component styles — callable AND destructurable
const button = recipe({
  name: 'button',
  variants: {
    intent: variant.enum(['primary', 'outlined'], { default: 'primary' }),
    size: variant.enum(['sm', 'lg'], { default: 'sm' }),
  },
  styles: {
    base: {
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      border: 'none',
      color: color.surface,
      backgroundColor: color.primary,
      transition: 'background-color 150ms ease',

      '&:hover': {
        backgroundColor: '#0052cc',
      },

      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
    },
    variants: {
      intent: {
        primary: { backgroundColor: color.primary, color: color.surface },
        outlined: {
          backgroundColor: 'transparent',
          border: `1px solid ${color.primary}`,
          color: color.primary,
        },
      },
      size: {
        sm: { padding: '4px 12px', fontSize: '12px' },
        lg: { padding: '12px 24px', fontSize: '16px' },
      },
    },
  },
});

// Use in JSX — base always included, variants are typed
function Button({ intent, size, children }) {
  return <button className={button({ intent, size })}>{children}</button>;
}

// Or destructure individual class strings
const { base } = button;

// Renders: <button class="button-base button-intent-primary button-size-sm">
```

## Core Concepts

### Readable Class Names

TypeStyles generates class names that mirror your authored style names. If you write a variant called `intent: { primary: {...} }`, you get a class name `button-intent-primary` in the DOM. What you see in your code is what you see in DevTools.

```tsx
import { variant } from 'typestyles';
const card = recipe({ name: 'card', variants: { elevated: variant.boolean({ default: false }) }, styles: { base: { padding: '16px', borderRadius: '8px' }, variants: { elevated: { true: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }, false: {} } } } });

<div className={card()}>               {/* class="card-base" */}
<div className={card({ elevated: true })}> {/* class="card-base card-elevated" */}

// Or destructure
const { base, elevated } = card;
<div className={cx(base, isElevated && elevated)}>
```

### Design Tokens via CSS Custom Properties

CSS custom properties are first-class citizens. Define your tokens once, use them everywhere — including in plain CSS files.

```tsx
const { recipe, tokens } = createTypeStyles({ scopeId: 'app' });

// Creates CSS custom properties on :root
const spacing = tokens.create('spacing', {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
});

// Use in TypeStyles — fully typed, autocomplete works
const layout = recipe({
  name: 'layout',
  styles: {
    base: {
      padding: spacing.md, // var(--spacing-md)
      gap: spacing.lg, // var(--spacing-lg)
    },
  },
});

// Use in plain CSS — same custom properties
// styles.css
// .legacy-component {
//   padding: var(--spacing-md);
//   gap: var(--spacing-lg);
// }
```

Tokens support theming through standard CSS custom property overrides:

```tsx
const theme = tokens.createTheme('dark', {
  base: {
    color: {
      surface: '#1a1a2e',
      text: '#e0e0e0',
    },
  },
});

// Apply the theme to any subtree (Theme — use .className in React)
<div className={theme.className}>{/* All children use dark theme values */}</div>;
```

### Incremental Adoption

TypeStyles works alongside existing CSS. Adopt it one component at a time.

```tsx
// Use TypeStyles and plain CSS together
import './legacy-styles.css';
import { createTypeStyles, cx } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const newComponent = recipe({
  name: 'new-component',
  styles: { base: { padding: '16px', borderRadius: '8px' } },
});

function MyComponent() {
  return (
    <div className="legacy-class">
      <div className={cx(newComponent(), 'extra-class')}>
        {/* New component using TypeStyles */}
      </div>
    </div>
  );
}
```

### Composing Styles

Styles compose naturally using the built-in `cx()` utility or by destructuring.

```tsx
import { variant } from 'typestyles';
import { createTypeStyles, cx } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const text = recipe({
  name: 'text',
  variants: {
    bold: variant.boolean({ default: false }),
    muted: variant.boolean({ default: false }),
    heading: variant.boolean({ default: false }),
  },
  styles: {
    base: { fontFamily: 'system-ui' },
    variants: {
      bold: { true: { fontWeight: 700 }, false: {} },
      muted: { true: { color: color.secondary }, false: {} },
      heading: { true: { fontSize: '24px', lineHeight: 1.2 }, false: {} },
    },
  },
});

// Destructure and compose with cx()
const { base, heading, bold, muted } = text;

<h1 className={cx(base, heading, bold)}>{/* class="text-base text-heading text-bold" */}</h1>;
```

Use the built-in `cx` utility to combine classes from different sources:

```tsx
import { createTypeStyles, cx } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const card = style('card', { padding: '16px' });

// Combine TypeStyles classes with external classes, conditionally
const { base: textBase, muted } = text;

<div className={cx(card, textBase, muted, isActive && 'active', externalClassName)} />;
```

### Selectors and Nesting

Write CSS selectors naturally. Media queries, pseudo-classes, combinators — it all works.

```tsx
const nav = recipe({
  name: 'nav',
  styles: {
    base: {
      display: 'flex',
      gap: spacing.md,

      // Pseudo-classes
      '&:hover': {
        backgroundColor: color.surface,
      },

      // Media queries
      '@media (max-width: 768px)': {
        flexDirection: 'column',
      },

      // Descendant selectors
      '& a': {
        textDecoration: 'none',
        color: color.primary,
      },

      // Container queries
      '@container (min-width: 400px)': {
        gridTemplateColumns: '1fr 1fr',
      },
    },
  },
});
```

### Single File Components (Optional)

You can colocate styles with components, but you're never forced to.

```tsx
import { variant } from 'typestyles';
// Button.tsx — styles and component together
import { createTypeStyles } from 'typestyles';

const { recipe, tokens } = createTypeStyles({ scopeId: 'app' });

const color = tokens.use('color'); // Reference tokens defined elsewhere

const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary', 'ghost'], { default: 'primary' }) },
  styles: {
    base: {
      padding: '8px 16px',
      backgroundColor: color.primary,
    },
    variants: {
      intent: {
        primary: { backgroundColor: color.primary },
        ghost: { backgroundColor: 'transparent' },
      },
    },
  },
});

export function Button({ intent, children }) {
  return <button className={button({ intent })}>{children}</button>;
}
```

Or keep styles separate:

```tsx
import { variant } from 'typestyles';
// button.styles.ts
import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

export const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
  styles: {
    base: { padding: '8px 16px' },
    variants: { intent: { primary: { backgroundColor: '#0066ff' } } },
  },
});

// Button.tsx
import { button } from './button.styles';
export function Button({ intent, children }) {
  return <button className={button({ intent })}>{children}</button>;
}
```

## How It Works

TypeStyles operates at runtime with minimal overhead:

1. **`recipe()`** registers style definitions and returns a callable+destructurable object
2. **Calling the object** composes class names from the variants you select (base always included)
3. **Destructuring** gives you individual class strings for fine-grained control
4. **CSS is injected** into a `<style>` element on first use (lazy injection)
5. **Class names** are deterministic and human-readable — derived from the names you author
6. **Tokens** are CSS custom properties, so they cascade naturally and work in plain CSS

### Style Injection

Styles are injected into the document lazily when a component using them first renders. TypeStyles uses a single managed `<style>` element and batches insertions for performance.

For SSR, TypeStyles provides a `collectStyles()` API to extract the CSS during server rendering:

```tsx
import { collectStyles } from 'typestyles/server';

const { html, css } = collectStyles(() => renderToString(<App />));
// Inject `css` into the <head> of the HTML document
```

Sync and async render functions are supported — `collectStyles` returns a `Promise` when the render callback is async.

## API Reference

### `createTypeStyles(options?)`

Preferred entry point for apps, libraries, and micro-frontends. Returns a scoped **`style`**, **`recipe`**, **`tokens`**, **`global`**, **`override`**, and related helpers from one config (class names and CSS variables stay isolated when you set `scopeId`):

```tsx
import { createTypeStyles } from 'typestyles';

export const { style, recipe, tokens, global, override } = createTypeStyles({
  scopeId: 'my-ui',
  mode: 'hashed',
  prefix: 'ui',
});
```

Supports the same options as `createStyles` and `createTokens`, plus optional **`layers`** for cascade layer wiring across styles, tokens, and global CSS. Pass optional **`utils`** to attach shorthand style expanders on the styles instance.

### `recipe(namespace, config)`

Creates a component style and returns a callable + destructurable object.

```tsx
import { variant } from 'typestyles';
// Dimensioned variants
const button = recipe({
  name: 'button',
  variants: {
    intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
    size: variant.enum(['sm', 'lg'], { default: 'sm' }),
  },
  styles: {
    base: { padding: '8px 16px' },
    variants: {
      intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } },
      size: { sm: { fontSize: '14px' }, lg: { fontSize: '18px' } },
    },
  },
});

button(); // "button-base button-intent-primary button-size-sm"
button({ intent: 'ghost' }); // "button-base button-intent-ghost button-size-sm"
button.base; // "button-base"
button['intent-primary']; // "button-intent-primary"

// Flat variants (simple boolean toggles)
const card = recipe({
  name: 'card',
  variants: { elevated: variant.boolean({ default: false }) },
  styles: {
    base: { padding: '16px' },
    variants: { elevated: { true: { boxShadow: '...' }, false: {} } },
  },
});

card(); // "card-base"
card({ elevated: true }); // "card-base card-elevated"
card.elevated; // "card-elevated"
```

### `style(name, properties)`

Creates a single class with no variants. Returns the class name string.

```tsx
const card = style('card', { padding: '1rem' });
// card === "card"
```

Use **`hash(properties, options?)`** for deterministic hashed classes from raw style objects (the lower-level `createStyles()` API exposes the same as **`hashClass`**).

### `cx(...classes)`

Joins class strings, filtering out falsy values.

```tsx
import { cx } from 'typestyles';

cx('a', 'b', false && 'c', undefined); // "a b"
```

### `tokens.create(namespace, values)`

Creates CSS custom properties and returns typed references.

```tsx
const spacing = tokens.create('spacing', {
  sm: '8px',
  md: '16px',
});

spacing.sm; // "var(--spacing-sm)" (typed as a CSS value)
spacing.md; // "var(--spacing-md)"
```

### `tokens.createTheme(name, config)`

Creates a theme (class `theme-{name}`) with token overrides. Pass **`base`**, and either **`modes`** (manual `tokens.when` conditions) or **`colorMode`** (presets), not both. Returns a **`Theme`**—use **`theme.className`** where a string is required.

```tsx
const dark = tokens.createTheme('dark', {
  base: {
    color: {
      surface: '#1a1a2e',
      text: '#e0e0e0',
    },
  },
});

<div className={dark.className}>
```

See `tokens.createDarkMode`, `tokens.when`, and `tokens.colorMode` for layered light/dark/system behavior.

### `createStyles(options?)`, `createTokens(options?)`, and `createGlobal(options?)`

Configure **`styles`**, **`tokens`**, or **`global`** separately when you need different options on each (legacy **`styles.class`** / **`styles.component`** live on `createStyles()` instances):

```tsx
import { createStyles, createTokens } from 'typestyles';

export const styles = createStyles({ scopeId: 'my-ui', mode: 'hashed', prefix: 'ui' });
export const tokens = createTokens({ scopeId: 'my-ui' });

// styles.class('card', …)  →  prefer style() from createTypeStyles
// styles.component('button', …)  →  prefer recipe()
```

### `tokens.use(namespace)`

References tokens defined elsewhere. Useful for consuming shared tokens without importing the definition file.

```tsx
const color = tokens.use('color');
color.primary; // "var(--color-primary)"
```

## Subpath exports

| Import                   | Use for                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `typestyles`             | `createTypeStyles`, `cx`, `createStyles`, `createTokens`, `createGlobal`, …        |
| `typestyles/server`      | `collectStyles`, `getRegisteredCss`, streaming SSR helpers                         |
| `typestyles/build`       | Build-time stubs when runtime is disabled                                          |
| `typestyles/hmr`         | HMR invalidation (used by `@typestyles/vite`)                                      |
| `typestyles/color`       | Color helpers (`rgb`, `oklch`, `mix`, …) — kept off the main entry for bundle size |
| `typestyles/css`         | `@property` registration and custom property helpers                               |
| `typestyles/color-scale` | OKLCH color ramp generation                                                        |
| `typestyles/token-scale` | Geometric and linear token scale helpers                                           |
| `typestyles/globals`     | Ambient types for CSS modules and global augmentation                              |
| `typestyles/testing`     | Test-state reset (`resetAll`, `onAfterReset`, `createTestHarness`)                 |

## Runtime vs zero-runtime

| Mode                      | How                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Runtime (default)**     | Styles inject into a managed `<style>` tag on first use (~35 KB gzip main entry; CI enforces a budget)                                           |
| **Zero-runtime (opt-in)** | `@typestyles/vite`, `@typestyles/rollup`, `@typestyles/esbuild`, `@typestyles/webpack`, or `@typestyles/next/build` extract a static `.css` file |

Same authoring API in both modes.

## Comparison

High-level tradeoffs (details and nuance: [framework comparison](https://typestyles.dev/docs/framework-comparison)):

| Feature                    | TypeStyles                   | StyleX             | Emotion / styled-components | Panda CSS    | vanilla-extract  | CSS Modules | Tailwind        |
| -------------------------- | ---------------------------- | ------------------ | --------------------------- | ------------ | ---------------- | ----------- | --------------- |
| Readable class names       | Yes                          | No                 | No                          | Utilities    | Hashed / modules | Scoped      | Utility classes |
| Type-safe                  | Yes                          | Yes                | Partial                     | Yes          | Yes              | Partial     | No              |
| No build step required     | Yes                          | No                 | Yes                         | No           | No               | No          | No              |
| Works with plain CSS       | Yes                          | Difficult          | Limited                     | Moderate     | Good             | Excellent   | Yes             |
| Incremental adoption       | Yes                          | Difficult          | Yes                         | Moderate     | Moderate         | Yes         | Yes             |
| CSS custom property tokens | First-class                  | Limited            | Manual                      | First-class  | Manual           | Manual      | Via config      |
| Zero-runtime path          | Yes (opt-in build plugins)   | Compiler default   | Varies                      | Build output | Always           | Always      | Build output    |
| SSR support                | Yes                          | Yes                | Yes                         | Yes          | Yes              | Yes         | Yes             |
| Runtime overhead           | Minimal (off when extracted) | None               | Moderate                    | Low–none     | None             | None        | None            |
| Main entry size (gzip)     | ~35 KB                       | N/A (compile-time) | ~12 KB+ (varies)            | Build output | N/A              | N/A         | N/A             |

Color helpers (`rgb`, `oklch`, `mix`, …) live on `typestyles/color` so the common import path stays smaller. CI enforces a gzip budget on `dist/index.js` (~35 KB).

## Installation

```bash
npm install typestyles
# or
pnpm add typestyles
# or
yarn add typestyles
```

No bundler plugin required for the **runtime path** — TypeStyles works with Vite, webpack, esbuild, Parcel, and other bundlers that resolve `node_modules`. For **zero-runtime extraction**, use `@typestyles/vite`, `@typestyles/rollup`, `@typestyles/esbuild`, or `@typestyles/webpack` (Next.js: `@typestyles/next/build`).

Optional Vite plugin for development niceties (style HMR, dead style detection):

```bash
npm install -D @typestyles/vite
```

```ts
// vite.config.ts
import { typeStyles } from '@typestyles/vite';

export default defineConfig({
  plugins: [typeStyles()],
});
```

## Examples

Runnable apps in the [typestyles monorepo examples](https://github.com/type-styles/typestyles/tree/main/examples) — each has its own README.

| Example                                                                                                   | Demonstrates                                                      |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`vite-app`](https://github.com/type-styles/typestyles/tree/main/examples/vite-app)                       | React + `@typestyles/vite` — HMR, convention entry, design system |
| [`next-app`](https://github.com/type-styles/typestyles/tree/main/examples/next-app)                       | Next.js App Router + `buildTypestylesForNext` + verification      |
| [`vue-app`](https://github.com/type-styles/typestyles/tree/main/examples/vue-app)                         | Vue 3 + Vite extraction                                           |
| [`svelte-app`](https://github.com/type-styles/typestyles/tree/main/examples/svelte-app)                   | Svelte 5 + Vite extraction                                        |
| [`esbuild-app`](https://github.com/type-styles/typestyles/tree/main/examples/esbuild-app)                 | `@typestyles/esbuild` — vanilla JS                                |
| [`rollup-app`](https://github.com/type-styles/typestyles/tree/main/examples/rollup-app)                   | `@typestyles/rollup` — vanilla JS                                 |
| [`rolldown-app`](https://github.com/type-styles/typestyles/tree/main/examples/rolldown-app)               | Rolldown + Rollup-compatible plugin                               |
| [`parcel-app`](https://github.com/type-styles/typestyles/tree/main/examples/parcel-app)                   | Runtime-only path (no bundler plugin)                             |
| [`typewind`](https://github.com/type-styles/typestyles/tree/main/examples/typewind)                       | Tailwind-style utilities via `style()`                            |
| [`design-system`](https://github.com/type-styles/typestyles/tree/main/examples/design-system)             | Framework-agnostic tokens and recipes                             |
| [`react-design-system`](https://github.com/type-styles/typestyles/tree/main/examples/react-design-system) | React component library on typestyles                             |

## Ecosystem packages

| Package                                                                                | Description                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`@typestyles/vite`](https://www.npmjs.com/package/@typestyles/vite)                   | Vite plugin — HMR, duplicate detection, production extraction |
| [`@typestyles/astro`](https://www.npmjs.com/package/@typestyles/astro)                 | Astro integration                                             |
| [`@typestyles/next`](https://www.npmjs.com/package/@typestyles/next)                   | Next.js App/Pages Router + Turbopack extraction               |
| [`@typestyles/rollup`](https://www.npmjs.com/package/@typestyles/rollup)               | Rollup and Rolldown plugin                                    |
| [`@typestyles/esbuild`](https://www.npmjs.com/package/@typestyles/esbuild)             | esbuild plugin                                                |
| [`@typestyles/webpack`](https://www.npmjs.com/package/@typestyles/webpack)             | webpack plugin                                                |
| [`@typestyles/props`](https://www.npmjs.com/package/@typestyles/props)                 | Type-safe atomic CSS utilities                                |
| [`@typestyles/open-props`](https://www.npmjs.com/package/@typestyles/open-props)       | Open Props tokens for typestyles                              |
| [`@typestyles/migrate`](https://www.npmjs.com/package/@typestyles/migrate)             | Codemods from styled-components / Emotion                     |
| [`@typestyles/eslint-plugin`](https://www.npmjs.com/package/@typestyles/eslint-plugin) | ESLint rules for style objects                                |
| [`@typestyles/react`](https://www.npmjs.com/package/@typestyles/react)                 | React integration — `styled` API and `css` prop               |
| [`@typestyles/cli`](https://www.npmjs.com/package/@typestyles/cli)                     | CLI — class snapshots and verification                        |

See the [full package index](https://github.com/type-styles/typestyles#packages) on GitHub.

## License

Apache-2.0
