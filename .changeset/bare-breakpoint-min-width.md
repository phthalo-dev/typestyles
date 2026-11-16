---
'typestyles': patch
---

Normalize bare-length breakpoint values to `(min-width: …)` media conditions. Registering `breakpoints: { xl: '80rem' }` and calling `breakpoint('xl')` (or using `xl` in responsive property values) used to emit the invalid, never-matching query `@media (80rem)`; it now emits `@media (min-width: 80rem)`, and the `breakpoint()` return type reflects the wrapped condition. A dev warning is logged when a bare value is normalized.
