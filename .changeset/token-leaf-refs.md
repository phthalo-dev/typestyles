---
'typestyles': minor
---

**Breaking:** every token leaf is now a `{ name, var }` ref instead of a bare `var(--…)` string. This covers `tokens.create()`, `tokens.use()`, `theme.tokens`, and `ctx.tokens` in override and theme `components` factories, so they match `tokens.declare()` refs and component vars. Refs coerce to `var(--…)` in template strings and when used directly as style values or as values of other tokens, so most code keeps working; code that relied on a leaf being a `string` (`typeof`, `.startsWith`, `===` against a string) should use `.var`. `TokenRefTree` leaves are typed as the new `UntypedTokenRef`, which is accepted by every CSS property. `isTokenRef` is now true for plain created leaves.
