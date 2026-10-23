# @typestyles/react

React integration for [typestyles](https://github.com/phthalo-dev/typestyles) — migration-friendly **`styled`** API and **`css` prop** for teams coming from Emotion or styled-components.

## Installation

```bash
npm install @typestyles/react typestyles react react-dom
```

## `createStyled` / `styled`

Thin React wrapper over `recipe` from `createTypeStyles` with typed variant props via `ComponentVariants`:

```tsx
import { createTypeStyles } from 'typestyles';
import { createStyled, TypeStylesProvider } from '@typestyles/react';

const api = createTypeStyles({ scopeId: 'app' });
const styled = createStyled(api);

const Button = styled('button', {
  base: { padding: '8px 16px', border: 'none', borderRadius: '4px' },
  variants: {
    intent: {
      primary: { backgroundColor: '#0066ff', color: '#fff' },
      ghost: { backgroundColor: 'transparent' },
    },
  },
  defaultVariants: { intent: 'primary' },
});

function App() {
  return (
    <TypeStylesProvider styles={api}>
      <Button intent="ghost">Click me</Button>
    </TypeStylesProvider>
  );
}
```

Use a custom namespace when the element tag differs from the recipe name:

```tsx
const Button = styled('button', 'btn', { base: { padding: '8px' } });
```

## Runtime `css` prop

Point JSX at `@typestyles/react` and wrap your app in `TypeStylesProvider`:

```tsx
/** @jsxImportSource @typestyles/react */
import { api } from './styles';
import { TypeStylesProvider } from '@typestyles/react';

export function App() {
  return (
    <TypeStylesProvider styles={api}>
      <div css={{ color: 'red', padding: '1rem' }}>Hello</div>
    </TypeStylesProvider>
  );
}
```

Or in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsxImportSource": "@typestyles/react"
  }
}
```

Inline style objects are converted to deterministic classes via `hash` (or `hashClass` on a `createStyles()` instance) at runtime.

## Zero-runtime `css` prop (Babel)

For static style objects, use the Babel plugin to transform `css={{ … }}` into `className` at build time:

```js
// babel.config.js
module.exports = {
  plugins: [['@typestyles/react/babel', { stylesImport: './styles' }]],
};
```

Before:

```tsx
<button css={{ padding: '8px', color: 'red' }} />
```

After:

```tsx
<button className={cx(__typestylesCss({ padding: '8px', color: 'red' }))} />
```

Dynamic expressions (e.g. `css={condition && { color: 'red' }}`) are left unchanged for the runtime jsx path.

## API

| Export                          | Description                                                           |
| ------------------------------- | --------------------------------------------------------------------- |
| `createStyled(api)`             | Returns a `styled(tag, config)` factory backed by `recipe` on the API |
| `TypeStylesProvider`            | Supplies the styles API to the jsx runtime for `css` prop resolution  |
| `resolveCssPropClass`           | Low-level helper: `css` object → merged `className`                   |
| `@typestyles/react/jsx-runtime` | Drop-in jsx runtime with `css` prop support                           |
| `@typestyles/react/babel`       | Babel plugin for zero-runtime static `css` props                      |

## Future work

- SWC plugin (Babel shipped first)
- Vite auto-config for `jsxImportSource`
- Build-time transform for dynamic `css` expressions
