# @typestyles/open-props

Type-safe [Open Props](https://open-props.style/) design tokens for [typestyles](https://github.com/type-styles/typestyles).

Open Props is a curated set of CSS custom properties for spacing, color, typography, shadows, easings, and more. This package registers every scale through `tokens.create()` so you get **`var(--token-name)` references with full TypeScript autocomplete** — no separate `@import 'open-props'` step, no stringly-typed token names.

Full guide: [Open Props integration](https://typestyles.dev/docs/open-props)

## Why not raw Open Props?

| Raw Open Props                          | `@typestyles/open-props`                                       |
| --------------------------------------- | -------------------------------------------------------------- |
| CSS `@import` + `var(--size-3)` strings | Typed `sizes['3']` → `var(--size-3)`                           |
| No autocomplete for token names         | Autocomplete for every scale and key                           |
| Separate from your component styles     | Same token system as `tokens.create` — composable and themable |

Tokens register on `:root` when imported, identical to hand-written `tokens.create` calls. They work in plain CSS too: `padding: var(--size-4)`.

## Installation

```bash
npm install @typestyles/open-props typestyles
```

No additional CSS file is required — importing a token module registers the custom properties.

## Quick start

```ts
import { createTypeStyles } from 'typestyles';
import { sizes, radius, color, font } from '@typestyles/open-props';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const card = recipe({
  name: 'card',
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

Rendered CSS uses standard custom properties:

```css
.card-base {
  padding: var(--size-4);
  border-radius: var(--radius-3);
  background-color: var(--color-gray-2);
  font-family: var(--font-sans);
}
```

## Available scales

Import only what you need — each export is a separate `tokens.create` registration:

| Export              | Namespace                | Examples                                                     |
| ------------------- | ------------------------ | ------------------------------------------------------------ |
| `sizes`             | `--size-*`               | `sizes['4']`, `sizes['fluid-2']`, `sizes['content-1']`       |
| `radius`            | `--radius-*`             | `radius['3']`, `radius.pill`                                 |
| `color`             | `--color-*`              | `color['gray-5']`, `color['blue-6']` — 19 scales × 13 shades |
| `shadow`            | `--shadow-*`             | `shadow['2']`, `shadow['inner-1']`                           |
| `font`              | `--font-*`               | `font.sans`, `font.mono`, `font['neo-grotesque']`            |
| `fontSize`          | `--font-size-*`          | `fontSize['2']`, `fontSize['fluid-1']`                       |
| `fontWeight`        | `--font-weight-*`        | `fontWeight['5']`                                            |
| `fontLetterspacing` | `--font-letterspacing-*` |                                                              |
| `fontLineheight`    | `--font-lineheight-*`    |                                                              |
| `easing`            | `--ease-*`               | `easing['3']`, `easing['elastic-out-3']`                     |
| `animation`         | `--animation-*`          | `animation['fade-in']`, `animation.spin`                     |
| `duration`          | `--duration-*`           |                                                              |
| `gradient`          | `--gradient-*`           | `gradient['12']`                                             |
| `media`             | `--media-*`              | `media.md`, `media.dark` — use in `@media ${media.md}`       |
| `zIndex`            | `--zindex-*`             |                                                              |
| `ratio`             | `--ratio-*`              | `ratio.golden`, `ratio.widescreen`                           |
| `borderSize`        | `--border-size-*`        |                                                              |
| `brand`             | `--brand-*`              | Social/platform brand colors                                 |
| `palette`           | `--palette-*`            | OKLCH palette steps                                          |
| `noise`             | `--noise-*`              |                                                              |
| `masksEdges`        | `--masks-edge-*`         |                                                              |
| `masksCornerCuts`   | `--masks-corner-cuts-*`  |                                                              |

Bracket notation is required for numeric keys: `sizes['4']`, not `sizes.4`.

## Reference tokens defined elsewhere

If tokens are registered in a shared design-system package, reference them without re-importing definitions:

```ts
import { useOpenProps } from '@typestyles/open-props';

const spacing = useOpenProps('size');
spacing['4']; // var(--size-4)
```

`useOpenProps` is an alias for `tokens.use()` with Open Props typing.

## Mix with custom tokens

```ts
import { createTypeStyles } from 'typestyles';
import { color, sizes } from '@typestyles/open-props';

const { recipe, tokens } = createTypeStyles({ scopeId: 'app' });

const brand = tokens.create('brand', {
  primary: '#ff6b6b',
});

const hero = recipe({
  name: 'hero',
  styles: {
    base: {
      padding: sizes['6'],
      backgroundColor: brand.primary,
      color: color['gray-0'],
    },
  },
});
```

## Theming

Open Props tokens are CSS custom properties — override them like any typestyles token:

```tsx
import { createTypeStyles } from 'typestyles';
import { color } from '@typestyles/open-props';

const { tokens } = createTypeStyles({ scopeId: 'app' });

const dark = tokens.createTheme('dark', {
  base: {
    color: {
      'gray-0': color['gray-10'],
      'gray-1': color['gray-9'],
    },
  },
});

<div className={dark.className}>...</div>;
```

See [Theming](https://typestyles.dev/docs/theming) for `createTheme`, dark mode presets, and `Theme`.

## Production builds

Import Open Props scales from your [convention entry](https://typestyles.dev/docs/zero-runtime) so token `:root` rules land in the extracted CSS:

```ts
// src/typestyles-entry.ts
import { sizes, color, radius } from '@typestyles/open-props';
import './components';
```

Or import scales in the modules that use them — side-effect registration runs at module load.

## Related packages

| Package                         | Role                                           |
| ------------------------------- | ---------------------------------------------- |
| [`typestyles`](../typestyles)   | Core styling API                               |
| [`@typestyles/props`](../props) | Build utility props on top of these scales     |
| [`@typestyles/vite`](../vite)   | Extract static CSS including token definitions |

## Credits

Token values are derived from [Open Props](https://open-props.style/) by [Adam Argyle](https://github.com/argyleink). TypeStyles integration maintains naming parity with the upstream `--*` custom properties.

## License

Apache-2.0
