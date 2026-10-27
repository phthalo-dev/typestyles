---
'@typestyles/vite': minor
'@typestyles/build-runner': patch
'@typestyles/astro': patch
---

Emit Vite extracted CSS as a content-hashed asset by default so production deploys cannot pair new JavaScript with a cached `typestyles.css`. Dev still serves the stable `/typestyles.css` URL. Set `extract.fileName` to a literal path to opt out, or use `[hash]` placeholders for a custom name.

`@typestyles/astro` keeps the stable `typestyles.css` name by default, because Astro pages do not pass through Vite's HTML rewrite.
