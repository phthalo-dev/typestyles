---
'typestyles': patch
---

Collapse the copied `createStyles` and `recipe` overload lists into one parameterized signature. Passing `{ varDefinitions }` to `recipe()` no longer infers `.vars`; declare `vars` on the config or call `c.vars()`.
