---
'@typestyles/build-runner': minor
'@typestyles/vite': minor
---

Extraction now resolves like the host bundler. `runTypestylesExtract` / `runTypestylesBuild` accept `conditions` and `alias` (passed to esbuild), and `@typestyles/vite` forwards the resolved config's custom `resolve.conditions` (SSR ones first) and string aliases. Hosts without custom resolution behave as before.
