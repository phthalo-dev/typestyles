# AGENTS.md

Guidance for coding agents working in the **typestyles** monorepo.

## What is typestyles?

CSS-in-TypeScript: type-safe style objects, design tokens as CSS custom properties, human-readable class names, and optional zero-runtime extraction via bundler plugins (`@typestyles/vite`, `@typestyles/next`, etc.).

**Public entry:** `createTypeStyles({ scopeId, layers? })` → `{ style, recipe, tokens, global, … }`. Prefer that over lower-level `createStyles` / `createTokens` / `createGlobal`. Cascade layers use nested config: `layers: { order, token, style, global? }`. Globals: `global.rule` / `global.rules` / `global.apply` / `global.fontFace`.

- **Docs site:** https://typestyles.dev
- **AI doc index:** https://typestyles.dev/llms.txt
- **Full markdown bundle:** https://typestyles.dev/llms-full.txt
- **MCP server:** https://typestyles.dev/mcp (search, fetch docs, API lookup, examples, changelogs)

## Monorepo layout

| Path                                                             | Purpose                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------- |
| `packages/typestyles`                                            | Core runtime (`styles`, `tokens`, `cx`, …)                  |
| `packages/vite`, `rollup`, `esbuild`, `webpack`, `next`, `astro` | Bundler integrations                                        |
| `packages/react`, `props`, `open-props`, `migrate`, `cli`        | Framework adapters & tooling                                |
| `packages/build-runner`                                          | Shared build-time CSS extraction                            |
| `docs/`                                                          | Astro documentation site (source: `docs/content/docs/*.md`) |
| `examples/`                                                      | Runnable example apps                                       |

Package manager: **pnpm** (workspace). Node 20+ recommended.

## Key commands

Run from the **repository root**:

```bash
pnpm install          # install all workspace deps
pnpm build            # vp pack every package
pnpm verify           # build + check + typecheck + test (`vp run ci`, same as CI)
pnpm test             # vp run -r test
pnpm check            # vp check (format + lint)
pnpm lint             # vp lint
```

## Before committing

**Required.** Before creating a git commit (or when the user asks you to commit), run the same checks as [CI](.github/workflows/ci.yml):

```bash
pnpm verify
```

This builds every package, then runs `vp check` (format + lint), per-package `typecheck`, and per-package tests. Fix any failures before committing — do not skip hooks or commit with known CI failures.

When you changed only one package, you may scope checks for faster feedback (must still pass full `pnpm verify` before commit):

```bash
vp run -F typestyles test
vp run -F typestyles typecheck
```

The pre-commit hook only runs `vp staged` (format and lint on staged files); the pre-push hook runs `vp run ci`.

Docs site only:

```bash
vp run -F docs dev
vp run -F "docs..." build   # builds the workspace packages docs depends on first
```

Core package:

```bash
pnpm --filter typestyles test
pnpm --filter typestyles build
```

## Documentation for agents

- Prefer fetching **clean markdown** over parsing HTML: `https://typestyles.dev/docs/<slug>.md`
- Use the **MCP server** when you need search or API lookup mid-task
- Doc source lives in `docs/content/docs/`; navigation order is in `docs/src/navigation.ts`
- AI transforms: `docs/src/lib/aiMarkdown.ts`

## Conventions

- TypeScript throughout; ESM (`"type": "module"`)
- Tests: Vitest through Vite+ (`vp test run` per package)
- Changesets for releases (`.changeset/`)
- Vite+ (`vp`): Oxlint and Oxfmt via `vp check`, tsdown via `vp pack`; hooks in `.vite-hooks/`

### Type tests

`pnpm typecheck` (`tsc --noEmit`) is what locks call-signature behavior. `tsconfig.json` excludes `**/*.test.ts`, so a negative check inside a Vitest file never runs.

Put compile-only fixtures in `*.type-tests.ts` or `*.typecheck.ts` next to the implementation (see `packages/typestyles/src/create-type-styles.typecheck.ts` and `component-overload.type-tests.ts`). Those files are part of `tsc` and are not executed by Vitest.

Reject a call or property with a comment on the line above it:

```ts
// @ts-expect-error — `layer` must be one of the configured `layers.order` names
styles.class('card', { color: 'red' }, { layer: 'nope' });
```

Say what should fail. An unused `@ts-expect-error` fails typecheck, which is the signal that the negative case started compiling. Do not leave that directive on a line that is supposed to succeed.

### Style API types

`createStyles` returns `StylesApi<Options>`. `recipe` / `component` is `RecipeFn`. Layers, utils, and attribute mode are parameters of those two types. Do not add a named alias per combination (`StylesApiWithLayers`, `SemanticRecipeFn`, and the rest of that matrix). Component vars come from `vars` on the config or `c.vars()`, not a `varDefinitions` option on the call.

## Common pitfalls

- Styles must be **imported** from a side-effect entry (e.g. `typestyles-entry.ts`) for build extraction to emit CSS
- Use `createTypeStyles({ scopeId })` per package/micro-frontend for token/class isolation
- Prefer `recipe` + variants (from `createTypeStyles`) over ad-hoc string class names
- SSR: use `typestyles/server` helpers; see `docs/content/docs/ssr.md`

## CI/CD

All three repos (`typestyles`, `var-ui`, `homeslate`) use the same pipeline. Everything lives in `.github/workflows/ci.yml`.

- **Verify** is the status check to require on `main`. It runs `vp run ci`, the same command the pre-push hook runs, so run it before pushing. Every package under `packages/*` is built and published. `Benchmark` runs on PRs that touch `packages/typestyles`, `benchmarks` or the lockfile.
- **Release** runs on `main` after `Verify`. It reuses the `dist` that `Verify` built, mints a token from the GitHub App (so the version PR and tags trigger CI), and runs the changesets action.
- **Deploy docs / Preview docs** build the docs site with the Netlify CLI (`netlify deploy --build`) and deploy it: production after `Verify` on `main`, a `deploy-preview-<PR>` alias with a sticky comment on same-repo PRs. They only run when docs or the packages they use changed (the `Changes` job). Netlify's own git builds are turned off (`ignore = "exit 0"` in `netlify.toml`).
- **Unstable publish** is manual: Actions → CI → Run workflow → tick `unstable`. It versions every package as `0.0.0-unstable.<sha>` and publishes with the `unstable` tag. It lives in `ci.yml` (not its own file) because the npm trusted publisher is bound to that filename.

### Releasing

1. Add a changeset (`pnpm changeset`) to any PR that changes a published package.
2. After merge, Release opens a `chore: version packages` PR. `Verify` runs on it. Merge it to publish.
3. Publishing uses **npm trusted publishing (OIDC)** with provenance. There is no `NPM_TOKEN`. Each package's trusted publisher is `phthalo-dev/typestyles` with workflow **`ci.yml`**, so do not rename that file or move the release job.
4. A **new package** needs one manual first publish, then: `npm trust github <pkg> --repo phthalo-dev/typestyles --file ci.yml --allow-publish --allow-stage-publish -y`.

### Things that bite

- Git hooks live in `.vite-hooks/` (`vp staged` and a main-branch guard on commit; a changeset check and `vp run ci` on push). They exit early when `CI` is set; the release job commits and pushes tags, and must not re-run them.
- Generated `CHANGELOG.md` files are excluded from formatting; changesets does not format them.
- Do not set `registry-url` on `setup-vp`: it writes a placeholder auth token that blocks OIDC. The release job also installs `npm@^11.5.1` (trusted publishing needs it; npm 12 rejects flags pnpm forwards).
- Secrets: `APP_CLIENT_ID` and `APP_PRIVATE_KEY` (GitHub App) are org secrets, with `NETLIFY_AUTH_TOKEN`; `NETLIFY_SITE_ID` is a repo secret.
- Node comes from `.nvmrc`; pnpm from `packageManager`. Do not repeat versions in workflow YAML.
