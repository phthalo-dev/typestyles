---
'typestyles': minor
---

`ctx.tokens` is now typed in `Theme.override({ components })` and `override({ styles })`, not just `createTheme({ components })`. With `createTypeStyles(...).withTokenRefs(designTokens)`, a child theme's component factory sees the instance's built-in refs plus the parent's namespaces and its own `extend`; `override({ styles })` sees the built-in refs. Without `withTokenRefs` both stay the loose token bag.

`Theme` gains a second type parameter (`Theme<E, B>`, default empty) and `OverrideFn` gains `B`; existing code is unaffected. `Theme.override` also no longer collapses the theme's token types to `never` when `extend` is omitted.
