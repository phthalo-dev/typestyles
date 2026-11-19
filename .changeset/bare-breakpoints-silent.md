---
'typestyles': patch
---

Bare-length breakpoints (`md: '48rem'`) no longer warn. They already resolved to the mobile-first `(min-width: 48rem)`, the universal convention, so the warning described the supported behaviour rather than a problem. It printed once per breakpoint in every process.
