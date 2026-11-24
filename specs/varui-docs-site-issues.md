# VarUI kit gaps found while migrating the typestyles docs site

Repo for all items: `phthalo-dev/var-ui` (packages are `@var-ui/*` 0.14.0). Not yet filed.

## 1. `@var-ui/core` and `@var-ui/astro` hard-depend on a registry `typestyles`

- **Repro:** in a pnpm workspace that links its own `typestyles` (`workspace:*`), add
  `@var-ui/core@0.14.0` and `@var-ui/astro@0.14.0`. The lockfile then resolves a second runtime,
  `typestyles@0.37.0` from the registry, next to the workspace copy
  (`@var-ui/core@0.14.0` -> `dependencies: typestyles: ^0.37.0`).
- **Why it matters:** two runtimes means two class/token registries.
- **Expected:** `typestyles` as a `peerDependency` (the docs kit already does this), not a dependency.
- **Workaround:** `overrides` in `pnpm-workspace.yaml`
  (`'@var-ui/core>typestyles': 'workspace:*'`, same for `@var-ui/astro`, `@var-ui/icons`).
  `scripts/check-single-typestyles.ts` (run in `vp run ci`) fails if a second copy returns.

## 2. `varDocs()` always registers its own `@typestyles/vite` extractor

- **Repro:** use `varDocs({ typestyles: { entry } })` together with `@typestyles/astro`
  (`AstroTypestyles({ mode: 'build', extract: { modules: [entry], fileName: 'typestyles.css' } })`).
  `astro build` warns `The emitted file "typestyles.css" overwrites a previously emitted file of the same name`
  and the kit's copy runs without `mode: 'build'`, so it also warns that the CSS runtime shipped to the client.
- **Expected:** an opt-out such as `typestyles: { extract: false }` for sites that already run
  their own extractor, or the kit reusing an existing one.
- **Workaround:** `docs/astro.config.mjs`, function `keepSingleTypestylesExtractor()`: an inline
  integration listed last that removes all but the last vite plugin named `typestyles` in `astro:config:setup`.

## 3. Peer ranges of `@var-ui/docs@0.13.0` pinned old typestyles packages

- `0.13.0` peers: `typestyles ^0.35.2`, `@typestyles/vite ^0.7`, `@typestyles/build-runner ^0.8.1`.
  `0.14.0` peers (`^0.37.0`, `^0.9.0`, `^0.10.0`) match this repo. Fixed in 0.14.0; recorded only because
  pnpm's `minimumReleaseAge` refuses releases under a day old (see `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`).

## 4. `DocsTopBar` renders an empty brand link when no `brand` slot is given

- **Repro:** `<DocsPage brand={{ heading: 'typestyles', href: '/' }} …>` with no `slot="brand"` child.
  The bar renders `<a class="var-ui-top-nav__brand" aria-label="typestyles" href="/"> </a>`: no visible text.
- **Expected:** fall back to `brand.heading` as the link text.
- **Workaround:** `docs/src/layouts/KitDocsLayout.astro` passes `<span slot="brand">typestyles</span>`.

## 5. Top nav selects every item whose `match` prefixes the path

- **Repro:** `topNav` with `{ match: '/docs' }` and `{ match: '/docs/changelog' }`; on `/docs/changelog/…` both
  `Docs` and `Changelog` get `data-selected` + `aria-current="page"` (`DocsTopBar` and `docsTopBarClient.ts`).
- **Expected:** only the longest matching prefix is selected (or an `exclude`/exact option).
- **Workaround:** none; both stay selected on changelog pages.

## 6. Top nav has no external-link or icon item

- **Repro:** a `GitHub` item with `link: 'https://github.com/…'`. It renders as a plain same-tab text link;
  `match` must be set to something no path starts with. The old header had an icon button with `target="_blank"`.
- **Expected:** `TopNavItem` supports `external` (`target`/`rel`) and an icon-only variant, or a documented `tools` recipe.

## 7. `DocsPage` takes exactly one theme class and no extra `<html>` classes

- **Repro:** `themeClassName="a b"` throws in `ThemeScript` (`classList.add('a b')`), and `htmlAttributes.class`
  would duplicate the `class` attribute.
- **Why it matters:** a site migrating gradually needs a second (legacy) theme class on `<html>`.
- **Workaround:** `KitDocsLayout.astro` adds `@examples/design-system`'s `defaultTheme.className` with an inline
  head script (also on `astro:before-swap`). Temporary; goes away with the legacy components.

## 8. Command palette items have no full-text field

- **Repro:** `DocsSearchItem` has `title`, `meta`, `keywords`, `headings`; items are inlined as JSON into every
  page, and `initCommandPalette` (`@var-ui/astro`) parses them once with no hook for a custom matcher or result
  provider (`rankCommandItems` takes an `isMatch` argument, but the palette never passes one). The old site
  searched page bodies through a lazily fetched `/search-index.json` (MiniSearch).
- **Why it matters:** body text is the largest part of the index; inlining it on every page is heavy.
- **Proposal for the kit:** an optional lazy index on `DocsSearch`/`CommandPalette`, for example
  `searchIndexUrl` returning items with a `body` field that is fetched on first open and matched after the existing
  fields (ranked below headings), or a documented `isMatch`/result-provider hook.
- **Workaround (no kit DOM changes):** `toKitSearchItems()` in `docs/src/lib/kitNav.ts` puts each page's
  distinctive body words in `keywords`. These are words of 4+ characters that appear in at most half of the pages
  and are not already in the title, description or headings. A word that appears only in a page body finds that
  page again. Limits: multi-word body phrases do not match, because the kit matches the whole query against each
  field. Each page's HTML also grows by about 120 KB raw (about 36 KB gzipped), because every page inlines the
  terms of all pages. Remove when the kit has a lazy index.

## 9. Colour mode key differs between kit shell and the old playground shell

- `@var-ui/docs` (`ThemeScript`) stores the mode under `theme-mode`; the old `Head.astro` /
  `docsAppearanceRuntime.ts` (still used by `/playground` via `PlaygroundLayout`) used `typestyles-theme`.
- **Fixed in Task 2:** the old code now reads and writes `theme-mode`, so docs and `/playground` share the
  preference. Still inconsistent until Task 5 moves the playground shell to the kit: the old shell
  sets `data-mode`, while the kit and the token CSS use `data-color-mode`, so the playground's explicit
  light/dark choice may not repaint its legacy tokens. The playground's style picker still writes
  `typestyles-style`, which the kit ignores.

## 10. (typestyles repo) `@examples/design-system` themes emit `-name`/`-var` props instead of colour tokens

Not a `packages/typestyles` regression and not caused by b314900 (#385). Repo: `phthalo-dev/typestyles`
(`examples/design-system`). The `createTheme` DX point below could be a typestyles issue.

- **Symptom:** in the built CSS, `.theme-example-ds-default` has no `--example-ds-color-accent-default`. It has
  `--example-ds-color-accent-default-name: --example-ds-palette-sky-7` and
  `--example-ds-color-accent-default-var: light-dark(var(--example-ds-palette-sky-7), var(--example-ds-palette-blue-4))`
  instead, and the `:root` default is empty (`--example-ds-color-accent-default: ;`). Same for every semantic
  colour whose value is a palette reference (`text.secondary`, `danger.default`, …). `text.primary` (light literal
  `#14110D`, dark palette ref) becomes the light literal only, so it stays dark in dark mode.
- **Cause:** since e997f7d (#370, "every token leaf is a `{ name, var }` ref"), `p.palette['sky-7']` is a
  `{ name, var }` object. `toModeAwareTokens()` in `examples/design-system/src/create-theme.ts` treats any plain
  object as a nested group: it recurses into `name` and `var`, so the leaf becomes the subtree
  `{ name: { light, dark }, var: { light, dark } }`. When light is a string and dark is a ref, it keeps the light
  string and drops dark.
- **Repro:** `vp run -F docs build`, then search `docs/dist/typestyles.css` for `--example-ds-color-accent-default`.
  In code: `createDesignTheme({ name: 'x', light: { color: { a: p.palette['sky-7'] } }, dark: { color: { a: p.palette['blue-4'] } } })`
  emits `--…-color-a-name` / `--…-color-a-var`, not `--…-color-a`.
- **Fix (example):** treat token refs as leaves in `zip` (detect `{ name, var }`, or use the ref's `.var` string).
- **typestyles DX candidate:** `tokens.createTheme` silently accepts a nested `{ name: …, var: … }` object and
  emits `-name`/`-var` custom properties. A dev warning (or type error) when a token subtree has exactly the
  `name`/`var` ref shape would have caught this.
- Docs workaround: `docs/src/styles/legacyThemeBridge.ts` maps those tokens onto Var UI tokens until the legacy
  components are removed.

## Design styles changed

The kit appearance menu replaces the old `AppearanceControls`. `theme.presets` needs `createDesignTheme()`
classes from `@var-ui/core`, which ships only its default theme (`defaultThemeClassName`); the old styles are
`@examples/design-system` themes. So no presets are configured and the menu offers colour mode only.

| Old style (`designStyleList`)     | Now                                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neo-Brutalist (`default`)         | Replaced by the Var UI default theme for the shell. Legacy page components still use their own styling, with colours mapped onto Var UI tokens (`docs/src/styles/legacyThemeBridge.ts`). |
| AI Glow (`ai-glow`)               | Dropped                                                                                                                                                                                  |
| New Wave (`new-wave`)             | Dropped                                                                                                                                                                                  |
| Windows 95 (`windows-95`)         | Dropped                                                                                                                                                                                  |
| Classic System (`classic-system`) | Dropped                                                                                                                                                                                  |

Also changed:

- Colour mode is stored under the kit's `theme-mode` key (old: `typestyles-theme`), so a saved choice resets once.
  `/playground` now uses the same key (item 9). The style choice (`typestyles-style`) is no longer read by docs pages.
- To bring styles back as presets, each would need a `createDesignTheme()` port (as Var UI's own site does in
  `docs/src/themes/*` + `typestyles-themes/*.ts`).
