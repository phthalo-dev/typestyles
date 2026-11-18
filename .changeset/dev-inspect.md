---
'typestyles': minor
'@typestyles/vite': patch
---

Add dev-only inspection helpers for runtime style debugging. The new `typestyles/inspect` entry point exports `inspect(className)`, `inspectClassList(classNames)`, and `inspectElement(element)`, and registers `window.__TYPESTYLES_INSPECT__` for console use. In attribute mode, opt in to `data-ts-source` attributes by setting `globalThis.__TYPESTYLES_DEV_INSPECT__ = true` (or `{ root }` to relativize paths). This complements the existing `extract.sourceComments` option, which covers extracted CSS, by addressing the runtime injection path where `CSSStyleSheet.insertRule` strips comments. The Vite plugin now auto-imports `typestyles/inspect` in dev so the global is available without manual imports.
