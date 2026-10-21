---
'typestyles': minor
'@typestyles/build-runner': patch
'@typestyles/eslint-plugin': patch
'@typestyles/cli': patch
---

`recipe()` and `override()` take one object. Declare `slots`, variant axes, and `vars` on that object and put option styles in `styles`, which is checked against those fields. The call always returns `{ className, attrs, props }`.
