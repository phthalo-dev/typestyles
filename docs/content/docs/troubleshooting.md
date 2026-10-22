---
title: Troubleshooting
description: Common issues and how to fix them
---

Common issues you might encounter and their solutions.

## Styles not applying

### Check the class name

First, verify the class name is being applied:

```tsx
function Button() {
  return <button className={button()}>Click me</button>;
}
```

Open DevTools and check that the element has the expected class:

```html
<!-- Should see something like this -->
<button class="button">Click me</button>
```

**If no class is present:**

- Check that the component is actually rendering
- Verify the style definition is being imported
- Ensure no JavaScript errors are preventing execution

**If class is present but styles don't apply:**

- Check the computed styles in DevTools
- Verify no other CSS is overriding your styles
- Look for CSS specificity issues

### Check CSS injection

Styles are injected lazily. Open DevTools and look for a `<style>` tag with typestyles:

```html
<head>
  <style id="typestyles">
    .button {
      padding: 8px 16px;
    }
  </style>
</head>
```

**If the style tag is missing:**

- Ensure typestyles is actually being imported
- Check that components using the styles are rendering
- Verify no bundler issues (check console for errors)

**If styles are in the tag but not applied:**

- Check for CSS syntax errors
- Verify the class name in HTML matches the CSS selector
- Look for ad blockers that might be removing styles

## Duplicate namespace warnings

### What it means

```
Style namespace "button" is also used in /path/to/other/file.ts.
Duplicate namespaces cause class name collisions.
```

This means you've created two different styles with the same namespace:

```ts
// File A
const button = recipe({ name: 'button' });

// File B
const button = recipe({ name: 'button' }); // Same namespace!
```

### How to fix

Use unique, descriptive namespaces:

```ts
// ✅ Good - descriptive names
const iconButton = recipe({ name: 'icon-button' });
const textButton = recipe({ name: 'text-button' });
const submitButton = recipe({ name: 'submit-button' });

// ❌ Bad - generic names that collide
const button = recipe({ name: 'button' });
const button2 = recipe({ name: 'button' }); // Collision!
```

## TypeScript errors

### "Property does not exist"

```
Property 'tertiary' does not exist on type '{ primary: string; secondary: string; }'
```

You're trying to access a token that doesn't exist:

```ts
const color = tokens.create('color', {
  primary: '#0066ff',
  secondary: '#6b7280',
});

color.tertiary; // Error! This token doesn't exist
```

**Fix:** Add the missing token or use an existing one.

### "No overload matches this call"

```
No overload matches this call.
  The last overload gave the following error.
    Argument of type 'string' is not assignable to parameter of type...
```

You're passing an invalid variant:

```ts
import { variant } from 'typestyles';
const button = recipe({ name: 'button', variants: { primary: variant.boolean({ default: false }) }, styles: { base: { ... }, variants: { primary: { true: { ... }, false: {} } } } });

button({ secondary: true }); // Error! 'secondary' is not a valid flat flag on this recipe
```

**Fix:** Pass only variant keys that exist on the recipe (for dimensioned components, use the correct dimension keys and option names).

### Cannot find module 'typestyles'

```
Cannot find module 'typestyles' or its corresponding type declarations.
```

**Fix:**

1. Make sure typestyles is installed:

   ```bash
   npm install typestyles
   ```

2. Check your import path:

   ```ts
   // ✅ Correct
   import { createTypeStyles } from 'typestyles';
   ```

```

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

// ❌ Incorrect
import { recipe } from './typestyles';

```

3. Restart TypeScript server in your editor

## SSR issues

### Styles not included in SSR output

**Symptom:** Page renders without styles, then styles appear after hydration (flash of unstyled content).

**Cause:** Not using `collectStyles()` during render.

**Fix:**

```ts
import { collectStyles } from 'typestyles/server';
import { renderToString } from 'react-dom/server';

// ❌ Wrong
const html = renderToString(<App />);

// ✅ Correct
const { html, css } = collectStyles(() => renderToString(<App />));
// Include css in your HTML response
```

For Next.js, follow the [SSR guide](/docs/ssr) and use `@typestyles/next` (`getRegisteredCss`, `TypestylesStylesheet`, or `@typestyles/next/server` helpers) so the document matches what App Router streams.

### Hydration mismatch

**Symptom:** React warning about hydration mismatch or styles appearing twice.

**Cause:** Mismatch between server and client CSS injection.

**Fix:**

1. Ensure the style tag ID matches:

   ```html
   <!-- Server -->
   <style id="typestyles">
     ${css}
   </style>

   <!-- Client looks for this ID -->
   ```

2. Don't manually create the style tag on client:

   ```tsx
   // ❌ Don't do this on client
   document.head.innerHTML += `<style id="typestyles">...</style>`;
   ```

// ✅ TypeStyles handles this automatically

````

### Empty CSS in SSR

**Symptom:** `css` string is empty.

**Cause:** Styles aren't being created during the render pass.

**Fix:** Make sure components with typestyles are actually rendered inside `collectStyles()`:

```ts
// ❌ Wrong - App doesn't use typestyles components
const { css } = collectStyles(() => renderToString(<App />));
// css is empty because App doesn't use styles

// ✅ Correct - Components with styles are rendered
const { css } = collectStyles(() =>
  renderToString(
    <App>
      <Button /> {/* Button uses typestyles */}
    </App>,
  ),
);
````

## Build issues

### Bundler errors

**ESM/CJS issues:**

If you get errors about ES modules:

```json
// package.json
{
  "type": "module"
}
```

Or use `.mjs` extension for your files.

**Webpack issues:**

If using webpack, ensure it can handle ES modules:

```js
// webpack.config.js
module.exports = {
  resolve: {
    fullySpecified: false,
  },
};
```

### Missing dependencies

If you see errors about missing dependencies, ensure you've installed typestyles:

```bash
npm install typestyles

# If using Vite plugin
npm install -D @typestyles/vite
```

## Runtime errors

### "Cannot read property 'create' of undefined"

```
TypeError: Cannot read property 'create' of undefined
```

**Cause:** Importing incorrectly.

**Fix:**

```ts
// ✅ Correct
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

// ❌ Incorrect
import styles from 'typestyles'; // Wrong! Use named import
```

### "insertRule is not a function"

```
TypeError: sheet.insertRule is not a function
```

**Cause:** Running in an environment without a real DOM (like jsdom with some configurations).

**Fix:** Mock the CSSOM APIs in your test setup:

```ts
// test-setup.ts
Object.defineProperty(document, 'styleSheets', {
  value: [
    {
      insertRule: jest.fn(),
      cssRules: [],
    },
  ],
});
```

Or use a real browser for testing (Playwright, Cypress).

## Styling issues

### Specificity problems

Your styles are being overridden by other CSS:

```css
/* Your typestyles class */
.button {
  color: blue;
}

/* Other CSS overrides it */
button {
  color: red;
} /* Higher specificity or loaded later */
```

**Fixes:**

1. Use more specific selectors:

   ```ts
   const button = recipe({
     name: 'button',
     styles: {
       base: {
         color: 'blue',
         // Increase specificity
         '&.button': {
           color: 'blue',
         },
       },
     },
   });
   ```

````

2. Load typestyles CSS after other CSS

3. Use `!important` (not recommended):
   ```ts
   base: {
     color: 'blue !important',
   }

````

### Cascade issues

Styles from parent components affecting children:

```ts
const parent = recipe({
  name: 'parent',
  styles: {
    base: {
      '& button': { color: 'red' }, // Affects ALL buttons inside
    },
  },
});
```

**Fix:** Be more specific or avoid nesting:

```ts
const parent = recipe({
  name: 'parent',
  styles: {
    base: {
      // Don't use & button, style specific class instead
    },
  },
});

const childButton = recipe({
  name: 'child-button',
  styles: {
    base: {
      color: 'red',
    },
  },
});
```

### Media queries not working

```ts
const responsive = recipe({
  name: 'responsive',
  styles: {
    base: {
      '@media (max-width: 768px)': {
        display: 'none',
      },
    },
  },
});
```

**Check:**

1. Viewport is actually below 768px
2. No syntax errors in the media query
3. Check DevTools to see if the media query CSS was generated

## Theme issues

### Theme not applying

```tsx
const darkTheme = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: {
      primary: '#66b3ff',
    },
  },
});

<div className={darkTheme.className}>Content</div>;
```

**Check:**

1. The theme class is applied (check DevTools)
2. Tokens are being used in styles (not hardcoded values)
3. The token namespace matches:

   ```ts
   // Creating
   const color = tokens.create('color', { ... });

   // Overriding
   tokens.createTheme({
     name: 'dark',
     tokens: {
       color: { ... }, // Must match 'color' namespace
     },
   });

   ```

````

4. If you're using `tokens.declare()` with typed schema leaves (`{ syntax: ... }`), those
   registered `@property` tokens inherit by default so values set on `.theme-*` surfaces
   cascade into descendants. Only set `inherits: false` on a leaf when you explicitly want
   descendant `var(--token)` lookups to fall back to that leaf's `initial-value`.

### Theme flashing on load

**Cause:** Theme is applied after initial render.

**Fix:** Apply theme class before first paint:

```html
<head>
  <script>
    // Set theme immediately
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    }
  </script>
</head>
````

## Vite plugin issues

### HMR not working

1. Check that the plugin is installed and configured:

   ```ts
   // vite.config.ts
   import typestyles from '@typestyles/vite';
   ```

export default {
plugins: [typestyles()],
};

````

2. Ensure files import from `'typestyles'` (not relative paths)

3. Check browser console for HMR-related errors

### "typestyles is not defined"

**Cause:** Plugin isn't transforming the file.

**Fix:** Make sure files import from `'typestyles'`:

```ts
// ✅ This file will be transformed
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

// ❌ This file won't be transformed
import { recipe } from '../path/to/typestyles';
````

## Performance issues

### Slow initial render

**Check for:**

1. Too many style definitions at once
2. Creating styles inside components
3. Very large CSS rules

**Fixes:**

1. Code split your styles
2. Move style definitions to module level
3. Simplify complex selectors

### Memory leaks

**Symptoms:** App gets slower over time, memory usage grows.

**Common causes:**

1. Creating styles in event handlers or components
2. Dynamic style values generating infinite variations

**Fix:**

```ts
// ❌ Never do this
function Component() {
  const styles = createStyles(); // Creates on every render
}

// ✅ Do this instead
const styles = createStyles(); // Create once at module level

function Component() {
  // Use existing styles
}
```

## Inspecting registered CSS

To verify what the runtime has registered (for example in a route handler or test), call `getRegisteredCss()` from `typestyles`. For SSR-specific collection, use `collectStyles()` from `typestyles/server` as described in the [SSR guide](/docs/ssr).

## Getting help

If you're still stuck:

1. **Check the documentation:** Review the relevant guide for your use case
2. **Search issues:** Look for similar problems in [GitHub issues](https://github.com/type-styles/typestyles/issues)
3. **Create a minimal reproduction:**
   - Create the smallest possible example that shows the issue
   - Share the code and expected vs actual behavior
4. **Open an issue:** Include:
   - TypeScript version
   - Bundler (Vite, webpack, etc.)
   - Browser
   - Minimal reproduction code

## Quick checklist

When something isn't working, check:

- [ ] Is typestyles installed?
- [ ] Are imports correct (named imports, not default)?
- [ ] Are styles defined at module level (not in components)?
- [ ] Are namespaces unique?
- [ ] Is the component actually rendering?
- [ ] Are there any JavaScript errors in console?
- [ ] Are the class names in HTML what you expect?
- [ ] Is the CSS present in the DOM (DevTools)?
- [ ] For SSR: Is `collectStyles()` being used?
- [ ] For themes: Are tokens being used (not hardcoded values)?
