---
'@typestyles/migrate': patch
---

Boolean variant migrations emit `recipe({ name, variants, styles })` with `variant.boolean` axes, and read `.className` from the call result.
