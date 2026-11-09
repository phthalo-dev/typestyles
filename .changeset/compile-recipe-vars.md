---
'typestyles': patch
'@typestyles/build-runner': patch
---

`compile: true` keeps recipe `.vars`. Client plans now record each recipe's var refs, and the `typestyles/lite` handle exposes the same `{ name, var }` tree, so components that assign recipe vars per instance no longer crash in zero-runtime builds (#315).
