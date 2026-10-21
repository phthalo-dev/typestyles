---
title: Keyframes
description: Create CSS animations with type-safe keyframe definitions
---

The `keyframes` API lets you define CSS animations with type-safe keyframe stops. Like styles and tokens, keyframes generate readable names and integrate seamlessly with the rest of your typestyles.

## Creating animations

Use `keyframes.create(name, stops)` to define an animation:

```ts
import { keyframes } from 'typestyles';

const fadeIn = keyframes.create('fadeIn', {
  from: { opacity: 0 },
  to: { opacity: 1 },
});
```

The function returns the animation name as a string, which you can use directly in your styles:

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });

const card = recipe({
  name: 'card',
  styles: {
    base: {
      animation: `${fadeIn} 300ms ease`,
    },
  },
});

// className={card()}
```

## Keyframe stops

You can use percentage values, `from` (0%), or `to` (100%):

```ts
const bounce = keyframes.create('bounce', {
  '0%': { transform: 'translateY(0)' },
  '40%': { transform: 'translateY(-30px)' },
  '60%': { transform: 'translateY(-15px)' },
  '100%': { transform: 'translateY(0)' },
});
```

## Using with styles

Reference keyframes in your style definitions using template literals:

```ts
import { createTypeStyles, keyframes } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const spin = keyframes.create('spin', {
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

const loader = recipe({
  name: 'loader',
  styles: {
    base: {
      width: '24px',
      height: '24px',
      border: '3px solid #e5e7eb',
      borderTopColor: '#0066ff',
      borderRadius: '50%',
      animation: `${spin} 800ms linear infinite`,
    },
  },
});
```

## Multiple properties

Each keyframe stop can contain multiple CSS properties:

```ts
const slideIn = keyframes.create('slideIn', {
  from: {
    opacity: 0,
    transform: 'translateX(-20px)',
  },
  to: {
    opacity: 1,
    transform: 'translateX(0)',
  },
});
```

## TypeScript support

Keyframe stops are fully typed, giving you autocomplete and error checking:

```ts
// TypeScript will catch this typo
const badAnimation = keyframes.create('bad', {
  frrom: { opacity: 0 }, // Error: Object literal may only specify known properties
  to: { opacity: 1 },
});
```

## Generated CSS

Keyframes generate standard CSS `@keyframes` rules with the exact name you provide:

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes bounce {
  0% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-30px);
  }
  60% {
    transform: translateY(-15px);
  }
  100% {
    transform: translateY(0);
  }
}
```

This makes debugging easy—you'll see `fadeIn` in DevTools, not a hashed string.

## Performance note

Keyframe CSS is injected once when the animation is first used, just like styles. Multiple components using the same animation share the same CSS rule.
