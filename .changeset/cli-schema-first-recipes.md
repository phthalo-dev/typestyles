---
'@typestyles/cli': patch
---

Recognize schema-first `recipe(namespace, definition, callback)` calls when scanning public class names for `typestyles snapshot` and `no-removed-public-classname`. The collector now reads the style config from the callback (third argument) and the `slots` list from the definition (second argument), instead of treating the definition's branded `variant.enum(...)` / `variant.boolean(...)` axes as styles and emitting no names.
