# Component Override Contract + `@scope` Helper — Implementation Spec (P5.3)

Implements `IMPROVEMENTS.md` P5.3. Derives the design from TypeStyles' own
existing subsystems (semantic class naming, cascade layers, CSS serialization) —
see the note at the end on why this ends up looking different from other
libraries' component-override stories, not just differently named.

---

## The actual problem

A theme wants to change how a component looks beyond whatever CSS custom
properties its author exposed. There is exactly one avenue for that: write CSS
targeting the component's class name.

For a **single, non-nested** theme region, this already works today with no new
engine work: `.theme-acme .button-base { … }`, placed in a cascade layer that
sits after the component's own layer, wins outright — cascade layers decide
outcome by layer order, not selector specificity, so there's no fight to have.

The problem shows up specifically when **two theme regions are nested** inside
each other and both target the same component — e.g. a `.theme-beta` widget
embedded inside a `.theme-acme` page, each wanting a different override for the
same recipe. `.theme-acme .button-base { … }` and `.theme-beta .button-base {
… }` have _identical_ specificity (0,2,0 each), so within the same layer the
winner is whichever rule was inserted into the stylesheet **later** — a fact
about module load order and HMR timing, not about which theme is actually
closer to the element in the DOM. That's the one gap ordinary selectors and
cascade layers can't close on their own, and it's exactly what CSS `@scope`'s
proximity-based matching was built for: the browser resolves ties by picking
the rule whose scoping root is the _nearest_ ancestor, independent of source
order. So `@scope` earns its place here for one specific, narrow reason — not
as a general replacement for plain selectors or layers.

---

## Two-tier override model

### Tier 1 — component-scoped CSS custom properties (primary; no new engine work)

Already the working pattern (see `button.ts`'s `c.vars({...})`): a component
author exposes a themeable property as a CSS custom property scoped to the
component. This tier is proximity-correct **for free** — custom property
values inherit down the DOM tree and get reassigned at each `.theme-*`
boundary, so a nested theme automatically overrides only its own subtree with
zero scoping logic required. This is ordinary CSS cascade behavior, not
something this spec needs to build.

**Consequence for the spec:** the highest-leverage deliverable here isn't new
code, it's the guidance to component authors — _"if you expect a property to
vary per theme, expose it as a var; that's the one override surface that never
needs `@scope`, a layer, or any tooling in this spec."_

### Tier 2 — plain CSS against the class name (the escape hatch)

For a property the author didn't anticipate exposing as a var. Two cases:

- **Non-nested:** works today — a themed selector plus a later cascade layer.
  No new API. Document it as already-supported so nobody reaches for new
  tooling they don't need.
- **Nested/conflicting:** needs `@scope` for proximity-correctness, per the
  problem statement above. This is what `scope()` (below) is for.

---

## Part A — the public contract

**Promise:** once a package ships a `recipe()` call in `semantic`
naming mode, its emitted class names (`{namespace}-{variant-segment}`
combinations) are public API. A consumer is entitled to target them directly
with plain CSS, `scope()`, or any other CSS tooling. Renaming a
namespace or a variant key is a breaking change under that package's normal
versioning rules — nothing about the type system catches this today (a
renamed _string literal_ passed to `recipe('button', …)` produces no
compiler error anywhere, unlike a renamed export), so it has to be promised and
defended deliberately, not left implicit.

**Corollary for component authors:** the two-tier model above means there's a
concrete authoring guideline, not just a promise about existing behavior — if
you expect a property to vary by theme, expose it as a `ctx.var`. That
guideline is what keeps most consumers on Tier 1 and out of `@scope` entirely.

Both of these are documentation deliverables (theming docs page: the two-tier
decision guide; component-authoring docs: the var-exposure guideline).

---

## Part B — `scope()`

```ts
function scope(
  opts: { root: string; to?: string; layer?: string },
  className: string,
  overrides: CSSProperties,
): void;
```

- `overrides` is compiled via the **existing** `serializeStyle('.' + className,
  overrides)` (`css.ts`) — the same serializer `style`/`recipe`
  already use. It already recurses through pseudo-selectors and nested at-rules,
  so `:hover`, `@media`, etc. inside `overrides` work with no new logic.
- Each resulting rule is wrapped: ``@scope (${opts.root})${opts.to ? ` to
  (${opts.to})` : ''} { ${rule.css} }``.
- If `opts.layer` is passed, the `@scope`-wrapped rule is further wrapped via
  the **existing** `applyLayerToRules` (`layers.ts`) — the identical function
  `createTheme` already calls — so a scoped override participates in a
  project's existing layer stack rather than introducing a second, parallel
  layering concept.
- Registered via the **existing** `insertRules` (`sheet.ts`). No new
  registration, HMR, or SSR-collection path — it's captured by zero-runtime
  build extraction automatically, the same way every other TypeStyles output
  is, with no bundler-plugin changes required.
- **Not** folded into the `tokens.when` / `createTheme` condition engine as a
  new condition type. That engine's declaration payload is a `ThemeOverrides`
  map (`--namespace-key: value` pairs); `scope()`'s payload is arbitrary
  `CSSProperties`. Conflating the two shapes to save one file would complicate
  `createTheme` for a narrower, comparatively rare use case. Keeping this as a
  separate function keeps the change's blast radius to one new file.

**Browser support:** `@scope` ships in Chrome 118+, Firefox 128+, Safari 17.4+.
Document this plainly as an opt-in escalation for the nested-conflict case —
consumers targeting older browsers stay on the Tier 2 non-nested pattern
(plain selector + layer) and accept the documented "last-registered wins"
caveat if they do have nested conflicting themes. `scope()` is offered,
not mandatory.

---

## Part C — breaking-rename detection

Restated in TypeStyles' own terms: a semantic-mode class name is a direct,
mechanical function of the string literal passed to `recipe()` /
`style()`. Changing that literal is invisible to TypeScript — unlike a
renamed export, it produces no compiler error at any call site — so it's
exactly the class of "silently-changed output with no type error" problem
`@typestyles/eslint-plugin` already exists to catch (duplicate-namespace
detection, scopeId guardrails).

**Design:**

- A checked-in snapshot file (e.g. `.typestyles-public-classnames.json`) lists
  every namespace + variant-key combination a package has shipped, generated
  by statically walking `recipe`/`style` call sites (reusing
  the AST-scanning the existing eslint-plugin rules already perform to find
  these calls) and computing the class name string the same way
  `class-naming.ts` does.
- A companion script (not the lint rule itself) regenerates the snapshot:
  `typestyles snapshot --write`. Updating the snapshot is a
  deliberate, explicit step — the same "you must acknowledge this" pattern
  changesets already use in this repo, rather than an eslint `--fix` that
  silently approves a rename.
- New rule `@typestyles/no-removed-public-classname`: recomputes the current
  set the same way, diffs against the committed snapshot, and errors on
  anything present in the snapshot but missing now. Adding a new class name
  never fails — only removals/renames do.
- **Opt-in, not default.** This is relevant to packages that _are_ design
  systems (public component libraries), not typical application code. It's
  enabled by adding the snapshot file and rule config to a package, not part
  of `@typestyles/eslint-plugin`'s recommended preset.

---

## Testing

- **`scope.test.ts`**: `scope()` produces the expected `@scope (...) to
  (...) { .class { ... } }` string for a plain properties object and for one
  containing a pseudo-selector (confirms `serializeStyle`'s existing recursion
  is reused correctly, not reimplemented); the `layer` option nests `@layer`
  outside `@scope`, matching `applyLayerToRules`'s existing wrapping
  convention; the rule is retrievable from `getRegisteredCss()`.
- **eslint-plugin rule tests**: a fixture package with a committed snapshot —
  renaming a namespace fails the rule; adding a new variant key passes without
  requiring a snapshot change; removing a variant key fails.

---

## Implementation Tasks

### Task 1 — `scope()` in core

Implement per Part B, reusing `serializeStyle`, `applyLayerToRules`,
`insertRules`.

**Done when:** unit tests from Testing pass; no new CSS-serialization or
layer-wrapping logic was written (both reused from existing files).

### Task 2 — Two-tier override docs

Add the Tier 1 / Tier 2 decision guide to the theming docs page: "expose a var
if a component author anticipated the need; use `scope()` only for
nested-theme conflicts; use a plain selector + layer for everything else."
Include the browser-support callout for `@scope`.

**Done when:** docs page builds and includes a runnable example of each tier.

### Task 3 — Public-contract + authoring docs

Document the semantic-classname stability promise (Part A) on the theming
docs page, and the "expose it as a var" guideline on the component-authoring
docs page.

**Done when:** both docs sections exist and cross-link to each other and to
Task 2's guide.

### Task 4 — Classname snapshot script

Build `typestyles snapshot --write` (or fold into an existing CLI
entry point if one exists by the time this is implemented) per Part C.

**Done when:** running it against a real `recipe()`-using package
(e.g. var-ui's `@var-ui/core`) produces a snapshot file listing its current
namespace/variant class names.

### Task 5 — `no-removed-public-classname` eslint rule

Implement the rule per Part C, consuming the Task 4 snapshot format.

**Done when:** eslint-plugin rule tests from Testing pass.

### Task 6 — Tests

Write the tests described in Testing for both new pieces.

**Done when:** `pnpm test` passes in `packages/typestyles` and
`packages/eslint-plugin` with the new suites included.

### Task 7 — Docs + roadmap update

Cross-link everything from the theming docs nav. Mark P5.3 shipped in
`IMPROVEMENTS.md` with the PR link.

**Done when:** docs site builds; `IMPROVEMENTS.md` checkbox is checked with a
PR reference.

---

## Explicitly out of scope

- **Extending `tokens.when` / `createTheme` to natively support `@scope` for
  token overrides.** Token overrides are CSS custom properties, which already
  get proximity-correct nested-theme behavior for free via inheritance (see
  Tier 1). There's no known case that needs it; revisit only if one shows up.
- **Autofixing renamed class names** (`eslint --fix` silently updating the
  snapshot). Acknowledging a rename is a deliberate step via the Task 4
  script, not an automatic one.
- **A bulk config-object API** for authoring many component overrides in one
  call. `scope()` is a single-call primitive by design; if bulk
  authoring ergonomics become a real pain point later, that's a follow-up
  spec, not part of this one.

---

## Why this doesn't read like a straight port of another library's design

Two decisions above are easy to get wrong by analogy rather than derivation,
worth calling out explicitly:

1. **`@scope` is justified by one specific failure mode** (nested-theme
   tie-breaking), not adopted wholesale as "how you write theme CSS." A
   design that reached for `@scope` everywhere would be solving a problem
   (selector specificity) that cascade layers already solve here.
2. **Component-scoped CSS variables are Tier 1, not an afterthought.** Because
   custom properties already inherit correctly through nested themes, the
   single biggest thing this spec does for override ergonomics is a
   documentation guideline aimed at component authors, not a new runtime
   primitive. A design that started from "we need an overrides config object"
   would have missed that the hard part is already solved by ordinary CSS
   inheritance, and gone straight to building new machinery that duplicates
   what variables give for free.
