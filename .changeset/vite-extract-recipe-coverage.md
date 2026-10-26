---
'@typestyles/vite': patch
'@typestyles/build-runner': patch
---

Fail `vite build` when a local module reachable from the app calls `recipe()` and is missing from the extract entry. Set `coverage: false` to extract a subset on purpose.
