---
'typestyles': minor
---

Add `inheritOverride` option to recipe `vars` so ancestor custom-property values are not shadowed by the host class default (#333).

Recipe `vars` defaults are normally declared on the recipe's host class — for example `.var-ui-code-block { --var-ui-code-block-fontsize: var(--var-ui-fontSize-sm) }`. Because the host class targets the same element, this re-declaration shadows any value set on an ancestor, so "set this component's var for everything in this region" did not work the way a custom property normally would.

- A recipe var can now be marked with `inheritOverride: true`:

  ```ts
  recipe({
    name: 'code-block',
    vars: {
      fontSize: { value: 'var(--fontSize-sm)', inheritOverride: true },
    },
    styles: ({ vars }) => ({
      base: { fontSize: vars.fontSize.var },
    }),
  });
  ```

- With `inheritOverride: true`, the default is emitted as a `var(--name, <default>)` fallback wherever the var is read, instead of being declared on the host class. An ancestor can now set `--code-block-fontsize` and the component will use that value.
- The host class no longer re-declares the default for `inheritOverride` vars, and the default is not copied onto routed slots either; read sites always carry the fallback.
- `typestyles/lite` plans record the fallback value so the zero-runtime handle's `.vars.x.var` matches the full runtime.
- Non-`inheritOverride` vars keep the existing behavior: defaults are declared on the host and routed slots as before.
