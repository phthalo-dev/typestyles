# TypeStyles: Consolidated Feedback & Prioritized Improvements

> Combined from: Panda CSS Internal Analysis, Roadmap, Architecture Review, Theme Architecture Plan, Design System TODO, Troubleshooting Docs, and Best Practices analysis.

---

## Priority 1 — Critical: API & Architecture Issues

These issues affect developer ergonomics fundamentally and should be addressed before any public release.

### 1.1 Build-Time Extraction Mode (Zero Runtime)

**Source:** Roadmap §2, Panda CSS Analysis §1

TypeStyles is a runtime CSS-in-JS library. The industry has moved decisively away from runtime CSS injection (React core team recommends against it, Next.js App Router has no first-class runtime CSS-in-JS support). Without a build-time extraction option, TypeStyles cannot compete with vanilla-extract, StyleX, or Panda CSS for production use.

**Current state:** Runtime + SSR only. The Vite plugin supports HMR but not extraction. A `mode: "build" | "hybrid"` option is planned but not implemented.

**What needs to happen:**

- Ship `@typestyles/build` package with CLI + Node API for static CSS extraction
- Extend `@typestyles/vite` with `mode: "runtime" | "build" | "hybrid"` option
- In `"build"` mode: scan modules → import in Node → call `getRegisteredCss()` → write `typestyles.css` → inject CSS file as virtual asset → use no-op sheet in browser bundle
- In `"hybrid"` mode: extract static styles at build time, allow runtime insertion for dynamic styles
- Support Next.js via `@typestyles/next/build` entrypoint that hooks into `next build`
- Emit a manifest mapping namespaces → class name strings so application code stays untouched

**DX example — what developers expect:**

```ts
// vite.config.ts — developer just flips a switch
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: [
    typestyles({ mode: 'build' }), // ← zero runtime CSS-in-JS
  ],
});

// Component code stays IDENTICAL — no authoring changes needed
import { styles } from 'typestyles';
const button = styles.create('button', {
  base: { padding: '8px 16px' },
});
```

**Why critical:** This is the #1 reason teams choose vanilla-extract or StyleX over runtime alternatives. Build-time extraction is table stakes for 2025+ CSS-in-JS.

---

### 1.2 Inconsistent Return Types Between `styles.create()` and `styles.component()`

**Source:** Architecture Review §1

The two main style APIs have fundamentally different call signatures and mental models:

```ts
// styles.create() — returns a variadic selector FUNCTION
const button = styles.create('button', {
  base: { padding: '8px' },
  primary: { color: 'blue' },
});
button('base', 'primary'); // → "button-base button-primary"

// styles.component() — returns a FUNCTION called with an OPTIONS OBJECT
const button = styles.component('button', {
  base: { padding: '8px' },
  variants: { intent: { primary: { color: 'blue' } } },
});
button({ intent: 'primary' }); // → "button-base button-intent-primary"

// styles.component() with slots — returns a FUNCTION that returns an OBJECT
const card = styles.component('card', {
  slots: ['root', 'header'],
  base: { root: { display: 'flex' } },
  variants: { /* ... */ },
});
card({ variant: 'elevated' }); // → { root: '...', header: '...' }
```

**Problems:**

1. Three different return shapes from conceptually similar APIs — developers must remember which they're using
2. `styles.create()` uses positional string args; `styles.component()` uses an options object — no consistency
3. When a `styles.component()` call adds `slots`, the return type changes from `string` to `Record<string, string>` — a breaking type change from adding one config key

**DX example — what's confusing:**

```tsx
// Developer creates a button with styles.create()
const btn = styles.create('btn', { base: {}, primary: {} });

// Later refactors to styles.component() for type-safe variants — must rewrite ALL call sites:
// BEFORE: btn('base', 'primary')
// AFTER:  btn({ intent: 'primary' })

// Then adds slots — ALL call sites break AGAIN:
// BEFORE: btn({ intent: 'primary' })         → string
// AFTER:  btn({ intent: 'primary' }).root     → now it's an object
```

**Recommendation:** Consider unifying to a single `styles.component()` API with a consistent return shape. CVA (Class Variance Authority) returns `{ root, ... }` for multipart and plain string for single-part — this graduated approach is more ergonomic. Or always return an object with a `className` property plus a `toString()` override so `string` coercion still works.

---

### 1.3 No Direct Property Access on Style Results

**Source:** Architecture Review §2

Style results must always be called as functions. There's no way to access individual variants as properties:

```ts
const button = styles.create('button', {
  base: { padding: '8px' },
  primary: { color: 'blue' },
  large: { fontSize: '18px' },
});

// ❌ Cannot do this:
button.base;      // undefined
button.primary;   // undefined

// ✅ Must always do this:
button('base');
button('base', 'primary');
button('base', condition && 'large');
```

**Problems:**

1. No destructuring: `const { base, primary } = button` doesn't work
2. No IDE autocomplete on variant names without calling the function
3. Every usage site requires function invocation, even for simple single-variant usage
4. Can't pass individual variant class names to child components without wrapping in a function call

**DX example — what developers expect:**

```tsx
// Tailwind/CVA pattern — direct access
const { base, primary } = buttonStyles;
<button className={`${base} ${primary}`} />

// Or property access
<button className={buttonStyles.primary} />

// TypeStyles forces:
<button className={button('base', 'primary')} />
```

**Recommendation:** Make the selector function also act as an object with variant class names as properties. This is achievable with a Proxy or by assigning properties to the function object.

---

### 1.4 Token System Creates Global Pollution with No Scoping

**Source:** Architecture Review §3, Theme Architecture Plan

All tokens are injected into `:root` as global CSS custom properties. There is no concept of component-scoped or private tokens:

```ts
// Every call injects to :root — globally visible to the entire page
tokens.create('color', { primary: '#0066ff' });
// → :root { --color-primary: #0066ff; }

tokens.create('button', { bg: 'blue' });
// → :root { --button-bg: blue; }
// ⚠️ These are now visible to EVERY component on the page
```

**Problems:**

1. Namespace collisions across packages: if two packages both use `tokens.create('color', ...)`, they conflict
2. No private/internal tokens: a component's internal spacing tokens are publicly accessible and overridable
3. Flat naming only: can't naturally express `--color-primary-hover` without manual naming conventions (the theme architecture plan works around this with a `flattenColorValues()` helper, but it's a userland workaround)
4. Token pollution scales with codebase size — hundreds of `:root` variables on large apps

**DX example — the collision problem:**

```ts
// Package A (design system)
tokens.create('color', { primary: '#0066ff' });

// Package B (third-party component library)
tokens.create('color', { primary: '#ff6600' });
// ⚠️ COLLISION — Package B overwrites Package A's --color-primary

// There's no way to scope: tokens.create('color', { primary: '#ff6600' }, { scope: '.my-component' })
```

**Recommendation:**

- Support scoped token injection (e.g., inject into a class selector instead of `:root`)
- Support nested token objects natively (not just flat `Record<string, string>`), so `tokens.create('color', { primary: { default: '#0066ff', hover: '#0055dd' } })` produces `--color-primary-default` and `--color-primary-hover` automatically
- Add a `scope` option to `tokens.create()` for component-level custom properties

---

### 1.5 Tokens Inject at Import Time (Side Effects)

**Source:** Architecture Review §4, Architecture Doc (Data Flow)

`tokens.create()` executes at module evaluation time, immediately injecting CSS into the document. This is a side effect of importing a module:

```ts
// This file IMMEDIATELY injects :root { --color-primary: #0066ff; }
// when ANY module imports it — even if no component uses the tokens yet
import { tokens } from 'typestyles';
export const color = tokens.create('color', { primary: '#0066ff' });
```

**Problems:**

1. **Bundle splitting**: tokens for lazy-loaded routes are injected eagerly when their module is evaluated, not when the route renders — defeats code splitting benefits
2. **SSR timing**: server-side module evaluation may differ from client, risking hydration mismatches
3. **Testing**: importing a token file in tests immediately pollutes the global style registry — `reset()` must be called in every test teardown
4. **Tree shaking**: bundlers can't tree-shake unused token files because the import has observable side effects

**DX example — the SSR problem:**

```tsx
// tokens.ts — evaluated at import time
export const color = tokens.create('color', { primary: '#0066ff' });

// app.tsx — on the server, this module runs during SSR
import { color } from './tokens';

// Problem: If server evaluates tokens.ts in a different order than client,
// or if some tokens are only imported on certain routes,
// the CSS output differs between server and client → hydration mismatch
```

**Recommendation:** Consider lazy token injection — tokens are registered but CSS is only injected when first referenced in a rendered style. Or provide a `tokens.define()` (declaration only) + `tokens.inject()` (imperative injection) split.

---

## Priority 2 — High: Missing Features That Block Adoption

### 2.1 No Framework-Specific Component Packages

**Source:** Roadmap §7, Panda CSS Analysis §4

No `@typestyles/react` package with `css` prop or `styled()` API. This is the #1 migration blocker from Emotion and styled-components, which dominate the React ecosystem:

```tsx
// ❌ Not possible today — Emotion/styled-components users expect this
import { css } from '@typestyles/react';

function Card({ highlighted }) {
  return (
    <div
      css={{
        padding: '16px',
        borderRadius: '8px',
        background: highlighted ? color.primary : color.surface,
      }}
    />
  );
}

// ❌ Also not possible — styled() API
const StyledButton = styled('button', {
  base: { padding: '8px 16px' },
  variants: {
    intent: {
      primary: { backgroundColor: color.primary },
    },
  },
});

<StyledButton intent="primary">Click me</StyledButton>
```

**What needs to ship:**

- `@typestyles/react` with `css` prop (requires Babel/SWC transform or JSX pragma)
- `@typestyles/react` with `styled()` factory for creating React components with typed variant props
- `@typestyles/vue` with Vue 3 Composition API integration
- `@typestyles/svelte` with Svelte action/preprocessor integration

**Why high priority:** Migration from Emotion/styled-components is the most common adoption path. Without a `css` prop or `styled()` API, the migration guide asks developers to rewrite every component — a non-starter for large codebases.

---

### 2.2 No Project-Level Class Naming / Hashing Strategy

**Source:** Roadmap §4/§6, Panda CSS Analysis §5

Class name hashing is available per-class via `styles.hashClass()`, but there's no global configuration to switch the entire project to hashed or atomic output:

```ts
// Today: must explicitly choose per-class
const readable = styles.create('button', { base: {} }); // → "button-base"
const hashed = styles.hashClass({ padding: '8px' }, 'button'); // → "ts-button-a1b2c3"

// ❌ No way to do this:
// typestyles.config.ts
export default {
  classNaming: 'hashed', // ALL classes are hashed in production
  // or: 'atomic'        // ALL classes are atomic like StyleX
};
```

**Current state:** `configureClassNaming({ mode: 'semantic' | 'hashed' | 'atomic' })` exists but:

- Atomic mode doesn't do true per-property splitting yet
- No build/plugin integration for compile-time class name resolution
- No per-file or per-package override (monorepo teams need different strategies)

**What needs to happen:**

- Complete atomic CSS mode with per-property class splitting
- Integrate class naming config with build plugins so class names are resolved at compile time
- Support per-package or per-entry overrides for monorepo scenarios
- Add a `scopeId` option for hash uniqueness across packages

---

### 2.3 No Built-In CSS Reset / Preflight

**Source:** Panda CSS Analysis §3, Roadmap (implicit)

TypeStyles supports `global.style()` for arbitrary global CSS, but provides no built-in CSS reset or preflight:

```ts
// Today: developers must write their own reset
global.style('*, *::before, *::after', { boxSizing: 'border-box' });
global.style('body', { margin: 0, fontFamily: 'system-ui' });
global.style('img, video', { maxWidth: '100%', display: 'block' });
// ... 30+ more lines of boilerplate

// ❌ Not possible:
import { preflight } from 'typestyles/reset';
preflight(); // ← applies a sensible CSS reset

// ❌ Also not possible:
import typestyles from '@typestyles/vite';
export default defineConfig({
  plugins: [typestyles({ preflight: true })],
});
```

**Recommendation:** Ship a `typestyles/reset` or `typestyles/preflight` export with a configurable CSS reset (similar to Tailwind's preflight or Panda's `preflight` config). Include sensible defaults that can be toggled or customized.

---

### 2.4 No JSX Factory or Pattern Primitives

**Source:** Panda CSS Analysis §4

Panda CSS provides generated JSX components (`Box`, `Stack`, `Flex`, `Grid`) and pattern primitives that reduce boilerplate. TypeStyles has nothing equivalent:

```tsx
// Panda CSS — zero-boilerplate layout
import { Box, Stack, Flex } from 'styled-system/jsx';

<Stack gap="4" direction="column">
  <Flex justify="between" align="center">
    <Box p="4">Content</Box>
  </Flex>
</Stack>

// TypeStyles — manual everything
import { styles } from 'typestyles';

const layout = styles.create('layout', {
  stack: { display: 'flex', flexDirection: 'column', gap: '16px' },
  flex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  box: { padding: '16px' },
});

<div className={layout('stack')}>
  <div className={layout('flex')}>
    <div className={layout('box')}>Content</div>
  </div>
</div>
```

**Recommendation:** This could live in `@typestyles/react` or a separate `@typestyles/patterns` package. Even without JSX factories, providing pre-built layout utility styles (Stack, Flex, Grid, Container, Center) as importable recipes would reduce boilerplate significantly.

---

## Priority 3 — Medium: DX Improvements & Ecosystem

### 3.1 ESLint Plugin

**Source:** Roadmap §5

No lint rules exist to catch common mistakes:

```ts
// These mistakes are silent today — no linter catches them:

// ❌ Duplicate namespace — only caught by runtime warning
styles.create('button', { base: {} }); // file-a.ts
styles.create('button', { base: {} }); // file-b.ts — silent collision

// ❌ Creating styles inside a component — memory leak
function Card() {
  const card = styles.create('card', { base: {} }); // ← LEAK: new styles every render
  return <div className={card('base')} />;
}

// ❌ Dynamic values in style objects — infinite variation generation
const btn = styles.create('btn', {
  base: { width: props.width }, // ← generates unique CSS per value
});

// ❌ Referencing a variant that doesn't exist — no type error at call site
const button = styles.create('button', { base: {}, primary: {} });
button('base', 'ghost'); // ← 'ghost' doesn't exist, silently ignored
```

**What an ESLint plugin should catch:**

- `styles.create()` / `styles.class()` / `styles.component()` called inside a function body (not module scope)
- Duplicate namespace strings across files
- Dynamic expressions in style object values
- Token namespace collisions
- Unused style variants

---

### 3.2 Enhanced `styles.component()` Ergonomics

**Source:** Roadmap §4

Compound variants are verbose and repetitive:

```ts
const button = styles.component('button', {
  variants: {
    intent: { primary: {}, ghost: {} },
    size: { sm: {}, lg: {} },
  },
  // Compound variants require repeating the full variant combination
  compoundVariants: [
    { variants: { intent: 'primary', size: 'lg' }, style: { fontWeight: 700 } },
    { variants: { intent: 'primary', size: 'sm' }, style: { fontSize: '11px' } },
    { variants: { intent: 'ghost', size: 'lg' }, style: { borderWidth: '2px' } },
    // Gets unwieldy with 3+ dimensions
  ],
});
```

**Improvements needed:**

- `styleVariants()` helper (vanilla-extract style) for generating variant maps from data
- Boolean variant shorthand: `{ outlined: true }` instead of `{ outlined: { true: { ... }, false: { ... } } }`
- Multi-value compound matching: `{ variants: { intent: ['primary', 'ghost'] }, style: { ... } }` to apply same style for multiple variant values
- Responsive variants: `{ size: { base: 'sm', md: 'lg' } }` — variants that change at breakpoints

---

### 3.3 Missing Webpack Integration

**Source:** Roadmap §1

No `@typestyles/webpack` package exists. Enterprise teams on Webpack have no bundler-level integration:

- No HMR support (must full-page reload)
- No namespace deduplication warnings
- No build-time extraction path
- Next.js webpack wiring lives under `@typestyles/next/build` but is Next-specific

**Recommendation:** Ship `@typestyles/webpack` with HMR, duplicate detection, and extraction support.

---

### 3.4 Accessibility Integration Gaps

**Source:** Design System TODO Phase 3, Roadmap (Documentation Gaps)

No guidance or built-in support for accessibility concerns in styling:

```ts
// ❌ No built-in focus-visible styles
const button = styles.component('button', {
  base: { /* no focus styles */ },
});

// ❌ No prefers-reduced-motion handling
const fadeIn = keyframes.create('fadeIn', { from: { opacity: 0 }, to: { opacity: 1 } });
// Developers must manually add @media (prefers-reduced-motion: reduce) everywhere

// ❌ No contrast validation
tokens.create('color', {
  text: '#666',       // ← Fails WCAG AA on white background
  background: '#fff', // ← No warning about insufficient contrast
});
```

**What's needed:**

- Define required contrast targets for all token themes
- Add `focus-visible` styles to all interactive component recipes
- Add `prefers-reduced-motion` media query helpers or a utility
- Document how to use TypeStyles with ARIA attributes, focus management, and screen readers
- Add a11y linting rules to the ESLint plugin

---

### 3.5 Nested Token Objects Not Natively Supported

**Source:** Theme Architecture Plan (Nesting Strategy)

`tokens.create()` only accepts flat `Record<string, string>`. The design system has to work around this with `flattenColorValues()` and `buildColorRefs()` helpers:

```ts
// ❌ What developers want to write:
const color = tokens.create('color', {
  background: {
    app: '#ffffff',
    surface: '#f8fafc',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
  },
});
color.background.app; // → "var(--color-background-app)"

// ✅ What they must write today:
const flatValues = flattenColorValues({ background: { app: '#fff' }, text: { primary: '#000' } });
const color = tokens.create('color', flatValues);
// color['background-app'] → "var(--color-background-app)"
// ⚠️ No dot-notation, no type-safe nested access

// Then manually build nested refs:
const colorRefs = buildColorRefs('color', shapeObject);
// colorRefs.background.app → "var(--color-background-app)"
```

**Recommendation:** Support nested objects natively in `tokens.create()`. Flatten keys with `-` separator internally. Return a nested proxy object for type-safe dot-notation access.

---

### 3.6 Theme System Requires Manual Dark Mode Wiring

**Source:** Theme Architecture Plan (Guiding Principles)

`tokens.createTheme()` creates a CSS class override, but dark mode typically uses `@media (prefers-color-scheme: dark)` or `[data-mode="dark"]` — neither is directly supported:

```ts
// Today: dark mode requires manual insertRule + theme class juggling
const dark = tokens.createTheme('dark', {
  color: { primary: '#66b3ff', surface: '#1a1a2e' },
});

// Developer must manually:
// 1. Apply className={dark} to <html> based on user preference
// 2. OR use insertRule() to inject @media (prefers-color-scheme: dark) rules
// 3. AND handle system preference detection in JavaScript
// 4. AND handle localStorage persistence
// 5. AND avoid flash of wrong theme on page load
```

**Recommendation:** Add first-class dark mode support:

```ts
// What it should look like:
tokens.createTheme('dark', {
  color: { primary: '#66b3ff' },
}, {
  media: '(prefers-color-scheme: dark)',  // auto-apply via media query
  selector: '[data-mode="dark"]',        // also apply via data attribute
});
```

---

## Priority 4 — Lower: Polish, DX, and Ecosystem

### 4.1 No Playground / REPL

**Source:** Roadmap §8

No interactive playground for trying TypeStyles without a project setup. Vanilla-extract has a playground, Panda CSS has a playground, Tailwind has a playground. TypeStyles has none.

**Impact:** Developers evaluate libraries by trying them. No playground = higher friction to adoption.

---

### 4.2 No VS Code Extension

**Source:** Roadmap §8

No editor support for:

- CSS property autocomplete in style objects (TypeScript provides some, but not CSS-specific)
- Hover preview showing generated CSS
- Go-to-definition from class name usage to style definition
- Color swatches for token values
- Snippets for common patterns

---

### 4.3 Design System Not Production-Ready

**Source:** Design System TODO

The reference design system (`examples/design-system`) has significant gaps:

- **Phase 3 incomplete:** No a11y baseline, no testing, no performance audit
- **Phase 4 incomplete:** No clear package entrypoints, no usage docs, no changelog
- No visual regression tests
- No token-level tests to prevent accidental breaking changes

This matters because the design system is the primary showcase for TypeStyles' capabilities. If the reference implementation is incomplete, teams can't evaluate whether TypeStyles is suitable for their own design systems.

---

### 4.4 No Migration CLI for All Libraries

**Source:** Roadmap (Documentation Gaps), Migration Docs

The migration CLI (`@typestyles/migrate`) exists but has significant limitations:

- Dynamic interpolations (`${(props) => ...}`) are not auto-migrated
- Exported styled components are skipped
- Complex non-JSX references are skipped
- No migration path for CSS Modules (only docs-level guidance)
- No migration path for Tailwind (only docs-level guidance)

**Recommendation:** Improve the CLI to handle more cases, or clearly document the manual migration steps for each case it can't handle.

---

### 4.5 Performance Documentation Gaps

**Source:** Roadmap (Documentation Gaps)

No published benchmark data comparing TypeStyles to alternatives:

- No bundle size comparisons (core, with Vite plugin, with SSR)
- No runtime performance benchmarks (style injection time, class name resolution)
- No CSS output size comparisons (atomic vs semantic vs hashed)
- No memory usage profiling under sustained usage

**Recommendation:** Publish reproducible benchmarks and include them in docs. This is a key decision factor for teams evaluating CSS-in-JS libraries.

---

### 4.6 Memory Leak Risk from Module-Level Design

**Source:** Troubleshooting Docs, Best Practices

TypeStyles' core design (styles defined at module level, never cleaned up) creates a subtle memory leak in long-running applications:

```ts
// Styles are registered once and NEVER garbage collected
// In apps with many lazy-loaded routes, the style registry grows monotonically

// Route A
const routeAStyles = styles.create('route-a', { /* 50 variants */ });
// Route B (lazy loaded, maybe visited once)
const routeBStyles = styles.create('route-b', { /* 50 variants */ });
// Route C, D, E... — all accumulated, never released

// After visiting many routes, the <style> element contains CSS for ALL routes
// even ones no longer mounted — and there's no API to release them
```

**Recommendation:** Add a `styles.release(namespace)` or `styles.unregister(namespace)` API for cleaning up styles associated with unmounted route/component trees. Or integrate with build-time extraction so this becomes a non-issue.

---

### 4.7 No Figma Token Sync

**Source:** Roadmap §9

No tooling for syncing tokens between Figma and TypeStyles:

```ts
// What teams need:
// 1. Export Figma tokens → typestyles tokens.create() calls
// 2. Import typestyles tokens → Figma variables
// 3. Watch for Figma token changes → auto-update TypeStyles files
```

**Impact:** Design system teams spend significant time manually keeping Figma and code in sync. Panda CSS and Tailwind have community plugins for this.

---

### 4.8 SSR Edge Cases Need Hardening

**Source:** Troubleshooting Docs, Architecture Doc

Several SSR edge cases are documented as known issues:

1. **Streaming SSR:** `collectStyles()` wrapping `renderPage()` is fragile because `renderPage` can be asynchronous in newer Next.js versions
2. **Astro view transitions:** Document swap can detach the `<style>` element — requires `ensureDocumentStylesAttached()` call
3. **React Server Components:** `TypestylesProvider` must be in root layout, but there's no enforcement or error if it's missing
4. **Flash of unstyled content (FOUC):** If `collectStyles()` isn't used during SSR, styles are missing until client-side hydration

---

### 4.9 PostCSS Plugin

**Source:** Roadmap §1

No public PostCSS plugin. Only internal PostCSS use in `@typestyles/migrate`. A PostCSS plugin would unlock CSS-pipeline adoption for teams using PostCSS-based toolchains (e.g., Tailwind v3-style builds, legacy Webpack setups).

---

## Summary: Priority Matrix

| # | Issue | Priority | Effort | Impact |
|---|-------|----------|--------|--------|
| 1.1 | Build-time extraction (zero runtime) | **Critical** | Very High | Removes #1 adoption blocker |
| 1.2 | Inconsistent return types between APIs | **Critical** | High | Eliminates API confusion |
| 1.3 | No direct property access on style results | **Critical** | Medium | Better DX, IDE support |
| 1.4 | Token global pollution / no scoping | **Critical** | High | Prevents namespace collisions |
| 1.5 | Tokens inject at import time (side effects) | **Critical** | High | SSR safety, tree-shaking |
| 2.1 | No `@typestyles/react` (`css` prop, `styled()`) | **High** | High | Unblocks Emotion/SC migration |
| 2.2 | No project-level hashing/atomic strategy | **High** | Medium | Production CSS optimization |
| 2.3 | No built-in CSS reset/preflight | **High** | Low | Quick migration ergonomic win |
| 2.4 | No JSX factory / pattern primitives | **High** | Medium | Reduces boilerplate |
| 3.1 | ESLint plugin | **Medium** | Medium | Catches silent bugs |
| 3.2 | Enhanced `styles.component()` ergonomics | **Medium** | Medium | Better variant authoring |
| 3.3 | Webpack integration | **Medium** | Medium | Enterprise adoption |
| 3.4 | Accessibility integration gaps | **Medium** | Medium | A11y compliance |
| 3.5 | Nested token objects not native | **Medium** | Low | Cleaner token authoring |
| 3.6 | Dark mode requires manual wiring | **Medium** | Medium | Common use case unsupported |
| 4.1 | No playground/REPL | **Lower** | Medium | Discovery & evaluation |
| 4.2 | No VS Code extension | **Lower** | High | Editor DX |
| 4.3 | Design system not production-ready | **Lower** | High | Reference implementation |
| 4.4 | Migration CLI limitations | **Lower** | Medium | Migration friction |
| 4.5 | Performance documentation gaps | **Lower** | Low | Decision-making data |
| 4.6 | Memory leak risk (no style cleanup) | **Lower** | Medium | Long-running apps |
| 4.7 | No Figma token sync | **Lower** | Medium | Design-code workflow |
| 4.8 | SSR edge case hardening | **Lower** | Medium | Robustness |
| 4.9 | PostCSS plugin | **Lower** | Medium | CSS pipeline teams |
