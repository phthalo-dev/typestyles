---
'typestyles': minor
---

Theme boundary cleanup. Token refs are accepted as values in `CreateTokenValues` (`tokens.create`, `createTheme({ tokens })`, mode leaves, `Theme.override` patches) and serialize to `var(--…)`. `Theme.override` patches accept partial mode leaves (`{ dark: '#fff' }`); a scalar parent fills the omitted modes. **Breaking:** `Theme.tokens` is required, so no `!`/`?.` is needed; reading it on a theme from the low-level `createTheme()` now throws a pointer to `tokens.createTheme()` instead of returning `undefined`.
