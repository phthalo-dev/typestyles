---
'typestyles': patch
---

Legacy recipes that return `vars: c.vars(...)` now expose those names on `recipe.vars` (`name` and `var`), including attribute-mode slot, flat, and dimensioned callbacks. Schema recipes were already typed this way.
