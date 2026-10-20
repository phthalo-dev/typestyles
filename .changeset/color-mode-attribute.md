---
'typestyles': minor
---

**BREAKING:** Automatic dark fallbacks for token values that cannot compile to `light-dark()` now match `data-color-mode` instead of `data-mode`, on `:root` or the theme class and on a descendant. Pass `colorModeAttribute` to `createTypeStyles` / `createTokens` to use another attribute, or `resolvedDarkWhen` on `tokens.createTheme()` for a custom condition.
