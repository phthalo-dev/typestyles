---
'typestyles': minor
'@typestyles/build-runner': patch
'@typestyles/eslint-plugin': patch
'@typestyles/cli': patch
---

Breaking: `recipe()` and `override()` take one object. Positional calls (`recipe(name, config)`, `recipe(name, definition, callback)`, and `override(component, config, options)`) are removed. Declare `slots`, variant axes, and `vars` on that object and put option styles in `styles`, which is checked against those fields. Every call returns `{ className, attrs, props }`.
