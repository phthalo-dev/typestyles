---
title: Color
description: Type-safe helpers for CSS color functions
---

The `color` API provides type-safe helpers for modern CSS color functions. These functions return plain CSS strings (no runtime color math), so they compose naturally with token references and other CSS values.

## Basic color functions

### rgb

Create `rgb()` colors with space-separated syntax:

```ts
import { color } from 'typestyles/color';

color.rgb(0, 102, 255); // "rgb(0 102 255)"
color.rgb(0, 102, 255, 0.5); // "rgb(0 102 255 / 0.5)"
```

### hsl

Create `hsl()` colors:

```ts
color.hsl(220, '100%', '50%'); // "hsl(220 100% 50%)"
color.hsl(220, '100%', '50%', 0.8); // "hsl(220 100% 50% / 0.8)"
```

### oklch

Create `oklch()` colors for perceptually uniform color spaces:

```ts
color.oklch(0.7, 0.15, 250); // "oklch(0.7 0.15 250)"
color.oklch(0.7, 0.15, 250, 0.5); // "oklch(0.7 0.15 250 / 0.5)"
```

### oklab

Create `oklab()` colors:

```ts
color.oklab(0.7, -0.1, -0.1); // "oklab(0.7 -0.1 -0.1)"
color.oklab(0.7, -0.1, -0.1, 0.5); // "oklab(0.7 -0.1 -0.1 / 0.5)"
```

### lab

Create `lab()` colors:

```ts
color.lab('50%', 40, -20); // "lab(50% 40 -20)"
```

### lch

Create `lch()` colors:

```ts
color.lch('50%', 80, 250); // "lch(50% 80 250)"
```

### hwb

Create `hwb()` colors:

```ts
color.hwb(220, '10%', '0%'); // "hwb(220 10% 0%)"
```

## Advanced color functions

### mix

Mix two colors using `color-mix()`:

```ts
// Mix red and blue equally (50/50)
color.mix('red', 'blue');
// "color-mix(in srgb, red, blue)"

// Mix 30% red with 70% blue
color.mix('red', 'blue', 30);
// "color-mix(in srgb, red 30%, blue)"

// Mix in a different color space
color.mix('red', 'blue', 50, 'oklch');
// "color-mix(in oklch, red 50%, blue)"
```

Works great with token references:

```ts
const theme = tokens.create('theme', {
  primary: '#0066ff',
});

// Create a lighter variant of your primary color
color.mix(theme.primary, 'white', 20);
// "color-mix(in srgb, var(--theme-primary) 20%, white)"
```

To darken or tweak a single source color's channels (same hue, different lightness), see [relative color syntax](#relative-color-syntax) instead of mixing with another color.

### alpha

Adjust the opacity of any color:

```ts
color.alpha('red', 0.5); // "color-mix(in srgb, red 50%, transparent)"
color.alpha(theme.primary, 0.2); // "color-mix(in srgb, var(--theme-primary) 20%, transparent)"
color.alpha('#0066ff', 0.8, 'oklch'); // "color-mix(in oklch, #0066ff 80%, transparent)"
```

This is a convenience wrapper around `color.mix()` that mixes any color with transparent.

To manipulate channels from a single source color (e.g. darker hover state), use [relative color syntax](#relative-color-syntax) instead.

### lightDark

Use the `light-dark()` CSS function for automatic light/dark mode switching:

```ts
color.lightDark('#111', '#eee');
// "light-dark(#111, #eee)"

// Works with tokens too
color.lightDark(theme.textLight, theme.textDark);
// "light-dark(var(--theme-textLight), var(--theme-textDark))"
```

Note: This requires the browser to support `light-dark()` and the element to have an appropriate `color-scheme` value.

## Relative color syntax

CSS relative color syntax lets you derive a new color from a source by reusing or modifying individual channels — for example, a darker hover state from one brand color without blending in a second color.

| Task                                              | API                                  |
| ------------------------------------------------- | ------------------------------------ |
| Blend two colors                                  | `color.mix()`                        |
| Change opacity only                               | `color.alpha()`                      |
| Familiar lighten / darken / saturate / rotate     | `color.lighten()` etc. (see below)   |
| Arbitrary channel expression                      | `color.oklchFrom()` / `color.from()` |
| Generate a full ramp from one accent (build time) | `typestyles/color-scale`             |

### from

```ts
color.from('oklch', theme.primary, 'l c h');
// "oklch(from var(--theme-primary) l c h)"

color.from('oklch', theme.primary, 'calc(l - 0.1) c h');
// darker variant — calc() inside components, channel keywords unchanged

color.from('rgb', '#0066ff', 'r g b', 0.5);
// "rgb(from #0066ff r g b / 0.5)"
```

Supported spaces: `rgb`, `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch`.

### rgbFrom and oklchFrom

Convenience wrappers for the most common cases:

```ts
rgbFrom(theme.primary, 'r', 'g', 'b', 0.5);
// "rgb(from var(--theme-primary) r g b / 0.5)"

oklchFrom(theme.primary, 'calc(l - 0.1)', 'c', 'h');
// "oklch(from var(--theme-primary) calc(l - 0.1) c h)"
```

### OKLCH manipulation

Sugar over `oklchFrom` for common single-source tweaks. All use OKLCH channel math — **not Sass-compatible** (perceptually different from HSL `lighten()` / `darken()`). Pass amounts in the same units as the source color's lightness (e.g. `'10%'` when the source uses percentages).

```ts
color.lighten(theme.primary, 0.1);
// "oklch(from var(--theme-primary) calc(l + 0.1) c h)"

color.darken(theme.primary, '10%');
// "oklch(from var(--theme-primary) calc(l - 10%) c h)"

color.saturate(theme.primary, 1.2);
// "oklch(from var(--theme-primary) l calc(c * 1.2) h)"

color.desaturate(theme.primary, 0.5);
// "oklch(from var(--theme-primary) l calc(c * 0.5) h)"

color.rotate(theme.primary, 30);
// "oklch(from var(--theme-primary) l c calc(h + 30))"

color.grayscale(theme.primary);
// "oklch(from var(--theme-primary) l 0 h)"
```

For arbitrary channel expressions, use `oklchFrom()` directly. For build-time palette generation or contrast checks, use `typestyles/color-scale`.

Values work in token custom properties as plain `<color>` strings — no `@property` changes needed.

## Using with tokens

All color functions accept token references since tokens are just CSS `var()` strings:

```ts
import { createTypeStyles } from 'typestyles';

const { style, recipe, tokens } = createTypeStyles({ scopeId: 'app' });
import { color as colorFn } from 'typestyles/color';

const themeColor = tokens.create('color', {
  primary: '#0066ff',
  secondary: '#6b7280',
});

const card = recipe({
  name: 'card',
  styles: {
    base: {
      backgroundColor: colorFn.mix(themeColor.primary, 'white', 10),
      borderColor: colorFn.alpha(themeColor.secondary, 0.3),
    },
  },
});
```

## Color spaces for mixing

When using `mix()` or `alpha()`, you can specify different color spaces:

- `'srgb'` (default) - Standard RGB, most common
- `'srgb-linear'` - Linear RGB
- `'display-p3'` - Wide gamut RGB
- `'a98-rgb'` - Wide gamut RGB
- `'prophoto-rgb'` - Very wide gamut
- `'rec2020'` - Ultra HD color space
- `'lab'` - CIE Lab color space
- `'oklab'` - Better Lab, perceptually uniform
- `'xyz'`, `'xyz-d50'`, `'xyz-d65'` - CIE XYZ
- `'hsl'` - HSL color space
- `'hwb'` - HWB color space
- `'lch'` - CIE LCH
- `'oklch'` - Better LCH, perceptually uniform

```ts
// Mix in perceptually uniform space for smoother gradients
color.mix('red', 'blue', 50, 'oklch');
color.alpha(theme.primary, 0.5, 'oklab');
```

## Why no runtime color math?

Unlike some libraries that parse and manipulate colors in JavaScript, these helpers simply generate CSS strings. This means:

- Zero runtime overhead
- Colors are computed by the browser (which can use hardware acceleration)
- Works naturally with CSS custom properties and tokens
- Respects user's color scheme and accessibility preferences
- Smaller bundle size

If you need programmatic color manipulation (e.g., generating a palette programmatically), do that at build time and use the resulting values with these helpers.
