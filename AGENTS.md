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
pnpm build            # turbo build (all packages + docs)
pnpm verify           # lint + typecheck + test (same checks as CI)
pnpm test             # turbo test
pnpm typecheck        # turbo typecheck
pnpm lint             # turbo lint
```

## Before committing

**Required.** Before creating a git commit (or when the user asks you to commit), run the same checks as [CI](.github/workflows/ci.yml):

```bash
pnpm verify
```

This runs `lint`, `typecheck`, and `test` in sequence. Fix any failures before committing — do not skip hooks or commit with known CI failures.

When you changed only one package, you may scope checks for faster feedback (must still pass full `pnpm verify` before commit):

```bash
pnpm --filter typestyles test
pnpm turbo run lint typecheck test --filter=typestyles
```

The pre-commit hook only runs Prettier on staged files; it does **not** replace `pnpm verify`.

Docs site only:

```bash
pnpm --filter docs dev
pnpm --filter docs build
turbo run build --filter docs
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
- Tests: Vitest (`vitest run` per package)
- Changesets for releases (`.changeset/`)
- Prettier + ESLint; husky pre-commit runs lint-staged

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
