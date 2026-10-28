---
'typestyles': minor
---

Add `typestyles/dtcg` runtime DTCG codec. `fromDTCG` treats input as untrusted: it enforces `maxDepth`, `maxNameLength` and `maxTokens` limits (options with safe defaults), rejects names and values containing characters that break CSS, and reports structured values and other likely mistakes in `warnings`.
