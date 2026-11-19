---
'typestyles': minor
---

`createTypeStyles(...).withTokenRefs(designTokens)` records the instance's built-in token refs at the type level (runtime no-op, same instance), so `ctx.tokens` in `tokens.createTheme({ components })` factories is typed with those refs plus the theme's own `tokens` namespaces, instead of a loose any-namespace bag. `createTheme` now infers `tokens` as its own type parameter so factories can see them. Declared `true` schema leaves are typed as refs (`UntypedTokenRef`), matching their runtime shape.
