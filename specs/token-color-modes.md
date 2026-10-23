# Mode-aware token leaves (`{ light, dark }`)

Implements [issue #163](https://github.com/phthalo-dev/typestyles/issues/163).

## Summary

When `createTypeStyles({ colorModes })` is configured, token leaves may use
`{ light: string, dark: string }` in:

- `tokens.create(namespace, values)`
- `tokens.createTheme(name, { base, colorMode: { light, dark } })`

Compatible values compile to `light-dark()` on `--*` custom properties.
Incompatible values (shadow shorthands, lengths) emit dark-mode override rules.

## API

```ts
const { tokens } = createTypeStyles({ colorModes: ['light', 'dark'] });

tokens.create('brand', {
  accent: { light: '#111', dark: '#eee' },
  glow: { light: '0 0 0 3px blue', dark: '0 0 16px navy' },
});

tokens.createTheme('acme', {
  base: { color: { text: { primary: '#111' } } },
  colorMode: {
    dark: { color: { text: { primary: '#eee' } } },
  },
});
```

Theme surfaces with `colorModes` configured emit `color-scheme: light dark`.

Preset mode layers (`tokens.colorMode.mediaOnly`, etc.) are passed via `modes:`:

```ts
tokens.createTheme('x', {
  base: light,
  modes: tokens.colorMode.mediaOnly({ dark }),
});
```

## var-ui

var-ui deletes its `color-mode-light-dark` bridge and passes mode-aware values
directly to TypeStyles. `createDesignTheme` only merges presets and wires
component overrides.
