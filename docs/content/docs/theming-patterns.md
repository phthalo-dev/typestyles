---
title: Theming Patterns
description: Light/dark mode, multi-brand theming, and advanced theme strategies
---

TypeStyles uses CSS custom properties for theming, making it flexible and powerful. This guide covers common theming patterns.

**New here?** Start with [End-to-end theming](/docs/theming-end-to-end) — a walkthrough covering `declare` / `create`, `createTheme({ tokens })`, `override` + `selectorPrefix`, and plain CSS.

Coming from **StyleX**, **Panda**, **vanilla-extract**, or **Stitches**? Start with the [migration cheat sheet](/docs/migration#coming-from-cheat-sheet).

## Theme surfaces

`tokens.createTheme({ name, … })` registers a **theme surface**: a stable class name `theme-{name}` whose custom properties override token values for that subtree. Everything is one **named** object (no positional `name` / `config` / `options` arguments).

Defaults usually live on `:root` via `tokens.create`. Theme `tokens` / `colorMode` only need **deltas** — unchanged paths inherit. See [End-to-end theming](/docs/theming-end-to-end).

### What the fields mean

| Field            | Plain language                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| **`name`**       | Theme id → class `theme-{name}` (with `scopeId` prefix when set).                                        |
| **`tokens`**     | Per-namespace overrides on `.theme-{name}` — use `{ light, dark }` leaves for CSS `light-dark()`.        |
| **`modes`**      | Extra conditional layers: `{ id, overrides, when }` (see `tokens.when.*`, `tokens.colorMode.*` presets). |
| **`components`** | Recipe overrides for `recipe()` namespaces, scoped to `.theme-{name}` (see below).                       |
| **`replace`**    | Default `true`: reusing `name` replaces the previous theme registration.                                 |

```ts
tokens.createTheme({
  name: 'app',
  tokens: {
    color: {
      accent: { default: '#0066ff' },
      text: { light: '#111827', dark: '#e5e7eb' },
      surface: { light: '#ffffff', dark: '#0f172a' },
    },
    brand: { glow: { default: '#0066ff' } },
  },
});
```

- **Inline `{ light, dark }` leaves** — On scalar token paths in `tokens` or `modes[].overrides`, TypeStyles compiles color-compatible values to CSS `light-dark()`.

Overrides use the same nested shape as `tokens.create` (nested keys become hyphenated `--namespace-key` variables).

The return value is a **`Theme`**: `{ className, name, source, tokens?, override }`, with `String(theme)` and template literals resolving to `className`. In React, pass **`theme.className`** (or `String(theme)`) to `className` props.

### Deriving child themes (`override`)

Use **`tokens.createTheme`** for the **root** theme (the design-system default that defines the token tree). Use **`theme.override`** for **child** themes — app brands, team packs, or theme-switcher entries that only patch values:

```ts
const values = {
  color: {
    brand: { light: 'red', dark: 'green' },
    accent: { default: '#111' },
  },
} as const;

export const defaultTheme = tokens.createTheme({
  name: 'default',
  tokens: values,
});

// Typed against defaultTheme's token tree — unknown keys are errors
export const brandTheme = defaultTheme.override({
  name: 'brand',
  tokens: {
    color: { brand: { light: 'blue', dark: 'navy' } },
  },
});
```

`override` deep-merges onto the parent’s `source` snapshot, emits a new `.theme-{name}` class, and returns another `Theme` (so chaining works). Apply one class for a single app theme, or keep several classes in the stylesheet for side-by-side brands / a theme switcher.

**Closed token tree:** patches may only touch namespaces and paths that already exist on the root theme. New keys belong on the root `createTheme` (or on `:root` via `tokens.create`), not in `override`.

**Object literals vs variables:** TypeScript’s excess-property checks apply to fresh object literals. If you build a patch in a variable, use `satisfies`:

```ts
import type { DeepPartialThemeTokens } from 'typestyles';

const patch = {
  color: { brand: 'purple' },
} satisfies DeepPartialThemeTokens<typeof light>;

defaultTheme.override({ name: 'purple', tokens: patch });
```

### Token refs on the theme surface

`tokens.createTheme()` attaches **`theme.tokens`**: the same ref tree shape as `tokens.use(namespace)` / `tokens.ensureNamespace()`.

- **`theme.tokens.use('color')`** — same as `tokens.use('color')` for namespaces created with `tokens.create` / `tokens.declare`.
- **`theme.tokens.brand`** — shortcuts for namespaces registered via **`config.tokens`** on the root theme (and re-registered when a child `override` merges those namespaces).

`tokens` registers each namespace with `tokens.create`, merges values into the theme’s `base` overrides, and emits CSS on `.theme-{name}`. Use refs in component code or in theme **`components`** factories:

```ts
const brand = tokens.createTheme({
  name: 'brand',
  tokens: {
    brand: {
      glow: { default: '#0066ff' },
    },
  },
  components: {
    button: ({ tokens: t }) => ({
      base: { boxShadow: `0 0 12px ${t.brand.glow.default}` },
    }),
  },
});

// Elsewhere: brand.tokens!.brand.glow.default → var(--…-brand-glow-default)
```

For one-off namespaces outside a theme, **`tokens.ensureNamespace(name, values)`** registers when missing and returns the same ref tree.

For **dark only when the OS prefers dark**, use `tokens.createDarkMode(name, overrides)` or `modes: tokens.colorMode.mediaOnly({ dark: … })`.

See [Tokens](/docs/tokens) for the core API. The `THEME.md` file at the repository root documents conditions, presets, and cascade ordering in full.

Try a minimal light/dark surface in the live example below — toggle **Dark** to see the theme class, token overrides, and emitted CSS change together.

<!-- doc-live-demo id="theming-light-dark" -->

## Generating a theme from one accent color

The design-system example ships `createColorTheme` — a semantic mapper that turns a single
hex accent into light and dark `DesignColorValues` using the core `typestyles/color-scale`
math (OKLCH ramps + WCAG contrast checks).

```ts
import { createColorTheme } from '@examples/design-system';

const { light, dark } = createColorTheme({
  accent: '#0064E0',
  neutralStyle: 'neutral', // 'neutral' | 'cool' | 'warm'
  contrast: 'standard', // 'standard' | 'high'
});

// Plug into createDesignTheme / tokens.createTheme mode overrides:
export const brandTheme = createDesignTheme({
  name: 'brand',
  light: { color: light, syntax: defaultLightSyntaxValues },
  dark: { color: dark, syntax: defaultDarkSyntaxValues },
});
```

**Layering:** `typestyles/color-scale` is vocabulary-agnostic (`parseColor`, `generateRamp`,
`contrastRatio`). `createColorTheme` lives in `examples/design-system` and decides which ramp
step maps to `background.app`, `accent.default`, and so on. Derived tokens such as
`accent.subtle` and `text.disabled` still come from the existing `color-mix()` machinery in
`tokens/index.ts` — `createColorTheme` only fills the base semantic slots.

**Core API** (usable without the design-system vocabulary):

```ts
import { parseColor, generateRamp, contrastRatio } from 'typestyles/color-scale';

const accent = parseColor('#0064E0'); // { l, c, h } in OKLCH units
const ramp = generateRamp({ hue: accent.h, chroma: accent.c }); // 10-step OKLCH strings
contrastRatio('#000', '#fff'); // 21
```

Dev-mode contrast warnings (`console.warn`) fire when generated pairs fall below 4.5:1
(standard) or 7:1 (high); they never throw.

## Generating type, motion, and radius scales

The `typestyles/token-scale` subpath does for numeric ladders what `color-scale` does for
color: it turns 2-3 numbers into a whole scale, so a theme author writes `{ base, ratio }`
instead of hand-picking every step. Like `color-scale`, it is vocabulary-agnostic — the
generators return plain numbers and never see names like `fontSize`, `radius`, or `fast`;
zipping your own step names onto the output is your design system's concern.

Reach for each generator by shape:

- **`generateGeometricScale`** — multiplicative ladders where each step is a ratio of the
  last (font sizes, spacing that grows faster at the top). `steps` are signed integer
  offsets from the base: `value(offset) = base * ratio ** offset`.
- **`generateLinearScale`** — even, grid-based ladders (radius steps on a 4px grid).
  `steps` are ordinal multipliers: `value(step) = base * step * multiplier`.
- **`expandDurationBand`** — one motion anchor expanded into a `{ min, base, max }` band:
  `min = base * ratio`, `max = base / ratio`, rounded to the nearest 5ms by default so
  computed bands look hand-picked instead of visibly computed (no `93.75ms`).

```ts
import {
  generateGeometricScale,
  generateLinearScale,
  expandDurationBand,
} from 'typestyles/token-scale';

// Font-size ladder: major third anchored at 16 (offset 0 is always exactly base).
generateGeometricScale({ base: 16, ratio: 1.25, steps: [-2, -1, 0, 1, 2, 3, 4] });
// → [10, 13, 16, 20, 25, 31, 39]

// Radius ladder on a 4px grid.
generateLinearScale({ base: 4, multiplier: 1, steps: [1, 2, 3, 4, 6] });
// → [4, 8, 12, 16, 24]

// One duration anchor → a min/base/max band (call once per named anchor).
expandDurationBand({ base: 150, ratio: 0.625 });
// → { min: 95, base: 150, max: 240 }
```

Outputs are unitless — append `px`/`rem`/`ms` yourself when zipping the numbers into your
own `tokens.create()` calls. All three generators round to whole numbers by default; the
array generators accept a `round` override and `expandDurationBand` accepts a `roundTo`
granularity for callers that want different precision.

## Basic light/dark mode

### Creating a theme

```ts
// tokens.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

// Define your base tokens
export const color = tokens.create('color', {
  // Light mode defaults
  text: '#111827',
  textMuted: '#6b7280',
  surface: '#ffffff',
  surfaceRaised: '#f9fafb',
  surfaceSunken: '#f3f4f6',
  border: '#e5e7eb',
  primary: '#0066ff',
  primaryHover: '#0052cc',
});

// Create dark theme override (class theme-dark)
export const darkTheme = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: {
      text: '#e0e0e0',
      textMuted: '#9ca3af',
      surface: '#1a1a2e',
      surfaceRaised: '#25253e',
      surfaceSunken: '#16162a',
      border: '#3f3f5c',
      primary: '#66b3ff',
      primaryHover: '#3399ff',
    },
  },
});
```

### Applying the theme

```tsx
// App.tsx
import { darkTheme } from './tokens';

function App() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={isDark ? darkTheme.className : ''}>
      <button onClick={() => setIsDark(!isDark)}>Toggle theme</button>
      <PageContent />
    </div>
  );
}
```

### Persisting theme preference

```tsx
// hooks/useTheme.ts
import { useState, useEffect } from 'react';
import { darkTheme } from '../tokens';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';

      // Fall back to system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Optional: Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDark ? '#1a1a2e' : '#ffffff');
    }
  }, [isDark]);

  return {
    isDark,
    themeClass: isDark ? darkTheme.className : '',
    toggle: () => setIsDark(!isDark),
  };
}
```

## System preference detection

### CSS-only approach (no flash)

```ts
// tokens.ts
export const color = tokens.create('color', {
  text: '#111827',
  surface: '#ffffff',
  // ... other tokens
});

export const darkTheme = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: {
      text: '#e0e0e0',
      surface: '#1a1a2e',
    },
  },
});
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
  <head>
    <script>
      // Prevent flash of wrong theme
      (function () {
        const theme =
          localStorage.getItem('theme') ||
          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        if (theme === 'dark') {
          document.documentElement.classList.add('theme-dark');
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

```tsx
// App.tsx
import { darkTheme } from './tokens';

function App() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains(darkTheme.className),
  );

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    if (newTheme) {
      document.documentElement.classList.add(darkTheme.className);
    } else {
      document.documentElement.classList.remove(darkTheme.className);
    }
  };

  return <div className={isDark ? darkTheme.className : ''}>{/* app content */}</div>;
}
```

### Dark from media query only

If you do not toggle a class yourself and only want dark tokens when `prefers-color-scheme: dark` matches:

```ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

const light = { color: { text: '#111827', surface: '#ffffff' } };
const dark = { color: { text: '#e5e7eb', surface: '#0f172a' } };

export const appTheme = tokens.createTheme({
  name: 'app',
  tokens: light,
  modes: tokens.colorMode.mediaOnly({ dark }),
});
```

Apply `appTheme.className` once on your root; dark overrides apply automatically via CSS.

## Multi-brand theming

### Different themes for different contexts

```ts
// themes.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

const light = {
  color: {
    primary: '#0066ff',
    secondary: '#6b7280',
    text: '#111827',
    surface: '#ffffff',
  },
  space: {
    sm: '8px',
    md: '16px',
    lg: '24px',
  },
} as const;

export const defaultTheme = tokens.createTheme({
  name: 'default',
  tokens: light,
});

export const brandA = defaultTheme.override({
  name: 'brand-a',
  tokens: {
    color: { primary: '#2563eb' },
  },
});

export const brandB = defaultTheme.override({
  name: 'brand-b',
  tokens: {
    color: {
      primary: '#10b981',
      secondary: '#f59e0b',
      text: '#1f2937',
      surface: '#fafafa',
    },
  },
});

export const brandC = defaultTheme.override({
  name: 'brand-c',
  tokens: {
    color: {
      primary: '#ef4444',
      secondary: '#8b5cf6',
      text: '#0f172a',
      surface: '#f8fafc',
    },
  },
});
```

### Applying brand themes

```tsx
// App.tsx
import { brandA, brandB, brandC } from './themes';

const brands = {
  a: brandA,
  b: brandB,
  c: brandC,
};

function App({ brandId }) {
  const surface = brands[brandId] || brandA;

  return (
    <div className={theme.className}>
      <PageContent />
    </div>
  );
}
```

### Nested themes

Themes can be nested for scoped theming:

```tsx
import { brandA, brandB } from './themes';

function App() {
  return (
    <div className={brandA.className}>
      <Header /> {/* Uses brandA colors */}
      <main>
        <div className={brandB.className}>
          <Widget /> {/* Uses brandB colors */}
        </div>
      </main>
      <Footer /> {/* Uses brandA colors */}
    </div>
  );
}
```

CSS custom properties cascade naturally, so the inner theme overrides only affect its subtree.

## Component-specific themes

### Isolated component theming

```ts
// components/Chart/Chart.tokens.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

// Chart-specific tokens that don't affect the rest of the app
export const chartTheme = tokens.createTheme({
  name: 'chart',
  tokens: {
    color: {
      primary: '#0066ff',
      secondary: '#10b981',
      tertiary: '#f59e0b',
      quaternary: '#ef4444',
      grid: '#e5e7eb',
      axis: '#6b7280',
    },
  },
});
```

```tsx
// components/Chart/Chart.tsx
import { chartTheme } from './Chart.tokens';

export function Chart({ data }) {
  return (
    <div className={chartTheme.className}>
      <svg className={chart('svg')}>{/* Chart uses chart-specific color tokens */}</svg>
    </div>
  );
}
```

## Seasonal/time-based themes

### Time-aware theming

```ts
// themes/seasonal.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const holidayTheme = tokens.createTheme({
  name: 'holiday',
  tokens: {
    color: {
      primary: '#c41e3a', // Holiday red
      secondary: '#165b33', // Holiday green
      accent: '#ffd700', // Gold
    },
  },
});

export const springTheme = tokens.createTheme({
  name: 'spring',
  tokens: {
    color: {
      primary: '#88c999',
      secondary: '#f4a460',
      accent: '#ffb6c1',
    },
  },
});
```

```tsx
// hooks/useSeasonalTheme.ts
import { holidayTheme, springTheme } from '../themes/seasonal';

export function useSeasonalTheme(): string | undefined {
  const now = new Date();
  const month = now.getMonth();

  // Holiday season: December
  if (month === 11) {
    return holidayTheme.className;
  }

  // Spring: March-May
  if (month >= 2 && month <= 4) {
    return springTheme.className;
  }

  return undefined; // Use default theme
}
```

## Advanced theme composition

### Partial themes

```ts
// themes/semantics.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

// Semantic color tokens
export const successTheme = tokens.createTheme({
  name: 'success',
  tokens: {
    color: {
      primary: '#10b981',
      primaryHover: '#059669',
    },
  },
});

export const warningTheme = tokens.createTheme({
  name: 'warning',
  tokens: {
    color: {
      primary: '#f59e0b',
      primaryHover: '#d97706',
    },
  },
});

export const dangerTheme = tokens.createTheme({
  name: 'danger',
  tokens: {
    color: {
      primary: '#ef4444',
      primaryHover: '#dc2626',
    },
  },
});
```

```tsx
// components/Alert/Alert.tsx
import { successTheme, warningTheme, dangerTheme } from '../../themes/semantics';

const alertThemeClasses = {
  success: successTheme.className,
  warning: warningTheme.className,
  danger: dangerTheme.className,
};

export function Alert({ type, children }) {
  return <div className={alertThemeClasses[type]}>{children}</div>;
}
```

### Token layering

```ts
// tokens/layers.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

// Layer 1: Primitives
const primitives = tokens.create('primitives', {
  // Raw values
  blue500: '#0066ff',
  blue600: '#0052cc',
  gray500: '#6b7280',
});

// Layer 2: Semantic tokens
const color = tokens.create('color', {
  // Reference primitives
  primary: primitives.blue500,
  primaryHover: primitives.blue600,
  text: '#111827',
});

// Layer 3: Component tokens
const button = tokens.create('button', {
  // Reference semantic tokens
  backgroundColor: color.primary,
  backgroundColorHover: color.primaryHover,
  textColor: '#ffffff',
});
```

## Light / dark / system on `data-*`

When the user can pick light, dark, or system, and **light must win over system dark**, use `tokens.colorMode.systemWithLightDarkOverride`:

```ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

const light = { color: { text: '#111827', surface: '#ffffff' } };
const dark = { color: { text: '#e5e7eb', surface: '#0f172a' } };

export const shell = tokens.createTheme({
  name: 'shell',
  tokens: light,
  modes: tokens.colorMode.systemWithLightDarkOverride({
    attribute: 'data-color-mode',
    values: { light: 'light', dark: 'dark', system: 'system' },
    scope: 'ancestor',
    light,
    dark,
  }),
});
```

Set `data-color-mode` on `html` (or another ancestor); apply `shell.className` on your themed subtree.

### Mode-aware token values (`light-dark()` on custom properties)

When you register `colorModes` on `createTypeStyles` or `createTokens`, token leaves can use
`{ light, dark }` in `tokens.create()` and `tokens.createTheme({ tokens })`. Color-compatible
values compile to CSS `light-dark()` on `--*` variables; shadow-like shorthands get a dark
override rule instead. That rule matches `data-color-mode="dark"` on the anchor or a descendant
(override the attribute with `colorModeAttribute`, or the condition with `resolvedDarkWhen`).

```ts
import { colorModes, createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app', colorModes });

const brand = tokens.create('brand', {
  accent: { light: '#111', dark: '#eee' },
});

const theme = tokens.createTheme({
  name: 'acme',
  tokens: {
    color: { text: { light: '#111', dark: '#eee' } },
  },
});
```

This is separate from **style-level** `{ light, dark }` on component properties (see
[Mode-aware property values](#mode-aware-property-values-colormodes) below) and from
**conditional** `modes` layers driven by `tokens.when.*`. See
[Tokens — Mode-aware token leaves](/docs/tokens#mode-aware-token-leaves) for the full API.

## Optional: `mergeThemeOverrides` helpers

Prefer composing themes with `createTheme({ tokens })` (mode-aware leaves) and forking with [`theme.override`](#deriving-child-themes-override). Use the helpers below when you need to merge **token ref leaves** yourself — for example building a config object before calling `createTheme`.

Token refs from `tokens.declare()` are proxy objects — they cannot be cloned with
`structuredClone` and will not round-trip through ad-hoc deep merges. Pass **leaf** refs
(`semantic.accent.default`), not branch proxies (`semantic.accent`):

```ts
import { mergeThemeOverrides } from 'typestyles';

const presetTokens = {
  color: { text: '#111827', accent: { default: '#0066ff' } },
};
const appTokens = {
  color: { accent: { default: '#ff5500' } },
};

const merged = mergeThemeOverrides(presetTokens, appTokens);
// → { color: { text: '#111827', accent: { default: '#ff5500' } } }
```

**`mergeThemeOverrides(base, patch?)`** — deep-merge two override trees. Plain objects merge
recursively; arrays and primitives from `patch` replace `base`. Leaf token refs stringify to
`var(--…)`; the result is always a deep clone.

**`cloneThemeValues(values)`** — deep-clone a value tree with the same ref serialization when
you need an isolated copy outside of `mergeThemeOverrides`.

## Condition scopes: `self`, `ancestor`, `descendant`

`tokens.when.attr(name, value, { scope })` and `tokens.when.className(name, { scope })` accept three `scope` values describing where the marker lives relative to the theme root:

- **`'self'`** — the marker is on the theme root itself: `.theme-app[data-mode="dark"]`.
- **`'ancestor'`** — the marker is on an ancestor of the theme root (e.g. `data-color-mode` on `html`): `[data-mode="dark"] .theme-app`.
- **`'descendant'`** — the marker is on a descendant of the theme root, somewhere inside the themed subtree: `.theme-app [data-mode="dark"]`.

### Fixed-tone surfaces with `scope: 'descendant'`

Sometimes a specific element should render with a **fixed** tone regardless of the page's ambient mode — a toast that is always dark even on a light page, a syntax-highlighted code block that stays dark in light mode. That is not "dark mode": it is a design decision fixed to one element. A descendant-scoped mode expresses exactly that — the marker attribute goes on the element itself, inside the themed subtree:

```ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

const light = { color: { text: '#111827', surface: '#ffffff' } };
const dark = { color: { text: '#e5e7eb', surface: '#0f172a' } };

export const app = tokens.createTheme({
  name: 'app',
  tokens: light,
  modes: [
    // Ambient light/dark switching, as usual:
    ...tokens.colorMode.systemWithLightDarkOverride({
      attribute: 'data-color-mode',
      values: { light: 'light', dark: 'dark' },
      scope: 'ancestor',
      light,
      dark,
    }),
    // Fixed-tone override for marked elements inside the themed subtree:
    {
      id: 'surface-dark',
      overrides: dark,
      when: tokens.when.attr('data-surface', 'dark', { scope: 'descendant' }),
    },
  ],
});
```

```html
<div class="theme-app">
  <p>Follows the ambient light/dark mode…</p>
  <div data-surface="dark">…but this toast is always dark.</div>
</div>
```

The descendant-scoped rule compiles to `.theme-app [data-surface="dark"]`, so any element carrying `data-surface="dark"` inside the theme gets the dark token values — no matter what `prefers-color-scheme` or `data-color-mode` currently say. `tokens.colorMode.*` presets return plain mode arrays — spread them into `modes` alongside hand-written entries (as above).

Two properties worth knowing:

- **No built-in "reset to ambient".** Once a descendant-scoped mode matches, it applies to that whole subtree; a nested child cannot fall back to the ambient mode automatically. Define an explicit mode (e.g. `data-surface="light"`) if you need a counter-tone.
- **`when.not()` is not supported on descendant-scoped conditions** — a descendant relationship cannot collapse into a single `:not()` compound selector. In development this logs a warning and emits no rule.

## Accessibility considerations

### High contrast mode

```ts
// themes/accessibility.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const highContrastTheme = tokens.createTheme({
  name: 'high-contrast',
  tokens: {
    color: {
      text: '#000000',
      surface: '#ffffff',
      primary: '#0000ff',
      border: '#000000',
    },
  },
});
```

```tsx
// hooks/useAccessibility.ts
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handler = (e) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isHighContrast;
}
```

### Respect user preferences

```ts
// tokens.ts
import { createTypeStyles } from 'typestyles';

const { tokens } = createTypeStyles({ scopeId: 'app' });

export const color = tokens.create('color', {
  text: '#111827',
  // ... other tokens
});

export const darkTheme = tokens.createTheme({
  name: 'dark',
  tokens: {
    color: {
      text: '#e0e0e0',
      // ... other overrides
    },
  },
});

// Optional: separate surface for motion tokens, etc.
export const reducedMotionTheme = tokens.createTheme({
  name: 'reduced-motion',
  tokens: {
    /* motion-related overrides */
  },
});
```

```tsx
// App.tsx
import { darkTheme } from './tokens';

function App() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const themeClasses = [prefersDark && darkTheme.className, prefersReducedMotion && 'reduce-motion']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={themeClasses}>
      <PageContent />
    </div>
  );
}
```

## Theme switching transitions

### Smooth theme transitions

```css
/* Add to your global CSS or a style element */
html,
body,
* {
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}
```

Or with typestyles global CSS:

```ts
import { createTypeStyles } from 'typestyles';

const { global } = createTypeStyles({ scopeId: 'app' });

global.rule('html', {
  transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
});
```

Use a scoped `global` from `createTypeStyles({ layers: { order, token, style, global } })` when you emit globals into a cascade layer (see [Cascade layers](/docs/cascade-layers)).

### Animating typed tokens with `@property`

The transition above works because `background-color`, `color`, and `border-color` are already-animatable CSS properties — the browser interpolates the _computed_ value across the style change regardless of how it was derived from `var(--…)`. Plain custom properties themselves don't get that for free: an **unregistered** `--token` is just a token stream, so a value that's only ever consumed as raw text — a gradient angle, a `filter` amount, the custom property itself via `transition: --token` — snaps discretely instead of animating.

> **Register the token with `syntax` to make it interpolate.** `tokens.create` and `property` both accept `{ value, syntax, inherits }` and register a typed [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property) rule for the custom property. Once a token has a typed `syntax` (`<color>`, `<angle>`, `<number>`, …), the browser knows how to interpolate it directly — including inside values, like gradients, that a `transition` on a real CSS property can't reach.

```ts
import { createTypeStyles } from 'typestyles';

const { style, tokens } = createTypeStyles({ scopeId: 'app' });

// A typed, animatable custom property — not just a plain token.
const brand = tokens.create('brand', {
  angle: { value: '20deg', syntax: '<angle>', inherits: true },
});

const dark = tokens.createTheme({
  name: 'dark',
  tokens: {
    brand: { angle: '260deg' },
  },
});

const card = style('card', {
  backgroundImage: `conic-gradient(from ${brand.angle.var}, #0066ff, #66b3ff, #0066ff)`,
  transition: `${brand.angle.name} 0.6s ease`,
});
```

**Tokens whose value references another token stay typed too.** Declare the
schema with `tokens.declare`, then pass plain values to `tokens.create`. For
`syntax` leaves, `@property` is emitted at declare time with a
syntax-appropriate placeholder `initial-value` (`transparent` for `<color>`,
`0` for `<number>`, and so on), while `:root` carries the real value — including
`color-mix()` expressions built from forward refs:

```ts
const color = tokens.declare('color', {
  accent: { default: { syntax: '<color>', inherits: false } },
  accentSubtle: { syntax: '<color>', inherits: false, initial: 'hotpink' },
});

tokens.create(
  'color',
  {
    accent: { default: '#0066ff' },
    accentSubtle: `color-mix(in oklch, ${color.accent.default} 24%, white)`,
  },
  { decl: color },
);
```

Toggling `dark.className` now smoothly rotates the gradient across the theme switch — the browser tweens `--brand-angle` (`brand.angle.name`) from `20deg` to `260deg` frame by frame, then the `conic-gradient` re-renders each step, because `@property` told it `--brand-angle` is an `<angle>`. Without the registered `syntax`, the same class swap would snap the gradient to its new angle with no animation at all.

This is a genuine capability gap versus compiler-first tools: StyleX's own documented capability list marks explicit `@property` output as unsupported ("compiles but invalid CSS output"), so an Astryx/StyleX theme can't emit this pattern — a smoothly animating gradient angle or color token on theme switch is structurally unavailable to it. TypeStyles tokens and `property` emit real `@property` rules because they're just CSS, not compiler-owned output. See [Theming architecture: TypeStyles vs. StyleX (and Astryx)](/docs/framework-comparison#theming-architecture-typestyles-vs-stylex-and-astryx) for the fuller comparison, and [`property`](/docs/api-reference#styles) / [`tokens.create`](/docs/tokens#custom-css-variable-names-nametemplate) for the full options.

### Prevent flash during theme switch

```tsx
import { useEffect, useState } from 'react';
import { darkTheme } from './tokens';

function ThemeProvider({ children }) {
  const [themeClass, setThemeClass] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Read theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    setThemeClass(savedTheme === 'dark' ? darkTheme.className : '');
    setIsReady(true);
  }, []);

  // Prevent rendering until theme is determined
  if (!isReady) {
    return null; // or a loading spinner
  }

  return <div className={themeClass}>{children}</div>;
}
```

## SSR with themes

### Server-side theme detection

```ts
// server.ts
import { collectStyles } from 'typestyles/server';
import { darkTheme } from './tokens';

app.get('/', (req, res) => {
  // Detect theme from cookie or user preference
  const themeCookie = req.cookies.theme;
  const isDark = themeCookie === 'dark';
  const htmlClass = isDark ? darkTheme.className : '';

  const { html, css } = collectStyles(() =>
    renderToString(
      <div className={htmlClass}>
        <App />
      </div>,
    ),
  );

  res.send(`
    <!DOCTYPE html>
    <html class="${htmlClass}">
      <head>
        <style id="typestyles">${css}</style>
      </head>
      <body>
        <div id="root">${html}</div>
      </body>
    </html>
  `);
});
```

## Component overrides (two-tier model)

When a theme needs to change how a component looks beyond token overrides, pick the
lightest option that fits. For recipe-shaped bulk restyling (base / variants /
compounds) without writing class names, use [`override()`](#typed-component-overrides)
first; fall back to Tier 1 vars or Tier 2 CSS when you need a single property or
nested-theme proximity.

### Typed component overrides

`override({ recipe, styles, vars?, layer?, selectorPrefix? })` restyles a `recipe()`
with the same style object — variant keys autocomplete from the recipe, and you never
pass class names. `styles` is partial. Call it on the **same**
`createTypeStyles` instance that created the component (design systems typically wrap this).
Cross-instance calls — a component from one `createTypeStyles` instance passed to
another instance's `override` — are unsupported: emission uses **this** instance's
sheet, breakpoints, and layer stack, so selectors may land in the wrong CSS.

With `@typestyles/vite` in serve mode, modules that call `override` (or
helpers that wrap it, such as `createDesignTheme` / `overrideComponent`, including
renamed imports such as `createDesignTheme as cdt`) get HMR dispose tracking so
theme edits update override CSS without a full reload. Re-registering the same
override keys always replaces the previous CSS. Recipe HMR still preserves
override rules — theme modules own those registrations.

```ts
import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { recipe, override } = createTypeStyles({
  scopeId: 'app',
  layers: {
    order: ['components', 'overrides'] as const,
    token: 'components',
    style: 'components',
  },
});

const button = recipe({
  name: 'button',
  layer: 'components',
  variants: {
    intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
    size: variant.enum(['sm', 'lg'], { default: 'sm' }),
  },
  styles: {
    base: { borderRadius: '6px' },
    variants: {
      intent: {
        primary: { backgroundColor: 'blue' },
        ghost: { backgroundColor: 'transparent' },
      },
      size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } },
    },
  },
});

// App-global
override({
  recipe: button,
  layer: 'overrides',
  styles: {
    base: { borderRadius: '999px' },
    variants: {
      intent: { primary: { textTransform: 'uppercase' } },
    },
  },
});

// Theme-scoped (descendant prefix — not CSS `@scope`)
override({
  recipe: button,
  layer: 'overrides',
  selectorPrefix: '.theme-acme',
  styles: { base: { boxShadow: 'none' } },
});
```

Works for semantic, bem, template, and attribute naming modes (and flat / slot /
multi-slot recipe shapes). Attribute mode emits selectors like
`.button[data-intent="primary"]`; put overrides in a later cascade layer so they
beat recipe CSS without fighting specificity. When `createTypeStyles({ layers })`
includes an `"overrides"` layer, omitting `{ layer }` defaults to that name —
custom stacks without `"overrides"` must pass `{ layer }` explicitly.

#### Override component internal vars

When a recipe declares **`vars`**, consumers override them with the matching **`vars`**
block on `override()` (typed logical keys) or token/theme CSS on the var host.

```ts
const sideNav = recipe({
  name: 'side-nav',
  slots: ['root', 'heading'] as const,
  vars: {
    border: { value: '#ccc', syntax: '<color>' as const },
    headingColor: '#111',
  },
  styles: ({ vars }) => ({
    base: {
      root: { borderColor: vars.border.var },
      heading: { color: vars.headingColor.var },
    },
  }),
});

// sideNav.vars.border.var — same paths consumers override below
override({
  recipe: sideNav,
  layer: 'overrides',
  selectorPrefix: '.theme-acme',
  vars: { border: 'transparent', headingColor: 'var(--brand-heading)' },
  styles: { base: { root: { margin: '8px', borderRadius: '12px' } } },
});
// => .theme-acme .side-nav { --side-nav-border: transparent; …; margin: 8px; … }
```

Declaring `vars` on the recipe makes `OverrideConfigFor<typeof sideNav>` infer those keys.

Var overrides emit on the **var host class** (same element that owns default var
declarations from the recipe). They compose with `base` slot overrides on that host;
if both set the same custom property, **`base` wins**.

#### Mode-aware property values (`colorModes`)

Register color modes once on the TypeStyles instance, then use `{ light, dark }` on color
and image properties — they compile to `light-dark()`:

```ts
import { createTypeStyles, colorModes } from 'typestyles';

const { recipe, override } = createTypeStyles({ scopeId: 'var-ui', colorModes });

const button = recipe({
  name: 'button',
  styles: { base: { borderColor: { light: 'red', dark: 'blue' } } },
});

override({
  recipe: button,
  styles: { base: { color: { light: '#111', dark: '#eee' } } },
});
// => border-color: light-dark(red, blue); color: light-dark(#111, #eee)
```

`colorModes` from `typestyles` is `['light', 'dark']`. **Array order** defines
`light-dark()` arguments: index `0` = light color-scheme, index `1` = dark. Structural
properties (`padding`, `fontWeight`, …) should use `conditions` instead — dev warns if
you pass mode objects on them. v1 supports at most two registered modes.

#### Conditional styles in recipes (`when`)

`conditions` / `conditional()` only work on **`override`**. Inside a
`recipe` (or `style`), spread **`when(condition, style)`**
so the same `tokens.when.*` / `resolvedDarkWhen` builders expand into nested `&` keys
and `@media` wrappers:

```ts
import { resolvedDarkWhen, when } from 'typestyles';

recipe({
  name: 'badge',
  styles: {
    base: {
      color: '#111827',
      ...when(when.prefersDark, { color: '#e5e7eb' }),
      ...when(resolvedDarkWhen('data-mode', 'ancestor'), {
        '&::after': { opacity: 0.85 },
      }),
    },
  },
});
```

That is equivalent to hand-writing selector maps (what some design systems call
`atDarkMode`), without duplicating the condition contract themes already use.
Also exported as **`whenStyle`** from `typestyles` when you are not on a TypeStyles instance.

#### Conditional override blocks (`conditions`)

For structural or multi-property mode differences on **overrides**, add `conditions` on
override style blocks (`base`, variant options, compounds, slot blocks). Each entry
compiles `when` with the same `tokens.when.*` builders theme modes use:

```ts
import { conditional } from 'typestyles';
import { when } from 'typestyles'; // or tokens.when from your tokens instance

override({
  recipe: button,
  layer: 'overrides',
  selectorPrefix: '.theme-acme',
  styles: {
    base: {
      letterSpacing: '0.02em',
      conditions: [
        conditional(when.attr('data-mode', 'dark', { scope: 'ancestor' }), {
          letterSpacing: '0.06em',
        }),
        conditional(when.prefersDark, { color: 'white' }, 'dark-text'),
      ],
    },
  },
});
```

`conditions` is reserved — do not put it on `recipe()` recipe definitions.
Use [`when`](#conditional-styles-in-recipes-when) in recipes instead.

`getComponentMeta(component)` reads the public `__tsMeta` blob (namespace, kind,
naming mode, base class(es), per-option selector fragments). Renaming anything in
that metadata is a breaking change — same contract as public class names.

For nested conflicting theme regions, `selectorPrefix` has the same proximity
footgun as plain descendant CSS — use Tier 1 vars or [`scope()`](#tier-2--plain-css-against-semantic-class-names).

### Tier 1 — component-scoped CSS custom properties (preferred)

If a component author exposed a property as a CSS custom property (`vars` on the
recipe), consumers override it per theme with **`override({ vars })`** (typed
logical keys) or ordinary token/theme CSS on the var host. Custom properties inherit
down the DOM and reset at each `.theme-*` boundary, so nested themes stay
proximity-correct with no extra tooling.

See [Components — expose themeable properties as vars](/docs/components#expose-themeable-properties-as-vars) and [override internal vars in themes](/docs/components#override-internal-vars-in-themes).

### Tier 2 — plain CSS against semantic class names

For properties the author did not expose as vars, target the stable semantic class
names from `recipe()` (for example `button`, `button--intent-primary`).
See [Class naming](/docs/class-naming) and the [public contract](#public-semantic-class-names).

**Non-nested themes:** a descendant selector in a later cascade layer is enough:

```ts
import { createTypeStyles } from 'typestyles';

const { recipe, style, override } = createTypeStyles({
  scopeId: 'app',
  layers: {
    order: ['components', 'overrides'] as const,
    token: 'components',
    style: 'components',
  },
});

const button = recipe({
  name: 'button',
  layer: 'components',
  styles: { base: { padding: '8px 16px' } },
});

// In theme setup for `.theme-acme`:
style('.theme-acme .button', { borderRadius: '999px' }, { layer: 'overrides' });
```

**Nested conflicting themes:** when two `.theme-*` regions nest and both override the
same component class, plain selectors tie on specificity and source order wins. Use
`scope()` so the nearest scoping root wins:

```ts
scope({ root: '.theme-beta', to: '.theme-acme', layer: 'overrides' }, 'button', {
  backgroundColor: 'rebeccapurple',
  '&:hover': { opacity: 0.9 },
});
```

`scope()` reuses the same `serializeStyle` / `applyLayerToRules` / `insertRules`
pipeline as other TypeStyles APIs — pseudo-selectors and `@media` in `overrides` work
unchanged.

**Browser support:** `@scope` ships in Chrome 118+, Firefox 128+, Safari 17.4+. Treat
it as an opt-in escalation for nested conflicts; older browsers can keep Tier 2 plain
selectors and accept the documented load-order caveat.

### Attribute variants: use layers, not specificity

Attribute variants intentionally use selectors such as
`.button[data-intent="primary"]`, which are more specific than `.button`. When
theming an attribute-mode design system, put recipe CSS and overrides in ordered
cascade layers so override precedence is explicit:

```ts
const { recipe, override, scope } = createTypeStyles({
  scopeId: 'app',
  mode: 'attribute',
  layers: {
    order: ['tokens', 'components', 'overrides', 'utilities'] as const,
    token: 'tokens',
    style: 'components',
  },
});

const button = recipe({
  name: 'button',
  layer: 'components',
  styles: { base: { borderRadius: '6px' } },
});

scope({ root: '.theme-acme', layer: 'overrides' }, button.base, {
  borderRadius: '999px',
});
// Prefer override(button, { base: { borderRadius: '999px' } }, { selectorPrefix: '.theme-acme', layer: 'overrides' })
```

Use `components` for recipe CSS, `overrides` for theme or consumer restyles, and
`utilities` for per-instance intent. A later layer wins without a specificity
escalation. Prefer `override()` for recipe-shaped restyles (including
attribute variants); plain CSS / `scope()` remain fine when you only need
a base-class or ad-hoc selector.

## Public semantic class names

In **`semantic` naming mode** (the default), every class emitted by
`recipe()` / `style()` is a **public, semver-guarded surface**.
Consumers may target those names in plain CSS, `scope()`, `override()`, or any other CSS
tooling. Renaming a namespace or variant key is a **breaking change** — TypeScript will
not catch a renamed string literal, so publishable design systems should opt into the
[`@typestyles/no-removed-public-classname`](/docs/publishing-packages#guard-public-class-names)
rule and regenerate `.typestyles-public-classnames.json` deliberately when names change.

## Best practices

1. **Use semantic token names** - `primary`, `surface`, `text` instead of `blue`, `white`, `black`
2. **Define dark mode alongside light mode** - Keep them in sync
3. **Test both themes** - Use visual regression for both modes
4. **Respect system preferences** - Default to `prefers-color-scheme`
5. **Provide user override** - Let users choose independently of system
6. **Store preference** - Use localStorage to remember user choice
7. **Avoid theme flash** - Set theme class before first paint
8. **Use CSS custom properties** - They cascade naturally for nested themes
