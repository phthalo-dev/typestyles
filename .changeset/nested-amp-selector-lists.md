---
'typestyles': patch
---

Fix nested `&` selectors under a selector-list parent: `'.a &, &.b': { '& .c': … }` now emits `.a .x .c, .x.b .c` instead of attaching `.c` only to the last list item. Nested keys that are themselves lists get the cross product.
