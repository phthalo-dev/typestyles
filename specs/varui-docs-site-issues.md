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
