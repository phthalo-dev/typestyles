---
'typestyles': patch
---

Restore CSS keyword value suggestions in style objects. `CSSValue` is now `(string & {}) | number` (the csstype pattern), so `display: '|'` and `flexDirection: '|'` suggest csstype keywords again inside `style()`, recipe `styles` blocks and callbacks, and slot variant options. Any `string` is still assignable, so widened inferred values keep working.

Also speeds up typechecking code that uses `withUtils` / `createStyles({ utils })`: `CSSPropertiesWithUtils` no longer makes TypeScript compare every csstype value union against a generic mapped type.
