---
title: Best Practices
description: Tips for organizing and maintaining typestyles in your project
---

These guidelines will help you write maintainable, scalable code with typestyles.

## Naming conventions

### Namespaces

Use kebab-case for namespaces. The namespace should describe the component or pattern:

```ts
// Good - descriptive and consistent
const button = recipe({ name: 'button' });
const card = recipe({ name: 'card' });
const navigationMenu = recipe({ name: 'navigation-menu' });

// Avoid - generic or single-letter names
const b = recipe({ name: 'b' });
const x = recipe({ name: 'x' });
const component = recipe({ name: 'component' });
```

### Variants

Use camelCase for variant dimension names. Be descriptive about the style purpose, not just the visual appearance:

```ts
import { variant } from 'typestyles';
const button = recipe({ name: 'button', variants: { intent: variant.enum(["primary", "secondary", "danger", "ghost"], { default: "primary" }), size: variant.enum(["small", "medium", "large"], { default: "medium" }) }, styles: { base: { ... }, variants: { intent: {
      primary: { ... },     // The main action
      secondary: { ... },   // Alternative action
      danger: { ... },      // Destructive action
      ghost: { ... },       // Subtle action
    }, size: {
      small: { ... },
      medium: { ... },
      large: { ... },
    } } } });

// Avoid - describes appearance only
// blue: { ... }, big: { ... }, rounded: { ... }
```

For flat configs, variant names should still be descriptive:

```ts
import { variant } from 'typestyles';
const card = recipe({ name: 'card', variants: { elevated: variant.boolean({ default: false }), interactive: variant.boolean({ default: false }), disabled: variant.boolean({ default: false }) }, styles: { base: { ... }, variants: { elevated: { true: { ... }, false: {} }, interactive: { true: { ... }, false: {} }, disabled: { true: { ... }, false: {} } } } });
```

### Tokens

Group tokens by category. Use consistent naming within groups:

```ts
// Good - clear categories and consistent naming
export const color = tokens.create('color', {
  // Semantic colors
  primary: '#0066ff',
  secondary: '#6b7280',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',

  // Neutral scale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  // ...etc

  // Text colors
  text: '#111827',
  textMuted: '#6b7280',
  textInverse: '#ffffff',

  // Surface colors
  surface: '#ffffff',
  surfaceRaised: '#f9fafb',
  surfaceSunken: '#f3f4f6',
});

export const space = tokens.create('space', {
  // Scale-based
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',

  // Semantic aliases (optional)
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
});
```

## File organization

### Monorepo/Package structure

```
src/
  tokens/
    index.ts          # Re-exports all tokens
    colors.ts         # Color definitions
    spacing.ts        # Spacing scale
    typography.ts     # Font sizes, line heights
    radii.ts          # Border radius
    shadows.ts        # Box shadows
  components/
    Button/
      index.ts      # Component export
      Button.tsx    # Component implementation
      Button.styles.ts  # Style definitions
    Card/
      index.ts
      Card.tsx
      Card.styles.ts
    ...
  layouts/
    Layout.styles.ts
    ...
  utils/
    styles.ts         # Shared utility styles
```

### Token files

Keep tokens in dedicated files, grouped by category:

```ts
// tokens/colors.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const color = tokens.create('color', {
  // Brand colors
  brand50: '#eff6ff',
  brand100: '#dbeafe',
  brand500: '#3b82f6',
  brand600: '#2563eb',
  brand700: '#1d4ed8',

  // Neutral scale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  // ... etc
});

// tokens/index.ts
export { color } from './colors';
export { space } from './spacing';
export { font } from './typography';
```

### Component style files

Keep styles co-located with components or in a separate `.styles.ts` file:

**Option 1: Same file (for simple components)**

```tsx
import { variant } from 'typestyles';
// Button.tsx
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { color, space } from '../tokens';

const button = recipe({ name: 'button', variants: { intent: variant.enum(["primary", "secondary"], { default: "primary" }) }, styles: { base: { ... }, variants: { intent: { primary: { ... }, secondary: { ... } } } } });

export function Button({ variant = 'primary', children }) {
  return <button className={button({ intent: variant })}>{children}</button>;
}
```

**Option 2: Separate file (for complex components)**

```ts
import { variant } from 'typestyles';
// Button.styles.ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { color, space } from '../tokens';

export const button = recipe({ name: 'button', variants: { intent: variant.enum(["primary", "secondary"], { default: "primary" }), size: variant.enum(["small", "medium", "large"], { default: "medium" }) }, styles: { base: { ... }, variants: { intent: { primary: { ... }, secondary: { ... } }, size: { small: { ... }, medium: { ... }, large: { ... } } } } });

// Button.tsx
import { button } from './Button.styles';

export function Button({ variant = 'primary', size = 'medium', children }) {
  return (
    <button className={button({ intent: variant, size })}>
      {children}
    </button>
  );
}
```

## Token architecture

### Semantic vs. literal tokens

Use literal tokens for the design system foundation, semantic tokens for application use:

```ts
// tokens/primitives.ts
// Raw values from your design system
export const primitives = {
  colors: {
    blue500: '#0066ff',
    blue600: '#0052cc',
    gray500: '#6b7280',
    red500: '#ef4444',
  },
  space: {
    1: '4px',
    2: '8px',
    3: '16px',
    4: '24px',
  },
};

// tokens/semantic.ts
// Semantic meanings mapped to primitives
export const color = tokens.create('color', {
  primary: primitives.colors.blue500,
  primaryHover: primitives.colors.blue600,
  secondary: primitives.colors.gray500,
  danger: primitives.colors.red500,
  // ... etc
});

export const space = tokens.create('space', primitives.space);
```

### Component-specific tokens

For complex components, you can scope tokens to just that component:

```ts
// components/Calendar/Calendar.tokens.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const calendar = tokens.create('calendar', {
  daySize: '40px',
  headerHeight: '48px',
  gridGap: '4px',
});

// Usage in Calendar.styles.ts
import { calendar } from './Calendar.tokens';

const calendarStyles = recipe({
  name: 'calendar',
  styles: {
    base: {
      width: calendar.daySize,
      height: calendar.daySize,
    },
  },
});
```

### Token composition

Reference other tokens when defining new ones:

```ts
const space = tokens.create('space', {
  1: '4px',
  2: '8px',
  3: '16px',
  4: '24px',
  5: '32px',
});

const size = tokens.create('size', {
  // Reference space tokens for consistency
  sm: space[1], // 4px
  md: space[2], // 8px
  lg: space[3], // 16px
  icon: space[4], // 24px
});
```

## Component patterns

### Compound components

For related components (like Form + Input + Label), use consistent namespacing:

```ts
import { variant } from 'typestyles';
const form = recipe({ name: 'form', styles: { base: { ... } } });

const input = recipe({ name: 'input', variants: { state: variant.enum(["error", "success"], { default: "error" }) }, styles: { base: { ... }, variants: { state: {
      error: { borderColor: '#ef4444' },
      success: { borderColor: '#10b981' },
    } } } });

const label = recipe({ name: 'label', variants: { required: variant.boolean({ default: false }) }, styles: { base: { ... }, variants: { required: {
      true: { '&::after': { content: '"*"', color: '#ef4444' } },
    } } } });

// Usage
<form className={form()}>
  <div>
    <label className={label({ required: true })}>Name</label>
    <input className={input({ state: error ? 'error' : undefined })} />
  </div>
</form>
```

### Variant composition

Use dimensioned variants for structured component APIs:

```ts
import { variant } from 'typestyles';
const button = recipe({
  name: 'button',
  variants: {
    intent: variant.enum(['primary', 'secondary', 'ghost'], { default: 'primary' }),
    size: variant.enum(['small', 'medium', 'large'], { default: 'medium' }),
  },
  styles: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      border: 'none',
      fontWeight: 500,
      transition: 'all 150ms ease',
    },
    variants: {
      intent: {
        primary: { backgroundColor: color.primary, color: '#fff' },
        secondary: { backgroundColor: color.secondary, color: '#fff' },
        ghost: { backgroundColor: 'transparent' },
      },
      size: {
        small: { padding: '4px 8px', fontSize: '12px' },
        medium: { padding: '8px 16px', fontSize: '14px' },
        large: { padding: '12px 24px', fontSize: '16px' },
      },
    },
  },
});

// Usage
button(); // Primary medium button
button({ intent: 'ghost', size: 'small' }); // Small ghost button
```

### Layout components

Use layout components with flexible spacing:

```ts
import { variant } from 'typestyles';
const stack = recipe({
  name: 'stack',
  variants: { gap: variant.enum(['1', '2', '3', '4'], { default: '1' }) },
  styles: {
    base: {
      display: 'flex',
      flexDirection: 'column',
    },
    variants: {
      gap: {
        1: { gap: space[1] },
        2: { gap: space[2] },
        3: { gap: space[3] },
        4: { gap: space[4] },
      },
    },
  },
});

const row = recipe({
  name: 'row',
  variants: { gap: variant.enum(['1', '2'], { default: '1' }) },
  styles: {
    base: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
    variants: {
      gap: {
        1: { gap: space[1] },
        2: { gap: space[2] },
      },
    },
  },
});
```

## State management

### Boolean variants

For simple on/off states, use boolean variants or flat configs:

```ts
import { variant } from 'typestyles';
const card = recipe({ name: 'card', variants: { elevated: variant.boolean({ default: false }), interactive: variant.boolean({ default: false }) }, styles: { base: { ... }, variants: { elevated: { true: {
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  }, false: {} }, interactive: { true: {
    cursor: 'pointer',
    '&:hover': {
      boxShadow: '0 8px 12px rgba(0,0,0,0.15)',
    },
  }, false: {} } } } });

// Destructure and use cx() for conditional application:
import { cx } from 'typestyles';

const { base, elevated, interactive } = card;
cx(base, isElevated && elevated, isInteractive && interactive);
```

### Complex state

For more complex state combinations, use dimensioned variants:

```ts
import { variant } from 'typestyles';
const button = recipe({ name: 'button', variants: { intent: variant.enum(["primary", "secondary", "ghost"], { default: "primary" }), size: variant.enum(["small", "medium", "large"], { default: "medium" }), disabled: variant.boolean({ default: false }), loading: variant.boolean({ default: false }) }, styles: { base: { ... }, variants: { intent: { primary: { ... }, secondary: { ... }, ghost: { ... } }, size: { small: { ... }, medium: { ... }, large: { ... } }, disabled: { true: { opacity: 0.5, cursor: 'not-allowed' } }, loading: { true: { cursor: 'wait' } } } } });

function getButtonClasses({ variant, size, isDisabled, isLoading }: ButtonProps) {
  return button({
    intent: variant,
    size,
    disabled: isDisabled || undefined,
    loading: isLoading || undefined,
  });
}
```

## Theming patterns

### Dark mode with createTheme

```ts
// tokens/index.ts
export const color = tokens.create('color', {
  text: '#111827',
  textMuted: '#6b7280',
  surface: '#ffffff',
  surfaceRaised: '#f9fafb',
});

export const darkTheme = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: {
      text: '#e0e0e0',
      textMuted: '#9ca3af',
      surface: '#1a1a2e',
      surfaceRaised: '#25253e',
    },
  },
});

// Apply theme to document body or specific container
document.body.classList.add(darkTheme.className);
```

### Multiple themes

```ts
const brandLight = tokens.createTheme({
  name: 'brand-light',
  tokens: {/* … */},
});
const brandDark = tokens.createTheme({
  name: 'brand-dark',
  tokens: {/* … */},
});
const highContrast = tokens.createTheme({
  name: 'high-contrast',
  tokens: {/* … */},
});
```

## Code style

### Consistent formatting

```ts
import { variant } from 'typestyles';
// Good - consistent structure
const card = recipe({
  name: 'card',
  variants: {
    elevated: variant.boolean({ default: false }),
    interactive: variant.boolean({ default: false }),
  },
  styles: {
    base: {
      padding: space[4],
      borderRadius: '8px',
      backgroundColor: color.surface,
    },
    variants: {
      elevated: {
        true: {
          boxShadow: shadow.md,
        },
        false: {},
      },
      interactive: {
        true: {
          cursor: 'pointer',
          transition: 'box-shadow 200ms ease',
          '&:hover': {
            boxShadow: shadow.lg,
          },
        },
        false: {},
      },
    },
  },
});

// Avoid - inconsistent formatting
const card = recipe({
  name: 'card',
  variants: { elevated: variant.boolean({ default: false }) },
  styles: {
    base: { padding: space[4], borderRadius: '8px', backgroundColor: color.surface },
    variants: { elevated: { true: { boxShadow: shadow.md }, false: {} } },
  },
});
```

### Import organization

```ts
// 1. External imports
import React from 'react';
import { createTypeStyles, cx } from 'typestyles';

const { style, recipe, tokens } = createTypeStyles({ scopeId: 'app' });

// 2. Internal absolute imports
import { color, space } from '@/tokens';
import { Button } from '@/components';

// 3. Internal relative imports
import { card } from './Card.styles';
import { useCardState } from './useCardState';
```

## Performance tips

1. **Define styles at module level** - Never create styles inside components
2. **Reuse token references** - Define once, import many times
3. **Minimize variants** - Don't create a variant for every possible state
4. **Use [`createVar()` for dynamic values**](/docs/dynamic-styles) — Keep styles static; set per-instance values via CSS custom properties
5. **Lazy load component styles** - Use dynamic imports for code splitting

## Scope isolation

### Why scopeId matters

In semantic mode (the default), `recipe({ name: 'button' })` produces class names like `button`. If two packages — or two files in the same app — both register a `'button'` namespace without a `scopeId`, their CSS rules silently overwrite each other. TypeStyles warns about this in development, but the fix is simple: always set a `scopeId`.

### For applications

Use `createTypeStyles` with a `scopeId` at the root of your styles:

```ts
// src/styles.ts
import { createTypeStyles } from 'typestyles';

export const { style, recipe, tokens } = createTypeStyles({
  scopeId: 'my-app',
});
```

Class names become `my-app-button` — unique across your dependency tree.

### For published packages

Published packages **must** use a `scopeId` to avoid colliding with consumer code or other packages. Use the package name and `hashed` mode:

```ts
import { createTypeStyles } from 'typestyles';

export const { style, recipe, tokens } = createTypeStyles({
  scopeId: '@acme/ui',
  mode: 'hashed',
});
```

See the full [Publishing Packages](/docs/publishing-packages) guide for ESLint enforcement, token scoping, and a complete library setup example.

### Per-file isolation (CSS Modules style)

For maximum isolation without choosing a global scope, use `fileScopeId`:

```ts
import { createStyles, fileScopeId } from 'typestyles';

const styles = createStyles({ scopeId: fileScopeId(import.meta) });
```

Each file gets a unique hash-based scope, similar to CSS Modules.

## Common mistakes to avoid

### Creating styles inside components

```tsx
// Bad - creates new styles on every render
function Button({ children }) {
  const button = recipe({ name: 'button', styles: { base: { ... } } }); // Don't do this
  return <button className={button()}>{children}</button>;
}

// Good - define at module level
const button = recipe({ name: 'button', styles: { base: { ... } } });

function Button({ children }) {
  return <button className={button()}>{children}</button>;
}
```

### Dynamic style values

```tsx
import { createTypeStyles, createVar, assignVars } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

// Bad - creates styles for every possible value
const button = recipe({ name: 'button', styles: { base: { width: props.width } } });

// Good - wire dynamic values through CSS custom properties
const widthVar = createVar('buttonWidth');

const button = recipe({
  name: 'button',
  styles: { base: { display: 'inline-block', width: widthVar } },
});

function Button({ width, children }) {
  return (
    <button className={button()} style={assignVars({ [widthVar]: width })}>
      {children}
    </button>
  );
}
```

### Duplicate namespaces

```ts
// File A
const button = recipe({ name: 'button' });

// File B
const button = recipe({ name: 'button' }); // Collision!

// Fix 1 - use descriptive names
const iconButton = recipe({ name: 'icon-button' });
const textButton = recipe({ name: 'text-button' });

// Fix 2 (recommended) - use scopeId to isolate
const { recipe } = createTypeStyles({ scopeId: 'my-app' });
const button = recipe({ name: 'button' }); // "my-app-button"
```

## Summary

- Always set a `scopeId` via `createTypeStyles` or `createStyles` — especially in published packages
- Use descriptive, consistent naming for namespaces and variants
- Organize tokens by category in dedicated files
- Define styles at module level, never in components
- Use semantic tokens for application code
- Keep variants focused on style purpose, not appearance
- Use [`createVar()` + `assignVars()`](/docs/dynamic-styles) for per-instance dynamic values
- Use `cx()` from typestyles for conditional class joining
- Use a bundler plugin for [zero-runtime production builds](/docs/zero-runtime)
