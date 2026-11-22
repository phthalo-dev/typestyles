---
'typestyles': patch
'@typestyles/build-runner': patch
'@typestyles/vite': patch
'@typestyles/props': patch
---

Custom property keys (`--*`) are emitted verbatim instead of kebab-cased (#383). The production extract coverage check now matches recipes by name when the app and the extract entry reach them through different file paths, such as workspace `src` aliases vs. package `dist` (#384).

Numeric values on custom properties no longer get a `px` suffix. `@typestyles/props` leaves `--*` names verbatim too. Coverage name matching ignores same-named recipes in other app modules; a same-named recipe in an unrelated package's `dist` can still mask a missing one.
