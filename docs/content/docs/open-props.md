---
title: Open Props
description: Type-safe access to Open Props CSS custom properties
---

[Open Props](https://open-props.style/) is a collection of expertly crafted CSS design tokens. This package provides type-safe access to all Open Props tokens directly in TypeScript.

## Installation

```bash
npm install @typestyles/open-props
```

## Quick Start

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { sizes, radius, color, font } from '@typestyles/open-props';

const card = recipe({
  name: 'card',
  slots: ['padding', 'borderRadius', 'backgroundColor', 'fontFamily'] as const,
  styles: {
    base: {
      padding: sizes['4'],
      borderRadius: radius['3'],
      backgroundColor: color['gray-2'],
      fontFamily: font['sans'],
    },
  },
});
```

All tokens return `var(--token-name)` references that work seamlessly with typestyles.

## Available Tokens

### Sizes

Spacing and sizing tokens for layout:

```ts
sizes['0']; // var(--size-0)
sizes['1']; // var(--size-1)
sizes['2']; // var(--size-2)
sizes['3']; // var(--size-3)
sizes['4']; // var(--size-4)
// ... up to sizes['10']

// Fluid sizes
sizes['fluid-1']; // var(--size-fluid-1)
sizes['fluid-2']; // var(--size-fluid-2)
sizes['fluid-3']; // var(--size-fluid-3)

// Content sizes
sizes['content-1']; // 20ch
sizes['content-2']; // 45ch
sizes['content-3']; // 60ch
```

### Radius

Border radius tokens:

```ts
radius['0']; // var(--radius-0)
radius['1']; // var(--radius-1)
radius['2']; // var(--radius-2)
radius['3']; // var(--radius-3)
radius['4']; // var(--radius-4)
// ... up to radius['30']

// Special values
radius['round']; // 100%
radius['pill']; // 9999px
```

### Colors

19 color scales with 13 shades each (0-12):

```ts
// Access by color name and shade
color['gray-0']; // var(--color-gray-0)
color['gray-5']; // var(--color-gray-5)
color['gray-10']; // var(--color-gray-10)

color['indigo-0']; // var(--color-indigo-0)
color['blue-6']; // var(--color-blue-6)
color['red-4']; // var(--color-red-4)
```

Available color palettes:

- `gray`, `stone`, `red`, `pink`, `purple`, `violet`, `indigo`, `blue`
- `cyan`, `teal`, `green`, `lime`, `yellow`, `orange`
- `choco`, `brown`, `sand`, `camo`, `jungle`

### Typography

```ts
// Font sizes
fontSize['00']; // 0.5rem
fontSize['0']; // 0.75rem
fontSize['1']; // 1rem
fontSize['2']; // 1.1rem
// ... up to fontSize['8']

// Fluid font sizes
fontSize['fluid-0']; // clamp(0.75rem, 2vw, 1rem)
fontSize['fluid-1']; // clamp(1rem, 4vw, 1.5rem)
fontSize['fluid-2']; // clamp(1.5rem, 6vw, 2.5rem)
fontSize['fluid-3']; // clamp(2rem, 9vw, 3.5rem)

// Font weights
fontWeight['1']; // 100
fontWeight['4']; // 400
fontWeight['7']; // 700
fontWeight['9']; // 900

// Letter spacing
fontLetterspacing['0']; // -.05em
fontLetterspacing['4']; // .150em

// Line height
fontLineheight['00']; // .95
fontLineheight['1']; // 1.25
fontLineheight['3']; // 1.5

// Font families
font['sans']; // var(--font-sans)
font['serif']; // var(--font-serif)
font['mono']; // var(--font-mono)
font['system-ui']; // var(--font-system-ui)
font['humanist']; // var(--font-humanist)
// ... and more
```

### Shadows

```ts
shadow['1']; // var(--shadow-1)
shadow['2']; // var(--shadow-2)
shadow['3']; // var(--shadow-3)
shadow['4']; // var(--shadow-4)
shadow['5']; // var(--shadow-5)
shadow['6']; // var(--shadow-6)

// Inner shadows
shadow['inner-1']; // var(--shadow-inner-1)
shadow['inner-2']; // var(--shadow-inner-2)
shadow['inner-3']; // var(--shadow-inner-3)
shadow['inner-4']; // var(--shadow-inner-4)
shadow['inner-5']; // var(--shadow-inner-5)
```

### Gradients

30 handcrafted gradients:

```ts
gradient['1']; // var(--gradient-1)
gradient['10']; // var(--gradient-10)
gradient['20']; // var(--gradient-20)
gradient['30']; // var(--gradient-30)
```

### Easing

CSS easing functions:

```ts
easing['1']; // var(--ease-1)
easing['2']; // var(--ease-2)
easing['3']; // var(--ease-3)

// Directional
easing['in-1']; // var(--ease-in-1)
easing['out-1']; // var(--ease-out-1)
easing['in-out-1']; // var(--ease-in-out-1)

// Elastic
easing['elastic-out-1']; // var(--ease-elastic-out-1)
easing['elastic-in-1']; // var(--ease-elastic-in-1)

// Bounce
easing['bounce-1']; // var(--ease-bounce-1)
```

### Animations

Pre-defined animation names:

```ts
animation['fade-in']; // var(--animation-fade-in)
animation['slide-in-up']; // var(--animation-slide-in-up)
animation['scale-in']; // var(--animation-scale-in)
animation['spin']; // var(--animation-spin)
animation['pulse']; // var(--animation-pulse)
// ... and more
```

### Media Queries

Media query conditions for responsive design:

```ts
media['motion']; // var(--media-motion)
media['motionReduce']; // var(--media-motionReduce)
media['dark']; // var(--media-dark)
media['light']; // var(--media-light)
media['landscape']; // var(--media-landscape)
media['portrait']; // var(--media-portrait)

// Breakpoints
media['sm']; // var(--media-sm)  - 24rem
media['md']; // var(--media-md)  - 28rem
media['lg']; // var(--media-lg)  - 32rem
media['xl']; // var(--media-xl)  - 36rem
media['2xl']; // var(--media-2xl) - 42rem
// ... up to media['9xl']
```

### Other Tokens

```ts
// Aspect ratios
ratio['square']; // var(--ratio-square)
ratio['landscape']; // var(--ratio-landscape)
ratio['portrait']; // var(--ratio-portrait)
ratio['widescreen']; // var(--ratio-widescreen)
ratio['golden']; // var(--ratio-golden)

// Z-index layers
zIndex['1']; // var(--zindex-1)
zIndex['max']; // var(--zindex-max)

// Durations
duration['0']; // 0s
duration['1']; // 0.05s
duration['2']; // 0.1s
duration['3']; // 0.2s
duration['4']; // 0.4s
duration['5']; // 0.8s

// Border widths
borderSize['0']; // 0
borderSize['1']; // 1px
borderSize['2']; // 2px
// ... and more
```

### Brand Colors

Brand-specific colors for common services:

```ts
brand['facebook']; // var(--brand-facebook)
brand['twitter']; // var(--brand-twitter)
brand['instagram']; // var(--brand-instagram)
brand['youtube']; // var(--brand-youtube)
brand['spotify']; // var(--brand-spotify)
brand['discord']; // var(--brand-discord)
// ... and more
```

### Palette

Dynamic OKLCH palette for creating custom color schemes:

```ts
palette['1']; // var(--palette-1)
palette['8']; // var(--palette-8)
palette['16']; // var(--palette-16)
```

### Masks

SVG mask presets:

```ts
masksEdges['0']; // var(--masks-edge-0)
masksEdges['4']; // var(--masks-edge-4)

masksCornerCuts['1']; // var(--masks-corner-cuts-1)
masksCornerCuts['6']; // var(--masks-corner-cuts-6)
```

## Using with Styles

All tokens work seamlessly with typestyles:

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe } = createTypeStyles({ scopeId: 'app' });
import { sizes, radius, color, shadow, fontSize } from '@typestyles/open-props';

const button = recipe({
  name: 'button',
  slots: [
    'display',
    'alignItems',
    'justifyContent',
    'padding',
    'borderRadius',
    'fontSize',
    'backgroundColor',
    'color',
    'boxShadow',
    'transition',
    '&:hover',
  ] as const,
  styles: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${sizes['2']} ${sizes['4']}`,
      borderRadius: radius['2'],
      fontSize: fontSize['2'],
      backgroundColor: color['blue-6'],
      color: color['blue-0'],
      boxShadow: shadow['2'],
      transition: 'all 200ms var(--ease-2)',
      '&:hover': {
        boxShadow: shadow['3'],
        backgroundColor: color['blue-5'],
      },
    },
  },
});
```

## Combining with Custom Tokens

You can mix Open Props with your own custom tokens:

```ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });
import { color, sizes } from '@typestyles/open-props';

// Your custom tokens
const brand = tokens.create('brand', {
  primary: '#ff6b6b',
  accent: '#4ecdc4',
});

// Use both together
const container = recipe({
  name: 'container',
  slots: ['backgroundColor', 'padding', 'borderColor'] as const,
  styles: {
    base: {
      backgroundColor: brand.primary,
      padding: sizes['4'],
      borderColor: color['gray-3'],
    },
  },
});
```
