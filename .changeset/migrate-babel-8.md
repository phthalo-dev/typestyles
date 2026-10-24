---
'@typestyles/migrate': patch
---

Update to Babel 8 and `diff` 9. Negative numeric CSS values (for example `z-index: -1`) are emitted as a unary minus, which Babel 8 requires. This also fixes the `traverse is not a function` error when running the published CLI.
