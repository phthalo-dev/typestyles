# Rebuild the typestyles.dev docs site on VarUI

Status: draft, awaiting approval. Date: 2026-11-24.

## Intent

typestyles.dev should be built on VarUI (`@var-ui/*`), the design system we
build on top of TypeStyles. The site is the prime public example of how good
TypeStyles DX is for building a design system, and VarUI's own docs site
already runs on the `@var-ui/docs` kit. If the kit cannot carry a site as big
as ours, we want to find that out and fix it in the open.

Secondary goal: dogfooding. Every bug or DX gap hit along the way is filed on
the repo that owns it (`phthalo-dev/typestyles` or `phthalo-dev/var-ui`).

## Goals

- `docs/` renders its shell (top bar, sidebar, TOC, search, appearance menu,
  code blocks, theming, syntax highlighting) from `@var-ui/docs` and
  `@var-ui/astro`, configured through `varDocs()`.
- Content stays in `docs/content/docs/*.md`, loaded by a content collection
  with `docsSchema()`. Markdown sibling URLs (`/docs/<slug>.md`), `/llms.txt`
  and `/llms-full.txt` keep working, with the same URLs.
- The custom features survive with the same behavior: install tabs, `LiveDemo`
  (build-time CSS extraction), AI actions bar, playground, changelog and
  design-system pages, search index endpoints, the MCP endpoint.
- `@examples/design-system` is no longer a dependency of `docs/`.
- Dependency on VarUI is by published npm version, pinned exactly.

## Non-goals

- No redesign of content, information architecture or navigation order.
- No changes to the playground's internals (Monaco, esbuild-wasm, iframe
  runner). Only its page shell moves.
- No change to deploy (Netlify CLI from `ci.yml`) or the MCP function's API.
- Not making `examples/design-system` go away. It may still serve other
  consumers; only `docs/` stops depending on it.

## Anti-goals (a failure even if it technically works)

- URLs, anchors or markdown/llms output regress and break inbound links or AI
  tooling.
- Workarounds hidden in the docs site for kit gaps, with no issue filed. A gap
  is either fixed upstream, or filed and referenced by a `TODO(var-ui#N)`.
- Two copies of `typestyles` resolved in the docs build.

## Constraints

- VarUI is a separate repo and is published to npm (0.14.0 at time of
  writing). Its `typestyles` peer range is `^0.37.0`; this repo is at 0.37.0.
  pnpm's workspace resolution gives one shared copy while the ranges overlap.
- The circularity is release lag only: after a typestyles breaking change,
  the docs site cannot move until VarUI ships a compatible release.
- Astro 5, TypeStyles extraction from `src/typestyles-entry.ts`
  (`@typestyles/astro`, `mode: 'build'`).
- `pnpm verify` must pass before each commit (AGENTS.md).
- Filing issues posts to public repos: show the list to the user first.

## Approaches considered

- **A. Big-bang swap.** One change replaces everything. Fastest, but a huge
  unreviewable PR and a broken site mid-way.
- **B. Staged migration on one branch (chosen by the user).** Each step leaves
  the site building and can be reviewed alone; kit gaps surface one at a time.
  Cost: temporary old/new coexistence.
- **C. Parallel `docs-next` app, then cut over.** Safe production, but two
  sites and content pipelines to keep in sync, plus a risky final swap.

## Design (approach B)

Stages, each a reviewable commit or small group of commits that leaves
`pnpm verify` green and the site working:

1. **Foundations.** Add `@var-ui/core`, `@var-ui/astro`, `@var-ui/docs`,
   `@var-ui/icons` at exact versions (my call: exact pins, not ranges). Add a
   CI check that the install has exactly one `typestyles` copy. Wire
   `varDocs()` in `astro.config.mjs` alongside the existing integrations;
   register `@var-ui/core/styles` and `@var-ui/docs/styles` in
   `typestyles-entry.ts`. Prove one guide page renders through the kit.
2. **Content and routing.** Add `content.config.ts` with `docsSchema()` over
   `content/docs`. Route guides through the kit (`DocsGuidePage`, or the
   injected routes if they suit our static build). Move nav to the kit's
   `topNav`/`sidebarSections` generated from `src/navigation.ts`. Replace our
   search, TOC, sidebar, header, appearance controls. Move `.md` views,
   `llms.txt` and `llms-full.txt` onto the kit's markdown views, keeping or
   extending ours where the output differs. Redirects for any URL that moves.
3. **Custom features, one per commit.** Install tabs marker, `LiveDemo`, AI
   actions bar, changelog page, design-system page, recipes page, home page
   (`DocsMarketingPage`), 404, playground page shell. Search/MCP content
   generators keep working off the same content.
4. **Cleanup.** Delete superseded components and styles, drop
   `@examples/design-system` from `docs/package.json`, update `docs/README.md`
   and `DOC_STRUCTURE.md`, add a docs page or README section describing the
   VarUI pin policy.

Version policy: `@var-ui/*` pinned exactly; bumped together with `typestyles`
in the same change when typestyles releases; if VarUI lags, docs holds back.

Issue filing: keep a running list (title, repo, repro) in the PR description
as gaps are found. At the end of each stage, show the list to the user, then
file with `gh issue create` only after they say yes.

## Verification

- `pnpm verify` at each stage.
- Before/after comparison of the built site: set of URLs, `/llms.txt`,
  `/llms-full.txt`, `.md` outputs, `search-index.json` entries.
- Manual run of `vp run -F docs dev` and a built preview: light/dark and
  style switching, search, mobile sidebar, playground load, LiveDemo.
- Unit tests in `docs/` keep passing; new code gets tests where logic exists
  (nav mapping, URL parity check).

## Left to the builder

- Whether injected kit routes or `DocsGuidePage` in our own `[slug].astro`
  suits our static build better (the kit README supports both).
- Exact mapping of our five-ish nav categories to kit sidebar sections.
- How the playground page uses the kit chrome (`DocsMarketingPage` or a
  custom layout using `DocsTopBar`).
- Whether the existing "design style" switcher maps to the kit's
  `theme.presets` or is dropped (flag to user if dropped).

## Open risks

- Kit may not expose slots for the AI actions bar or install tabs.
- Kit's markdown/llms output may differ from ours (frontmatter, link
  rewriting, `llms-full` ordering).
- Bundle weight of the kit chrome versus ours; check Lighthouse before/after.
