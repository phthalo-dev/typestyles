# TypeStyles

CSS-in-TypeScript that embraces CSS instead of hiding from it.

TypeStyles gives you the developer experience of type-safe styles in TypeScript while producing clean, readable, inspectable output in the DOM. No gibberish class names. No build step required. No all-or-nothing adoption. Just CSS, with types.

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
import { createTypeStyles, variant } from 'typestyles';

const { style, recipe, tokens } = createTypeStyles({ scopeId: 'app' });

// Define design tokens as CSS custom properties
const color = tokens.create('color', {
  primary: '#0066ff',
  secondary: '#6b7280',
  surface: '#ffffff',
  text: '#111827',
});

// One object: axes on the input, option styles in `styles`.
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

// The call returns `{ className, attrs, props }`. Base is always included.
function Button({ intent, size, children }) {
  return <button className={button({ intent, size }).className}>{children}</button>;
}
```

## Core Concepts

### Readable Class Names

TypeStyles generates class names that mirror your authored style names. If you write a variant called `intent: { primary: {...} }`, you get a class name `button-intent-primary` in the DOM. What you see in your code is what you see in DevTools.

```tsx
const card = recipe({
  name: 'card',
  variants: { elevated: variant.boolean({ default: false }) },
  styles: {
    base: { padding: '16px', borderRadius: '8px' },
    variants: {
      elevated: { true: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }, false: {} },
    },
  },
});

<div className={card().className} />
<div className={card({ elevated: true }).className} />
```

### Design Tokens via CSS Custom Properties

CSS custom properties are first-class citizens. Define your tokens once, use them everywhere — including in plain CSS files.

```tsx
import { createTypeStyles } from 'typestyles';

const { tokens, recipe } = createTypeStyles({ scopeId: 'app' });

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
import { createTypeStyles, cx } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const text = recipe({
  name: 'text',
  slots: ['base', 'bold', 'muted', 'heading'] as const,
  styles: {
    base: {
      base: { fontFamily: 'system-ui' },
      bold: { fontWeight: 700 },
      muted: { color: color.secondary },
      heading: { fontSize: '24px', lineHeight: 1.2 },
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
const text = recipe({
  name: 'text',
  slots: ['base', 'muted'] as const,
  styles: {
    base: {
      base: { fontSize: '14px' },
      muted: { color: '#6b7280' },
    },
  },
});

// Combine TypeStyles classes with external classes, conditionally
const { base: textBase, muted } = text;

<div className={cx(card, textBase, muted, isActive && 'active', externalClassName)} />;
```

### Selectors and Nesting

Write CSS selectors naturally. Media queries, pseudo-classes, combinators — it all works.

```tsx
const { recipe } = createTypeStyles({ scopeId: 'app' });

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
// Button.tsx — styles and component together
import { createTypeStyles, variant } from 'typestyles';

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
  return <button className={button({ intent }).className}>{children}</button>;
}
```

Or keep styles separate:

```tsx
// button.styles.ts
import { createTypeStyles, variant } from 'typestyles';

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
  return <button className={button({ intent }).className}>{children}</button>;
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

### `recipe({ name, styles, slots?, variants?, vars? })`

Creates a component style. Declare variant axes with `variant.enum` / `variant.boolean` and put option styles in `styles`. Calling it returns `{ className, attrs, props }`.

```tsx
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

button().className;
button({ intent: 'ghost' }).className;
button.base;
button['intent-primary'];

const card = recipe({
  name: 'card',
  variants: { elevated: variant.boolean({ default: false }) },
  styles: {
    base: { padding: '16px' },
    variants: { elevated: { true: { boxShadow: '...' }, false: {} } },
  },
});

card().className;
card({ elevated: true }).className;
```

### `style(name, properties)`

Creates a single class with no variants. Returns the class name string.

```tsx
const card = style('card', { padding: '1rem' });
// card === "card"
```

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

Creates a theme surface (class `theme-{name}`) with token overrides. Pass **`base`**, and either **`modes`** (manual `tokens.when` conditions) or **`colorMode`** (presets), not both. Returns a **`Theme`**—use **`theme.className`** where a string is required.

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

### `createTypeStyles(options?)`

**Preferred entry.** Returns a flat `{ style, recipe, tokens, global, … }` API with one shared `scopeId` so class names and CSS variables stay isolated:

```tsx
import { createTypeStyles } from 'typestyles';

export const { style, recipe, tokens, global } = createTypeStyles({
  scopeId: 'my-ui',
  mode: 'hashed',
  prefix: 'ui',
});
```

Supports the same naming options as `createStyles` / `createTokens`, plus optional nested **`layers: { order, token, style, global? }`**. Pass optional **`utils`** to attach shorthand style expanders.

### `createStyles(options?)` and `createTokens(options?)`

Lower-level factories when you need styles or tokens alone:

```tsx
import { createStyles, createTokens } from 'typestyles';

export const styles = createStyles({ scopeId: 'my-ui', mode: 'hashed', prefix: 'ui' });
export const tokens = createTokens({ scopeId: 'my-ui' });
```

Prefer `createTypeStyles({ scopeId })` so `style`, `recipe`, and `tokens` share one scope.

### `tokens.use(namespace)`

References tokens defined elsewhere. Useful for consuming shared tokens without importing the definition file.

```tsx
const color = tokens.use('color');
color.primary; // "var(--color-primary)"
```

## Comparison

High-level tradeoffs (details and nuance: [docs — framework comparison](./docs/content/docs/framework-comparison.md)):

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

Runnable apps in [`examples/`](./examples/README.md) — each has its own README.

| Example                                                 | Demonstrates                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| [`vite-app`](./examples/vite-app)                       | React + `@typestyles/vite` — HMR, convention entry, design system |
| [`next-app`](./examples/next-app)                       | Next.js App Router + `buildTypestylesForNext` + verification      |
| [`vue-app`](./examples/vue-app)                         | Vue 3 + Vite extraction                                           |
| [`svelte-app`](./examples/svelte-app)                   | Svelte 5 + Vite extraction                                        |
| [`esbuild-app`](./examples/esbuild-app)                 | `@typestyles/esbuild` — vanilla JS                                |
| [`rollup-app`](./examples/rollup-app)                   | `@typestyles/rollup` — vanilla JS                                 |
| [`rolldown-app`](./examples/rolldown-app)               | Rolldown + Rollup-compatible plugin                               |
| [`parcel-app`](./examples/parcel-app)                   | Runtime-only path (no bundler plugin)                             |
| [`typewind`](./examples/typewind)                       | Tailwind-style utilities via `style`                              |
| [`design-system`](./examples/design-system)             | Framework-agnostic tokens and recipes                             |
| [`react-design-system`](./examples/react-design-system) | React component library on typestyles                             |

From the monorepo root: `pnpm vite-app dev`, `pnpm next-app dev`, `pnpm typewind dev`, etc.

## Packages

Documentation for each published npm package lives in its README — these are the landing pages on npmjs.com.

| Package                                                 | Description                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| [`typestyles`](./packages/typestyles)                   | Core library — `styles`, `tokens`, `cx`, SSR helpers          |
| [`@typestyles/vite`](./packages/vite)                   | Vite plugin — HMR, duplicate detection, production extraction |
| [`@typestyles/astro`](./packages/astro)                 | Astro integration                                             |
| [`@typestyles/next`](./packages/next)                   | Next.js App/Pages Router + Turbopack extraction               |
| [`@typestyles/rollup`](./packages/rollup)               | Rollup and Rolldown plugin                                    |
| [`@typestyles/esbuild`](./packages/esbuild)             | esbuild plugin                                                |
| [`@typestyles/webpack`](./packages/webpack)             | webpack plugin                                                |
| [`@typestyles/build-runner`](./packages/build-runner)   | Shared extraction engine and CI verification                  |
| [`@typestyles/props`](./packages/props)                 | Type-safe atomic CSS utilities                                |
| [`@typestyles/open-props`](./packages/open-props)       | Open Props tokens for typestyles                              |
| [`@typestyles/migrate`](./packages/migrate)             | Codemods from styled-components / Emotion                     |
| [`@typestyles/eslint-plugin`](./packages/eslint-plugin) | ESLint rules for style objects                                |
| [`@typestyles/react`](./packages/react)                 | React integration — `styled` API and `css` prop               |
| [`@typestyles/cli`](./packages/cli)                     | CLI — class snapshots and verification                        |

Site docs: [typestyles.dev](https://typestyles.dev) · Docs site source: [`docs/README.md`](./docs/README.md)

## License

Apache-2.0
