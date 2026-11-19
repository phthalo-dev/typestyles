---
'typestyles': patch
---

Fix auto-routed recipe var defaults overriding inherited values (regression in 0.36.0, [#329](https://github.com/phthalo-dev/typestyles/pull/329)). A slot that reads a var now gets the var's default, and its `override()` theme values, only where it has no host ancestor (a portaled popup), through `.slot:where(:not(.host *))`. Before this fix the default was declared on the slot unconditionally. That declaration beat the value the slot should inherit from the host: a variant (a tone colour), an inline `style` or a value set per item (a rating star's fill), so those stopped reaching the slot. Explicit `slots` options keep declaring the default unconditionally.
