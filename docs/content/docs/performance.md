---
title: Performance
description: Understanding and optimizing typestyles performance
---

TypeStyles is designed to be fast. This guide explains how it works under the hood and how to keep your apps running smoothly.

## How typestyles performs

### Runtime cost

TypeStyles operates at runtime with minimal overhead. The timings below are **rough orders of magnitude** and will vary by device and bundle.

| Operation              | Cost (typical) | Frequency                 |
| ---------------------- | -------------- | ------------------------- |
| `recipe()` / `style()` | sub-ms         | Once per style definition |
| `button()` / `cx(...)` | very small     | Every render              |
| CSS injection          | sub-ms         | Once per unique rule      |

**What this means:**

- Creating styles is fast and happens once at module load
- Applying styles (selector calls) is just string concatenation
- CSS is injected lazily and only once per unique style

### Memory usage

TypeStyles stores:

- **Style definitions**: One object per style namespace
- **CSS rules**: One string per variant
- **Token values**: One object per token namespace

Memory use scales with how many namespaces and rules you register; profile your own app if it becomes a concern.

## Bundle size

### Minified + gzipped sizes

Approximate sizes (measure your own bundle with your toolchain):

```
typestyles (core): on the order of a few KB gzipped
typestyles/server: additional small chunk for SSR helpers
@typestyles/vite: dev dependency only
```

### Comparison with alternatives

Other libraries’ numbers change frequently; compare using [bundlephobia](https://bundlephobia.com/) or your bundler’s analyzer. TypeStyles aims for a small runtime that injects plain CSS, versus larger runtimes that parse CSS in JS.

## Lazy injection

Styles aren't injected until they're used. This means:

```ts
// This is defined but no CSS is injected yet
const button = recipe({ name: 'button', styles: { base: { padding: '8px' } } });

// CSS is only injected when the component renders
function App() {
  return <button className={button()}>Click</button>;
}
```

**Benefits:**

- Unused code paths don't add CSS weight
- Initial page load is faster
- Code-split styles work automatically

## Batched DOM updates

CSS rules are batched and inserted on the next frame:

```ts
// Multiple style definitions
const button = recipe({ name: 'button' });
const card = recipe({ name: 'card' });
const input = recipe({ name: 'input' });

// All queued together, inserted in one operation
// Uses requestAnimationFrame or microtask for batching
```

**Benefits:**

- Fewer DOM manipulations
- Better performance during initial render
- Avoids forced synchronous layout

## Performance best practices

### 1. Define styles at module level

```ts
// ✅ Good - defined once
const button = recipe({ name: 'button' });

function Button() {
  return <button className={button()} />;
}

// ❌ Bad - redefined on every render
function Button() {
  const button = recipe({ name: 'button' }); // Don't do this!
  return <button className={button()} />;
}
```

Module-level definitions are evaluated once. Creating styles inside components causes unnecessary work on every render.

### 2. Avoid dynamic style values

```ts
import { createTypeStyles, createVar, assignVars } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

// ❌ Bad - creates styles for every possible value
const box = recipe({ name: 'box', styles: { base: { width: props.width } } });

// ✅ Good — use CSS custom properties for dynamic values (see Dynamic styling guide)
const widthVar = createVar('boxWidth');

const box = recipe({
  name: 'box',
  styles: { base: { display: 'block', width: widthVar } },
});

function Box({ width }) {
  return <div className={box()} style={assignVars({ [widthVar]: width })} />;
}
```

Dynamic values in style objects require JavaScript to run for every value change. Use [`createVar()` and `assignVars()`](/docs/dynamic-styles) to keep styles static and set values via CSS custom properties — or use raw inline styles for one-off properties.

### 3. Reuse token references

```ts
// ✅ Good - reference the token object
const color = tokens.create('color', {
  primary: '#0066ff',
});

const button = recipe({ name: 'button', styles: { base: { color: color.primary } } });

const link = recipe({ name: 'link', styles: { base: { color: color.primary } } });

// ❌ Bad - recreate values
const button = recipe({ name: 'button', styles: { base: { color: '#0066ff' } } });

const link = recipe({ name: 'link', styles: { base: { color: '#0066ff' } } });
```

Tokens ensure consistency and reduce memory usage.

### 4. Minimize variants

```ts
import { variant } from 'typestyles';
// ❌ Bad - too many variants for rarely used combinations
const button = recipe({ name: 'button', variants: { primary: variant.boolean({ default: false }), secondary: variant.boolean({ default: false }), primarySmall: variant.boolean({ default: false }), primaryLarge: variant.boolean({ default: false }), secondarySmall: variant.boolean({ default: false }), secondaryLarge: variant.boolean({ default: false }) }, styles: { base: { ... }, variants: { primary: { true: { ... }, false: {} }, secondary: { true: { ... }, false: {} }, primarySmall: { true: { ... }, false: {} }, primaryLarge: { true: { ... }, false: {} }, secondarySmall: { true: { ... }, false: {} }, secondaryLarge: { true: { ... }, false: {} } } } });

// ✅ Good - compose smaller variants
const button = recipe({ name: 'button', variants: { primary: variant.boolean({ default: false }), secondary: variant.boolean({ default: false }), small: variant.boolean({ default: false }), large: variant.boolean({ default: false }) }, styles: { base: { ... }, variants: { primary: { true: { ... }, false: {} }, secondary: { true: { ... }, false: {} }, small: { true: { ... }, false: {} }, large: { true: { ... }, false: {} } } } });

// Usage: button({ primary: true, small: true }) with flat keys, or cx(base, primary, small)
```

Composing variants reduces the number of CSS rules and makes your styles more flexible.

### 5. Code split your styles

```ts
// ✅ Good - load styles on demand
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// HeavyComponent.styles.ts is only loaded when needed
```

Since styles are co-located with components, code splitting works automatically.

### 6. Avoid deeply nested selectors

```ts
// ❌ Bad - deep nesting increases selector complexity
const card = recipe({ name: 'card', styles: { base: {
    '& .header': {
      '& .title': {
        '& span': { // Too deep!
          fontWeight: 'bold',
        },
      },
    },
  } } });

// ✅ Good - flatter structure, separate styles
const card = recipe({ name: 'card', styles: { base: { ... } } });

const cardTitle = recipe({ name: 'card-title', styles: { base: { fontWeight: 'bold' } } });
```

Deep nesting makes CSS harder to maintain and can impact selector matching performance.

## Benchmarks

For reproducible, CI-validated performance numbers — including CSS generation time, extracted file sizes across all naming modes, runtime injection latency, and SSR collection overhead — see the dedicated **[Benchmarks](/docs/benchmarks)** page.

The benchmark harness runs a 50-component reference design system and reports median/p95 timings. Regressions are caught automatically in CI.

## Measuring performance

### DevTools profiling

To measure typestyles performance in your app:

1. **Chrome DevTools Performance tab:**
   - Record a profile during initial render
   - Look for `insertRule` calls
   - Check total time spent in typestyles functions

2. **Lighthouse:**
   - Run performance audit
   - Check "Reduce unused CSS" (should be minimal with lazy injection)
   - Check "Minimize main-thread work"

3. **React DevTools Profiler:**
   - Profile component renders
   - Selector calls are fast and won't show up prominently

### Performance marks

Add marks to measure specific operations:

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

performance.mark('styles-component-start');
const button = recipe({ name: 'button' });
performance.mark('styles-component-end');

performance.measure('styles-component', 'styles-component-start', 'styles-component-end');

// Check in DevTools > Performance > Timings
```

## Memory leaks

### Potential issues

**1. Creating styles in event handlers:**

```ts
// ❌ Bad - creates styles on every click
function handleClick() {
  const button = recipe({ name: 'dynamic-button' });
  // This accumulates in memory!
}
```

**2. Not cleaning up in long-lived apps:**

TypeStyles doesn't automatically clean up unused styles. In most apps this isn't a problem because:

- Style definitions are small
- CSS rules are reused
- Apps don't have infinite style variations

However, if you're dynamically creating thousands of styles:

```ts
// If you must create dynamic styles, consider cleanup
// (Not built into typestyles - implement at app level)
```

### Best practices to avoid leaks

1. Always define styles at module level
2. Don't create styles based on user input or dynamic data
3. Use [`createVar()` + `assignVars()`](/docs/dynamic-styles) for dynamic values on shared styles, or inline styles for one-offs
4. Limit the number of unique style variations

## Server-side rendering performance

### CSS extraction

SSR adds minimal overhead:

```ts
const { html, css } = collectStyles(() => renderToString(<App />));
```

The `collectStyles` call:

1. Captures all CSS to a string buffer (synchronous)
2. No DOM operations (server environment)
3. Returns CSS ready to embed in HTML

**Performance tips:**

- Cache SSR output when possible
- Use streaming SSR with care — see [Streaming SSR](/docs/ssr#streaming-ssr-express--node) (two renders for custom Node servers; Next.js App Router should use `TypestylesStylesheet` or build-time extraction instead)
- The collected CSS string is often modest, but measure it for your app

### CSS size

Reported CSS weight depends entirely on how many variants and utilities you register. In many apps it stays smaller than a hand-maintained global stylesheet because unused definitions are never hit.

These are usually smaller than equivalent CSS files because:

- Unused styles aren't included
- No vendor prefixes (handled by browser)
- Minimal whitespace in generated CSS

## Comparison with CSS files

### CSS files (traditional approach)

**Pros:**

- Zero runtime cost
- Cacheable separately
- Familiar tooling

**Cons:**

- No type safety
- Global namespace
- Harder to code split

### TypeStyles

**Pros:**

- Type safety
- Scoped styles (via class names)
- Automatic code splitting
- Easy theming
- Minimal runtime cost

**Cons:**

- Small runtime (see your bundle analyzer)
- Runtime CSS injection (one-time cost)
- Requires JavaScript

**When to use CSS files:**

- Static sites with no interactivity
- When you don't need type safety
- Design systems with stable CSS

**When to use typestyles:**

- Interactive applications
- When type safety matters
- Complex theming requirements
- Component libraries

## Optimizing for production

### Build-time considerations

TypeStyles works the same in development and production. There's no build step or optimization needed.

However, you can optimize your build:

1. **Tree shaking:** Unused typestyles code is removed by your bundler
2. **Minification:** CSS in strings is minified along with JS
3. **Code splitting:** Lazy-loaded components bring their styles automatically

### Production checklist

- [ ] No `recipe()` / `style()` definitions inside component bodies (define at module scope)
- [ ] No dynamic values in style objects
- [ ] Tokens reused across components
- [ ] Variants composed, not multiplied
- [ ] Test performance on low-end devices
- [ ] Monitor Core Web Vitals (CLS, LCP, INP)

## Monitoring real-world performance

### Web Vitals

Track these metrics in production:

- **LCP (Largest Contentful Paint):** Should be < 2.5s
  - TypeStyles doesn't block rendering (lazy injection)
- **INP (Interaction to Next Paint):** Should be < 200ms
  - Selector calls are very cheap (string concatenation)
- **CLS (Cumulative Layout Shift):** Should be < 0.1
  - Styles are available before paint (if using SSR)

### Real User Monitoring (RUM)

```ts
// Send metrics to analytics
import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFCP(console.log);
getFID(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## Summary

TypeStyles performance characteristics:

- **Bundle size:** Small core; measure with your bundler
- **Runtime cost:** Minimal (string concatenation + batched DOM inserts)
- **Memory:** Scales with registered rules; usually modest
- **Rendering:** No blocking, lazy injection
- **SSR:** Style collection is synchronous around your render

To maintain good performance:

1. Define styles at module level
2. Use [`createVar()` + `assignVars()`](/docs/dynamic-styles) for dynamic values on shared styles
3. Compose variants instead of multiplying them
4. Let code splitting handle lazy loading
5. Profile if you have concerns

TypeStyles is designed to be fast enough for almost all applications while providing excellent developer experience.
