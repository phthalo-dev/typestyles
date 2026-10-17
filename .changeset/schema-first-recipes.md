---
'typestyles': minor
---

Schema-first recipes: add `variant.enum(options, { default })` and `variant.boolean({ default })` axis helpers, plus a `recipe(namespace, definition, callback, options?)` call shape whose style callback is contextually typed from the definition. The callback is checked against the definition: missing options, unknown axes, and unknown option keys are all errors. Schema recipes expose `.defaults`, an internal-var-typed `.vars`, derived `RecipeVariants` (null-free props) / `RecipeDefaultsOf` / `VariantOptions` types, and `getComponentMeta(recipe).schema` for docs generators. Legacy `recipe` call shapes are unchanged.
