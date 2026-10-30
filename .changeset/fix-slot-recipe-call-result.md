---
'typestyles': patch
---

Fix slot recipe call results being typed as `Record<string, ComponentAttrsResult>`. The result is now keyed by the declared slot names, so a mistyped slot is a compile error.
