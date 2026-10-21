---
title: Animation Patterns
description: Common animation patterns and techniques with typestyles
---

TypeStyles supports CSS animations through the `keyframes` API. This guide covers common animation patterns and best practices.

## Basic animations

### Fade in

```ts
import { createTypeStyles, keyframes } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const fadeIn = keyframes.create('fadeIn', {
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const card = recipe({
  name: 'card',
  styles: {
    base: {
      animation: `${fadeIn} 300ms ease`,
    },
  },
});
```

### Slide in

```ts
const slideInRight = keyframes.create('slideInRight', {
  from: {
    opacity: 0,
    transform: 'translateX(20px)',
  },
  to: {
    opacity: 1,
    transform: 'translateX(0)',
  },
});

const slideInLeft = keyframes.create('slideInLeft', {
  from: {
    opacity: 0,
    transform: 'translateX(-20px)',
  },
  to: {
    opacity: 1,
    transform: 'translateX(0)',
  },
});

const slideInUp = keyframes.create('slideInUp', {
  from: {
    opacity: 0,
    transform: 'translateY(20px)',
  },
  to: {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

const slideInDown = keyframes.create('slideInDown', {
  from: {
    opacity: 0,
    transform: 'translateY(-20px)',
  },
  to: {
    opacity: 1,
    transform: 'translateY(0)',
  },
});
```

### Scale animations

```ts
const scaleIn = keyframes.create('scaleIn', {
  from: {
    opacity: 0,
    transform: 'scale(0.9)',
  },
  to: {
    opacity: 1,
    transform: 'scale(1)',
  },
});

const scaleOut = keyframes.create('scaleOut', {
  from: {
    opacity: 1,
    transform: 'scale(1)',
  },
  to: {
    opacity: 0,
    transform: 'scale(0.9)',
  },
});

const popIn = keyframes.create('popIn', {
  '0%': { transform: 'scale(0)' },
  '70%': { transform: 'scale(1.1)' },
  '100%': { transform: 'scale(1)' },
});
```

## Common UI animations

### Loading spinner

```ts
import { variant } from 'typestyles';
const spin = keyframes.create('spin', {
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

const spinner = recipe({
  name: 'spinner',
  variants: {
    sm: variant.boolean({ default: false }),
    lg: variant.boolean({ default: false }),
  },
  styles: {
    base: {
      display: 'inline-block',
      width: '24px',
      height: '24px',
      border: '3px solid #e5e7eb',
      borderTopColor: '#3b82f6',
      borderRadius: '50%',
      animation: `${spin} 800ms linear infinite`,
    },
    variants: {
      sm: {
        true: {
          width: '16px',
          height: '16px',
          borderWidth: '2px',
        },
        false: {},
      },
      lg: {
        true: {
          width: '32px',
          height: '32px',
          borderWidth: '4px',
        },
        false: {},
      },
    },
  },
});
```

### Pulse animation

```ts
const pulse = keyframes.create('pulse', {
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.5 },
});

const skeleton = recipe({
  name: 'skeleton',
  styles: {
    base: {
      backgroundColor: '#e5e7eb',
      borderRadius: '4px',
      animation: `${pulse} 2s ease-in-out infinite`,
    },
  },
});
```

### Shake animation (error state)

```ts
import { variant } from 'typestyles';
const shake = keyframes.create('shake', {
  '0%, 100%': { transform: 'translateX(0)' },
  '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
  '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
});

const input = recipe({ name: 'input', variants: { error: variant.boolean({ default: false }) }, styles: { base: { ... }, variants: { error: { true: {
    borderColor: '#ef4444',
    animation: `${shake} 500ms ease-in-out`,
  }, false: {} } } } });
```

### Bounce animation

```ts
const bounce = keyframes.create('bounce', {
  '0%, 100%': {
    transform: 'translateY(0)',
    animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
  },
  '50%': {
    transform: 'translateY(-25%)',
    animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
  },
});

const notification = recipe({
  name: 'notification',
  slots: ['badge'] as const,
  styles: {
    base: {
      badge: {
        animation: `${bounce} 1s infinite`,
      },
    },
  },
});
```

## Page transitions

### Page fade

```ts
const pageFadeIn = keyframes.create('pageFadeIn', {
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const pageLayout = recipe({
  name: 'page',
  slots: ['container'] as const,
  styles: {
    base: {
      container: {
        animation: `${pageFadeIn} 300ms ease`,
      },
    },
  },
});
```

### Staggered list items

```ts
// Individual item animation
const listItemFadeIn = keyframes.create('listItemFadeIn', {
  from: {
    opacity: 0,
    transform: 'translateY(10px)',
  },
  to: {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

// Delay classes for stagger effect
const list = recipe({
  name: 'list',
  slots: [
    'item',
    'itemDelay1',
    'itemDelay2',
    'itemDelay3',
    'itemDelay4',
    'itemDelay5',
  ] as const,
  styles: {
    base: {
      item: {
        opacity: 0,
        animation: `${listItemFadeIn} 300ms ease forwards`,
      },
      itemDelay1: { animationDelay: '50ms' },
      itemDelay2: { animationDelay: '100ms' },
      itemDelay3: { animationDelay: '150ms' },
      itemDelay4: { animationDelay: '200ms' },
      itemDelay5: { animationDelay: '250ms' },
    },
  },
});

// React usage with index
function List({ items }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li
          key={item.id}
          className={list(
            'item',
            index === 0 && 'itemDelay1',
            index === 1 && 'itemDelay2',
            index === 2 && 'itemDelay3',
            // ... or use a function to calculate delay
          )}
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

## Micro-interactions

### Button press

```ts
import { variant } from 'typestyles';
const buttonPress = keyframes.create('buttonPress', {
  '0%': { transform: 'scale(1)' },
  '50%': { transform: 'scale(0.95)' },
  '100%': { transform: 'scale(1)' },
});

const button = recipe({
  name: 'button',
  variants: { press: variant.boolean({ default: false }) },
  styles: {
    base: {
      transition: 'transform 100ms ease',

      '&:active': {
        transform: 'scale(0.95)',
      },
    },
    variants: {
      press: {
        true: {
          animation: `${buttonPress} 150ms ease`,
        },
        false: {},
      },
    },
  },
});
```

### Checkbox check

```ts
import { variant } from 'typestyles';
const checkmark = keyframes.create('checkmark', {
  '0%': {
    strokeDashoffset: 100,
  },
  '100%': {
    strokeDashoffset: 0,
  },
});

const checkbox = recipe({ name: 'checkbox', variants: { checkmark: variant.boolean({ default: false }), checked: variant.boolean({ default: false }) }, styles: { base: { ... }, variants: { checkmark: { true: {
    strokeDasharray: 100,
    strokeDashoffset: 100,
  }, false: {} }, checked: { true: {
    '& .checkmark': {
      animation: `${checkmark} 200ms ease forwards`,
    },
  }, false: {} } } } });
```

### Hover lift effect

```ts
import { variant } from 'typestyles';
const card = recipe({
  name: 'card',
  variants: { interactive: variant.boolean({ default: false }) },
  styles: {
    base: {
      transition: 'transform 200ms ease, box-shadow 200ms ease',
    },
    variants: {
      interactive: {
        true: {
          cursor: 'pointer',

          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
          },
        },
        false: {},
      },
    },
  },
});
```

## Complex animations

### Modal enter/exit

```ts
const modalBackdropFadeIn = keyframes.create('modalBackdropFadeIn', {
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const modalBackdropFadeOut = keyframes.create('modalBackdropFadeOut', {
  from: { opacity: 1 },
  to: { opacity: 0 },
});

const modalContentSlideIn = keyframes.create('modalContentSlideIn', {
  from: {
    opacity: 0,
    transform: 'scale(0.95) translateY(10px)',
  },
  to: {
    opacity: 1,
    transform: 'scale(1) translateY(0)',
  },
});

const modalContentSlideOut = keyframes.create('modalContentSlideOut', {
  from: {
    opacity: 1,
    transform: 'scale(1) translateY(0)',
  },
  to: {
    opacity: 0,
    transform: 'scale(0.95) translateY(10px)',
  },
});

const modal = recipe({
  name: 'modal',
  slots: [
    'backdrop',
    'backdropEnter',
    'backdropExit',
    'content',
    'contentEnter',
    'contentExit',
  ] as const,
  styles: {
    base: {
      backdrop: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
      backdropEnter: {
        animation: `${modalBackdropFadeIn} 200ms ease`,
      },
      backdropExit: {
        animation: `${modalBackdropFadeOut} 200ms ease forwards`,
      },
      content: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
      },
      contentEnter: {
        animation: `${modalContentSlideIn} 300ms ease`,
      },
      contentExit: {
        animation: `${modalContentSlideOut} 200ms ease forwards`,
      },
    },
  },
});
```

### Toast notifications

```ts
import { variant } from 'typestyles';
const toastSlideIn = keyframes.create('toastSlideIn', {
  from: {
    opacity: 0,
    transform: 'translateX(100%)',
  },
  to: {
    opacity: 1,
    transform: 'translateX(0)',
  },
});

const toastSlideOut = keyframes.create('toastSlideOut', {
  from: {
    opacity: 1,
    transform: 'translateX(0)',
  },
  to: {
    opacity: 0,
    transform: 'translateX(100%)',
  },
});

const toastProgress = keyframes.create('toastProgress', {
  from: { transform: 'scaleX(1)' },
  to: { transform: 'scaleX(0)' },
});

const toast = recipe({
  name: 'toast',
  variants: {
    enter: variant.boolean({ default: false }),
    exit: variant.boolean({ default: false }),
    progressBar: variant.boolean({ default: false }),
    success: variant.boolean({ default: false }),
    error: variant.boolean({ default: false }),
    info: variant.boolean({ default: false }),
  },
  styles: {
    base: {
      padding: '16px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    variants: {
      enter: {
        true: {
          animation: `${toastSlideIn} 300ms ease`,
        },
        false: {},
      },
      exit: {
        true: {
          animation: `${toastSlideOut} 300ms ease forwards`,
        },
        false: {},
      },
      progressBar: {
        true: {
          height: '3px',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          marginTop: '12px',
          transformOrigin: 'left',
          animation: `${toastProgress} 5000ms linear forwards`,
        },
        false: {},
      },
      success: {
        true: {
          backgroundColor: '#10b981',
          color: 'white',
        },
        false: {},
      },
      error: {
        true: {
          backgroundColor: '#ef4444',
          color: 'white',
        },
        false: {},
      },
      info: {
        true: {
          backgroundColor: '#3b82f6',
          color: 'white',
        },
        false: {},
      },
    },
  },
});
```

### Skeleton loading

```ts
import { variant } from 'typestyles';
const shimmer = keyframes.create('shimmer', {
  '0%': { backgroundPosition: '-200% 0' },
  '100%': { backgroundPosition: '200% 0' },
});

const skeleton = recipe({
  name: 'skeleton',
  variants: {
    animated: variant.boolean({ default: false }),
    text: variant.boolean({ default: false }),
    textLarge: variant.boolean({ default: false }),
    circle: variant.boolean({ default: false }),
    avatar: variant.boolean({ default: false }),
    card: variant.boolean({ default: false }),
  },
  styles: {
    base: {
      backgroundColor: '#e5e7eb',
      borderRadius: '4px',
    },
    variants: {
      animated: {
        true: {
          background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
          backgroundSize: '200% 100%',
          animation: `${shimmer} 1.5s infinite`,
        },
        false: {},
      },
      text: {
        true: {
          height: '1em',
          marginBottom: '0.5em',
        },
        false: {},
      },
      textLarge: {
        true: {
          height: '1.5em',
        },
        false: {},
      },
      circle: {
        true: {
          borderRadius: '50%',
        },
        false: {},
      },
      avatar: {
        true: {
          width: '40px',
          height: '40px',
        },
        false: {},
      },
      card: {
        true: {
          height: '200px',
        },
        false: {},
      },
    },
  },
});
```

## Scroll animations

### Infinite scroll indicator

```ts
import { variant } from 'typestyles';
const scrollIndicator = keyframes.create('scrollIndicator', {
  '0%, 100%': {
    opacity: 1,
    transform: 'translateY(0)',
  },
  '50%': {
    opacity: 0.5,
    transform: 'translateY(6px)',
  },
});

const scrollCue = recipe({
  name: 'scroll-cue',
  variants: {
    arrow: variant.boolean({ default: false }),
    arrowDelay1: variant.boolean({ default: false }),
    arrowDelay2: variant.boolean({ default: false }),
    arrowDelay3: variant.boolean({ default: false }),
  },
  styles: {
    base: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
    },
    variants: {
      arrow: {
        true: {
          animation: `${scrollIndicator} 1.5s ease-in-out infinite`,
        },
        false: {},
      },
      arrowDelay1: { true: { animationDelay: '0ms' }, false: {} },
      arrowDelay2: { true: { animationDelay: '150ms' }, false: {} },
      arrowDelay3: { true: { animationDelay: '300ms' }, false: {} },
    },
  },
});
```

## Best practices

### Performance

```ts
// ✅ Use transform and opacity for smooth animations
const goodAnimation = keyframes.create('goodAnimation', {
  from: {
    opacity: 0,
    transform: 'translateY(20px)', // GPU accelerated
  },
  to: {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

// ❌ Avoid animating layout properties
const badAnimation = keyframes.create('badAnimation', {
  from: {
    height: 0, // Triggers layout
    marginTop: 0, // Triggers layout
  },
  to: {
    height: '100px',
    marginTop: '20px',
  },
});
```

### Accessibility

```ts
// Respect reduced motion preference
const animated = recipe({
  name: 'animated',
  styles: {
    base: {
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
        transition: 'none',
      },
    },
  },
});
```

### Timing functions

```ts
// Standard curves
const ease = 'ease'; // Standard
const easeIn = 'ease-in'; // Accelerate
const easeOut = 'ease-out'; // Decelerate
const easeInOut = 'ease-in-out'; // Both

// Custom cubic-bezier for specific feels
const springy = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';
const smooth = 'cubic-bezier(0.4, 0, 0.2, 1)';
const enter = 'cubic-bezier(0, 0, 0.2, 1)';
const exit = 'cubic-bezier(0.4, 0, 1, 1)';

// Usage
const button = recipe({
  name: 'button',
  styles: {
    base: {
      transition: `transform 200ms ${springy}`,
    },
  },
});
```

### Duration guidelines

| Animation Type    | Duration  | Use Case                    |
| ----------------- | --------- | --------------------------- |
| Micro-interaction | 100-200ms | Button press, hover states  |
| Standard          | 200-300ms | Modals, dropdowns, tooltips |
| Complex           | 300-500ms | Page transitions, reveals   |
| Ambient           | 1-10s     | Loading states, skeletons   |

### Naming conventions

```ts
// Use descriptive names
const fadeIn = keyframes.create('fadeIn', { ... });
const slideUp = keyframes.create('slideUp', { ... });
const modalEnter = keyframes.create('modalEnter', { ... });
const modalExit = keyframes.create('modalExit', { ... });

// Include direction when applicable
const slideInRight = keyframes.create('slideInRight', { ... });
const slideInLeft = keyframes.create('slideInLeft', { ... });
const slideOutUp = keyframes.create('slideOutUp', { ... });
```

## Animation utilities

### Animation delay helper

```ts
function createStaggeredAnimation(
  baseName: string,
  itemCount: number,
  baseDelay: number,
): Record<string, string> {
  const delays: Record<string, string> = {};

  for (let i = 0; i < itemCount; i++) {
    delays[`delay${i + 1}`] = `${baseDelay * (i + 1)}ms`;
  }

  return delays;
}

// Usage in React
function StaggeredList({ items }) {
  const delayClass = (index: number) => {
    const delays = ['delay1', 'delay2', 'delay3', 'delay4', 'delay5'];
    return delays[index] || 'delay5';
  };

  return (
    <ul>
      {items.map((item, index) => (
        <li key={item.id} className={list('item', delayClass(index))}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}
```

### Animation presets

```ts
// animations/presets.ts
export const presets = {
  fade: {
    in: 'fadeIn 300ms ease',
    out: 'fadeOut 200ms ease',
  },
  slide: {
    up: 'slideUp 300ms ease',
    down: 'slideDown 300ms ease',
    left: 'slideLeft 300ms ease',
    right: 'slideRight 300ms ease',
  },
  scale: {
    in: 'scaleIn 200ms ease',
    out: 'scaleOut 200ms ease',
  },
  bounce: 'bounce 500ms ease',
  pulse: 'pulse 2s ease-in-out infinite',
  spin: 'spin 1s linear infinite',
  shake: 'shake 500ms ease-in-out',
} as const;

// Usage
const modal = recipe({
  name: 'modal',
  slots: ['enter'] as const,
  styles: {
    base: {
      enter: {
        animation: presets.fade.in,
      },
    },
  },
});
```

## Summary

1. **Use transform and opacity** - Best performance
2. **Respect reduced motion** - Accessibility first
3. **Keep animations purposeful** - Don't animate just because you can
4. **Use appropriate timing** - Match animation to importance
5. **Consider physics** - Natural motion feels better
6. **Test on real devices** - Performance varies
7. **Name descriptively** - Make intent clear
8. **Reuse animations** - Create a preset library
9. **Document timing** - Help other developers
10. **Test with users** - Get feedback on feel
