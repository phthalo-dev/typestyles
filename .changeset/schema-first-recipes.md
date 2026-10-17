---
'typestyles': minor
---

Schema-first recipes: add `variant.enum(options, { default })` and `variant.boolean({ default })` axis helpers, plus a `recipe(namespace, definition, callback, options?)` call shape whose style callback is contextually typed from the definition. Schema recipes expose `.defaults`, derived `RecipeVariants` / `RecipeDefaults` / `VariantOptions` types, and `getComponentMeta(recipe).schema` for docs generators. Legacy `recipe` call shapes are unchanged.
