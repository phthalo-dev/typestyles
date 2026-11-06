---
'typestyles': minor
'@typestyles/build-runner': minor
'@typestyles/vite': minor
'@typestyles/rollup': minor
'@typestyles/esbuild': minor
'@typestyles/webpack': minor
'@typestyles/next': minor
---

Ship a pure, name-only `typestyles/core` build and resolve the client to it in zero-runtime production builds.

`typestyles` now publishes two builds of the same API surface:

- the runtime barrel — registers CSS into the global sheet (unchanged, used by extraction/SSR/dev)
- `typestyles/core` — computes the identical class names and data attributes, but the stylesheet state machine, CSSOM/DOM plumbing, and insertion registry are absent from the module graph entirely

In `mode: 'build'`, bundler integrations resolve the client's bare `typestyles` specifier to `typestyles/core`:

- `@typestyles/vite` (and `@typestyles/astro`, which wraps it): `resolve.alias` `typestyles` → `typestyles/core`
- `@typestyles/rollup`: `resolveId` hook
- `@typestyles/esbuild`: native `alias` option
- `@typestyles/webpack`: exact `typestyles$` resolve-alias entry
- `@typestyles/next/build`: same exact alias on client webpack bundles (server keeps the runtime for SSR collection)

All swaps are idempotent and preserve user-provided aliases; `mode: 'runtime'` / `mode: 'hybrid'` and development builds keep the full runtime. The published package also declares a conservative `sideEffects` allowlist (`hmr`, `server`, `build`, `testing`). Production bundles for the example app drop `index.js` and the stateful `custom-properties` chunk; extraction CSS output is byte-identical.
