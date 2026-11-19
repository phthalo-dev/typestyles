---
'typestyles': minor
'@typestyles/build-runner': minor
'@typestyles/vite': minor
---

Add real CSS source maps for extracted CSS. Enable with `extract.sourceMap: true` in `@typestyles/vite`. Each extracted rule is mapped back to the `recipe()` / `style()` call site via a VLQ source map emitted as a companion `.css.map` asset, referenced by a `/*# sourceMappingURL=... */` comment. The dev server also serves the map so the same mappings are available during development. The shared `@typestyles/build-runner` extraction pipeline now captures per-rule source locations and generates the map, and `typestyles` exposes `getRegisteredCssForSourceMap()` for consumers that need the raw mapping data. This complements `extract.sourceComments` and `typestyles/inspect` with a standard, tool-friendly source map.
