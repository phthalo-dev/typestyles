---
'typestyles': minor
---

Dev-only: warn when two `style()` calls in the same `scopeId` declare byte-identical rules under different names ("Duplicate style definition"), the inverse of the existing class-name collision check. Once per pair; no production cost.
