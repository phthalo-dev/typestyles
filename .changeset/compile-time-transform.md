---
'typestyles': minor
'@typestyles/build-runner': minor
'@typestyles/vite': minor
'@typestyles/rollup': minor
'@typestyles/esbuild': minor
'@typestyles/webpack': minor
---

Add an experimental compile-time transform (`compile: true`) for zero-runtime client bundles.

Extraction now records a small JSON plan per `recipe()` — base classes, slots, dimensions and defaults, i.e. everything a call needs — in the same Node run that produces the CSS (`runTypestylesExtract` returns `{ css, plans }`; `runTypestylesBuild` is unchanged). With `compile: true`, the Vite, Rollup, esbuild (and Bun), and webpack (and Rspack) integrations replace `recipe({ name, ... })` definitions in client bundles with `createAttrsRecipeFromPlan(<plan>)` from the new `typestyles/lite` entry (under 1 KB gzipped), and mark style factory calls (`createTypeStyles`, `createStyles`, `createTokens`, `createGlobal`) as pure. The style configs, token tables and CSS machinery they referenced then tree-shake away. Class names, `data-*` attributes and the emitted CSS are unchanged.

Plans cover attribute-mode dimensioned and slot recipes, flat and multi-slot recipes, and the class-name modes (`semantic`, `bem`, `template`, `hashed`, `compact`, `atomic`) for dimensioned recipes (with compound variants) plus slot recipes in `semantic`/`bem`/`template`. Parity with the real runtime is tested across a grid of selections. Calls that can't be planned (non-literal names, themes/tokens whose results are read at runtime, recipes in unsupported shapes) keep the runtime, and the Vite and Rollup integrations warn when a substantial part of it remains.

On var-ui's bundle fixtures this removes about 80–105 KB of minified JS (button-only 312.7 → 230.2 KB, form-kit 457.9 → 367.3 KB, date-kit 512.9 → 421.7 KB).

`@typestyles/vite` returns two plugins when `compile: true` (the transform must run after Vite's own TypeScript transform); otherwise it still returns a single plugin. `@typestyles/build-runner` gains the shared transform (`transformRecipeCalls`, `indexPlans`, …) and an `acorn` dependency.
