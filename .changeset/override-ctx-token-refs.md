---
'typestyles': patch
---

`ctx.tokens` in `override({ styles: (ctx) => … })` and `createTheme({ components })` factories now returns real `{ name, var }` refs for every leaf, as `OverrideTokenNode` promises. Before, `tokens.space.md.var` was `undefined` at runtime, so declarations written against the types were silently dropped. `${tokens.space.md}` still interpolates to `var(--…)`. `tokens.use()` and `theme.tokens` are unchanged (they are typed as `var()` strings).
