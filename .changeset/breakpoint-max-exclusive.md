---
'typestyles': minor
---

`breakpoint(name, 'max')` (and `'maxHeight'`) derived from a stored `min-width` / `min-height` condition now emits an exclusive range query (`@media (width < 48rem)`) instead of the inclusive `(max-width: 48rem)`. `min` and `max` for the same breakpoint now partition the viewport instead of both matching at exactly the breakpoint width. Breakpoints stored as `(max-width: …)` are unchanged.
