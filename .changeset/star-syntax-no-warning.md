---
'typestyles': patch
---

Stop warning when a `syntax: '*'` var/token has a `var()`/`env()`-dependent value. `@property` with `*` adds nothing (no type, no interpolation), so skipping it is the correct result; typed syntaxes without a usable `initial` still warn.
