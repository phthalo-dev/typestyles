# Responsive Object Syntax — Implementation Spec (P6)

Implements `IMPROVEMENTS.md` P6 — breakpoint shorthand in **style property
values** for the core TypeStyles engine (`style`, `recipe`,
theme/global style objects, and any path that serializes `CSSProperties` via
`serializeStyle`).

**Relationship to `@typestyles/props`:** responsive **utility props** already
exist — `defineProperties({ conditions })` + `{ sm: 2, md: 4 }` resolves to
atomic class names at runtime. This spec is **not** that system. It adds the
same _authoring ergonomics_ to **declarative style objects** that compile to
plain CSS `@media` blocks (or additional rules in `atomic` mode), the way
Panda CSS's `{ base, md, lg }` property values and today's manual
`'@media (min-width: …)'` keys do — but without repeating full media-query
strings on every property.

---

## The actual problem

Responsive layout today in core TypeStyles means one of:

1. **Repeat full `@media` keys** beside every property that changes — verbose,
   hard to keep breakpoint names consistent, and noisy in variants:

   ```ts
   base: {
     padding: t.space[4],
     '@media (min-width: 768px)': { padding: t.space[6] },
     '@media (min-width: 1024px)': { padding: t.space[8] },
   }
   ```

2. **Use `@typestyles/props`** for responsive utilities — great for atomic
   layout props, but not for component `base` / variant style objects and not
   for theme/global CSS that never goes through `createProps`.

3. **Split into separate variant keys** — works but conflates "responsive
   tweak" with "semantic variant" (`size: 'lg'` meaning both "large intent"
   and "1024px breakpoint").

The benchmark reference app (`benchmarks/reference-app/components.ts`, container
recipe) already shows the pain: four nearly identical `@media (min-width: …)`
blocks for one component. Panda's equivalent nests under `@media` once; what
designers and Panda/Chakra migrants expect at the **property** level is:

```ts
padding: { base: t.space[4], md: t.space[6], lg: t.space[8] },
```

That syntax does not exist in core serialization today. Adding it closes the
biggest responsive authoring gap left after `@typestyles/props` shipped, without
requiring a compiler or a second styling model.

---

## Guiding principles

| Principle                                        | Rationale                                                                                                                                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sugar over a new runtime**                     | Responsive objects expand at CSS-serialization time into the same `@media { … }` output authors can write manually today. No new class-name scheme in `semantic`/`hashed`/`compact` modes.                                                     |
| **Breakpoints registered once**                  | Breakpoint names (`sm`, `md`, …) map to media-query strings on the instance (`createStyles` / `createTypeStyles`), not re-declared per property.                                                                                               |
| **`base` is the default**                        | Unqualified mobile-first value lives under `base` (Panda/Chakra convention). Accept `_` as an alias for migration ergonomics from Panda's `_` token.                                                                                           |
| **Scalar values only**                           | Responsive object values are `string \| number` — one declaration per breakpoint. Nested `CSSProperties` per breakpoint belong in explicit `@media` keys, not responsive shorthand (avoids ambiguous objects).                                 |
| **Explicit beats magic**                         | Full `'@media (min-width: 768px)'` keys remain valid and take precedence when both forms appear. Unknown breakpoint keys on a value object are **errors in development**, not silent passthrough.                                              |
| **Same breakpoints story as props (eventually)** | v1 ships on the instance; a follow-up may expose a shared breakpoint map type/helper for `@typestyles/props` — out of scope here, but the names and query strings should match what props docs already use (`sm: '(min-width: 640px)'`, etc.). |

---

## Public API

### Breakpoint registry — `createStyles` / `createTypeStyles`

Add an optional **`breakpoints`** field to `createStyles` options (and pass it
through `createTypeStyles` unchanged):

```ts
const { style, recipe } = createTypeStyles({
  scopeId: 'app',
  breakpoints: {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
  },
});
```

- Keys are **breakpoint names** (author-chosen strings; typical `sm`/`md`/…).
- Values are **media query conditions without the `@media` wrapper** — same
  string you'd put inside `@media … { }` (matches `@typestyles/props`
  `{ '@media': '(min-width: 640px)' }`).
- `createTypeStyles()` / `createStyles()` without **`breakpoints`** rejects
  responsive object values in dev (see Validation) until breakpoints are configured
  on that instance.
- Stored on the instance's internal config next to `scopeId`, `mode`,
  `layers` — not global mutable state.

Optional sugar — **`breakpoints.fromTokens`** (nice-to-have in v1, required
before documenting "use Open Props media tokens"):

```ts
import { media } from '@typestyles/open-props';

createTypeStyles({
  breakpoints: { fromTokens: media }, // reads string values from a tokens.create('media', …) ref
});
```

Implementation: if `fromTokens` is set, breakpoint names are the flattened
leaf keys of that namespace and values are the literal media conditions stored
at `tokens.create` time (requires the token registry to expose leaf values for
the `media` namespace — a small read-only accessor on `TokensApi`, not
`var(--…)` strings). If both `fromTokens` and explicit entries are provided,
explicit entries win for overlapping keys.

### Responsive property values

Any `string | number` CSS property value in a `CSSProperties` object may
instead be a **responsive object**:

```ts
import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({
  scopeId: 'app',
  breakpoints: {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
  },
});

recipe('container', {
  base: {
    width: '100%',
    paddingLeft: { base: t.space[4], md: t.space[6] },
    paddingRight: { base: t.space[4], md: t.space[6] },
    maxWidth: {
      base: '100%',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
});
```

**Expansion (non-atomic modes):** for each property `P` with responsive object
`R`:

1. Emit `P: R.base ?? R._` (if present) in the parent rule's declaration block.
2. For each other entry `(name, value)` where `name` is a registered breakpoint,
   emit a nested at-rule on the **same selector**:

   ```css
   @media (min-width: 768px) {
     .container-base {
       padding-left: 24px;
     }
   }
   ```

   Implemented by pushing `{ '@media (…)': { [P]: value } }` into the same
   recursive `serializeStyle` path already used for manual `@media` keys.

**Expansion (`atomic` mode):** each `(property, breakpoint, value)` triple
becomes its own atomic rule wrapped in the breakpoint's `@media` block — same
decomposition rules as today for atomic declarations, plus media wrapping from
`atomic-decompose.ts`. No new atomic class naming scheme.

### Reserved base keys

| Key       | Role                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`    | Default (mobile-first) value; emitted unwrapped in the parent rule.                                                                                           |
| `_`       | Alias for `base` (Panda migration). If both `base` and `_` are present, **`base` wins** and `_` is ignored with a dev warning.                                |
| `default` | **Not supported** — use `base`. Mentioned only so the spec explicitly rejects it (avoids colliding with `@typestyles/props` `defaultCondition` mental model). |

### Nesting interaction

Responsive objects are allowed in:

- `style` / `recipe` `base`, variant styles, compound
  variants, slot styles
- `scope()` overrides
- `global.rule()` / global recipes
- Nested pseudo blocks: `'&:hover': { opacity: { base: 0.9, md: 1 } }` — base
  and breakpoint declarations serialize inside the `:hover` rule (breakpoint
  keys expand to nested `@media` **inside** the pseudo rule's block, which is
  valid CSS)

Responsive objects are **not** interpreted inside:

- Theme **`ThemeOverrides`** passed to `tokens.createTheme` (token values must
  stay scalar — theming is not layout)
- **`@typestyles/props`** prop values (already has its own condition objects;
  unification is a follow-up)

### Validation (development)

When `serializeStyle` encounters a plain object as a property value:

1. If **`breakpoints` is unset** on the instance that owns the
   serialization context → throw (or `console.error` + fall back to invalid CSS
   `"[object Object]"` — **prefer throw in dev**, omit declaration in prod).
2. If every key is in `{ base, _ } ∪ breakpointNames` and every value is
   `string | number` → treat as responsive object.
3. If some keys match breakpoints but others don't, or any value is a non-null
   object → **throw in dev** with a message naming the property and the unknown
   key. Do not partially apply — avoids half-responsive output.

**Ambiguity note:** a value like `{ sm: '8px' }` where `sm` is a breakpoint
is responsive; `{ '&:hover': { color: 'red' } }` remains a nested selector
because the key starts with `&`. A value `{ md: { padding: '8px' } }` fails
rule 3 (nested object value) — author must use `'@media (min-width: 768px)':
{ padding: '8px' }` or split properties.

---

## Core implementation

### 1. `packages/typestyles/src/breakpoints.ts` (new)

```ts
export type BreakpointMap = Record<string, string>;

export type BreakpointsConfig =
  | BreakpointMap
  | { fromTokens: CreatedTokenRef<TokenValues, string> };

export function resolveBreakpoints(
  config: BreakpointsConfig | undefined,
): BreakpointMap | undefined;

export function isResponsiveObject(
  value: unknown,
  breakpoints: BreakpointMap | undefined,
): value is Record<string, string | number>;

export function expandResponsiveProperty(
  prop: string,
  value: Record<string, string | number>,
  breakpoints: BreakpointMap,
): CSSProperties; // plain props + generated `@media (…)` keys
```

`expandResponsiveProperty` returns a flat `CSSProperties` fragment:

```ts
// padding: { base: '8px', md: '16px' }
// → { padding: '8px', '@media (min-width: 768px)': { padding: '16px' } }
```

Use **`@media (${condition})`** as the at-rule key — the exact string form
`serializeStyle` already recognizes — so no changes to at-rule wrapping logic.

### 2. Thread breakpoints through serialization

- Add optional **`breakpoints?: BreakpointMap`** to the internal serialization
  context (today `serializeStyle(selector, properties)` is context-free).
- Plumb from `createStyles` → component/class/global builders →
  `serializeStyle` / `atomic-decompose`.
- **`createTypeStyles`**: copy the same `breakpoints` option onto both
  `styles` and (future) document that `tokens` ignores it.

### 3. `css.ts` — pre-process property entries

In `serializeStyle`, before the nested-selector / at-rule / declaration
branch:

```ts
if (isResponsiveObject(value, breakpoints)) {
  const expanded = expandResponsiveProperty(prop, value, breakpoints!);
  rules.push(...serializeStyle(selector, expanded)); // or inline merge
  continue;
}
```

Ensure expanded `@media` keys merge declarations targeting the **same** media
query when multiple properties share a breakpoint (optional optimization —
correctness does not require merge; duplicate `@media` blocks are valid CSS).

### 4. Types — `CSSProperties` responsive augmentation

Add a conditional type on the `createTypeStyles` / `createStyles` API (exact typing strategy left to
implementation, but the spec requires):

```ts
type ResponsiveValue<T extends string | number, B extends BreakpointMap> =
  | T
  | ({ base?: T; _?: T } & { [K in keyof B]?: T });
```

When `breakpoints` is configured on `createStyles`, component/class config
properties typed as `CSSValue` widen to `ResponsiveValue<CSSValue, typeof breakpoints>`
for that instance. Default unconfigured export keeps today's types unchanged.

---

## Testing

Add `packages/typestyles/src/responsive-object.test.ts` and extend
`css.test.ts`:

| Case                                                                       | Expected                                                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `{ padding: { base: '8px', md: '16px' } }` with `md: '(min-width: 768px)'` | Base rule contains `padding: 8px`; second rule `@media (min-width: 768px) { … padding: 16px … }`. |
| `_` alias                                                                  | `{ padding: { _: '8px', md: '16px' } }` same as `base`.                                           |
| Breakpoint-only keys (no `base`)                                           | Only `@media` rules emitted; no base declaration for that property.                               |
| Inside `'&:hover'`                                                         | Expanded declarations nest under `:hover`, media blocks inside hover block.                       |
| Unknown breakpoint key `foo`                                               | Dev: throws.                                                                                      |
| Non-scalar value `{ md: { color: 'red' } }`                                | Dev: throws.                                                                                      |
| `breakpoints` unset + responsive object                                    | Dev: throws.                                                                                      |
| Manual `'@media …'` + responsive on same object                            | Both apply; no conflict.                                                                          |
| `atomic` mode                                                              | One atomic class per breakpoint-specific declaration, each wrapped in `@media`.                   |
| Theme overrides with responsive object                                     | Ignored / error — overrides reject non-scalar token values (existing behavior).                   |

---

## Implementation tasks

### Task 1 — `breakpoints.ts` + unit tests

Implement `resolveBreakpoints`, `isResponsiveObject`, `expandResponsiveProperty`.

**Done when:** unit tests for expansion and validation pass in isolation.

### Task 2 — Plumb `breakpoints` through `createStyles` / `createTypeStyles`

Store on styles config; pass into all serialization entry points.

**Done when:** configured instance can serialize a responsive object; default
export rejects in dev.

### Task 3 — Integrate into `serializeStyle` + `atomic-decompose`

Pre-expand responsive property values; confirm pseudo and manual `@media` nesting
still pass existing `css.test.ts` / `atomic-decompose.test.ts`.

**Done when:** new tests pass; existing suites unchanged.

### Task 4 — TypeScript inference (optional follow-up in same PR if small)

Widen property value types when `breakpoints` is a const literal on
`createTypeStyles`.

**Done when:** a const breakpoint map autocompletes keys inside responsive
objects in an IDE test fixture (or type test via `expectTypeOf` if the repo
uses it).

### Task 5 — Docs

Add "Responsive property values" to [Components](/docs/components) (or
[Dynamic styles](/docs/dynamic-styles)): register breakpoints once, use
`{ base, md }` on properties, link to `@typestyles/props` for atomic utilities.
Include before/after replacing the reference-app container pattern.

**Done when:** docs build; `IMPROVEMENTS.md` P6 item checked with PR link.

---

## Explicitly out of scope

- **Array shorthand** (`padding: [8, 16, 24]` mapped to breakpoint order) —
  adds implicit ordering magic; revisit only if users ask after object syntax
  ships.
- **Panda-style grouped `@media` object** (`{ '@media': { '(min-width: 640px)':
  { … } } }`) — different sugar; authors can already write `'@media
  (min-width: 640px)'` keys. Could be a separate spec if grouped nesting is
  still too verbose after per-property syntax lands.
- **Container-query breakpoint registry** — v1 is `@media` only. Container
  conditions continue to use explicit `'@container (…)'` keys or
  `container()`.
- **Unifying `@typestyles/props` conditions with styles breakpoints** — desirable
  follow-up (`defineProperties({ conditions: breakpoints })` helper), not
  required for core serialization.
- **Responsive token values in `tokens.create`** — tokens are design primitives,
  not layout breakpoints.
- **Build-time extraction changes** — responsive expansion happens wherever
  `serializeStyle` already runs; zero-runtime path needs no new bundler work
  beyond what those call sites already trigger.

---

## Why this shape (not props, not a compiler)

1. **Component styles compile to real CSS rules**, not utility class lists —
   responsive objects must expand to `@media`, not to
   `atom-padding-md-16`-style names.
2. **Breakpoint registry on the instance** mirrors how `scopeId` and
   `layers` already parameterize a `createTypeStyles` design system — one
   place to define the scale, many components reference names.
3. **Pre-expansion to existing `@media` keys** reuses `serializeStyle`'s
   at-rule branch instead of inventing a parallel responsive code path — same
   reason `scope()` reuses serialization rather than a new CSS printer.
