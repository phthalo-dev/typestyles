---
'typestyles': patch
---

Fix crash when a slot recipe has a slot named `name` (or `length`): these collide with read-only own properties of functions, which previously threw during recipe creation and took down all extracted CSS. Slot accessors are now defined with `Object.defineProperty` so reserved names are supported.
