---
title: Use with AI tools
description: Query typestyles documentation from LLM crawlers, coding agents, and chat assistants
---

TypeStyles documentation is built for humans **and** AI tools. Every page has a clean Markdown sibling, a machine-readable index, and a remote MCP server you can add to your editor.

## Quick links

| Resource            | URL                                                                 |
| ------------------- | ------------------------------------------------------------------- |
| Documentation index | [llms.txt](https://typestyles.dev/llms.txt)                         |
| Full doc bundle     | [llms-full.txt](https://typestyles.dev/llms-full.txt)               |
| JSON index          | [docs-index.json](https://typestyles.dev/docs-index.json)           |
| MCP server          | [https://typestyles.dev/mcp](https://typestyles.dev/mcp)            |
| MCP discovery       | [.well-known/mcp.json](https://typestyles.dev/.well-known/mcp.json) |

Any doc page is also available as Markdown: append `.md` to the HTML path — for example [getting-started.md](https://typestyles.dev/docs/getting-started.md).

## MCP server tools

The MCP server at `https://typestyles.dev/mcp` exposes read-only tools:

- **`search_docs`** — keyword search across all pages
- **`get_doc`** — full clean markdown for one page by slug
- **`list_docs`** — all pages grouped by sidebar category
- **`lookup_api`** — API reference sections by symbol (e.g. `recipe`)
- **`get_examples`** — code blocks from the docs by topic
- **`get_changelog`** — package changelogs, optionally one version

Doc pages are also available as MCP resources at `typestyles://docs/<slug>`.

## Add to your editor

### Claude Code

```bash
claude mcp add --transport http typestyles https://typestyles.dev/mcp
```

### Cursor

Add to your MCP config (`.cursor/mcp.json` in your project or global Cursor settings):

```json
{
  "mcpServers": {
    "typestyles": {
      "url": "https://typestyles.dev/mcp"
    }
  }
}
```

### VS Code

Add to your user or workspace MCP settings:

```json
{
  "servers": {
    "typestyles": {
      "type": "http",
      "url": "https://typestyles.dev/mcp"
    }
  }
}
```

### ChatGPT

Use **Connectors** or custom GPT actions with the MCP endpoint `https://typestyles.dev/mcp` (Streamable HTTP transport).

## On-page actions

Every documentation page includes **Copy as Markdown**, **View as Markdown**, and **Open in AI** actions next to the title. Use them to paste a page into Claude or ChatGPT with one click.

## In your project

The `typestyles` npm package ships an [`llms.txt`](https://www.npmjs.com/package/typestyles) with API patterns and links to the full docs. Agents working inside consumer repos can read it from `node_modules/typestyles/llms.txt`.

The [typestyles monorepo](https://github.com/phthalo-dev/typestyles) includes an `AGENTS.md` at the repo root with monorepo layout and build commands.
