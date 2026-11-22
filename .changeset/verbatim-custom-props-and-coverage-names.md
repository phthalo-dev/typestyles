---
'typestyles': patch
'@typestyles/build-runner': patch
'@typestyles/vite': patch
---

Custom property keys (`--*`) are emitted verbatim instead of kebab-cased (#383). The production extract coverage check now matches recipes by name when the app and the extract entry reach them through different file paths, such as workspace `src` aliases vs. package `dist` (#384).
