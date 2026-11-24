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

- **Repro:** `DocsSearchItem` has `title`, `meta`, `keywords`, `headings`; items are inlined into every page.
  The old site searched page bodies (lazy-loaded `/search-index.json` with MiniSearch).
- **Why it matters:** body-text search is a regression; shipping bodies inline would bloat every page.
- **Expected:** an optional lazily fetched index (URL) or a `body` field searched after load.
- **Workaround:** none; titles, descriptions, categories and h2/h3 headings are searchable. `/search-index.json`
  is unchanged and still served.

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
  The style choice (`typestyles-style`) is no longer read.
- To bring styles back as presets, each would need a `createDesignTheme()` port (as Var UI's own site does in
  `docs/src/themes/*` + `typestyles-themes/*.ts`).
