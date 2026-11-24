# Issues found while moving the typestyles docs onto the Var UI docs kit

Status: **filed** (V1-V7 = var-ui#332-#338, V9-V13 = var-ui#339-#343, T1 = typestyles#391; V8 was already fixed upstream as var-ui#310). Each entry below became one GitHub issue. Versions: `@var-ui/*@0.14.0`,
workspace `typestyles`. Workaround comments in the code now carry `TODO(var-ui#N)` references.

Severity: **high** = wrong output or a second runtime; **medium** = real cost or a hand-rolled copy of kit code;
**low** = polish or docs.

## Open: `phthalo-dev/var-ui`

### V1. `@var-ui/core` and `@var-ui/astro` depend on `typestyles` instead of peer-depending

- **Severity:** high
- **Repro:** in a pnpm workspace that links its own `typestyles` (`workspace:*`), add `@var-ui/core@0.14.0` and
  `@var-ui/astro@0.14.0`. The lockfile resolves a second runtime, `typestyles@0.37.0`, from the registry
  (`@var-ui/core@0.14.0` and `@var-ui/astro@0.14.0` have `dependencies: { typestyles: ^0.37.0 }`). Two runtimes
  mean two class and token registries. (`@var-ui/icons@0.14.0` has no `typestyles` dependency.)
- **Proposed fix:** make `typestyles` a `peerDependency` of `@var-ui/core` and `@var-ui/astro`, as `@var-ui/docs`
  already does.
- **Workaround:** `pnpm-workspace.yaml` `overrides` (`'@var-ui/core>typestyles': 'workspace:*'`, same for
  `@var-ui/astro`); `scripts/check-single-typestyles.ts` (`pnpm check:single-typestyles`, in `pnpm verify`) fails if
  a second copy returns. The overrides also hide pnpm's range check, so the same script warns (exit 0; `--strict-ranges`
  fails) when the workspace `typestyles` version is outside the `typestyles` range a pinned `@var-ui/*` package
  declares.

### V2. `varDocs()` always registers its own `@typestyles/vite` extractor

- **Severity:** medium
- **Repro:** `varDocs({ typestyles: { entry } })` together with
  `AstroTypestyles({ mode: 'build', extract: { modules: [entry], fileName: 'typestyles.css' } })`. `astro build`
  warns `The emitted file "typestyles.css" overwrites a previously emitted file of the same name`, and the kit's copy
  runs without `mode: 'build'`, so it also warns that the CSS runtime ships to the client.
- **Proposed fix:** an opt-out such as `typestyles: { extract: false }` for sites that run their own extractor, or
  reuse an extractor that is already registered.
- **Workaround:** `docs/astro.config.mjs`, `keepSingleTypestylesExtractor()`: an integration listed last that keeps
  only the last vite plugin named `typestyles` (it warns if the count is not 2).

### V3. Command palette has no full-text search

- **Severity:** medium
- **Repro:** `DocsSearchItem` has `title`, `meta`, `keywords`, `headings`. Items are inlined as JSON into every page,
  and `initCommandPalette` (`@var-ui/astro`) parses them once, with no hook for a custom matcher or result provider
  (`rankCommandItems` takes an `isMatch` argument, but the palette never passes one). Body text cannot be searched
  without inlining it on every page.
- **Proposed fix:** an optional lazy index on `DocsSearch` / `CommandPalette`, e.g. `searchIndexUrl` returning items
  with a `body` field, fetched on first open and matched after the existing fields; or a documented `isMatch` /
  result-provider hook.
- **Workaround:** `docs/src/lib/kitNav.ts`, `toKitSearchItems()`: each page's rarest body words go into `keywords`,
  at most 40 per page (`MAX_BODY_TERMS_PER_PAGE`; 4–24 characters, fewer than 3 digits, in at most half of the pages,
  not already in title/description/headings). Cost: about 20 KB raw / 7.6 KB gzip per page (palette JSON 59.3 KB raw
  vs 39.6 KB without body terms). Recall: 1,560 body terms (of 11,028 candidates); 56% of the words that occur in
  exactly one page are kept; body phrases never match. The old site searched full bodies through a lazily fetched
  `/search-index.json` (MiniSearch), which is still generated.

### V4. `@var-ui/docs/highlight` output is unstyled outside the kit's own site

- **Severity:** medium
- **Repro:** `highlightCodeBlockContent()` (`@var-ui/docs/highlight`, the documented sync entry) returns highlight.js
  markup (`hljs-keyword`, …). No `@var-ui/*` package styles those classes; the `hljs-*` → `color.code.*` rules live in
  the kit's own docs site and are not exported. The design-token colours promised by `syntax: 'design-tokens'` only
  exist in the Shiki theme (`@var-ui/docs/shiki`), which the kit wires into MDX fences only. There is no plain
  `highlightCode(code, lang)` and no sync Shiki helper for non-MDX pipelines (marked, Astro components, scripts).
- **Proposed fix:** export a sync `highlightCode(code, lang)` that uses the design-token Shiki theme, or ship the
  `hljs-*` token rules with `@var-ui/docs/styles`.
- **Workaround:** `docs/src/lib/shikiTokens.ts` builds a sync Shiki core highlighter (`createHighlighterCoreSync`,
  JavaScript regex engine, statically imported grammars) with `designTokenShikiTheme`; `shiki` is a direct dependency
  of `docs/`. The theme needs an `as never` cast (kit colours are `CSSVarRef` objects, which Shiki's types reject).

### V5. `codeBlockMarkup()` duplicates the source in `data-var-ui-code`

- **Severity:** low
- **Repro:** the copy button carries the raw source in a `data-var-ui-code` attribute, so every fence is in the HTML
  twice (long fences double the page weight).
- **Proposed fix:** have `initCodeBlockCopy` read the text from the block's `pre code` (or make the attribute opt-in).
- **Workaround:** `docs/src/lib/markdownCodeBlockHtml.ts` emits the kit structure without the attribute, and
  `docs/src/scripts/docsCodeBlockCopy.ts` copies the visible `pre`'s text with a delegated handler; the kit's
  `initCodeBlockCopy` is not used on doc pages.

### V6. `PackageInstall` has no markup entry point and does not export its behaviour

- **Severity:** medium
- **Repro:** sites that render markdown strings (typestyles expands `doc-install-tabs` comment regions before
  `marked`) cannot use `PackageInstall.astro`. It also takes a `packages` string and derives all commands itself, so
  commands that come from content cannot be shown. `initPackageInstall` is only reachable as
  `src/scripts/packageInstall.ts`, and its storage key (`var-docs-package-manager`) is a private constant.
- **Proposed fix:** a `packageInstallMarkup({ commands, … })` helper next to `codeBlockMarkup` (the `tabs` / `tab`
  slots already exist in the `codeBlock` recipe), and export `initPackageInstall` plus the storage-key constant from
  `@var-ui/docs`.
- **Workaround:** `docs/src/lib/expandInstallTabGroups.ts` builds the markup from the `codeBlock` recipe slots (same
  classes and `data-package-install` / `data-package-manager` hooks; the bun tab is derived from the pnpm command,
  HTML only); `docs/src/scripts/docInstallTabs.ts` re-implements the tab behaviour; the key is repeated in
  `docs/src/lib/packageManagerStorage.ts`.

### V7. No kit layout for a full-height tool page

- **Severity:** low
- **Repro:** a page that wants the docs top bar and mobile menu but a full-height, unpadded content area (editor +
  preview). `DocsPage` adds the docs grid; `DocsMarketingPage` (even with `bleed`) adds a scrolling `main`.
- **Proposed fix:** a `DocsToolPage` (or a `DocsMarketingPage` `fill` variant) with the same props and slots.
- **Workaround:** `docs/src/layouts/PlaygroundLayout.astro` composes `ThemeScript`, `DocsFavicon`, `AppShell`,
  `DocsTopBar`, `DocsMobileMenu`, `Layout` / `LayoutContent` by hand (as Var UI's own playground does) and repeats the
  `<head>` wiring (`typestyles.css` link, `ClientRouter`) that `DocsPage` owns, so the two can drift.

### V8. `DocsTopBar` and `DocsMobileMenu` render an empty brand link without a `brand` slot

- **Severity:** low
- **Repro:** `<DocsPage brand={{ heading: 'typestyles', href: '/' }}>` with no `slot="brand"` child renders
  `<a class="var-ui-top-nav__brand" aria-label="typestyles" href="/"> </a>` (no visible text). Same in the mobile
  drawer header.
- **Proposed fix:** fall back to `brand.heading` as the link text.
- **Workaround:** `<span slot="brand">typestyles</span>` in `docs/src/layouts/KitDocsLayout.astro`,
  `docs/src/pages/index.astro` and `docs/src/layouts/PlaygroundLayout.astro` (top bar and mobile menu).

### V9. Top nav selects every item whose `match` prefixes the path

- **Severity:** low
- **Repro:** `topNav` with `{ match: '/docs' }` and `{ match: '/docs/changelog' }`. On `/docs/changelog/…` both
  `Docs` and `Changelog` get `data-selected` and `aria-current="page"` (`DocsTopBar` and `docsTopBarClient.ts`).
- **Proposed fix:** select only the longest matching prefix (or add an `exclude` / exact option).
- **Workaround:** none; both items stay selected on changelog pages.

### V10. Top nav has no external-link or icon-only item

- **Severity:** low
- **Repro:** a `GitHub` item with `link: 'https://github.com/…'` renders as a plain same-tab text link, and its
  `match` must be set to something no path starts with. The old header had an icon button opening a new tab.
- **Proposed fix:** `external` (`target` / `rel`) and an icon-only variant on `TopNavItem`, or a documented tools slot.
- **Workaround:** none; the item is a same-tab text link (`docs/src/lib/kitNav.ts`, `toKitTopNav()`).

### V11. `Menu` `href` items cannot open in a new tab

- **Severity:** low
- **Repro:** `Menu` `sections[].items[]` with `href: 'https://claude.ai/…'` renders `<a role="menuitem" href>`;
  `MenuItemDefinition` has no `target` / `rel`.
- **Proposed fix:** `external?: boolean` (or `target` / `rel`) on `MenuItemDefinition`.
- **Workaround:** `docs/src/scripts/docAiActions.ts` sets `target="_blank" rel="noopener noreferrer"` on
  `[data-doc-ai-actions] a[role=menuitem]` after load (without JS the links open in the same tab).

### V12. `SegmentedControl`: change event undocumented, random default `name`

- **Severity:** low
- **Repro:** the change event (`var-ui:segmented-control-change`, `detail.id`) is exported as
  `SEGMENTED_CONTROL_CHANGE_EVENT` from `@var-ui/astro` but not mentioned on the component page. `name` defaults to a
  random value, so static HTML differs between builds unless `name` is passed.
- **Proposed fix:** document the event; make the default `name` deterministic (or note it in the docs).
- **Workaround:** `docs/src/components/LiveDemo.astro` imports the constant and passes `name={`live-demo-${id}`}`;
  the kitchen sink passes `name` too.

### V13. `DocsPage` and `DocsMarketingPage` viewport meta has no `initial-scale=1`

- **Severity:** low
- **Repro:** both components hardcode `<meta name="viewport" content="width=device-width" />` in their `<head>`.
  Without `initial-scale=1`, iOS Safari can keep a zoomed-out scale after an orientation change.
- **Proposed fix:** `content="width=device-width, initial-scale=1"` (or a prop to override it).
- **Workaround:** none for kit-shell pages: a second viewport meta through the `head` slot would be a duplicate
  whose precedence is browser-dependent. `docs/src/layouts/PlaygroundLayout.astro` owns its `<head>` and sets
  `initial-scale=1`.

## Open: `phthalo-dev/typestyles`

### T1. `examples/design-system` themes and recipes emit `-name` / `-var` properties instead of colour tokens

- **Severity:** medium (the example is broken; the docs no longer use it)
- **Repro:** build anything that imports `@examples/design-system` and search the CSS for
  `--example-ds-color-accent-default`: `.theme-example-ds-default` has
  `--example-ds-color-accent-default-name: --example-ds-palette-sky-7` and
  `--example-ds-color-accent-default-var: light-dark(…)`, and the `:root` default is empty. Same for every semantic
  colour whose value is a palette ref; `text.primary` keeps only its light literal. Component recipes hit the same
  bug: `alert` tone variants emit `undefined: var(--example-ds-color-text-onAccent)`.
- **Cause:** since e997f7d (#370, every token leaf is a `{ name, var }` ref), `toModeAwareTokens()` in
  `examples/design-system/src/create-theme.ts` treats refs as nested groups and recurses into `name` / `var`; when
  light is a string and dark is a ref it drops dark.
- **Proposed fix:** treat token refs as leaves in `zip` (detect `{ name, var }` or use `.var`). DX follow-up for
  `packages/typestyles`: warn (or type-error) when `tokens.createTheme` gets a subtree shaped exactly like a ref.
- **Workaround:** none needed any more. The docs dropped `@examples/design-system` (the old `legacyThemeBridge.ts`
  that papered over this was deleted with it).

## Resolved or obsolete (do not file)

- **`@var-ui/docs@0.13.0` peer ranges pinned old typestyles packages:** fixed in 0.14.0. Leftover:
  `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` has a TODO to drop the 0.14.0 entries once they are older than
  the release-age gate.
- **`DocsPage` takes one theme class and no extra `<html>` classes:** only needed to keep the legacy theme class on
  `<html>`. The legacy components are gone and the head script in `KitSiteHead.astro` was deleted, so the docs no
  longer need it. File only if another consumer needs several theme classes.
- **Colour-mode key differs between the kit and the old playground shell:** closed; every page uses the kit's
  `ThemeScript` (`theme-mode` key, `data-color-mode`).

## User-visible changes (not issues)

- **Design styles:** the appearance menu offers colour mode only. `theme.presets` needs `createDesignTheme()`
  classes, and `@var-ui/core` ships only its default theme. Neo-Brutalist (the old default) is replaced by the Var UI
  default theme; AI Glow, New Wave, Windows 95 and Classic System are dropped. Bringing them back means porting each
  to `createDesignTheme()` (as Var UI's own site does in `docs/src/themes/*`).
- **Storage keys:** colour mode is stored under `theme-mode` (was `typestyles-theme`), so a saved choice resets once;
  `typestyles-style` is no longer read.
- **Search:** body search is limited as described in V3 (no phrase search).
- **Fonts:** pages use the kit's fonts; Fraunces is no longer loaded. JetBrains Mono is loaded on `/playground` only
  (Monaco).
- **Kitchen sink:** `/docs/design-system/kitchen-sink` now shows the Var UI components the site is built from instead
  of the `@examples/design-system` Astro components.
