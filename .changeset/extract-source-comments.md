---
'typestyles': minor
'@typestyles/build-runner': minor
'@typestyles/vite': minor
---

Add opt-in `extract.sourceComments` to precede each extracted CSS rule with a `/* path:line */` comment naming the `recipe()` / `style()` call that registered it. `@typestyles/vite` passes the option through to the extract; paths are relative to the project root. Runtime injection is unchanged because `insertRule` drops comments.
