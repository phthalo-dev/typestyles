---
'typestyles': minor
---

`createTypeStyles(...).withRecipes({ button, card })` records the instance's recipes at the type level (runtime no-op returning the same instance; keys are recipe names, and development warns on a mismatch). Theme `components` in `createTheme` and `Theme.override` is then closed to those names, and each entry is typed against its own recipe: slots, axes, `compoundVariants`, `vars`, and a `styles` factory's `ctx.vars` / `ctx.tokens`. Without `withRecipes` nothing changes.

`Theme`, `TokensApi` and `TypeStylesApi` gain a trailing defaulted type parameter for the registry.

Also fixes slot names never being checked for slot recipes in `override()` and theme `components` (`RecipeSlots` widened to `string` on a recipe handle), so an unknown slot such as `footer` is now an error.
