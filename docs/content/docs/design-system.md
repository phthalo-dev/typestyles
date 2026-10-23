---
title: Design System with Tokens
description: Building a comprehensive design system using typestyles tokens
---

A design system is more than just components—it's a complete set of standards for design and code. This guide shows how to build a token-based design system with typestyles.

**Reference implementation:** [`@examples/design-system`](https://github.com/phthalo-dev/typestyles/blob/main/examples/design-system/README.md) (tokens + recipes) and [`@examples/react-design-system`](https://github.com/phthalo-dev/typestyles/blob/main/examples/react-design-system/README.md) (React components). The [docs site kitchen sink](/docs/design-system/kitchen-sink) renders the same recipes.

## Token architecture

### Three-layer token system

```
Layer 1: Primitives (raw values)
    ↓
Layer 2: Semantics (meaningful tokens)
    ↓
Layer 3: Components (component-specific)
```

### Layer 1: Primitives

Raw values from your brand guidelines:

```ts
// tokens/primitives/colors.ts
export const primitiveColors = {
  // Brand palette
  brand: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Neutral palette
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // Functional colors
  red: { 50: '#fef2f2', 500: '#ef4444', 900: '#7f1d1d' },
  orange: { 50: '#fff7ed', 500: '#f97316', 900: '#7c2d12' },
  yellow: { 50: '#fefce8', 500: '#eab308', 900: '#713f12' },
  green: { 50: '#f0fdf4', 500: '#22c55e', 900: '#14532d' },
  blue: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
  purple: { 50: '#faf5ff', 500: '#a855f7', 900: '#581c87' },
} as const;
```

```ts
// tokens/primitives/spacing.ts
export const primitiveSpacing = {
  0: '0px',
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
  32: '128px',
  40: '160px',
  48: '192px',
  56: '224px',
  64: '256px',
} as const;
```

```ts
// tokens/primitives/typography.ts
export const primitiveTypography = {
  fontFamily: {
    sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'Cambria', 'serif'],
    mono: ['Menlo', 'Monaco', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem', // 72px
  },
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;
```

### Layer 2: Semantic tokens

Meaningful tokens that reference primitives:

```ts
// tokens/semantic/colors.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });
import { primitiveColors } from '../primitives/colors';

export const color = tokens.create('color', {
  // Brand
  brand: primitiveColors.brand[500],
  brandHover: primitiveColors.brand[600],
  brandActive: primitiveColors.brand[700],
  brandSubtle: primitiveColors.brand[100],
  brandMuted: primitiveColors.brand[200],

  // Text
  text: primitiveColors.gray[900],
  textMuted: primitiveColors.gray[500],
  textSubtle: primitiveColors.gray[400],
  textInverse: '#ffffff',
  textBrand: primitiveColors.brand[600],

  // Backgrounds
  background: primitiveColors.gray[50],
  surface: '#ffffff',
  surfaceRaised: primitiveColors.gray[100],
  surfaceSunken: primitiveColors.gray[50],
  surfaceOverlay: 'rgba(0, 0, 0, 0.5)',

  // Borders
  border: primitiveColors.gray[200],
  borderHover: primitiveColors.gray[300],
  borderActive: primitiveColors.brand[500],

  // Status
  success: primitiveColors.green[500],
  successSubtle: primitiveColors.green[50],
  warning: primitiveColors.orange[500],
  warningSubtle: primitiveColors.orange[50],
  danger: primitiveColors.red[500],
  dangerSubtle: primitiveColors.red[50],
  info: primitiveColors.blue[500],
  infoSubtle: primitiveColors.blue[50],
});
```

```ts
// tokens/semantic/spacing.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });
import { primitiveSpacing } from '../primitives/spacing';

export const space = tokens.create('space', {
  // Base scale
  ...primitiveSpacing,

  // Semantic aliases
  gap: primitiveSpacing[4],
  gapSm: primitiveSpacing[2],
  gapLg: primitiveSpacing[6],

  section: primitiveSpacing[16],
  sectionSm: primitiveSpacing[12],
  sectionLg: primitiveSpacing[24],

  component: primitiveSpacing[4],
  componentSm: primitiveSpacing[3],
  componentLg: primitiveSpacing[6],
});
```

Split typography into **separate token namespaces** so scale names like `normal` and `tight` do not collide across weight, line height, and tracking (a single `tokens.create('font', …)` object cannot contain duplicate keys).

```ts
// tokens/semantic/typography.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });
import { primitiveTypography } from '../primitives/typography';

export const font = tokens.create('font', {
  sans: primitiveTypography.fontFamily.sans.join(', '),
  serif: primitiveTypography.fontFamily.serif.join(', '),
  mono: primitiveTypography.fontFamily.mono.join(', '),

  xs: primitiveTypography.fontSize.xs,
  sm: primitiveTypography.fontSize.sm,
  base: primitiveTypography.fontSize.base,
  lg: primitiveTypography.fontSize.lg,
  xl: primitiveTypography.fontSize.xl,
  '2xl': primitiveTypography.fontSize['2xl'],
  '3xl': primitiveTypography.fontSize['3xl'],
  '4xl': primitiveTypography.fontSize['4xl'],

  body: primitiveTypography.fontSize.base,
  bodySm: primitiveTypography.fontSize.sm,
  bodyLg: primitiveTypography.fontSize.lg,
  headingSm: primitiveTypography.fontSize.xl,
  heading: primitiveTypography.fontSize['2xl'],
  headingLg: primitiveTypography.fontSize['3xl'],
  headingXl: primitiveTypography.fontSize['4xl'],
  display: primitiveTypography.fontSize['5xl'],
  displayLg: primitiveTypography.fontSize['6xl'],
});

export const fontWeight = tokens.create('font-weight', {
  normal: primitiveTypography.fontWeight.normal,
  medium: primitiveTypography.fontWeight.medium,
  semibold: primitiveTypography.fontWeight.semibold,
  bold: primitiveTypography.fontWeight.bold,
});

export const lineHeight = tokens.create('line-height', {
  none: primitiveTypography.lineHeight.none,
  tight: primitiveTypography.lineHeight.tight,
  snug: primitiveTypography.lineHeight.snug,
  normal: primitiveTypography.lineHeight.normal,
  relaxed: primitiveTypography.lineHeight.relaxed,
  loose: primitiveTypography.lineHeight.loose,
});

export const letterSpacing = tokens.create('letter-spacing', {
  tighter: primitiveTypography.letterSpacing.tighter,
  tight: primitiveTypography.letterSpacing.tight,
  normal: primitiveTypography.letterSpacing.normal,
  wide: primitiveTypography.letterSpacing.wide,
  wider: primitiveTypography.letterSpacing.wider,
  widest: primitiveTypography.letterSpacing.widest,
});
```

### Layer 3: Component tokens

Component-specific tokens:

```ts
// tokens/components/button.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });
import { color, space, font, fontWeight } from '../semantic';

export const button = tokens.create('button', {
  // Size
  heightSm: '32px',
  heightMd: '40px',
  heightLg: '48px',

  // Padding
  paddingHorizontalSm: space[3],
  paddingHorizontalMd: space[4],
  paddingHorizontalLg: space[6],
  paddingVerticalSm: space[2],
  paddingVerticalMd: space[2],
  paddingVerticalLg: space[3],

  // Border radius
  borderRadius: '6px',
  borderRadiusSm: '4px',
  borderRadiusLg: '8px',

  // Font
  fontSizeSm: font.sm,
  fontSizeMd: font.base,
  fontSizeLg: font.lg,
  fontWeight: fontWeight.medium,

  // Primary variant
  primaryBackground: color.brand,
  primaryBackgroundHover: color.brandHover,
  primaryBackgroundActive: color.brandActive,
  primaryText: color.textInverse,

  // Secondary variant
  secondaryBackground: color.surface,
  secondaryBackgroundHover: color.surfaceRaised,
  secondaryBorder: color.border,
  secondaryText: color.text,

  // Focus ring
  focusRingColor: color.brand,
  focusRingWidth: '2px',
  focusRingOffset: '2px',
});
```

```ts
// tokens/components/card.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });
import { color, space } from '../semantic';

export const card = tokens.create('card', {
  // Spacing
  padding: space[6],
  paddingSm: space[4],
  paddingLg: space[8],

  // Visual
  borderRadius: '8px',
  borderWidth: '1px',
  borderColor: color.border,
  background: color.surface,

  // Shadow
  shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  shadowHover: '0 4px 6px rgba(0, 0, 0, 0.1)',

  // Header
  headerPadding: space[4],
  headerBorderColor: color.border,

  // Body
  bodyPadding: space[6],

  // Footer
  footerPadding: space[4],
  footerBackground: color.surfaceRaised,
  footerBorderColor: color.border,
});
```

## Token documentation

### Token reference table

Create documentation for your tokens:

```md
# Color Tokens

## Brand

| Token               | Value   | Usage                  |
| ------------------- | ------- | ---------------------- |
| `color.brand`       | #3b82f6 | Primary buttons, links |
| `color.brandHover`  | #2563eb | Hover states           |
| `color.brandSubtle` | #dbeafe | Light backgrounds      |

## Text

| Token               | Value   | Usage                    |
| ------------------- | ------- | ------------------------ |
| `color.text`        | #111827 | Primary text             |
| `color.textMuted`   | #6b7280 | Secondary text           |
| `color.textInverse` | #ffffff | Text on dark backgrounds |

## Status

| Token           | Value   | Usage          |
| --------------- | ------- | -------------- |
| `color.success` | #22c55e | Success states |
| `color.danger`  | #ef4444 | Error states   |
```

### Token usage examples

```ts
// Always use tokens, never hardcode values

// ❌ Bad
const button = recipe({
  name: 'button',
  styles: {
    base: {
      padding: '8px 16px', // Hardcoded
      backgroundColor: '#3b82f6', // Hardcoded
    },
  },
});

// ✅ Good
const button = recipe({
  name: 'button',
  styles: {
    base: {
      padding: `${buttonToken.paddingHorizontalMd} ${buttonToken.paddingVerticalMd}`,
      backgroundColor: buttonToken.primaryBackground,
    },
  },
});
```

## Theme variations

### Dark theme

```ts
// tokens/themes/dark.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });
import { primitiveColors } from '../primitives/colors';

export const darkTheme = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: {
      brand: primitiveColors.brand[400],
      brandHover: primitiveColors.brand[300],
      brandActive: primitiveColors.brand[500],

      text: primitiveColors.gray[100],
      textMuted: primitiveColors.gray[400],
      textSubtle: primitiveColors.gray[500],
      textInverse: primitiveColors.gray[900],

      background: primitiveColors.gray[900],
      surface: primitiveColors.gray[800],
      surfaceRaised: primitiveColors.gray[700],
      surfaceSunken: primitiveColors.gray[950],

      border: primitiveColors.gray[700],
      borderHover: primitiveColors.gray[600],
    },
  },
});
```

### High contrast theme

```ts
// tokens/themes/high-contrast.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const highContrastTheme = tokens.createTheme({
  name: 'high-contrast',
  tokens: {
    color: {
      text: '#000000',
      background: '#ffffff',
      border: '#000000',
      brand: '#0000ff',

      success: '#006600',
      warning: '#cc6600',
      danger: '#cc0000',
    },
  },
});
```

## Token naming conventions

### Consistent naming

```
Category + Property + Variant + State

Examples:
- color.text (category.property)
- color.textMuted (category.property.variant)
- color.textMutedHover (category.property.variant.state)
- button.primaryBackground (category.property)
- button.primaryBackgroundHover (category.property.state)
```

### Property modifiers

```
Base: color.brand
Subtle: color.brandSubtle
Muted: color.brandMuted
Hover: color.brandHover
Active: color.brandActive
Disabled: color.brandDisabled
Inverse: color.brandInverse
```

## Token validation

### Type checking

```ts
// Ensure all required tokens exist
interface RequiredTokens {
  brand: string;
  text: string;
  background: string;
  // ... etc
}

// TypeScript will catch missing tokens
const requiredTokens: RequiredTokens = {
  brand: color.brand,
  text: color.text,
  background: color.background,
};
```

### Contrast checking

```ts
// WCAG contrast ratio helper
function getContrastRatio(color1: string, color2: string): number {
  // Implementation
}

// Ensure accessible contrast
const contrastRatio = getContrastRatio(color.text, color.background);
if (contrastRatio < 4.5) {
  console.warn('Text contrast does not meet WCAG AA standards');
}
```

## Token distribution

### NPM package structure

```
@myorg/design-tokens/
├── package.json
├── tokens/
│   ├── primitives/
│   ├── semantic/
│   ├── components/
│   └── themes/
└── dist/
    ├── tokens.css      # CSS custom properties
    ├── tokens.json     # JSON format
    └── tokens.scss     # SCSS variables
```

### Multiple formats

TypeStyles **does not** ship a separate “token compiler” — your `tokens.create` calls emit **CSS custom properties** when the module runs (or when an extraction build evaluates your entry). For **additional** artifacts (JSON for Figma pipelines, SCSS for legacy apps), treat primitives as the source of truth in TypeScript and add your own small exporters.

**CSS (what TypeStyles already produces)**

- **Diagnostics / tests** — `getRegisteredCss()` from `typestyles` after importing your token modules.
- **SSR** — `collectStyles()` from `typestyles/server` around `renderToString`, then inject the returned CSS string.
- **Production bundle** — `@typestyles/vite`, `@typestyles/rollup`, or `@typestyles/next` with an [extraction entry](/docs/zero-runtime) so a static `.css` file includes `:root` and theme rules.

**JSON / SCSS**

- Export plain objects from `tokens/primitives/*.ts` and `JSON.stringify` them, or generate SCSS variables from those objects in a script. Keep TypeStyles as the runtime source of truth for `var(--…)` values that components actually use.

## Token governance

### Change process

1. **Request**: Designer/developer requests a new token
2. **Review**: Design system team reviews for necessity
3. **Naming**: Follow naming conventions
4. **Documentation**: Update token reference
5. **Communication**: Announce breaking changes
6. **Deprecation**: Mark old tokens as deprecated before removal

### Versioning

```json
{
  "name": "@myorg/design-tokens",
  "version": "2.1.0",
  "description": "Design tokens for the Acme design system"
}
```

Breaking changes (new major version):

- Removing tokens
- Renaming tokens
- Changing token values significantly

Non-breaking changes (new minor/patch):

- Adding new tokens
- Small value adjustments
- Adding new themes

## Best practices summary

1. **Never hardcode values** - Always use tokens
2. **Use semantic names** - `color.text` not `color.gray900`
3. **Layer your tokens** - Primitives → Semantics → Components
4. **Document everything** - Maintain token reference
5. **Test contrast** - Ensure accessibility compliance
6. **Version carefully** - Follow semantic versioning
7. **Support multiple themes** - Light, dark, high-contrast
8. **Generate multiple formats** - CSS, SCSS, JSON for different consumers
9. **Govern changes** - Have a process for token modifications
10. **Provide examples** - Show developers how to use tokens
