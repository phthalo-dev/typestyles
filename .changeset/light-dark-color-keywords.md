---
'typestyles': patch
---

Mode-aware `{ light, dark }` values only compile to `light-dark()` when both sides are colors or images. Keywords such as `normal`/`screen`, `none` and filter functions used to be treated as colors, producing `light-dark(normal, screen)`, which is invalid and silently fell back. They now emit the light value plus a dark-mode override rule, like shadows already did. Color detection recognizes CSS named colors, `transparent`, `currentcolor`, system colors, hex and color/image functions.

The "cannot use `light-dark()` — emitting a dark-mode override rule instead" warning is gone (tokens and component vars): the override rule is the supported output, not something to fix.
