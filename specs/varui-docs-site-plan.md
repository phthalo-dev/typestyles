# typestyles.dev on VarUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render typestyles.dev's shell, theming and code blocks from the published `@var-ui/*` packages, with every existing URL and AI-facing output unchanged.

**Architecture:** Migrate in stages on one branch. The site's data layer (`docs/src/lib/docs.ts`, `getAllDocs`/`getDocBySlug`) stays the single source for pages, `.md` views, `llms.txt`, `llms-full.txt`, search index and the MCP bundle, so output parity is preserved by construction. Only the chrome (header, sidebar, TOC, search, appearance, code blocks, theme) moves to the kit via `varDocs()` and `DocsPage`. Each task leaves `pnpm verify` green.

**Tech Stack:** Astro 5, `@var-ui/docs` / `@var-ui/astro` / `@var-ui/core` / `@var-ui/icons`, TypeStyles extraction (`@typestyles/astro`), Vitest via `vp`, pnpm workspace.

**Spec:** `specs/varui-docs-site.md`

## Global Constraints

- `@var-ui/*` pinned to exact versions (no `^`/`~`), all the same version. Start from the latest published (0.14.0 when the spec was written; re-check with `npm view @var-ui/docs version`).
- Exactly one `typestyles` resolution in `pnpm-lock.yaml` (the workspace package).
- Astro must satisfy the kit's peer range (kit catalog is `^5.14.0`; docs is currently `^5.6.1`).
- URLs unchanged: `/docs/<slug>`, `/docs/<slug>.md`, `/llms.txt`, `/llms-full.txt`, `/docs-index.json`, `/search-index.json`, `/mcp`, `/playground`, `/docs/changelog/**`.
- `pnpm verify` passes before every commit (AGENTS.md). Commit messages end with the Co-Authored-By line from the session attribution.
- No kit workaround without a filed or listed issue: record it in `specs/varui-docs-site-issues.md` (title, repo, repro, workaround location) and reference it from code as `TODO(var-ui#N)` / `TODO(typestyles#N)` once filed. Do not run `gh issue create` without the user's yes.
- Out of scope: content/nav order changes, playground internals, deploy workflow, MCP function API.

## Review Focus

- A slug or anchor that exists today returns 404 or a different heading id after migration: test compares the pre-migration URL list and heading ids.
- `llms.txt` / `.md` bytes change (link host, ordering, frontmatter): test snapshots against pre-migration output.
- Dark/light or style choice flashes wrong theme on first paint (FOUC) or resets on view-to-view navigation.
- Kit chrome CSS missing in the extracted `typestyles.css` (unstyled shell in production build only).
- Search palette and mobile sidebar break on keyboard-only use (focus trap, Escape, `/` or Cmd-K shortcut).

---

### Task 1: Pin VarUI, add single-copy guard, and get one kit page building

**Files:**

- Modify: `docs/package.json`, `pnpm-workspace.yaml` (astro catalog if needed), `docs/astro.config.mjs`, `docs/src/typestyles-entry.ts`, `docs/tsconfig.json`
- Create: `scripts/check-single-typestyles.ts`, `scripts/check-single-typestyles.test.ts`
- Modify: root `package.json` (script `check:single-typestyles`), `vite.config.ts` (add to the `ci` run task)

**Interfaces:**

- Produces: `export function findTypestylesResolutions(lockfile: string): string[]` (unique `typestyles@<version>` keys found under `packages:`/`snapshots:`; CLI exits 1 when length > 1).
- Produces: `varDocs()` registered in `astro.config.mjs` with `disableGuideRoutes: true`, `disableMiddleware: true`, `markdownViews: false`, `routes: { docs: { prefix: '/docs', collection: 'docs' } }` (we keep our own routes and our own `.md`/llms outputs).

- [ ] **Step 1: Write failing test** `findTypestylesResolutions` in `scripts/check-single-typestyles.test.ts`: lockfile text with one `typestyles@workspace`-style entry returns length 1; text containing both `typestyles@0.37.0` and `typestyles@0.36.0` returns both; input with `@typestyles/vite@…` only returns `[]` (scoped packages must not match).
- [ ] **Step 2: Run** `vp test run scripts/check-single-typestyles.test.ts`. Expected: FAIL (not defined).
- [ ] **Step 3: Implement** `findTypestylesResolutions` plus a CLI main that reads `pnpm-lock.yaml`, prints offenders, `process.exit(1)` if more than one. Wire `check:single-typestyles` into the `ci` task.
- [ ] **Step 4: Run** the test again. Expected: PASS. Run the CLI on the real lockfile: Expected: exit 0.
- [ ] **Step 5: Add deps** with exact versions: `pnpm --filter docs add --save-exact @var-ui/core @var-ui/astro @var-ui/docs @var-ui/icons`. Bump `astro` to satisfy the kit peer range if pnpm warns. Re-run the CLI guard. Expected: still exit 0 (if not, stop and file a var-ui issue about the peer range).
- [ ] **Step 6: Wire the integration** in `astro.config.mjs` as specified under Produces, with `theme.defaultClassName: defaultThemeClassName` from `@var-ui/core`, `typestyles.entry: 'src/typestyles-entry.ts'`, and `vite.ssr.noExternal: ['@var-ui/docs', '@var-ui/astro', '@var-ui/core', '@var-ui/icons']` (the kit ships raw `.astro`/`.ts`). Import `@var-ui/core/styles` and `@var-ui/docs/styles` in `typestyles-entry.ts`. Resolve conflicts with the existing `AstroTypestyles({ extract })` so only one extractor writes `typestyles.css` (keep ours; set the kit's extraction off or aligned if the config requires it; log any gap in the issues file).
- [ ] **Step 7: Prove it** by making `/docs/getting-started` render once through `DocsPage` (temporary branch inside `[slug].astro` is fine, via a `?kit` query-free approach: copy the page to `src/pages/kit-probe.astro`). Run `vp run -F docs build`. Expected: build succeeds, `dist/typestyles.css` contains a kit class (grep for a `var-ui` or `docsTopBar` class name from `@var-ui/docs/styles`). Delete the probe page.
- [ ] **Step 8: Record baselines** for later parity tests: add `docs/scripts/capture-baseline.mts` that builds nothing but reads `docs/dist` and writes `specs/baseline/urls.json` (sorted list of every `.html`/`.md`/`.txt`/`.json` path), `specs/baseline/llms.txt`, and heading ids per page. Run it against a build from `main` content (run before any chrome change lands, i.e. on this task's pre-change tree via `git stash`-free approach: build in a separate worktree of `main`). Commit the baselines.
- [ ] **Step 9: `pnpm verify`, commit** `feat(docs): add pinned @var-ui deps, single-typestyles guard, parity baselines`.

### Task 2: Shell on the kit (header, sidebar, TOC, mobile menu, search, appearance, theme)

**Files:**

- Create: `docs/src/lib/kitNav.ts`, `docs/src/lib/kitNav.test.ts`, `docs/src/layouts/KitDocsLayout.astro`
- Modify: `docs/src/pages/docs/[slug].astro`, `docs/src/pages/docs/index.astro`, `docs/src/pages/index.astro`, `docs/src/pages/404.astro`, `docs/src/pages/docs/recipes.astro`, `docs/src/pages/docs/design-system/kitchen-sink.astro`, `docs/src/pages/docs/changelog/index.astro`, `docs/src/pages/docs/changelog/[scope]/[name].astro`
- Modify: `docs/astro.config.mjs` (`theme.presets` from the existing design-style list in `src/tokens.ts`)

**Interfaces:**

- Consumes: `docNavigation` from `docs/src/navigation.ts`; `getAllDocs()` from `docs/src/lib/docs.ts`; `searchIndex` builder from `docs/src/lib/searchIndex.ts`.
- Produces: `export function toKitSidebarSections(nav: typeof docNavigation): { title: string; items: { text: string; link: string }[] }[]` and `export function toKitTopNav(): { text: string; link: string; match: string }[]` in `kitNav.ts`; items with only `href` (Playground, Changelog) map to `link: href`, items with `slug` map to `link: '/docs/<slug>'`.
- Produces: `KitDocsLayout.astro` props `{ title: string; currentPath: string; toc?: DocHeading[]; wide?: boolean }` wrapping `DocsPage`.

- [ ] **Step 1: Write failing tests** in `kitNav.test.ts`: every `slug` item maps to `/docs/<slug>`; href-only items keep their href; section order and count equals `docNavigation.categories`; no item is dropped (total item count equal).
- [ ] **Step 2: Run** `vp test run docs/src/lib/kitNav.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `toKitSidebarSections` / `toKitTopNav` (top nav: Docs, Playground, Changelog, GitHub, matching today's `SiteHeader` links).
- [ ] **Step 4: Run** tests. Expected: PASS.
- [ ] **Step 5: Create `KitDocsLayout.astro`** around `@var-ui/docs/DocsPage` passing `topNav`, `sidebarSections`, `searchItems` (from existing search index data, same fields), `themeClassName`, and the heading list for the TOC. Keep `Head` SEO tags (canonical, markdown alternate) via the kit's head slot, or fall back to rendering them in our own `<head>` extension if no slot exists (log in issues file).
- [ ] **Step 6: Switch `[slug].astro`** (and the other pages listed) from `DocsLayout` to `KitDocsLayout`. Keep prose rendering as-is (`set:html` of `entry.html`) for now. Keep `DocAiActions`, `PageFooter`, `Pagination`, `LiveDemo` rendered in the article area unchanged.
- [ ] **Step 7: Presets**: map `designStyleList` from `src/tokens.ts` to `theme.presets` (`id`, `label`, `className`, `swatch`) so the kit appearance menu replaces `AppearanceControls`. If the existing style switcher cannot be expressed as presets, STOP and report to the user which styles would be lost (spec: flag, don't drop silently).
- [ ] **Step 8: Verify** `vp run -F "docs..." build` succeeds; run parity script from Task 1: URL list identical to `specs/baseline/urls.json`; `llms.txt` byte-identical; heading ids identical. Then `vp run -F docs dev`, check in the browser (Browser pane): top bar, sidebar active state, TOC scrollspy, search (open with `/` or Cmd-K, arrow keys, Enter, Escape), mobile sidebar at 375px, dark/light + preset switch with no flash on reload.
- [ ] **Step 9: `pnpm verify`, commit** `feat(docs): render docs shell from @var-ui/docs`.

### Task 3: Code blocks and highlighting from the kit

**Files:**

- Modify: `docs/src/lib/highlightDocCode.ts`, `docs/src/lib/markdownCodeBlockHtml.ts`, `docs/src/lib/docs.ts`
- Test: `docs/src/lib/highlightDocCode.test.ts` (create)

**Interfaces:**

- Consumes: `@var-ui/docs/highlight` (`highlightCodeBlock`) and `@var-ui/docs/CodeBlock` markup classes.
- Produces: `highlightDocCode(code: string, lang?: string): { highlighted: string; lang: string }` keeps its current signature (callers in `docs.ts`, `LiveDemo`, MCP content generator unchanged).

- [ ] **Step 1: Write failing test**: for `ts`, `tsx`, `css`, `bash`, `html` and an unknown lang, `highlightDocCode` returns HTML containing `color.code.*` token classes or CSS variable usage from the kit highlighter, escapes `<` in input, and never throws.
- [ ] **Step 2: Run, expect FAIL. Step 3: Implement** by delegating to the kit's highlighter; keep the wrapper in `markdownCodeBlockHtml.ts` emitting the kit's CodeBlock class structure so copy/expand work with kit CSS. Remove `highlight.js` usage and the `codeHljsScope` dependency if nothing else needs it.
- [ ] **Step 4: Verify** tests pass; run existing `docs` test suite; rebuild and diff `.md` outputs (markdown views must be unaffected: they use raw source, not highlighted HTML). Visually check a long TS block in light and dark.
- [ ] **Step 5: `pnpm verify`, commit** `feat(docs): highlight code with the VarUI design-token theme`.

### Task 4: Custom features on kit chrome (install tabs, LiveDemo, AI actions)

**Files:**

- Modify: `docs/src/lib/expandInstallTabGroups.ts`, `docs/src/components/LiveDemo.astro`, `docs/src/components/DocAiActions.astro`, `docs/src/styles/liveDemo.ts`, `docs/src/styles/docAiActions.ts`
- Test: `docs/src/lib/expandInstallTabGroups.test.ts` (extend or create)

**Interfaces:**

- Consumes: kit `PackageInstall` markup (`packages`, `dev` props) or its CSS classes.
- Produces: unchanged marker syntax in content (`<!-- doc-install-tabs -->`, `<!-- doc-live-demo id="…" -->`). Content files are not edited.

- [ ] **Step 1: Write failing test**: the install-tabs expansion for the three-fence example in `getting-started.md` yields four tabs (pnpm/npm/yarn/bun if the kit provides bun; otherwise keep three) and each tab's command text is unchanged from source.
- [ ] **Step 2: Run, expect FAIL. Step 3: Implement** by re-skinning the generated markup with kit CodeBlock/Tabs classes (or rendering via `PackageInstall` only if the markup can be produced from Astro; the expansion runs on markdown strings, so prefer class-level reuse and record the gap if `PackageInstall` cannot be used from a string pipeline).
- [ ] **Step 4: Restyle `LiveDemo` and `DocAiActions`** with kit tokens/recipes (`@var-ui/core` button recipes for the AI actions menu); delete bespoke styles they replace.
- [ ] **Step 5: Verify** in browser: install tabs switch and copy; the three live demos (`components-variants`, `theming-light-dark`, `getting-started-button`) render and update; AI actions copy markdown and open links. `pnpm verify`, commit `feat(docs): port install tabs, live demos, AI actions to kit styling`.

### Task 5: Playground, changelog, design-system and home pages on kit chrome

**Files:**

- Modify: `docs/src/layouts/PlaygroundLayout.astro`, `docs/src/pages/playground.astro`, `docs/src/pages/index.astro`, `docs/src/styles/home.ts`, `docs/src/styles/playground.ts`

**Interfaces:**

- Consumes: `@var-ui/docs/DocsMarketingPage` (home), `DocsTopBar` + `DocsAppearanceMenu` (playground custom layout).

- [ ] **Step 1: Home** on `DocsMarketingPage`, preserving hero copy and CTA links; delete bespoke header duplication.
- [ ] **Step 2: Playground**: `PlaygroundLayout` uses `DocsTopBar` and `DocsAppearanceMenu`; playground internals untouched. Verify Monaco loads, a preset runs in the iframe, share-URL state round-trips (`urlState.test.ts` still passes).
- [ ] **Step 3: Changelog and kitchen-sink pages** already moved in Task 2; check them against the baseline URL list and fix styling gaps.
- [ ] **Step 4: Verify** `vp run -F docs test`, build, parity script, browser pass at 375px and 1280px. `pnpm verify`, commit `feat(docs): home, playground and changelog on VarUI chrome`.

### Task 6: Cleanup and docs

**Files:**

- Delete: superseded components in `docs/src/components` (`Sidebar`, `SiteHeader`, `Toc`, `TocNav`, `MobileSidebar`, `SearchPalette`, `AppearanceControls`, `SkipLink`, `CodeBlockCopy` if unused), matching `docs/src/styles/*`, `docs/src/scripts/docsSearch.ts`, `docs/src/lib/docsAppearanceRuntime.ts`, `docs/src/lib/initDocsAppearanceControls.ts`, `docs/src/layouts/DocsLayout.astro`
- Modify: `docs/package.json` (drop `@examples/design-system`, `highlight.js` if unused), `docs/src/typestyles-entry.ts`, `docs/README.md`, `docs/DOC_STRUCTURE.md`, `AGENTS.md` (note the VarUI pin policy under Monorepo layout/CI)
- Create: `.changeset/*.md` only if a published package changed (none expected; skip otherwise).

- [ ] **Step 1: Delete** each listed file; run `vp run -F docs build` and `vp check` after each batch to catch dangling imports (knip-style: `grep -rn "<name>" docs/src` before deleting).
- [ ] **Step 2: Remove** `@examples/design-system` from `docs/package.json` and the entry file; confirm `pnpm install` and the single-typestyles guard still pass.
- [ ] **Step 3: Document** the pin policy (exact pins, bump with typestyles, hold back if VarUI lags, single-copy guard) in `docs/README.md` and one paragraph in `AGENTS.md`.
- [ ] **Step 4: Final parity**: full build, parity script green, `pnpm verify`, preview the built site (`vp run -F docs preview`) and click through home, a docs page, search, playground, changelog.
- [ ] **Step 5: Issues**: finalize `specs/varui-docs-site-issues.md`; present it to the user; file with `gh issue create` only on their yes, then replace placeholders with real `TODO(…#N)` references. Commit `chore(docs): remove superseded chrome, document VarUI pin policy`.

## Self-review notes

- Spec coverage: shell (T2), code blocks/highlighting (T3), custom features (T4–5), `@examples/design-system` removal and docs (T6), pinning + single-copy (T1, T6), issue filing (Global Constraints, T6), verification via parity baselines (T1 onward).
- Deliberate deviation from the spec's first design sketch: pages stay on `getDocBySlug` (not an Astro content collection + `DocsGuidePage`), because MCP, search, llms and install-tab/live-demo markers all consume that pipeline and it guarantees output parity. Revisit only if the kit later offers a string-pipeline hook.
- Open item resolved as my call: kit `markdownViews` is disabled in favor of our existing outputs (spec allowed "keeping or extending ours").
