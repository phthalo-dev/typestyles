---
'@typestyles/build-runner': patch
---

The extraction bundle now compiles JSX with the automatic runtime (unless the project's `tsconfig.json` sets `jsx`, or the new `jsx` option is passed), so module-level JSX such as `icon: <Icon />` no longer throws `React is not defined` during extraction.
