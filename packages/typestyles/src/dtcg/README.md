# dtcg (internal note)

Runtime codec between typestyles tokens and W3C DTCG JSON. Not published docs.

## Revision

- Target: Design Tokens Format Module **2025.10** (Final Community Group Report, 28 October 2025), https://www.designtokens.org/tr/2025.10/format/
- Checked 2026-10-28. A newer editor's draft (still titled 2025.10, dated 08 Sep 2026, marked "do not implement") exists; nothing in it changes the decisions below.

## Confirmed against the spec

- Alias syntax is `"{group.token}"` (resolves to a whole token's `$value`). Names may not contain `{`, `}` or `.`. JSON Pointer `$ref` also exists; we do not emit it and pass it through untouched.
- `$type` resolves: token's own, then referenced token's type, then closest enclosing group. Types must not be inferred from values.
- `$extensions` is allowed on tokens and groups, reverse-domain keys recommended; tools must preserve unknown extension data.
- No native modes/themes in the format module. `$extends` is group inheritance only. A separate Resolver Module exists but is not part of the format; it does not define a `$extensions` convention, so there is no conflict.

## Mode encoding (decision)

Light/dark lives under `$extensions["dev.typestyles"]` as `{ dark: <value or alias> }`. The token's `$value` is the light/default value.

```json
{
  "$type": "color",
  "$value": "#fff",
  "$extensions": { "dev.typestyles": { "dark": "{color.base}" } }
}
```

## Supported `$type` names

`color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`, `shadow`, `transition`. Any other `$type` (e.g. `strokeStyle`, `border`, `gradient`, `typography`) passes through as-is.

## Deviation from the spec's value shapes

2025.10 specifies structured values: color `{ colorSpace, components, alpha?, hex? }`, dimension `{ value, unit: px|rem }`, duration `{ value, unit: ms|s }`. This codec accepts and emits **string** values (e.g. `"#fff"`, `"16px"`, `"200ms"`) for these types. Object-form values pass through untouched (never parsed or rewritten) and `fromDTCG` adds a warning, because `tokens.create` flattens them into several custom properties. Strict-2025.10 consumers may need a conversion step.

## Untrusted input (decision)

`fromDTCG` is meant to read theme JSON from storage, so it treats input as hostile:

- Limits with safe defaults: `maxDepth` 32, `maxNameLength` 128, `maxTokens` 50,000. Violations are `invalid-token`; the subtree is not walked (`maxTokens` stops the walk). `maxErrors` and `maxWarnings` (100 each) cap the result; hitting `maxErrors` during the walk stops it. `null` or non-object options mean defaults.
- Entries are stored by numeric id with a parent pointer and their own name; full paths are only built (and truncated to 200 chars) for messages and output, so cost does not grow with path length. Walk and alias resolution are iterative.
- Names are an allow-list: `/^[\p{L}\p{M}\p{N}_-]+$/u` (letters, combining marks, digits, `-`, `_`). `tokens.create` default naming puts names into `--ns-path` unchanged; these are all CSS name code points (non-ASCII included), so the custom property is always valid. Combining marks are allowed so NFD-decomposed names (`a` + U+0308) pass like their NFC form. String values (including dark values, `resolveExternal` results and strings or keys inside structured values) may not contain `; { } < > \`, control characters, `/*` or `*/`, and must have balanced quotes and brackets: one scan where `"`/`'` opens a string only the same quote closes (brackets inside strings ignored), and `(`/`[` outside strings must close in order. An unquoted `url(` (any case, not part of a longer name) is read like CSS reads it: up to the first `)`, rejecting a quote or `(` before it, because CSS would treat those as a bad-url remnant and the scan would disagree about open strings. Aliases are checked after resolution. Embedded aliases (`"1px {s}"`) are rejected by the brace rule; the spec only has whole-value aliases.
- `$type` is only compared between adjacent alias hops, so `a(color) -> b(untyped) -> c(dimension)` passes.
- This keeps output from breaking out of a CSS declaration; it is not a general sanitizer.

## toDTCG (decision)

Best-effort and never throws: unreadable entries (throwing getters, proxies) are skipped, an object already on the current path (a cycle) is skipped, and `maxNodes` (default 50,000 groups plus tokens) stops conversion so shared references cannot multiply the output.
