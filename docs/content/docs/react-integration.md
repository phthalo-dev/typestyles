---
title: React Integration
description: Using typestyles with React patterns and best practices
---

TypeStyles works seamlessly with React. This guide shows common patterns for integrating typestyles into React applications.

**Runnable examples:** [examples/vite-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/vite-app/README.md) (Vite + shared design system) and [examples/next-app](https://github.com/phthalo-dev/typestyles/blob/main/examples/next-app/README.md) (App Router + build verification). Component library source: [examples/react-design-system](https://github.com/phthalo-dev/typestyles/blob/main/examples/react-design-system/README.md).

## Basic component setup

### Simple button component

```tsx
import { variant } from 'typestyles';
// components/Button/Button.tsx
import { createTypeStyles } from 'typestyles';
import { color, space } from '../../tokens';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const button = recipe({
  name: 'button',
  variants: {
    intent: variant.enum(['primary', 'secondary'], { default: 'primary' }),
    size: variant.enum(['small', 'medium', 'large'], { default: 'medium' }),
    disabled: variant.enum(['on', 'off'], { default: 'off' }),
    loading: variant.enum(['on', 'off'], { default: 'off' }),
  },
  styles: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      fontWeight: 500,
      cursor: 'pointer',
      border: 'none',
      transition: 'background-color 150ms ease',
    },
    variants: {
      intent: {
        primary: {
          backgroundColor: color.primary,
          color: '#fff',
          '&:hover': { backgroundColor: color.primaryHover },
        },
        secondary: {
          backgroundColor: color.secondary,
          color: '#fff',
          '&:hover': { backgroundColor: color.secondaryHover },
        },
      },
      size: {
        small: { padding: `${space.xs} ${space.sm}`, fontSize: '12px' },
        medium: { padding: `${space.sm} ${space.md}`, fontSize: '14px' },
        large: { padding: `${space.md} ${space.lg}`, fontSize: '16px' },
      },
      disabled: {
        on: { opacity: 0.5, cursor: 'not-allowed' },
        off: {},
      },
      loading: {
        on: { cursor: 'wait' },
        off: {},
      },
    },
  },
});

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      className={button({
        intent: variant,
        size,
        disabled: disabled ? 'on' : 'off',
        loading: loading ? 'on' : 'off',
      })}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
```

### Using the button

```tsx
// App.tsx
import { Button } from './components/Button';

function App() {
  return (
    <div>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button size="large">Large</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
    </div>
  );
}
```

## Polymorphic components

### Creating a polymorphic Box component

```tsx
import { variant } from 'typestyles';
// components/Box/Box.tsx
import { createTypeStyles, cx } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { space } from '../../tokens';
import type { ElementType, ComponentPropsWithoutRef } from 'react';

const box = recipe({
  name: 'box',
  variants: {
    flex: variant.boolean({ default: false }),
    block: variant.boolean({ default: false }),
    inline: variant.boolean({ default: false }),
    hidden: variant.boolean({ default: false }),
    gap1: variant.boolean({ default: false }),
    gap2: variant.boolean({ default: false }),
    gap3: variant.boolean({ default: false }),
    gap4: variant.boolean({ default: false }),
    row: variant.boolean({ default: false }),
    column: variant.boolean({ default: false }),
    wrap: variant.boolean({ default: false }),
    center: variant.boolean({ default: false }),
    p1: variant.boolean({ default: false }),
    p2: variant.boolean({ default: false }),
    p3: variant.boolean({ default: false }),
    p4: variant.boolean({ default: false }),
    m1: variant.boolean({ default: false }),
    m2: variant.boolean({ default: false }),
    m3: variant.boolean({ default: false }),
    m4: variant.boolean({ default: false }),
  },
  styles: {
    base: {},
    variants: {
      flex: { true: { display: 'flex' }, false: {} },
      block: { true: { display: 'block' }, false: {} },
      inline: { true: { display: 'inline' }, false: {} },
      hidden: { true: { display: 'none' }, false: {} },
      gap1: { true: { gap: space[1] }, false: {} },
      gap2: { true: { gap: space[2] }, false: {} },
      gap3: { true: { gap: space[3] }, false: {} },
      gap4: { true: { gap: space[4] }, false: {} },
      row: { true: { flexDirection: 'row' }, false: {} },
      column: { true: { flexDirection: 'column' }, false: {} },
      wrap: { true: { flexWrap: 'wrap' }, false: {} },
      center: {
        true: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        false: {},
      },
      p1: { true: { padding: space[1] }, false: {} },
      p2: { true: { padding: space[2] }, false: {} },
      p3: { true: { padding: space[3] }, false: {} },
      p4: { true: { padding: space[4] }, false: {} },
      m1: { true: { margin: space[1] }, false: {} },
      m2: { true: { margin: space[2] }, false: {} },
      m3: { true: { margin: space[3] }, false: {} },
      m4: { true: { margin: space[4] }, false: {} },
    },
  },
});

const {
  base,
  flex,
  block,
  inline,
  hidden,
  gap1,
  gap2,
  gap3,
  gap4,
  row,
  column,
  wrap: wrapClass,
  center: centerClass,
  p1,
  p2,
  p3,
  p4,
  m1,
  m2,
  m3,
  m4,
} = box;

type BoxProps<T extends ElementType = 'div'> = {
  as?: T;
  display?: 'flex' | 'block' | 'inline' | 'hidden';
  gap?: 1 | 2 | 3 | 4;
  direction?: 'row' | 'column';
  wrap?: boolean;
  center?: boolean;
  padding?: 1 | 2 | 3 | 4;
  margin?: 1 | 2 | 3 | 4;
} & Omit<ComponentPropsWithoutRef<T>, 'as'>;

export function Box<T extends ElementType = 'div'>({
  as,
  display,
  gap,
  direction,
  wrap,
  center,
  padding,
  margin,
  className,
  ...props
}: BoxProps<T>) {
  const Component = as || 'div';

  return (
    <Component
      className={cx(
        base,
        display === 'flex' && flex,
        display === 'block' && block,
        display === 'inline' && inline,
        display === 'hidden' && hidden,
        gap === 1 && gap1,
        gap === 2 && gap2,
        gap === 3 && gap3,
        gap === 4 && gap4,
        direction === 'row' && row,
        direction === 'column' && column,
        wrap && wrapClass,
        center && centerClass,
        padding === 1 && p1,
        padding === 2 && p2,
        padding === 3 && p3,
        padding === 4 && p4,
        margin === 1 && m1,
        margin === 2 && m2,
        margin === 3 && m3,
        margin === 4 && m4,
        className,
      )}
      {...props}
    />
  );
}
```

### Using Box as different elements

```tsx
// Using as a div (default)
<Box display="flex" gap={2} padding={3}>
  Content
</Box>

// Using as a button
<Box as="button" display="flex" center padding={2}>
  Click me
</Box>

// Using as a link
<Box as="a" href="/about" display="inline" padding={1}>
  About
</Box>

// Using with custom component
<Box as={CustomComponent} display="block" padding={4}>
  Content
</Box>
```

## Compound components

### Card component with multiple parts

```tsx
import { variant } from 'typestyles';
// components/Card/Card.tsx
import { createTypeStyles, cx } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { color, space } from '../../tokens';
import { createContext, useContext, type ReactNode } from 'react';

const card = recipe({
  name: 'card',
  variants: {
    elevated: variant.boolean({ default: false }),
    interactive: variant.boolean({ default: false }),
  },
  styles: {
    base: {
      borderRadius: '8px',
      backgroundColor: color.surface,
      border: `1px solid ${color.border}`,
      overflow: 'hidden',
    },
    variants: {
      elevated: {
        true: {
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
        false: {},
      },
      interactive: {
        true: {
          cursor: 'pointer',
          transition: 'box-shadow 200ms ease',
          '&:hover': {
            boxShadow: '0 8px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        false: {},
      },
    },
  },
});

const { elevated, interactive } = card;

const cardHeader = recipe({
  name: 'card-header',
  styles: {
    base: {
      padding: `${space.md} ${space.lg}`,
      borderBottom: `1px solid ${color.border}`,
    },
  },
});

const cardBody = recipe({
  name: 'card-body',
  styles: {
    base: {
      padding: space.lg,
    },
  },
});

const cardFooter = recipe({
  name: 'card-footer',
  styles: {
    base: {
      padding: `${space.md} ${space.lg}`,
      borderTop: `1px solid ${color.border}`,
      backgroundColor: color.surfaceRaised,
    },
  },
});

// Context for sharing state between compound components
interface CardContextValue {
  isInteractive: boolean;
}

const CardContext = createContext<CardContextValue>({ isInteractive: false });

// Main Card component
interface CardProps {
  elevated?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export function Card({ elevated = false, interactive = false, onClick, children }: CardProps) {
  return (
    <CardContext.Provider value={{ isInteractive: interactive }}>
      <div
        className={cx(card(), elevated && elevated, interactive && interactive)}
        onClick={onClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
      >
        {children}
      </div>
    </CardContext.Provider>
  );
}

// Card.Header
Card.Header = function CardHeader({ children }: { children: ReactNode }) {
  return <div className={cardHeader()}>{children}</div>;
};

// Card.Body
Card.Body = function CardBody({ children }: { children: ReactNode }) {
  return <div className={cardBody()}>{children}</div>;
};

// Card.Footer
Card.Footer = function CardFooter({ children }: { children: ReactNode }) {
  return <div className={cardFooter()}>{children}</div>;
};
```

### Using compound components

```tsx
import { Card } from './components/Card';

function Example() {
  return (
    <Card elevated interactive onClick={() => console.log('Clicked!')}>
      <Card.Header>
        <h3>Card Title</h3>
      </Card.Header>
      <Card.Body>
        <p>Card content goes here...</p>
      </Card.Body>
      <Card.Footer>
        <button>Action</button>
      </Card.Footer>
    </Card>
  );
}
```

## Form components

### Input with validation states

```tsx
import { variant } from 'typestyles';
// components/Input/Input.tsx
import { createTypeStyles, cx } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { color, space } from '../../tokens';
import { forwardRef } from 'react';

const inputWrapper = recipe({
  name: 'input-wrapper',
  styles: {
    base: {
      display: 'flex',
      flexDirection: 'column',
      gap: space.sm,
    },
  },
});

const inputLabel = recipe({
  name: 'input-label',
  styles: {
    base: {
      fontSize: '14px',
      fontWeight: 500,
      color: color.text,
    },
  },
});

const inputHelper = recipe({
  name: 'input-helper',
  variants: {
    tone: variant.enum(['neutral', 'error', 'success'], { default: 'neutral' }),
  },
  styles: {
    base: {
      fontSize: '12px',
      color: color.textMuted,
    },
    variants: {
      tone: {
        neutral: {},
        error: { color: color.danger },
        success: { color: color.success },
      },
    },
  },
});

const input = recipe({
  name: 'input',
  variants: {
    validation: variant.enum(['none', 'error', 'success'], { default: 'none' }),
  },
  styles: {
    base: {
      width: '100%',
      padding: `${space.sm} ${space.md}`,
      borderRadius: '6px',
      border: `1px solid ${color.border}`,
      fontSize: '14px',
      lineHeight: '1.5',
      backgroundColor: color.surface,
      color: color.text,
      transition: 'border-color 150ms ease, box-shadow 150ms ease',

      '&:focus': {
        outline: 'none',
        borderColor: color.primary,
        boxShadow: `0 0 0 3px ${color.alpha(color.primary, 0.1)}`,
      },

      '&::placeholder': {
        color: color.textMuted,
      },

      '&:disabled': {
        backgroundColor: color.surfaceSunken,
        cursor: 'not-allowed',
      },
    },
    variants: {
      validation: {
        none: {},
        error: {
          borderColor: color.danger,
          '&:focus': {
            borderColor: color.danger,
            boxShadow: `0 0 0 3px ${color.alpha(color.danger, 0.1)}`,
          },
        },
        success: {
          borderColor: color.success,
          '&:focus': {
            borderColor: color.success,
            boxShadow: `0 0 0 3px ${color.alpha(color.success, 0.1)}`,
          },
        },
      },
    },
  },
});

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  label?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, success, label, helperText, className, ...props }, ref) => {
    const validation = error ? 'error' : success ? 'success' : 'none';
    const helperTone = error ? 'error' : success ? 'success' : 'neutral';

    return (
      <div className={inputWrapper()}>
        {label && <label className={inputLabel()}>{label}</label>}
        <input ref={ref} className={cx(input({ validation }), className)} {...props} />
        {helperText && <span className={inputHelper({ tone: helperTone })}>{helperText}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';
```

## Lists and grids

### Responsive grid component

```tsx
import { variant } from 'typestyles';
// components/Grid/Grid.tsx
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { space } from '../../tokens';
import type { ReactNode } from 'react';

const grid = recipe({
  name: 'grid',
  variants: {
    columns: variant.enum(['1', '2', '3', '4', '6', '12'], { default: '1' }),
    gap: variant.enum(['none', 'sm', 'md', 'lg'], { default: 'md' }),
  },
  styles: {
    base: { display: 'grid' },
    variants: {
      columns: {
        1: { gridTemplateColumns: 'repeat(1, 1fr)' },
        2: { gridTemplateColumns: 'repeat(2, 1fr)' },
        3: { gridTemplateColumns: 'repeat(3, 1fr)' },
        4: { gridTemplateColumns: 'repeat(4, 1fr)' },
        6: { gridTemplateColumns: 'repeat(6, 1fr)' },
        12: { gridTemplateColumns: 'repeat(12, 1fr)' },
      },
      gap: {
        none: { gap: 0 },
        sm: { gap: space.sm },
        md: { gap: space.md },
        lg: { gap: space.lg },
      },
    },
  },
});

interface GridProps {
  columns?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Grid({ columns = 1, gap = 'md', children }: GridProps) {
  return <div className={grid({ columns, gap })}>{children}</div>;
}
```

## Context and theming

### Theme provider

```tsx
// components/ThemeProvider/ThemeProvider.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import { darkTheme } from '../../tokens';

interface ThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('theme-dark');
  });

  const toggle = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('theme-dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('theme-dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      <div className={isDark ? darkTheme : ''}>{children}</div>
    </ThemeContext.Provider>
  );
}
```

### Using the theme

```tsx
// components/ThemeToggle/ThemeToggle.tsx
import { useTheme } from '../ThemeProvider';
import { Button } from '../Button';

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <Button variant="secondary" onClick={toggle}>
      {isDark ? '🌞 Light mode' : '🌙 Dark mode'}
    </Button>
  );
}
```

## Performance optimization

### Memoized class names

For components that re-render frequently, you can memoize class name generation:

```tsx
import { useMemo } from 'react';
import { button } from './button.styles';

function OptimizedButton({
  variant,
  size,
  disabled,
}: {
  variant: 'primary' | 'secondary';
  size: 'small' | 'medium' | 'large';
  disabled: boolean;
}) {
  const className = useMemo(
    () =>
      button({
        intent: variant,
        size,
        disabled: disabled ? 'on' : 'off',
        loading: 'off',
      }),
    [variant, size, disabled],
  );

  return <button className={className}>Click</button>;
}
```

However, this is usually unnecessary since the selector function is already very fast.

### Code splitting

```tsx
// Lazy load heavy components with their styles
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyChart />
    </Suspense>
  );
}
```

The styles in `HeavyChart` are only loaded when the component is imported.

## TypeScript best practices

### Export component prop types

```tsx
// components/Button/Button.tsx
export interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  // ...
}

export function Button(props: ButtonProps) {
  // ...
}
```

### Use strict prop types

```tsx
// Good - strict typing
type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  variant?: ButtonVariant;
}

// Avoid - too permissive
interface ButtonProps {
  variant?: string; // Too broad
}
```

## Summary

Key patterns for React + typestyles:

1. **Define styles at module level** - Never in components
2. **Use TypeScript for prop types** - Get autocomplete and error checking
3. **Compose variants** - Build flexible component APIs
4. **Consider polymorphism** - `as` prop for versatile components
5. **Leverage context** - Share state between compound components
6. **Memoize if needed** - But profile first, selector functions are fast
7. **Code split naturally** - Styles follow component boundaries
