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

2025.10 specifies structured values: color `{ colorSpace, components, alpha?, hex? }`, dimension `{ value, unit: px|rem }`, duration `{ value, unit: ms|s }`. This codec accepts and emits **string** values (e.g. `"#fff"`, `"16px"`, `"200ms"`) for these types. Object-form values pass through untouched (never parsed or rewritten). Strict-2025.10 consumers may need a conversion step.
