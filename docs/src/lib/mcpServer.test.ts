import { describe, expect, it } from 'vite-plus/test';
import {
  createMcpServer,
  handleMcpRequest,
  listMcpToolNames,
  mcpContentBundle,
  mcpTools,
} from '../../netlify/functions/mcpServer';

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content.map((c) => c.text ?? '').join('\n');
}

describe('mcpContentBundle', () => {
  it('loads docs, search index, and navigation from bundled JSON', () => {
    expect(Object.keys(mcpContentBundle.docs).length).toBeGreaterThan(10);
    expect(mcpContentBundle.searchIndex.length).toBeGreaterThan(10);
    expect(mcpContentBundle.listDocs.length).toBeGreaterThan(0);
  });
});

describe('MCP tools', () => {
  it('registers six tools on the server', () => {
    expect(listMcpToolNames().sort()).toEqual(
      ['get_changelog', 'get_doc', 'get_examples', 'list_docs', 'lookup_api', 'search_docs'].sort(),
    );
    expect(createMcpServer()).toBeDefined();
  });

  it('search_docs returns ranked hits', () => {
    const text = textOf(mcpTools.searchDocs('vite plugin'));
    expect(text).toMatch(/vite/i);
  });

  it('get_doc returns full markdown', () => {
    const text = textOf(mcpTools.getDoc('getting-started'));
    expect(text).toContain('# Getting Started');
  });

  it('list_docs follows nav categories', () => {
    const text = textOf(mcpTools.listDocs());
    expect(text).toContain('## Getting Started');
    expect(text).toContain('getting-started');
  });

  it('lookup_api resolves styles', () => {
    const text = textOf(mcpTools.lookupApi('styles'));
    expect(text).toMatch(/styles/i);
  });

  it('get_examples finds button-related blocks', () => {
    const text = textOf(mcpTools.getExamples('button'));
    expect(text).toMatch(/button/i);
    expect(text).toContain('```');
  });

  it('get_changelog returns package markdown', () => {
    const text = textOf(mcpTools.getChangelog('typestyles'));
    expect(text.length).toBeGreaterThan(20);
  });

  it('get_doc did-you-mean for unknown slug', () => {
    const text = textOf(mcpTools.getDoc('not-a-real-slug-xyz'));
    expect(text).toMatch(/Did you mean/i);
  });
});

describe('MCP HTTP handler', () => {
  it('returns 405 for non-POST requests', async () => {
    const res = await handleMcpRequest(
      new Request('https://typestyles.test/mcp', { method: 'GET' }),
    );
    expect(res.status).toBe(405);
  });
});
