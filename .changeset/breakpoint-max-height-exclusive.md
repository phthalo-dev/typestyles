---
'typestyles': patch
---

`breakpoint(name, 'maxHeight')` derived from a min-width breakpoint is now exclusive (`(height < …)`), like `'max'`. Previously only same-axis conversions (min-height → maxHeight) were exclusive, so `maxHeight` still emitted an inclusive `(max-height: …)` for width-based breakpoints.
