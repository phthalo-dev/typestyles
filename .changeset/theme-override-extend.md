---
'typestyles': minor
---

`theme.override({ name, extend })` adds new token namespaces to a child theme. They are registered once, emitted on the child's class, and typed on the returned theme's `tokens` (`Theme<E & X>`). `tokens` still patches existing namespaces only. `createTheme({ tokens })` and `tokens.ensureNamespace()` already cover the root-theme side.
