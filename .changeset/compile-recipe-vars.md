---
'typestyles': patch
'@typestyles/build-runner': patch
---

`compile: true` keeps recipe `.vars`. Client plans now record each recipe's var refs, and the `typestyles/lite` handle exposes the same `{ name, var }` tree, so components that assign recipe vars per instance no longer crash in zero-runtime builds (#315).

`recipe.vars` (and the tree `c.vars()` returns) is now a frozen plain object instead of a Proxy, in both runtimes: reads are plain property lookups, and `Object.keys`, spread and `JSON.stringify` see the nested refs. Dashed paths still read the same ref (`vars['track-color']` is `vars.track.color`).
