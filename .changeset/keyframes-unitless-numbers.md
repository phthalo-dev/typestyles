---
'typestyles': patch
---

Keyframe stops now use the same value serialization as styles: unitless properties (e.g. `opacity`, `lineHeight`, `fontWeight`) keep their numbers unitless instead of getting an invalid `px` appended, and custom properties (`--*`) never receive a unit. Previously `{ opacity: 1 }` in a keyframe stop serialized as `opacity: 1px`, which the browser silently dropped.
