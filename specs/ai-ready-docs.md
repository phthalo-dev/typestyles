# AI-Ready Documentation Site — Design Spec

Make [typestyles.dev](https://typestyles.dev) a first-class citizen for AI
tools: LLM crawlers, coding agents, and chat assistants should be able to
discover, read, and query the docs as easily as humans browse them.

Designed 2026-07-04. Approach: **static-first** — every AI-facing artifact is
prerendered at build time from the existing docs pipeline
(`docs/src/lib/docs.ts` + `docs/src/navigation.ts`); the remote MCP server is a
thin stateless wrapper over the same build artifacts. One source of truth
(`docs/content/docs/*.md`), zero drift, and the static surface keeps serving
crawlers even if the MCP function is down.

---

## The actual problem

The docs site is a static Astro build whose _source_ is already Markdown, but
none of that is reachable by AI tools:

1. **No machine-readable entry point.** There is no `llms.txt`, so LLM crawlers
   and agents have no index of what documentation exists or where to fetch it
   in a token-efficient format.
2. **Markdown is trapped inside HTML.** Every page is served only as a rendered
   HTML document with nav chrome, search UI, and highlighted markup. An agent
   fetching `/docs/getting-started` burns tokens parsing layout instead of
   reading content.
3. **No queryable interface.** Coding agents (Claude Code, Cursor, etc.) can't
   search or look up typestyles APIs mid-task; they rely on training data,
   which goes stale with every release.
4. **No in-repo guidance.** An agent working inside a consumer project that
   uses `typestyles` has nothing local that teaches correct patterns.

## Scope

Everything below lives in `docs/` (the Astro site) unless noted.

1. Static AI content surface: `.md` routes, `llms.txt`, `llms-full.txt`,
   `docs-index.json`, crawler hygiene
2. Remote MCP server on Netlify Functions at `https://typestyles.dev/mcp`
3. On-page AI actions (copy/open as Markdown) + agent onboarding files
   (`AGENTS.md`, package `llms.txt`)
4. Tests for the transforms and the MCP server

**Out of scope (follow-ups):** a Claude Code plugin/skill shipped with the npm
package; MCP registry submission (post-launch task); Accept-header content
negotiation is a stretch item, not blocking.

---

## 1. Static AI content surface

### 1.1 Clean-markdown transform (shared foundation)

A new module `docs/src/lib/aiMarkdown.ts` converts a `DocEntry` into
"AI-clean" markdown used by _every_ consumer below (`.md` routes, llms-full,
MCP bundle):

- Emit `# {title}` followed by the frontmatter `description` as a lead
  paragraph (raw frontmatter is stripped).
- Replace each `<!-- doc-live-demo id="X" -->` marker with the demo's real
  source code (resolved via `src/demos/registry.ts` / `*.source.txt`) in a
  fenced `ts` block, prefixed by a one-line note linking to the interactive
  demo on the HTML page. An unknown demo id **fails the build** (loud, not
  silent).
- Normalize install-tab-group markers (see `expandInstallTabGroups.ts`) into a
  single plain fenced block using the pnpm variant, with the npm/yarn variants
  as comment lines — no HTML tab structure.
- Append a footer line with the canonical HTML URL of the page.

### 1.2 Routes

All prerendered static endpoints (Astro `APIRoute` files, `prerender = true`):

| Route                               | Source file                                     | Content                                                                                           |
| ----------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/docs/<slug>.md`                   | `src/pages/docs/[slug].md.ts`                   | Clean markdown for one page, `Content-Type: text/markdown; charset=utf-8`                         |
| `/docs/changelog/<scope>/<name>.md` | `src/pages/docs/changelog/[scope]/[name].md.ts` | Changelog markdown via `lib/changelogs.ts`                                                        |
| `/llms.txt`                         | `src/pages/llms.txt.ts`                         | Standard llms.txt index (below)                                                                   |
| `/llms-full.txt`                    | `src/pages/llms-full.txt.ts`                    | All doc pages' clean markdown concatenated, separated by `\n\n---\n\n`, each starting with its H1 |
| `/docs-index.json`                  | `src/pages/docs-index.json.ts`                  | `[{ slug, title, description, category, mdUrl, htmlUrl }]`                                        |

`llms.txt` format (per the llms.txt convention):

```
# typestyles

> <one-paragraph project summary>

## Getting Started
- [Getting started](https://typestyles.dev/docs/getting-started.md): <description>
...
```

Sections mirror the sidebar categories in `src/navigation.ts`, in nav order.
A final `## Optional` section links `llms-full.txt`, `docs-index.json`, the
changelog index, and the MCP endpoint.

### 1.3 Crawler & indexing hygiene

- Add `site: 'https://typestyles.dev'` to `astro.config.mjs` and install
  `@astrojs/sitemap` → `/sitemap-index.xml`.
- `docs/public/robots.txt`: allow all, with explicit `User-agent` allow blocks
  for GPTBot, ClaudeBot, Claude-Web, PerplexityBot, Google-Extended, CCBot;
  `Sitemap:` pointer.
- Canonical `<link rel="canonical">` in the shared layout head; each HTML doc
  page also gets `<link rel="alternate" type="text/markdown">` pointing at its
  `.md` sibling.
- **Stretch (non-blocking):** Netlify Edge Function rewriting `/docs/<slug>` →
  `/docs/<slug>.md` when `Accept: text/markdown` outranks `text/html`.

## 2. Remote MCP server

### 2.1 Runtime shape

- One stateless Netlify Function: `docs/netlify/functions/mcp.mts`, exposed at
  `https://typestyles.dev/mcp` (function route/redirect in `netlify.toml`).
- Streamable HTTP transport from `@modelcontextprotocol/sdk`, stateless mode
  (new `McpServer` + transport per request, no session store). Public,
  unauthenticated, read-only; GET/SSE streaming not required.
- **Content bundle:** the docs build additionally emits
  `mcp-content.json` — clean markdown per doc, search-index items,
  `api-reference.md` split into heading-keyed sections, extracted code
  examples, and changelog entries. The function imports this JSON at bundle
  time, so it makes zero runtime fetches and is always in lockstep with the
  deployed site. The file under `docs/netlify/functions/` is **gitignored**
  and written by Astro build (`generateMcpContentIntegration`) or
  `pnpm --filter docs generate:mcp-content` / vitest globalSetup.

### 2.2 Tools

| Tool            | Input                           | Returns                                                                                        |
| --------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `search_docs`   | `query: string`                 | Ranked MiniSearch hits: title, slug, snippet, category, md URL                                 |
| `get_doc`       | `slug: string`                  | Full clean markdown of the page                                                                |
| `list_docs`     | —                               | Categories → `{ slug, title, description }` in nav order                                       |
| `lookup_api`    | `symbol: string`                | The heading-section of `api-reference.md` matching the symbol (e.g. `recipe`, `nameTemplate`)  |
| `get_examples`  | `topic: string`                 | Code blocks from the docs whose nearest heading/page matches the topic, with source-page links |
| `get_changelog` | `pkg: string, version?: string` | Changelog markdown for the package, optionally one version's entry                             |

Doc pages are additionally exposed as MCP **resources**
(`typestyles://docs/<slug>`, `text/markdown`).

Error behavior: unknown slug/symbol/package returns a helpful message with
nearest matches from the search index ("did you mean …"), never a bare error.

### 2.3 Discoverability

- `docs/public/.well-known/mcp.json` describing the endpoint (name, version,
  transport, endpoint URL).
- New docs page `content/docs/ai-tools.md` ("Use with AI tools"): what's
  available (llms.txt, `.md` URLs, MCP) + copy-paste install snippets for
  Claude Code (`claude mcp add --transport http typestyles
  https://typestyles.dev/mcp`), Cursor, VS Code, and ChatGPT. Added to
  `navigation.ts`.
- Post-launch follow-up (not in this change): submit to the official MCP
  registry.

## 3. On-page UI + agent onboarding files

### 3.1 Page actions

On every doc page, next to the title (using existing design-system button/menu
styles):

- **Copy as Markdown** — client script fetches the sibling `.md`, writes to
  clipboard.
- **View as Markdown** — plain link to the `.md` route.
- **Open in Claude** / **Open in ChatGPT** — links to `claude.ai/new?q=…` /
  `chatgpt.com/?q=…` prefilled with "Read https://typestyles.dev/docs/<slug>.md
  so we can discuss it".

### 3.2 Onboarding files

- **`AGENTS.md`** at the repo root: what typestyles is, monorepo map, key
  commands (build/test/typecheck), pointers to `llms.txt` and the MCP server.
- **Package `llms.txt`:** the `typestyles` npm package ships an `llms.txt`
  (added to `files` in its `package.json`): concise API patterns, common
  mistakes, links to the `.md` docs. Referenced from the package README so
  agents inside consumer repos find it.

## 4. Testing

- **Unit (vitest in `docs/`, matching monorepo setup):** `aiMarkdown.ts`
  transform — live-demo replacement, tab normalization, frontmatter handling,
  unknown-demo-id build failure; `llms.txt` generation — category order and
  entry format match `navigation.ts`.
- **Integration:** drive the MCP function handler with a real
  `@modelcontextprotocol/sdk` client — initialize, list tools, call each of
  the six tools, assert shapes and the did-you-mean error path.
- **Rollout verification:** `turbo run build --filter docs`, then curl
  `/llms.txt`, `/llms-full.txt`, several `.md` routes and `docs-index.json`
  from `docs/dist`; after deploy, connect Claude Code to
  `https://typestyles.dev/mcp` end-to-end.

## Decisions log

- Hosting: **Netlify Functions** (same repo/deploy/domain) over Cloudflare
  Workers or a standalone service.
- MCP scope: **full toolbox** (search, fetch, API lookup, examples,
  changelog).
- Architecture: **static-first** artifacts + thin MCP wrapper, over a
  standalone generation script (drift risk) or dynamic/edge rendering (weak
  for static crawlers).
- Extras in scope: copy/open-as-Markdown UI, AGENTS.md + package llms.txt,
  MCP discoverability, crawler hygiene.
