---
'typestyles': patch
---

Fix stale CSS after editing a recipe or `style()` registered on a `createTypeStyles({ scopeId })` instance during Vite dev. The plugin's HMR `dispose` only knows the recipe name, so it released the namespace reservation without removing the scoped rules (`.var-ui-libraryWave__…`), and the re-run then skipped its dev cleanup. A namespace released by name is now remembered, and its next registration clears the old rules.
