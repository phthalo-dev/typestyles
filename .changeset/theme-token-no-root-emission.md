---
'typestyles': patch
---

Theme token values no longer emit `:root` rules at runtime. `createTheme({ tokens })` and `Theme.override({ tokens })` register each namespace through `tokens.create`, which also emitted the theme's values as `:root { --scope-ns-token: … }` custom properties plus `:root`-anchored dark-mode override rules for leaves that cannot use `light-dark()` (e.g. `shadow` tokens with `{ light, dark }` leaves). Importing a theme module therefore restyled the whole page — on a dark-mode visit every element picked up that theme's dark shadows, not just elements under `.theme-{name}`. Theme token values now live only on the theme class, which `createTheme` already emits (matching the zero-runtime extraction output), and the shared `:root` value tree is left untouched so a later `tokens.create()` cannot re-emit theme values either.
