---
'typestyles': patch
---

`Theme.override({ extend })` that overlaps an existing namespace now types the child theme as a deep merge with `extend` winning, matching the runtime. It was an intersection, so a leaf both sides defined with different literals (`'2rem'` and `'3rem'`) collapsed the whole namespace to `never` and `theme.tokens.space.lg` failed to typecheck. Adds an exported `MergeThemeTokens` helper type.
