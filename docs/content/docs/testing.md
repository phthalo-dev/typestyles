---
title: Testing
description: Testing strategies for typestyles components
---

Testing components styled with typestyles is straightforward. Since typestyles generates regular CSS class names, you can use standard testing tools without any special setup.

## Unit testing components

### Basic component testing

Since typestyles returns regular class names, test your components the same way you'd test any React/Vue/Svelte component:

```tsx
import { variant } from 'typestyles';
// Button.tsx
import type { ReactNode } from 'react';
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const button = recipe({
  name: 'button',
  variants: {
    primary: variant.boolean({ default: false }),
    large: variant.boolean({ default: false }),
  },
  styles: {
    base: { padding: '8px 16px' },
    variants: {
      primary: { true: { backgroundColor: '#0066ff' }, false: {} },
      large: { true: { fontSize: '18px' }, false: {} },
    },
  },
});

export function Button({
  variant,
  size,
  children,
}: {
  variant?: 'primary';
  size?: 'large';
  children: ReactNode;
}) {
  return (
    <button
      className={button({
        primary: variant === 'primary',
        large: size === 'large',
      })}
    >
      {children}
    </button>
  );
}

// Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with base class', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('button');
  });

  it('applies variant classes', () => {
    render(<Button variant="primary">Click me</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('button');
    expect(button).toHaveClass('button--primary');
  });

  it('applies multiple variants', () => {
    render(
      <Button variant="primary" size="large">
        Click me
      </Button>,
    );
    const button = screen.getByRole('button');

    expect(button).toHaveClass('button');
    expect(button).toHaveClass('button--primary');
    expect(button).toHaveClass('button--large');
  });
});
```

### Testing conditional classes

When variants are applied conditionally, test both states:

```tsx
import { variant } from 'typestyles';
import { cx } from 'typestyles';

const btn = recipe({
  name: 'button',
  variants: { loading: variant.boolean({ default: false }) },
  styles: {
    base: { padding: '8px 16px' },
    variants: { loading: { true: { cursor: 'wait', opacity: 0.8 }, false: {} } },
  },
});
const { loading: loadingClass } = btn;

function Button({ isLoading, children }: { isLoading?: boolean; children: React.ReactNode }) {
  return (
    <button className={cx(btn(), isLoading && loadingClass)}>
      {isLoading ? 'Loading...' : children}
    </button>
  );
}

// Button.test.tsx
it('applies loading state', () => {
  render(<Button isLoading>Click me</Button>);
  const button = screen.getByRole('button');

  expect(button).toHaveClass('button');
  expect(button).toHaveClass('button--loading');
});

it('does not apply loading class when not loading', () => {
  render(<Button>Click me</Button>);
  const button = screen.getByRole('button');

  expect(button).toHaveClass('button');
  expect(button).not.toHaveClass('button--loading');
});
```

## Testing with React Testing Library

### Prefer semantic queries

Instead of testing for specific class names, test for accessible properties when possible:

```tsx
// ✅ Good - test user-visible behavior
it('disables button when loading', () => {
  render(<Button isLoading>Click me</Button>);
  const button = screen.getByRole('button');

  expect(button).toBeDisabled();
  expect(button).toHaveTextContent('Loading...');
});

// Alternative if you need to verify styles
it('has loading styles', () => {
  render(<Button isLoading>Click me</Button>);
  const button = screen.getByRole('button');

  // Verify the class is applied (CSS testing is separate)
  expect(button).toHaveClass('button--loading');
});
```

### Testing style snapshots

If you want to ensure class names don't change unexpectedly, use snapshots:

```tsx
it('matches snapshot', () => {
  const { container } = render(<Button variant="primary">Click me</Button>);
  expect(container.firstChild).toMatchSnapshot();
  // Snapshot: <button class="button button--primary">Click me</button>
});
```

### Class naming mode

If you use [hashed, compact, or atomic class naming](/docs/class-naming) in tests, prefer a dedicated **`createTypeStyles({ mode, prefix, scopeId })`** (or **`createStyles({ mode, prefix, scopeId })`**) instance in that file so naming options never leak. Always call **`reset()`** (from `typestyles`) in `beforeEach` when tests inject CSS. Assertions that depend on exact class strings may need snapshots or prefix-based checks when `mode` is not `semantic`.

## CSS testing strategies

### Don't test CSS output directly

CSS output is an implementation detail. Test user-facing behavior instead:

```tsx
// ❌ Avoid - testing implementation details
it('has padding of 8px', () => {
  const { container } = render(<Button>Click</Button>);
  expect(container.firstChild).toHaveStyle({ padding: '8px 16px' });
});

// ✅ Better - test that the component renders correctly
it('renders as a button', () => {
  render(<Button>Click</Button>);
  expect(screen.getByRole('button')).toBeInTheDocument();
});

// ✅ Or use visual regression tests for styles
```

### Visual regression testing

For CSS testing, use visual regression tools like Chromatic, Percy, or Storybook's visual testing:

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'large',
    children: 'Large Button',
  },
};
```

Run visual regression tests in CI to catch unintended style changes.

## Testing tokens

### Token value tests

Test that tokens generate the expected CSS:

```ts
// tokens.test.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

describe('tokens', () => {
  it('creates color token references', () => {
    const color = tokens.create('color', {
      primary: '#0066ff',
    });

    expect(color.primary).toBe('var(--color-primary)');
  });

  it('creates spacing token references', () => {
    const space = tokens.create('space', {
      sm: '8px',
      md: '16px',
    });

    expect(space.sm).toBe('var(--space-sm)');
    expect(space.md).toBe('var(--space-md)');
  });
});
```

Note: Testing the actual CSS output requires DOM access (see integration tests below).

## Integration testing

### Testing with actual styles

For integration tests, you might want to verify that styles are actually applied:

```tsx
// setupTests.ts or jest.setup.ts
// Ensure styles are injected in test environment
import 'typestyles';

// For JSDOM-based tests, you may need to mock or stub some CSS APIs
Object.defineProperty(window, 'CSS', { value: { supports: () => true } });
```

### Testing computed styles

```tsx
import { render } from '@testing-library/react';
import { Button } from './Button';

it('applies correct background color', () => {
  const { getByRole } = render(<Button variant="primary">Click</Button>);
  const button = getByRole('button');

  // Get computed styles
  const styles = window.getComputedStyle(button);

  // Note: This may not work in JSDOM as it doesn't fully compute CSS
  // Better to use visual regression or E2E tests for this
  expect(styles.backgroundColor).toBeDefined();
});
```

⚠️ **Note**: JSDOM doesn't fully support CSS custom properties or computed styles. For testing actual styles, use a real browser with Playwright or Cypress.

## E2E testing

### Playwright example

```ts
// button.spec.ts
import { test, expect } from '@playwright/test';

test('button has correct styles', async ({ page }) => {
  await page.goto('/button-demo');

  const button = page.locator('button').first();

  // Check computed styles
  await expect(button).toHaveCSS('padding', '8px 16px');
  await expect(button).toHaveCSS('background-color', 'rgb(0, 102, 255)');

  // Check class names
  await expect(button).toHaveClass(/button/);
  await expect(button).toHaveClass(/button--primary/);
});

test('button hover state', async ({ page }) => {
  await page.goto('/button-demo');

  const button = page.locator('button').first();

  // Hover and check styles
  await button.hover();
  await expect(button).toHaveCSS('background-color', 'rgb(0, 82, 204)');
});
```

### Cypress example

```ts
// button.cy.ts
describe('Button', () => {
  it('has correct classes', () => {
    cy.visit('/button-demo');

    cy.get('button').first().should('have.class', 'button').and('have.class', 'button--primary');
  });

  it('has correct computed styles', () => {
    cy.visit('/button-demo');

    cy.get('button')
      .first()
      .should('have.css', 'padding', '8px 16px')
      .and('have.css', 'background-color', 'rgb(0, 102, 255)');
  });
});
```

## Testing SSR

When testing SSR-rendered components, ensure styles are collected:

```tsx
// ssr.test.ts
import { collectStyles } from 'typestyles/server';
import { renderToString } from 'react-dom/server';
import { App } from './App';

describe('SSR', () => {
  it('collects styles during render', () => {
    const { html, css } = collectStyles(() => renderToString(<App />));

    // HTML should contain class names
    expect(html).toContain('button');

    // CSS should contain the styles
    expect(css).toContain('.button');
    expect(css).toContain('padding');
  });

  it('includes CSS custom properties', () => {
    const { css } = collectStyles(() => renderToString(<App />));

    expect(css).toContain('--color-primary');
    expect(css).toContain('--space-md');
  });
});
```

## Snapshot testing class names

For library authors or design systems, you might want to snapshot the generated class names:

```ts
import { variant } from 'typestyles';
// styles.test.ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

describe('Button styles', () => {
  it('generates consistent class names', () => {
    const button = recipe({
      name: 'button',
      variants: { primary: variant.boolean({ default: false }) },
      styles: {
        base: { padding: '8px' },
        variants: { primary: { true: { color: 'blue' }, false: {} } },
      },
    });

    expect(button()).toMatchInlineSnapshot(`"button"`);
    expect(button({ primary: true })).toMatchInlineSnapshot(`"button button--primary"`);
  });
});
```

## Mocking typestyles (if needed)

In rare cases, you might want to mock typestyles:

```ts
// __mocks__/typestyles.ts
export const styles = {
  component: (namespace: string, definitions: Record<string, unknown>) => {
    const keys = Object.keys(definitions);
    return (options?: Record<string, boolean>) => {
      const parts = [namespace];
      if (options) {
        for (const [k, on] of Object.entries(options)) {
          if (on && k !== 'base') parts.push(`${namespace}--${k}`);
        }
      }
      return parts.join(' ');
    };
  },
};

export const tokens = {
  create: (namespace: string, values: Record<string, string>) => {
    return Object.fromEntries(
      Object.keys(values).map((key) => [key, `var(--${namespace}-${key})`]),
    );
  },
  use: (namespace: string) => {
    return new Proxy(
      {},
      {
        get: (_, key: string) => `var(--${namespace}-${key})`,
      },
    );
  },
  createTheme: (name: string) => `theme-${name}`,
};
```

However, mocking is usually unnecessary since typestyles has minimal side effects in tests.

## Testing design systems built on typestyles

If you're building a design system or component library — not just consuming one — see
[Testing Design Systems](/docs/testing-design-systems) for the `typestyles/testing` harness
utilities (`resetAll`, `onAfterReset`, `createTestHarness`) that coordinate resetting typestyles'
state with your own package-level registries (global styles, extended tokens, font faces).

## Best practices

1. **Test behavior, not classes** - Focus on what users see and interact with
2. **Use semantic queries** - `getByRole`, `getByText` over class name selectors
3. **Visual regression for styles** - Use Chromatic/Percy for CSS testing
4. **E2E for computed styles** - Use Playwright/Cypress to test actual rendering
5. **Snapshot sparingly** - Only snapshot class names if you're maintaining a library
6. **Don't test implementation** - CSS output is an implementation detail

## Example test suite

Here's a complete example test suite for a component:

```tsx
// Card.test.tsx
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('has correct ARIA role', () => {
    render(<Card>Content</Card>);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('applies elevated variant', () => {
    render(<Card elevated>Content</Card>);
    const card = screen.getByRole('article');

    expect(card).toHaveClass('card');
    expect(card).toHaveClass('card--elevated');
  });

  it('applies interactive variant', () => {
    render(<Card interactive>Content</Card>);
    const card = screen.getByRole('article');

    expect(card).toHaveClass('card');
    expect(card).toHaveClass('card--interactive');
  });

  it('can combine variants', () => {
    render(
      <Card elevated interactive>
        Content
      </Card>,
    );
    const card = screen.getByRole('article');

    expect(card).toHaveClass('card');
    expect(card).toHaveClass('card--elevated');
    expect(card).toHaveClass('card--interactive');
  });

  it('matches snapshot', () => {
    const { container } = render(
      <Card elevated>
        <h2>Title</h2>
        <p>Description</p>
      </Card>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

This approach tests:

- Component rendering
- Accessibility
- Variant application
- Combination of variants
- Snapshot for unexpected changes

All without worrying about the actual CSS values, which should be tested via visual regression or E2E tests.
