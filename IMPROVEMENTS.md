# TypeStyles Improvement Plan

Tracking doc for the prioritized improvements from the June 2026 principal-engineer audit.
Each task ships as its own PR. Check items off and link the PR as they land.

Source material: full audit of `packages/typestyles` (source, types, tests), all
integration packages, the docs site (31 pages), and all examples. Supersedes the
remaining open items in `FEEDBACK-COMBINED.md` (Tiers 1–2 of that doc are shipped).

## Strategic frame

We will not out-Tailwind Tailwind or out-atomic StyleX. The winnable market is
**teams building design systems who are burned by runtime CSS-in-JS but refuse to
give up TypeScript ergonomics or CSS interop**. Every task below serves one sentence:

> "As type-safe as vanilla-extract, as ergonomic as Stitches, debuggable like plain
> CSS — and you can verify the zero-runtime output yourself."

---

## P0 — Trust & correctness

Bugs and credibility issues that lose evaluations on contact. Do these first.

- [x] **P0.1 — Fix silent-wrong-output bugs** (PR: #86)
  - Refresh the stale unitless property set in `packages/typestyles/src/css.ts`
    (`aspectRatio: 1.5` currently emits invalid `aspect-ratio: 1.5px`; also
    `scale`, `WebkitLineClamp`, `fontSizeAdjust`, …)
  - Make `scopeId` actually affect semantic-mode class names (today it is a
    silent no-op in `class-naming.ts` — two packages collide without warning)
  - Add dev-mode hash-collision detection (promised in roadmap §6.1, never shipped)
  - Fix `useTypestyles` no-op subscribe in `@typestyles/next/src/client.tsx`

- [x] **P0.2 — Credibility sweep** (PR: #87)
  - Site chrome links to `github.com/typestyles/typestyles`; canonical org is
    `type-styles` (see PR #82). Fix `docs/src/lib/site.ts`, header, landing page.
  - Landing page (`docs/src/pages/index.astro`): DOM preview shows
    `class="button …"` but the product emits `button-base …`; hero sample uses an
    undefined `token.accent`
  - Unify license: `packages/next` and `packages/open-props` say MIT, everything
    else Apache-2.0
  - Delete `packages/build/` zombie directory (dist + node_modules only, untracked
    src, matches the workspace glob)
  - Fix `@typestyles/open-props` broken `./css` export (`dist/open-props.css` is
    never built) and remove the unused `open-props` dependency

- [x] **P0.3 — Surface the production story in the docs nav** (PR: #88)
  - `zero-runtime.md` has 16 inbound links but is not in the sidebar
    (`docs/src/navigation.ts`); `open-props.md` likewise
  - Decide on `css-selector-patterns.md` (internal research → remove from build or
    promote)

- [x] **P0.4 — Request-safe SSR collection** (PR: #89)
  - `collectStyles` uses a module-global buffer (`sheet.ts`); concurrent SSR
    requests interleave CSS. Isolate with `AsyncLocalStorage` on Node.
  - Add async render support: `collectStyles(async () => …)`

## P1 — Competitive table stakes

- [x] **P1.5 — Cut the runtime for the common path** (PR: #90)
  - Main entry is ~15 KB gzip; `color` namespace and helpers are eagerly bundled.
    Move `color` to a `typestyles/color` subpath entry.
  - Add a size budget check to CI and publish the measured number in the README
    comparison table.

- [ ] **P1.6 — Interactive proof in the docs** (PR: )
  - No playground, no live examples anywhere. Because TypeStyles runs in the
    browser, the docs site can render live demos: authored code + emitted CSS +
    actual DOM class names side by side. Ship a `LiveDemo` component and use it on
    getting-started, components, and theming pages.
  - Full editable REPL can follow later (P3).

- [x] **P1.7 — Productize the extraction verifier** (PR: #92)
  - Zero-runtime extraction is execute-and-collect; styles unreachable from the
    convention entry are silently dropped. Promote the pattern from
    `examples/next-app/scripts/verify-typestyles.mts` into
    `@typestyles/build-runner` as a supported `verifyTypestylesBuild()` API +
    document it on the zero-runtime page.

- [x] **P1.8 — First-class dynamic styling story** (PR: #93)
  - `createVar`/`assignVars` exists but is undocumented and anonymous (`--ts-N`).
    Add debug names (`createVar('cardBg')`), write a dedicated docs page, and
    cross-link from best-practices/performance pages (which currently just say
    "use inline styles").

- [x] **P1.9 — Streaming SSR story** (PR: #94)
  - Document streaming SSR (`renderToPipeableStream`) and RSC patterns against the
    request-scoped collection from P0.4; add helpers where they remove boilerplate.
  - Shipped: expanded [SSR guide](/docs/ssr) (request-safe collection, RSC decision
    table, streaming helpers); `typestylesStyleHtml`, `injectStylesIntoHtml`,
    `streamingDocumentShell`, `TYPESTYLES_STYLE_ID` on `typestyles/server`.

## P2 — Ecosystem & DX

- [x] **P2.10 — True atomic output** (PR: #95)
  - [x] Rename hash-only `atomic` mode to `compact` (honest naming for whole-object hashes).
  - [x] Ship `atomic` mode with per-declaration decomposition and dedup across components.
  - [x] Docs + changeset; open PR.

- [x] **P2.11 — ESLint plugin MVP** (PR: #96)
  - [x] `@typestyles/eslint-plugin` with first rules: shorthand/longhand conflict
        detection (we do nothing today; StyleX errors), invalid unitless values,
        duplicate namespace literals.

- [x] **P2.12 — Integration parity + honest claims** (PR: #97)
  - [x] Rollup plugin: convention-entry discovery aligned with Vite/Next defaults
  - [x] Ship `@typestyles/esbuild` and `@typestyles/webpack` for zero-runtime extraction
  - [x] README clarifies runtime vs extraction; documents new bundler plugins
  - [x] Vue/Svelte/esbuild/Parcel examples with build verification tests

- [x] **P2.13 — READMEs for every published package** (PR: #98)
  - Added npm landing-page READMEs for `packages/vite`, `packages/astro`,
    `packages/migrate`, `packages/props`, `packages/open-props`, and
    `packages/build-runner`; root README links the full package index.

- [x] **P2.14 — Migrate codemod: handle interpolations** (PR: #99)
  - Convert prop-based interpolations (`props => props.color`, destructured
    `({ color }) => color`, suffixes like `px`) to `createVar` + `assignVars`.
  - Convert boolean prop ternaries (`props.primary ? A : B`) to `styles.component`
    variants with JSX call-site rewrites.
  - Parse `@media` (and other at-rules) in static templates into nested style objects.

- [x] **P2.15 — Per-route critical CSS** (PR: #100)
  - `getRegisteredCss()` returns everything ever registered. Use the extraction
    manifest in `@typestyles/next/build` to emit route-level CSS.

- [ ] **P2.16 — Migrate codemod: Emotion css prop** (PR: )
  - Hoist inline `css={css\`...\`}`JSX attributes to module-level`styles.class`/`styles.component`and rewrite to`className`.

- [ ] **P2.17 — Migrate codemod: attrs and css composition** (PR: )
  - Parse `styled.*.attrs(…)` chains and merge static attrs onto rewritten JSX.
  - Inline referenced `css\`...\`` fragments when composing styled templates.

- [ ] **P2.18 — Migrate codemod: export migration opt-in** (PR: )
  - Add `--include-exports` to migrate exported styled components into named
    function wrappers without silently changing public APIs by default.

- [ ] **P2.19 — Migrate codemod: theme → tokens heuristic** (PR: )
  - Optional `--theme-prefix` rewrite for `props.theme…` interpolations to
    `tokens.use(…)` references with warnings for unmatched paths.

- [ ] **P2.20 — Migrate CLI hardening** (PR: )
  - `--strict` / non-zero exit on warnings; spread-prop detection (`{...props}`)
    with actionable hints; optional partial migration for mixed templates.

- [ ] **P2.21 — Migrate codemod: class → component second pass** (PR: )
  - Optional `--to-component` pass that groups related `styles.class` calls in a
    file into `styles.component` recipes with a `base` slot.

## P3 — API & type safety

- [x] **P3.22 — `styles.compose` type safety** (PR: #103)
  - Today `compose` returns `AnySelectorFunction` — args are `unknown[]`, no variant
    inference across composed callables. Callers get zero autocomplete or type errors.
  - Scope: infer a union of accepted variant objects from composed component fns;
    emit TS errors for unknown keys; dev-mode `console.error` for dynamic mismatches.
  - Effort: Medium (generic gymnastics on the overload; runtime change is small).

- [x] **P3.23 — `tokens.use` type inference** (PR: #104)
  - `tokens.use<T>('ns')` defaults to `TokenValues` (untyped). Cross-package consumers
    must manually sync a type annotation that rots as tokens change upstream.
  - Scope: export a `TokenRef<typeof created>` from `tokens.create`; make `tokens.use`
    accept that type or infer from a shared registry generic. Fallback: keep current
    behavior when no type param is passed.
  - Effort: Low-Medium (type-level change, no runtime impact).

- [x] **P3.24 — `@property` on token leaves + `styles.property`** (PR: #105)
  - Component-internal vars via `ctx.var` shipped; token leaves are still plain
    `var(--…)` strings with no `.name`/`.var` refs and no `@property` registration.
  - Scope: opt-in `{ value, syntax, inherits }` leaf shape in `tokens.create`;
    `styles.property(id, opts)` for non-token registered properties; both return
    `{ name: string; var: string; toString(): string }`.
  - Effort: Medium (token proxy changes + `@property` CSS emission).

- [x] **P3.25 — `@typestyles/react` package (css prop + styled API)**
  - Migration convenience for teams coming from Emotion/styled-components.
  - Scope: `css` prop via JSX transform (inline styles → `styles.hashClass` at build
    time or runtime); `styled('button', config)` thin wrapper over `styles.component`
    that returns a React component with typed variant props.
  - Effort: High (JSX transform, Babel/SWC plugin for zero-runtime css prop).

## P3.5 — Competitive positioning

Tasks that address specific gaps surfaced in comparison against StyleX, Vanilla
Extract, Emotion, Panda CSS, and CSS Modules. These are the things an evaluator
would notice in the first 30 minutes.

- [x] **P3.5.1 — Zero-runtime-first docs and defaults** (PR: )
  - The industry baseline in 2026 is zero-runtime. StyleX and Vanilla Extract
    make it structurally impossible to ship runtime injection. TypeStyles leads
    with the runtime path — getting-started, examples, and the landing page all
    show runtime usage. An evaluator's first impression is "another runtime
    CSS-in-JS library."
  - Scope: restructure the getting-started guide to lead with build extraction
    (Vite plugin example first, runtime as "quick prototyping" secondary). Update
    the landing page hero to show the extraction flow. Make the `examples/`
    directory default to extraction-enabled configs. Add a "Why zero-runtime
    matters" callout early in the docs funnel.
  - Non-goal: remove runtime support. The dual mode is a strength — it just
    shouldn't be the first thing people see.
  - Effort: Low-Medium (docs restructure, example config changes, no runtime
    code changes).

- [x] **P3.5.2 — scopeId collision guardrails** (PR: )
  - Semantic class names (`button-base`) collide across packages when `scopeId`
    is omitted. P0.1 fixed scopeId propagation, but nothing warns when it's
    missing. StyleX and CSS Modules make collisions structurally impossible.
  - Scope: add a dev-mode warning when two `styles.component()` or
    `styles.class()` calls register the same namespace without a `scopeId`.
    Emit once per duplicate pair (not per render). In `createTypeStyles()` and
    `createStyles()`, require `scopeId` when the code is inside `node_modules/`
    (detectable at registration time via stack trace or build plugin metadata).
    Document the collision model and when `scopeId` is required on the
    best-practices page.
  - Effort: Low (registry already tracks namespaces; add a `Set` check + dev
    warning).

- [ ] **P3.5.3 — Comparative benchmark suite** (PR: )
  - TypeStyles has no published performance data. The README comparison table
    makes claims (bundle size, features) without evidence. An evaluator who
    cares about performance will go to StyleX's benchmarks and find nothing
    comparable here.
  - Scope: build a benchmark harness that measures: (1) initial CSS generation
    time for N components, (2) extracted CSS file size for a reference app
    (atomic vs semantic vs hashed), (3) runtime injection latency (time from
    module load to styles in CSSOM), (4) SSR collection overhead per request.
    Run the same reference app through StyleX, Vanilla Extract, and Emotion for
    apples-to-apples comparison. Publish results in the docs and keep the
    harness in CI so numbers stay current.
  - Effort: High (harness authoring, multi-framework setup, ongoing
    maintenance).

- [ ] **P3.5.4 — VS Code extension MVP** (PR: )
  - Vanilla Extract and StyleX both have VS Code extensions. TypeStyles has
    none. Missing editor tooling is a visible gap in the first-use experience.
  - Scope: ship `@typestyles/vscode` with: (1) hover preview showing the
    emitted CSS for a `styles.component()` or `styles.class()` call, (2) token
    value previews with color swatches for `tokens.create()` color values,
    (3) go-to-definition from class name usage to the component/class
    definition. Stretch: inline CSS property documentation on hover.
  - Effort: High (Language Server Protocol setup, AST analysis, extension
    packaging). Promoted from P4 — this is table stakes for adoption, not a
    nice-to-have.

- [ ] **P3.5.5 — Honest comparison page with methodology** (PR: )
  - The current framework comparison table is self-authored with no
    methodology. Evaluators discount self-reported comparisons. StyleX publishes
    benchmark methodology; Panda CSS links to third-party comparisons.
  - Scope: replace the current comparison table with a page that (1) links to
    the benchmark harness from P3.5.3, (2) states methodology for each claim
    (how bundle size is measured, what "zero-runtime" means in each framework's
    context), (3) honestly documents where TypeStyles is weaker (maturity,
    community size, atomic mode battle-testing). A comparison that acknowledges
    weaknesses is more credible than one that doesn't.
  - Effort: Low-Medium (writing, depends on P3.5.3 for benchmark data).

- [ ] **P3.5.6 — Contributor onboarding** (PR: )
  - Sole-maintainer risk is the #1 concern for adopters. Even if contributor
    count doesn't change overnight, visible onboarding infrastructure signals
    that the project is designed for community ownership.
  - Scope: add `CONTRIBUTING.md` with architecture tour (link to
    `ARCHITECTURE.md`), local dev setup, PR conventions, and test expectations.
    Label 10+ issues as `good first issue` across the package spectrum (core,
    docs, eslint-plugin, bundler plugins). Add a "Contributing" section to the
    docs site. Set up issue templates for bug reports and feature requests.
  - Effort: Low (writing + issue triage, no code changes).

- [ ] **P3.5.7 — Package naming mode defaults for libraries** (PR: )
  - Semantic naming is great for app code but dangerous for published packages.
    Two npm packages using `styles.component('button', ...)` without `scopeId`
    collide silently. The docs don't guide library authors toward safe defaults.
  - Scope: add a "Publishing a package with TypeStyles" guide that recommends
    `createTypeStyles({ scopeId: pkg.name, mode: 'hashed' })` for library
    code. Add an ESLint rule (`@typestyles/no-default-scope-in-package`) that
    warns when `styles.component()` / `styles.class()` is used without a scoped
    factory inside a directory with a `package.json`. Consider making `hashed`
    the default mode when `scopeId` is set.
  - Effort: Low-Medium (docs + one ESLint rule).

- [ ] **P3.5.8 — Atomic mode hardening** (PR: )
  - Atomic mode was added in P2.10 but is young compared to StyleX's years of
    production use. Teams evaluating TypeStyles specifically for atomic output
    need confidence it handles edge cases.
  - Scope: add stress tests for atomic dedup covering: (1) identical
    declarations across 100+ components, (2) shorthand/longhand conflicts in
    atomic decomposition (`padding` vs `paddingTop`), (3) at-rule scoped
    atomics (`@media` wrapped declarations), (4) deterministic ordering under
    parallel build extraction, (5) interaction with cascade layers. Add a
    "Known limitations" section to the atomic mode docs that honestly documents
    what hasn't been tested at scale.
  - Effort: Medium (test authoring + edge case investigation).

## P5 — Theming engine capabilities for design systems built on TypeStyles

This phase was originally scoped while designing `examples/design-system` as a
competitor to Meta's Astryx (an internal-tools design system built on StyleX,
which gets a flexible theming story only by working _around_ StyleX's
restrictions). That design-system work has since moved out of this repo — it's
now developed as **var-ui**, a separate public/open-source project
(`@var-ui/*` on npm) with its own repository and site. This repo's job is the
**engine capabilities var-ui (and any other design system built on
TypeStyles) needs from the core library** — not the design system itself.

TypeStyles already has what a StyleX-based system has to build a workaround to
get: real CSS custom properties, semantic/readable class names, cascade
layers, and a more general theme condition engine (`tokens.when` /
`tokens.colorMode`) than fixed light/dark modes — with no compiler restriction
to route around in the first place. The remaining gap is a handful of specific
generative/authoring capabilities, each surfaced by an actual var-ui need
rather than speculative feature-parity work. Design-system-specific concerns
(theme galleries, packaging, component breadth, per-recipe docs) are tracked
in var-ui's own roadmap, not here.

- [x] **P5.1 — Generative color-scale API (`typestyles/color-scale`)**
  - Shipped in `packages/typestyles/src/color-scale.ts` (`parseColor`, `generateRamp`,
    `contrastRatio`). Spec: `specs/color-scale-generation.md`. Consumed today by
    var-ui's `createColorTheme` (`@var-ui/core`).

- [x] **P5.2 — Generative typography/motion/radius scale primitives**
  - Shipped in `packages/typestyles/src/token-scale.ts` (`generateGeometricScale`,
    `generateLinearScale`, `expandDurationBand`), exported via the
    `typestyles/token-scale` subpath. Pure numeric outputs, zero naming opinions —
    mapping steps to `fontSize`/`radius`/`duration` names is a design-system concern
    (var-ui wires these into its own `primitive.ts`).
    Spec: `specs/type-motion-radius-scale-generation.md`.

- [x] **P5.3 — Formalize the component-override public contract + `@scope` helper**
  - Shipped: `styles.scope()` (`packages/typestyles/src/scope.ts`) reuses `serializeStyle`,
    `applyLayerToRules`, and `insertRules`; `typestyles snapshot --write` +
    `@typestyles/no-removed-public-classname` guard semantic renames; theming/components/publishing
    docs cover the two-tier override model and public class name contract.
    Spec: `specs/component-override-contract.md`.
    PR: https://github.com/phthalo-dev/typestyles/pull/119.

- [x] **P5.4 — `descendant` scope on the theme condition engine**
  - Shipped in `packages/typestyles/src/theme.ts` / `types.ts`: `'descendant'` as
    a third `scope` value on `ThemeConditionAttr`/`ThemeConditionClass`, compiling
    to a descendant-combinator suffix (`.theme-name [data-x="y"]`); `when.not()`
    on a descendant-scoped condition is rejected with an explicit dev warning.
    Spec: `specs/surface-tone-override.md` (core-only; the design-system-layer
    `surfaces` config has moved to var-ui).

- [x] **P5.6 — Distribution parity: confirm and document build-time theme extraction**
  - Verified: `tokens.create` / `createTheme` CSS is captured by zero-runtime
    extraction across all six bundler integrations, with per-integration tests
    (Vite parity + plugin e2e, Rollup, esbuild + `verifyTypestylesBuild`,
    webpack + `verifyTypestylesBuild`, Next `buildTypestylesForNext`, and new
    `@typestyles/astro` test infrastructure). No extraction gap found. Documented
    in the "Theme extraction" section of `docs/content/docs/zero-runtime.md`
    (no unbuilt-theme runtime warning needed, unlike Astryx's
    `astryx theme build` fallback).

- [x] **P5.7 — Market `@property`-typed tokens as animatable-theme differentiator**
  - Shipped: "Animating typed tokens with `@property`" section in
    `docs/content/docs/theming-patterns.md` (worked example — a `conic-gradient`
    angle token that smoothly rotates across a theme switch via a registered
    `@property` `<angle>` syntax, contrasted with the discrete snap an
    unregistered token would produce), plus a fourth "Animatable typed tokens"
    difference in the "Theming architecture" section of
    `docs/content/docs/framework-comparison.md` (P3.5.5) noting StyleX's
    documented `@property (explicit)` as unsupported. Documentation-only —
    P3.24 already shipped the underlying `@property` support on token leaves
    and `styles.property`.

- **P5.8 — Moved to var-ui** (not tracked here — neither open nor shipped in
  this repo). Per-recipe structured docs for human + AI-agent discovery is
  about documenting var-ui's own components, not a TypeStyles engine concern.
  Tracked in var-ui's `ROADMAP.md`. (`packages/vscode` — already in progress
  in this repo — remains a candidate delivery vehicle var-ui could build on,
  if it wants one, rather than a new CLI from scratch.)

- [x] **P5.9 — Comparison page: add theming-architecture claims vs. Astryx/StyleX**
  - Shipped in `docs/content/docs/framework-comparison.md` — "Theming architecture:
    TypeStyles vs. StyleX (and Astryx)" section covering plain CSS custom properties
    vs. compiler-managed vars in `.stylex.ts` files, build-always extraction vs.
    runtime-injection-with-warning, and plain-CSS component overrides via semantic
    class names vs. `@scope` + data-attribute config DSL. Documentation-only.

## P6 — Future (unscheduled)

- Editable playground/REPL
- Recipes/cookbook section (resurrect the `recipes.astro` redirect)
- W3C Design Tokens import + Figma sync
- [x] **Responsive object syntax (breakpoint shorthand in style values)**
  - Shipped: `breakpoints` on `createStyles` / `createTypeStyles`; `{ base, md, lg }` on CSS
    property values expands to `@media` blocks at serialization time; `_` alias; `breakpoints.fromTokens`;
    atomic mode support. Spec: `specs/responsive-object-syntax.md`.
- [x] **Custom CSS variable name control (`nameTemplate` on `tokens.create`)**
  - Shipped: `nameTemplate` on `createTokens` and `tokens.create` with `TokenNameContext`
    (`scopeId`, `scope`, `namespace`, `path`, `segments`); segment-preserving
    `flattenTokenPaths`; theme/`tokens.use()`/`@property` wired through the same
    path→name registry. Spec: `specs/token-name-template.md`.
- [x] **Semantic naming and attribute-mode design-system parity**
  - Shipped: semantic components now use readable `block`, `block--dimension-option`,
    and `block__slot` names; compounds use chained selectors. Attribute mode now uses
    kebab-cased `data-*` names and supports slot recipes with per-slot attrs results.
    Cascade-layer guidance documents the recommended `components` / `overrides` pairing.
    Spec: `specs/semantic-and-attribute-mode.md`.
- [ ] **`styles.override()` + `__tsMeta` component metadata**
  - Recipe-shaped typed component overrides (`base` / `variants` / `compoundVariants`)
    inferred from the component return; mode-aware emission via non-enumerable
    `__tsMeta` + `getComponentMeta`. Spec: `specs/styles-override-meta.md`.
- 1.0 stability policy and criteria

## P7 — Testing architecture

Gaps identified while designing the `typestyles/testing` export (issue #170). See
`docs/superpowers/specs/2026-07-28-testing-architecture-design.md` for the full analysis; this
section is the authoritative tracker for the items themselves.

- [ ] **P7.1 — Wire unbuilt example apps into CI**
  - `vite-app`, `rollup-app`, `rolldown-app`, `next-app`, `typewind` have no `test` script, so
    `turbo run test` (what CI actually runs) skips them entirely — including their own `build`
    script. `next-app`'s `build` script runs `pnpm typestyles:verify`, a real correctness check
    that currently executes nowhere in CI. Give each a `test` script (`build` at minimum, or
    `build` plus a `verify-build.mjs` where a real assertion is cheap to add), matching the
    esbuild-app/parcel-app/svelte-app/vue-app pattern.

- [ ] **P7.2 — Roll out the `*.type-tests.ts` convention beyond `packages/typestyles`**
  - Only `packages/typestyles` has compile-time-checked type tests
    (`tsc --noEmit`-only, excluded from the vitest glob). Extend the convention to
    `packages/react` and `packages/props` — the two packages with the most consumer-facing
    generic/overload surface.

- [ ] **P7.3 — Harden build-parity tests against silent skip**
  - `describe.skipIf(!existsSync(dist))` in the per-bundler parity tests (vite, rollup, esbuild,
    webpack, next, astro) means a parity test silently vanishes if run outside turbo's
    dependency graph. Make the skip loud (log a warning naming the missing dist) or assert the dist exists explicitly in CI.

- [ ] **P7.4 — Visual regression baseline**
  - No Playwright/Cypress anywhere in the repo despite `docs/content/docs/testing.md`
    recommending both to consumers. Evaluate adding one to a single example app as a dogfooding
    proof point, not a full rollout.

- [x] **P7.5 — Public test-harness contract**
  - Shipped: `typestyles/testing` subpath export (`resetAll`, `onAfterReset`,
    `createTestHarness`), closing issue #170. Docs:
    `docs/content/docs/testing-design-systems.md`.

- [ ] **P7.6 — Fix CJS subpath state duplication**
  - tsup only code-splits ESM output; each subpath's `.cjs` build carries its own copy of
    module-level singletons (`globalSheetState`, `registeredNamespaces`, property registrations,
    etc.) instead of sharing one instance. A consumer requiring both `typestyles` and
    `typestyles/testing` (or `typestyles/server`) under CJS gets two disjoint sheets —
    `resetAll()` silently no-ops against state it doesn't share, producing stale or duplicate CSS
    with no error. Pre-existing across all subpaths (also present in `dist/server.cjs`), surfaced
    by `typestyles/testing`'s reliance on shared mutable state. Fix: enable tsup `splitting` for
    cjs output, or give the shared singletons a dedicated always-shared entry module.
