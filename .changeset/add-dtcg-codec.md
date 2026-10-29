---
'typestyles': minor
---

Add `typestyles/dtcg` runtime DTCG codec. `fromDTCG` treats input as untrusted: it enforces `maxDepth`, `maxNameLength`, `maxTokens`, `maxErrors` and `maxWarnings` limits (options with safe defaults), allows only letters (including combining marks), digits, `-` and `_` in names, rejects values that could break CSS (including comment delimiters, unterminated strings, unbalanced brackets and `url(`), and reports structured values and other likely mistakes in `warnings`. `toDTCG` never throws, skips cycles and stops after `maxNodes` groups and tokens.
