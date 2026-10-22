---
title: Component Library Setup
description: Building a reusable component library with typestyles
---

This guide shows you how to set up a reusable component library using typestyles, suitable for publishing to npm.

**Reference implementation:** [examples/react-design-system](https://github.com/type-styles/typestyles/blob/main/examples/react-design-system/README.md) (React Aria wrappers + shared tokens). Consumed by [examples/vite-app](https://github.com/type-styles/typestyles/blob/main/examples/vite-app/README.md) and [examples/next-app](https://github.com/type-styles/typestyles/blob/main/examples/next-app/README.md).

## Project structure

```
my-ui-library/
├── src/
│   ├── tokens/
│   │   ├── index.ts          # Token exports
│   │   ├── colors.ts         # Color definitions
│   │   ├── spacing.ts        # Spacing scale
│   │   └── typography.ts     # Font tokens
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.styles.ts
│   │   │   └── index.ts
│   │   ├── Card/
│   │   │   ├── Card.tsx
│   │   │   ├── Card.styles.ts
│   │   │   └── index.ts
│   │   ├── Input/
│   │   │   └── ...
│   │   └── index.ts          # Component exports
│   ├── utils/
│   │   └── style-utils.ts    # Shared style utilities
│   ├── index.ts              # Main library export
│   └── styles.css            # Optional global CSS
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Package configuration

### package.json

```json
{
  "name": "@myorg/ui-library",
  "version": "1.0.0",
  "description": "A React component library built with typestyles",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./tokens": {
      "import": "./dist/tokens/index.js",
      "types": "./dist/tokens/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc && vite build",
    "dev": "vite",
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typestyles": "^1.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typestyles": "^1.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

Note: `typestyles` should be a peer dependency so consuming apps can control the version.

## Scope isolation

Published packages **must** use a `scopeId` to prevent class name collisions with consumer code or other libraries. Without one, `recipe({ name: 'button' })` produces `button` in both your library and the consuming app — their CSS rules silently overwrite each other.

```ts
// src/styles.ts
import { createTypeStyles } from 'typestyles';

export const { style, recipe, tokens } = createTypeStyles({
  scopeId: '@myorg/ui-library',
});
```

Now all class names are prefixed (`myorg-ui-library-button`) and all token custom properties are namespaced (`--myorg-ui-library-color-primary`). See [Best Practices — Scope isolation](/docs/best-practices#scope-isolation) for more options.

## Token system

### Colors

```ts
// src/tokens/colors.ts
import { tokens } from './styles'; // use the scoped instance

export const colors = tokens.create('color', {
  // Brand
  brand50: '#eff6ff',
  brand100: '#dbeafe',
  brand200: '#bfdbfe',
  brand300: '#93c5fd',
  brand400: '#60a5fa',
  brand500: '#3b82f6',
  brand600: '#2563eb',
  brand700: '#1d4ed8',
  brand800: '#1e40af',
  brand900: '#1e3a8a',

  // Gray scale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Semantic
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
});

// Semantic aliases
export const semanticColors = tokens.create('semantic-color', {
  primary: colors.brand500,
  primaryHover: colors.brand600,
  secondary: colors.gray500,
  secondaryHover: colors.gray600,
  text: colors.gray900,
  textMuted: colors.gray500,
  background: colors.gray50,
  surface: '#ffffff',
  surfaceRaised: colors.gray100,
  border: colors.gray200,
});
```

### Spacing

```ts
// src/tokens/spacing.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const spacing = tokens.create('space', {
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

  // Semantic aliases
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
});
```

### Typography

```ts
// src/tokens/typography.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const fontSize = tokens.create('font-size', {
  xs: '0.75rem', // 12px
  sm: '0.875rem', // 14px
  base: '1rem', // 16px
  lg: '1.125rem', // 18px
  xl: '1.25rem', // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
});

export const fontWeight = tokens.create('font-weight', {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
});

export const lineHeight = tokens.create('line-height', {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
});
```

### Token exports

```ts
// src/tokens/index.ts
export { colors, semanticColors } from './colors';
export { spacing } from './spacing';
export { fontSize, fontWeight, lineHeight } from './typography';
```

## Component implementation

### Button component

```ts
import { variant } from 'typestyles';
// src/components/Button/Button.styles.ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { semanticColors, spacing, fontSize, fontWeight } from '../../tokens';

export const button = recipe({
  name: 'button',
  variants: {
    intent: variant.enum(['primary', 'secondary', 'outline', 'ghost'], {
      default: 'primary',
    }),
    size: variant.enum(['sm', 'md', 'lg'], { default: 'md' }),
    width: variant.enum(['auto', 'full'], { default: 'auto' }),
  },
  styles: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      borderRadius: '6px',
      lineHeight: '1.5',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 150ms ease',

      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
      },

      '&:focus': {
        outline: 'none',
        boxShadow: `0 0 0 3px ${semanticColors.primary}33`,
      },
    },
    variants: {
      intent: {
        primary: {
          backgroundColor: semanticColors.primary,
          color: '#ffffff',
          '&:hover:not(:disabled)': {
            backgroundColor: semanticColors.primaryHover,
          },
        },
        secondary: {
          backgroundColor: semanticColors.secondary,
          color: '#ffffff',
          '&:hover:not(:disabled)': {
            backgroundColor: semanticColors.secondaryHover,
          },
        },
        outline: {
          backgroundColor: 'transparent',
          border: `1px solid ${semanticColors.border}`,
          color: semanticColors.text,
          '&:hover:not(:disabled)': {
            backgroundColor: semanticColors.surfaceRaised,
          },
        },
        ghost: {
          backgroundColor: 'transparent',
          color: semanticColors.text,
          '&:hover:not(:disabled)': {
            backgroundColor: semanticColors.surfaceRaised,
          },
        },
      },
      size: {
        sm: {
          padding: `${spacing[1]} ${spacing[3]}`,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
        },
        md: {
          padding: `${spacing[2]} ${spacing[4]}`,
          fontSize: fontSize.base,
          fontWeight: fontWeight.medium,
        },
        lg: {
          padding: `${spacing[3]} ${spacing[6]}`,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.medium,
        },
      },
      width: {
        auto: {},
        full: { width: '100%' },
      },
    },
  },
});
```

```tsx
// src/components/Button/Button.tsx
import { cx } from 'typestyles';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { button } from './Button.styles';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cx(
          button({
            intent: variant,
            size,
            width: fullWidth ? 'full' : 'auto',
          }),
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
```

```ts
// src/components/Button/index.ts
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

## Theming support

### Dark theme

```ts
// src/tokens/themes.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const darkTheme = tokens.createTheme({
  name: 'dark',
  tokens: {
    'semantic-color': {
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      text: '#f9fafb',
      textMuted: '#9ca3af',
      background: '#111827',
      surface: '#1f2937',
      surfaceRaised: '#374151',
      border: '#4b5563',
    },
  },
});

export const highContrastTheme = tokens.createTheme({
  name: 'high-contrast',
  tokens: {
    'semantic-color': {
      text: '#000000',
      background: '#ffffff',
      primary: '#0000ff',
      border: '#000000',
    },
  },
});
```

### Theme provider

```tsx
// src/components/ThemeProvider/ThemeProvider.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import { darkTheme } from '../../tokens/themes';

interface ThemeContextValue {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark';
}

export function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
  const [theme, setTheme] = useState(defaultTheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={theme === 'dark' ? darkTheme.className : ''}>{children}</div>
    </ThemeContext.Provider>
  );
}
```

## Build configuration

### Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'MyUILibrary',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'typestyles'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          typestyles: 'TypeStyles',
        },
      },
    },
  },
});
```

### TypeScript config

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Main exports

```ts
// src/index.ts
// Components
export { Button } from './components/Button';
export type { ButtonProps } from './components/Button';

export { Card } from './components/Card';
export type { CardProps } from './components/Card';

export { Input } from './components/Input';
export type { InputProps } from './components/Input';

// Theme
export { ThemeProvider, useTheme } from './components/ThemeProvider';
export { darkTheme, highContrastTheme } from './tokens/themes';

// Tokens (for custom styling)
export { colors, semanticColors, spacing, fontSize, fontWeight, lineHeight } from './tokens';
```

## Usage examples

### Installation

```bash
npm install @myorg/ui-library typestyles react react-dom
```

### Basic usage

```tsx
import { Button, Card, Input } from '@myorg/ui-library';

function App() {
  return (
    <Card>
      <Card.Header>
        <h2>Login</h2>
      </Card.Header>
      <Card.Body>
        <Input label="Email" type="email" />
        <Input label="Password" type="password" />
      </Card.Body>
      <Card.Footer>
        <Button variant="primary" fullWidth>
          Sign In
        </Button>
      </Card.Footer>
    </Card>
  );
}
```

### With theming

```tsx
import { ThemeProvider, Button } from '@myorg/ui-library';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Button variant="primary">I adapt to the theme!</Button>
    </ThemeProvider>
  );
}
```

### Using tokens for custom styling

```tsx
import { Button } from '@myorg/ui-library';
import { semanticColors, spacing } from '@myorg/ui-library/tokens';
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const customCard = recipe({
  name: 'custom-card',
  styles: {
    base: {
      padding: spacing[6],
      border: `2px solid ${semanticColors.primary}`,
      borderRadius: '12px',
    },
  },
});

function CustomComponent() {
  return (
    <div className={customCard()}>
      <Button variant="primary">Library Button</Button>
    </div>
  );
}
```

## Publishing

### Build the library

```bash
npm run build
```

### Publish to npm

```bash
npm login
npm publish --access public
```

## Versioning

Follow semantic versioning:

- **Patch (1.0.1)**: Bug fixes, token value changes
- **Minor (1.1.0)**: New components, new tokens (backward compatible)
- **Major (2.0.0)**: Breaking changes, removed components, renamed tokens

## Best practices

1. **Export prop types** - Let consumers extend your components
2. **Document breaking changes** - Keep a detailed changelog
3. **Test thoroughly** - Components should work in any React app
4. **Minimize dependencies** - Keep the library lightweight
5. **Provide examples** - Show how to customize and extend
6. **Support tree-shaking** - Use ES modules and avoid side effects
7. **Version tokens separately** - Consider a separate tokens package
8. **Test with multiple React versions** - Ensure compatibility

## Troubleshooting

### Styles not working in consumer app

Make sure `typestyles` is installed in the consumer app:

```bash
npm install typestyles
```

### TypeScript errors in consumer

Ensure the consumer has compatible TypeScript settings:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

### Duplicate typestyles instances

If you see duplicate style tags, ensure `typestyles` is a peer dependency, not a regular dependency.
