import { describe, expect, it } from 'vite-plus/test';
import { buildLlmsTxt } from './llmsTxt';
import { docNavigation } from '../navigation';

const stubDoc = (slug: string, description: string) => ({
  slug,
  title: slug,
  description,
  content: '',
  html: '',
});

describe('buildLlmsTxt', () => {
  it('follows navigation category order and link format', () => {
    const docsBySlug = Object.fromEntries(
      docNavigation.categories
        .flatMap((c) => c.items)
        .filter((item) => item.slug)
        .map((item) => [item.slug!, stubDoc(item.slug!, `${item.slug} description`)]),
    );

    const txt = buildLlmsTxt(docsBySlug);
    expect(txt).toMatch(/^# typestyles\n\n>/);
    expect(txt).toContain('## Getting Started');
    expect(txt).toContain(
      '- [Getting Started](https://typestyles.dev/docs/getting-started.md): getting-started description',
    );
    expect(txt).toContain('## Optional');
    expect(txt).toContain('https://typestyles.dev/llms-full.txt');
    expect(txt).toContain('https://typestyles.dev/mcp');

    const gettingStartedIdx = txt.indexOf('## Getting Started');
    const coreIdx = txt.indexOf('## Core Concepts');
    const optionalIdx = txt.indexOf('## Optional');
    expect(gettingStartedIdx).toBeLessThan(coreIdx);
    expect(coreIdx).toBeLessThan(optionalIdx);
  });
});
