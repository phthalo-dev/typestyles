---
'typestyles': minor
---

Add runtime token-ref introspection (#321). Token refs from `tokens.declare()` / `tokens.create()` are lazy proxies whose `has` trap used to return `true` for every key, making a token **group** indistinguishable from a **leaf** at runtime (`'var' in group` was `true`, and reading `group.var` handed back another proxy for a custom property that does not exist).

- New `isTokenRef(value)` export: `true` only for token **leaf** refs (the `{ name, var }` objects a tree returns for leaf paths); groups always return `false`.
- New `tokens.entries(refs)` / `tokens.walk(refs, visit)`: enumerate the leaves of any refs tree or subtree (from `declare`, `create`, or `use`) as `[path, ref]` pairs — namespace-relative dashed paths in declaration order, refs normalized to the `{ name, var }` shape.
- The `has` trap on token refs proxies is now honest: `'var' in ref` is `true` only for leaves, and `'path' in tree` is `true` only for declared or created paths. A token path literally named `var`, `name`, or `length` wins over the member shims in both `in` checks and property access.
- New `TokenLeafRef` type export (the `{ name, var }` leaf shape).
