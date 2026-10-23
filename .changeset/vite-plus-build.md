---
'typestyles': patch
'@typestyles/astro': patch
'@typestyles/build-runner': patch
'@typestyles/cli': patch
'@typestyles/esbuild': patch
'@typestyles/eslint-plugin': patch
'@typestyles/migrate': patch
'@typestyles/next': patch
'@typestyles/open-props': patch
'@typestyles/props': patch
'@typestyles/react': patch
'@typestyles/rollup': patch
'@typestyles/vite': patch
'@typestyles/webpack': patch
---

Build with tsdown (via Vite+) instead of tsup. Public exports and types are unchanged; the output no longer includes JSDoc comments, and `@typestyles/next` now shares code between its entry points instead of duplicating it.
