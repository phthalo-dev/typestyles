---
'typestyles': minor
'@typestyles/build-runner': minor
'@typestyles/vite': minor
'@typestyles/rollup': minor
'@typestyles/esbuild': minor
'@typestyles/webpack': minor
'@typestyles/next': minor
---

Zero-runtime client builds now ship no CSS insertion runtime — for every typestyles entry point.

`typestyles` publishes its stylesheet module (`dist/sheet.js`) next to a no-op sibling (`dist/sheet-noop.js`) that exports the same API but does nothing. Every other module reaches the sheet through that one file, so in `mode: 'build'` the bundler integrations just redirect it in client bundles. The stylesheet state, CSSOM/DOM plumbing, insertion registry and dev-time collision bookkeeping never enter the module graph, while class names and data attributes are computed identically.

- One module graph, one registry: `typestyles`, `typestyles/css`, `typestyles/color`, … are all covered, with nothing to import differently and no specifier rewriting.
- `@typestyles/vite` (and `@typestyles/astro`) and `@typestyles/rollup`: `resolveId` hook (client builds only for Vite). `@typestyles/esbuild`: `onResolve` hook (skipped for `platform: 'node'`). `@typestyles/webpack` and `@typestyles/next/build`: module-factory hook (non-node targets / client bundles only; server bundles keep the real runtime for SSR collection).
- `mode: 'runtime'` / `'hybrid'`, development builds, and server/SSR/node builds keep the full runtime.
- Vite, Rollup and webpack warn at build time if the real sheet still ends up in a zero-runtime client bundle.
- Development diagnostics (namespace/class-name collision tracking) are gated behind the sheet, so they are absent from zero-runtime bundles.
- `@typestyles/build-runner` exports `toZeroRuntimeSheetId`, `isSheetRequest`, `findRealSheetModules`, `zeroRuntimeLeakMessage` and `ZeroRuntimeSheetWebpackPlugin` for custom integrations.
- The package also declares a conservative `sideEffects` allowlist (`hmr`, `server`, `build`, `testing`).
