---
'typestyles': minor
---

`tokens.declare()` refs are now enumerable and strict: `Object.keys` / `Object.entries` / spread list a group's schema keys, and a path that isn't in the schema returns `undefined` instead of a phantom `var(--…)` proxy. Group proxies still contribute nothing when used as theme overrides. `tokens.entries()` / `tokens.walk()` remain the way to enumerate every leaf.
