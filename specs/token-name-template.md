# Custom CSS Variable Name Control (`nameTemplate`) — Implementation Spec (P6)

Implements `IMPROVEMENTS.md` P6 — optional control over emitted **CSS custom
property names** from `tokens.create`, without giving up typed `var(--…)`
references or theme/`@property` integration.

---

## The actual problem

TypeStyles names tokens with a fixed, predictable pattern:

```ts
const tokens = createTokens({ scopeId: 'app' });
tokens.create('color', { brand: { primary: '#0066ff' } });
// Emits: --app-color-brand-primary: #0066ff
// Ref:   color.brand.primary → var(--app-color-brand-primary)
```

That default is correct for greenfield TypeStyles apps. It breaks down in three
real situations:

1. **Migrating an existing CSS variable system** — a product already ships
   `--color-brand-500`, `--spacing-4`, or Tailwind-style `--tw-*` names in
   global CSS, Style Dictionary output, or third-party component libraries.
   Re-emitting `--app-color-brand-500` duplicates vars; authors need TypeStyles
   refs that **point at the names already in the stylesheet**.

2. **Design-tool / DTCG conventions** — W3C Design Tokens JSON describes
   logical paths (`color.brand.500`); Style Dictionary and Figma plugins emit
   vendor-specific CSS names. Teams want TypeStyles to **match their
   canonical CSS naming spec** (prefix, segment separator, omission of
   namespace segment) while keeping TS nesting for authoring.

3. **Cross-package aliasing** — semantic tokens should resolve to
   `var(--primitive-color-blue-500)` with a **different prefix pattern** than
   the default `{scopeId}-{namespace}-{path}` — e.g. semantic vars live under
   `--ds-*` while primitives stay under `--color-*`.

`scopeId` alone only adds one prefix segment; it cannot reorder segments,
drop the namespace, change `-` joining rules, or map `brand.primary` →
`brand-500`. `tokens.use()` references another namespace's names but cannot
change emission. **`nameTemplate` closes that gap** as an opt-in escape hatch
with a stable default.

---

## Guiding principles

| Principle                                           | Rationale                                                                                                                                                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Default unchanged**                               | Omitting `nameTemplate` keeps today's `--{scopedNs}-{path}` behavior byte-for-byte. Zero breaking change for existing consumers.                                                                                                        |
| **One function, all emission sites**                | The same resolver runs for `:root` injection, proxy `var()` strings, `createTheme` overrides, `@property` registration, and `tokens.use()` — mismatched names between declaration and reference is the primary failure mode to prevent. |
| **Sanitize, then emit**                             | Template output passes through the same segment sanitization as `sanitizeClassSegment` (lowercase, safe charset) before `--` prefixing. Invalid names throw in development.                                                             |
| **Instance default + per-namespace override**       | `createTokens({ nameTemplate })` sets the default; `tokens.create('color', values, { nameTemplate })` overrides for one namespace (e.g. semantic vs primitive patterns).                                                                |
| **Path is flattened, segments available**           | Templates receive both the default flattened `path` (`brand-primary`) and `segments: ['brand', 'primary']` so callers can join with `.`, `_`, or `/` if their external spec demands it.                                                 |
| **Theme overrides follow the namespace's template** | `createTheme({ base: { color: { … } } })` emits `--*` names using the template registered when `color` was `create()`d — themes never invent a parallel naming scheme.                                                                  |

---

## Public API

### `TokenNameContext`

```ts
export type TokenNameContext = {
  /** Raw `scopeId` from `createTokens`, trimmed; undefined when unscoped. */
  scopeId: string | undefined;
  /** Sanitized scope segment used in default naming (`app` from `@acme/ui`). */
  scope: string;
  /** First argument to `tokens.create('color', …)`. */
  namespace: string;
  /** Flattened leaf path with default `-` join (`brand-primary`). */
  path: string;
  /** Path segments before joining (`['brand', 'primary']`). */
  segments: readonly string[];
};
```

### Template type

```ts
export type TokenNameTemplate = (ctx: TokenNameContext) => string;
```

The function **returns the full custom property name including `--` prefix**:

```ts
nameTemplate: ({ scope, namespace, path }) => `--${scope}-${namespace}-${path}`,
// Equivalent to today's default when scopeId is set.
```

**Validation:**

- Return value must match `/^--[a-z0-9-]+$/` after sanitization (same rules as
  today).
- Throw in development if template returns duplicate names for distinct paths
  within one `tokens.create` call (collision detection during flatten pass).

### `createTokens` option

```ts
createTokens({
  scopeId: 'app',
  nameTemplate: (ctx) => `--${ctx.namespace}-${ctx.path}`, // drop scope from var name
});
```

### `tokens.create` option

```ts
import { createTokens } from 'typestyles';

const tokens = createTokens({ scopeId: 'app' });

tokens.create(
  'color',
  { brand: { 500: '#0066ff' } },
  {
    nameTemplate: (ctx) => `--color-${ctx.segments.join('-')}`, // --color-brand-500
  },
);
```

`options.layer` (cascade layers) and `nameTemplate` compose independently.

### Default template (reference implementation)

When `nameTemplate` is omitted, use the current algorithm:

```ts
function defaultTokenNameTemplate(ctx: TokenNameContext): string {
  const ns = ctx.scopeId ? `${sanitizeClassSegment(ctx.scopeId)}-${ctx.namespace}` : ctx.namespace;
  return `--${ns}-${ctx.path}`;
}
```

Note: this matches `scopedTokenNamespace(scopeId, namespace)` + `'--' + path`
today.

---

## Examples (motivating cases)

### Match existing Style Dictionary CSS

```ts
const tokens = createTokens({ scopeId: 'acme' });

const primitive = tokens.create('color', palette, {
  nameTemplate: ({ segments }) => `--color-${segments.join('-')}`,
});
// --color-brand-500  (no acme- prefix — acme scope still applies to theme *classes*, not these vars)

const semantic = tokens.create('semantic-color', {
  text: { primary: primitive.brand[500] },
  nameTemplate: ({ path }) => `--ds-color-${path}`,
});
// --ds-color-text-primary: var(--color-brand-500)
```

Exact templates are consumer choices; the spec only guarantees the hook works
consistently.

### Reference foreign vars (no `:root` emission)

When migrating, sometimes **only** `tokens.use()` is needed — but when a
namespace is both created and consumed, names must match an external sheet:

```ts
import { createTokens } from 'typestyles';

const tokens = createTokens({ scopeId: 'app' });

tokens.create('space', spaceScale, {
  nameTemplate: () => `--spacing`, // invalid — must include path; illustrative only
});
// Correct pattern:
tokens.create('space', spaceScale, {
  nameTemplate: ({ path }) => `--spacing-${path}`, // --spacing-md
});
```

### Align Open Props / third-party naming

```ts
import { createTokens } from 'typestyles';

const tokens = createTokens({ scopeId: 'app' });

tokens.create('size', sizes, {
  nameTemplate: ({ path }) => `--size-${path}`, // matches open-props convention
});
```

---

## Core implementation

### 1. `packages/typestyles/src/token-naming.ts` (new)

```ts
export function resolveTokenName(
  template: TokenNameTemplate | undefined,
  ctx: TokenNameContext,
): string;

export function buildTokenNameContext(
  scopeId: string | undefined,
  namespace: string,
  path: string,
  segments: readonly string[],
): TokenNameContext;

export const defaultTokenNameTemplate: TokenNameTemplate;
```

`resolveTokenName` applies template (or default), sanitizes, validates, returns
`--…` string **without** the `var()` wrapper.

### 2. Registry per namespace

Extend the per-instance registry in `tokens.ts`:

```ts
// Pseudocode — alongside createdTokenKeys
createdTokenNameTemplates.set(namespace, template | undefined);
```

On `tokens.create`:

1. Resolve effective template: `options?.nameTemplate ?? instanceDefault`.
2. During `flattenTokenEntries`, for each `[path, value]`:
   - Split `path` into `segments` (`path.split('-')` is wrong for keys that
     contain hyphens in leaf names — **store segments during flatten** by
     changing `flattenTokenEntries` to yield `[path, segments, value]` or
     add `flattenTokenPaths` that preserves segment arrays).
3. `const name = resolveTokenName(template, ctx)`.
4. Emit `:root { ${name}: ${value}; }`.
5. Build proxy leaves with `var(${name})` / `@property` on `name`.

**Important:** `flattenTokenEntries` today joins with `-` only. For templates
that need faithful segments, thread segment arrays from the recursive flatten
walk rather than re-splitting `path` (re-split breaks keys like `'2xl'` or
`'line-height'` if ever nested — use the actual object keys at each level).

### 3. `createTokenProxy` changes

Proxy currently computes `makeToken(p) => var(--${namespace}-${p})`. Replace
with lookup from a **`path → resolvedName` map** built at `create()` time:

```ts
const nameByPath = new Map<string, string>(); // 'brand-primary' → '--color-brand-primary'
```

Proxy `get` handler resolves `newPrefix` path → `var(${nameByPath.get(newPrefix)})`.

### 4. `tokens.use()`

When referencing a namespace created with a custom template, `use()` must read
the same `nameByPath` map from the registry (not recompute default names).
If `use()` is called before `create()` for that namespace, keep today's dev
warning; names come from whoever registered first.

### 5. `theme.ts` — `buildDeclarations`

Replace:

```ts
parts.push(`--${cssNs}-${key}: ${value}`);
```

with:

```ts
parts.push(`${resolveRegisteredTokenName(scopeId, namespace, key)}: ${value}`);
```

where `resolveRegisteredTokenName` reads the stored template/map for
`namespace`. Theme class segments (`themeSegment`) **unchanged** — this spec
only affects custom properties, not `.theme-*` class names.

### 6. `@property` registration

`registerAtPropertyRule(name, …)` already takes the full name — pass the
template-resolved `--…` string from step 2. No separate code path.

### 7. `CreateTokensOptions` / types export

Export `TokenNameContext`, `TokenNameTemplate` from `typestyles` (and document
on [Tokens](/docs/tokens) + [Style Dictionary & W3C tokens](/docs/style-dictionary)).

---

## Interaction with `scopeId`

| Concern                      | Behavior                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default template             | Includes sanitized `scopeId` in the namespace segment (`--app-color-…`).                                                                           |
| Custom template              | Author may include or omit `ctx.scope` explicitly — TypeStyles does not force scope into the name when a template is provided.                     |
| Collision across bundles     | Omitting scope from var names restores collision risk; document prominently. Pair with `scopeId` on **classes** even when vars match global names. |
| `tokens.use()` across scopes | Each `createTokens` instance has its own registry; custom names do not leak across instances.                                                      |

---

## Testing

Add `packages/typestyles/src/token-naming.test.ts` and extend `tokens.test.ts` /
`theme.test.ts`:

| Case                                        | Expected                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| No `nameTemplate`                           | Identical output to current snapshots (`--color-primary`, `--app-color-primary` with scope). |
| Custom template drops scope                 | `--color-brand-500` emitted; proxy returns `var(--color-brand-500)`.                         |
| Segments join with custom separator         | `segments.join('_')` → `--color-brand_primary`.                                              |
| Per-namespace override                      | Instance default adds scope; one namespace overrides without scope.                          |
| `createTheme` override                      | Theme rule uses templated names for overridden keys.                                         |
| Descriptor leaf `{ value, syntax }`         | `@property` registered on templated name.                                                    |
| Duplicate template output for two paths     | Dev: throws on `create()`.                                                                   |
| Invalid characters in template output       | Sanitized or dev throw.                                                                      |
| `tokens.use('color')` after custom `create` | Same `var()` strings as direct ref.                                                          |
| `getRegisteredCss()`                        | Contains templated `--*` declarations only.                                                  |

---

## Implementation tasks

### Task 1 — Segment-preserving flatten + `token-naming.ts`

Add flatten helper that yields `{ path, segments, value }[]`; implement
`resolveTokenName` + default template.

**Done when:** unit tests pass for resolver and segment preservation.

### Task 2 — Wire `nameTemplate` through `tokens.create`

Build `nameByPath` map; update `:root` emission, proxy, descriptor meta,
registry.

**Done when:** `tokens.test.ts` covers custom template + proxy access.

### Task 3 — Wire through `theme.ts` and `tokens.use`

Theme overrides and `use()` read registered names.

**Done when:** `theme.test.ts` shows themed override uses templated `--*` name.

### Task 4 — TypeScript surface

Extend `CreateTokensOptions`, `tokens.create` options type, export public types.

**Done when:** API reference page types match implementation.

### Task 5 — Docs + Style Dictionary cross-link

Document on [Tokens](/docs/tokens) and add a "Matching external CSS names"
subsection to [Style Dictionary & W3C tokens](/docs/style-dictionary).
Mark `IMPROVEMENTS.md` item shipped with PR link.

**Done when:** docs build.

---

## Explicitly out of scope

- **String literal templates** (`'--{namespace}-{path}'`) — a function template
  is enough for v1; sugar can wrap the function later without API churn.
- **Renaming theme class segments** (`.theme-*`) — separate concern from custom
  properties; use `scopeId` and theme naming docs.
- **Component internal `c.var()` names** — `ComponentConfigContext` uses
  `scopedTokenNamespace` + sanitized paths; unification is a follow-up only if
  a concrete need appears.
- **`property()` global registered properties** — unrelated API surface.
- **Runtime mutation of templates after `create()`** — templates are fixed at
  registration; changing them requires a new namespace or new `createTokens`
  instance.
- **Importing DTCG JSON directly** — done: `fromDTCG` / `toDTCG` in `typestyles/dtcg` (previously tracked separately as "W3C Design Tokens
  import + Figma sync" in `IMPROVEMENTS.md`). `nameTemplate` remains the low-level
  hook Style Dictionary / hand-rolled pipelines use once values reach
  `tokens.create`.
- **Automatic reverse mapping from existing CSS** — no parser for arbitrary
  stylesheets; authors express intent via template function.

---

## Docs callouts (required content)

1. **Default is recommended** — custom names are for interop and migration,
   not aesthetics.
2. **Scope omission = collision risk** — when template drops `scopeId`, two
   packages can clobber the same `--color-primary`.
3. **Themes reference the same names** — changing a template after shipping is
   a breaking change for any consumer targeting `--*` in plain CSS (same as
   renaming a token key today).
4. **Style Dictionary split** — keep SD from emitting `:root` CSS; TypeStyles
   remains the single injector (existing gotcha), but SD's **naming convention**
   can now be mirrored via `nameTemplate`.

---

## Why a function template (not config flags)

Flags like `{ omitScope: true, separator: '_' }` cover the common cases but
fail on real conventions (`--ds-color-text`, `--color-brand-500`, matching
legacy `--spacing-4` where `4` is a leaf key). A single `(ctx) => string`
hook matches Style Dictionary custom formats and keeps the core implementation
one code path — the same reason `scopedTokenNamespace` wasn't extended with
five boolean knobs when `scopeId` shipped.
