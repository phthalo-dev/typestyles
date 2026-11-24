import { describe, expect, it } from 'vite-plus/test';
import { compareParity, isHashed, type ParitySnapshot } from './parity';

const CHANGELOG = '/docs/changelog/packages/typestyles.md';

function snapshot(overrides: Partial<ParitySnapshot> = {}): ParitySnapshot {
  return {
    urls: ['/docs/styles.md', '/docs/styles/index.html', CHANGELOG, '/llms.txt'],
    headings: { '/docs/styles/index.html': ['overview', 'variants'] },
    hashes: { '/docs/styles.md': 'a', [CHANGELOG]: 'c', '/llms.txt': 'l' },
    llms: '# typestyles\n',
    ...overrides,
  };
}

describe('isHashed', () => {
  it('hashes doc markdown views and machine-readable indexes', () => {
    expect(isHashed('/docs/styles.md')).toBe(true);
    expect(isHashed('/llms-full.txt')).toBe(true);
    expect(isHashed('/search-index.json')).toBe(true);
    expect(isHashed('/sitemap-0.xml')).toBe(true);
  });

  it('never hashes changelog views or the MCP content bundle', () => {
    expect(isHashed(CHANGELOG)).toBe(false);
    expect(isHashed('/docs/changelog/examples/vite-app.md')).toBe(false);
    expect(isHashed('/mcp-content.json')).toBe(false);
  });
});

describe('compareParity', () => {
  it('passes an identical build in both modes', () => {
    for (const mode of ['ci', 'strict'] as const) {
      expect(compareParity(snapshot(), snapshot(), mode)).toEqual({ errors: [], warnings: [] });
    }
  });

  it('fails on a missing baselined url in both modes', () => {
    const current = snapshot({ urls: ['/docs/styles/index.html', CHANGELOG, '/llms.txt'] });
    for (const mode of ['ci', 'strict'] as const) {
      expect(compareParity(snapshot(), current, mode).errors).toContain(
        'missing url: /docs/styles.md',
      );
    }
  });

  it('accepts an added url in ci mode and rejects it in strict mode', () => {
    const current = snapshot({ urls: [...snapshot().urls, '/docs/new-page.md'] });
    expect(compareParity(snapshot(), current, 'ci').errors).toEqual([]);
    expect(compareParity(snapshot(), current, 'strict').errors).toEqual([
      'new url: /docs/new-page.md',
    ]);
  });

  it('ignores a changed doc hash in ci mode and fails it in strict mode', () => {
    const current = snapshot({ hashes: { ...snapshot().hashes, '/docs/styles.md': 'b' } });
    expect(compareParity(snapshot(), current, 'ci').errors).toEqual([]);
    expect(compareParity(snapshot(), current, 'strict').errors).toEqual([
      'content changed: /docs/styles.md',
    ]);
  });

  it('ignores a changed changelog hash in both modes', () => {
    const current = snapshot({ hashes: { ...snapshot().hashes, [CHANGELOG]: 'changed' } });
    for (const mode of ['ci', 'strict'] as const) {
      expect(compareParity(snapshot(), current, mode).errors).toEqual([]);
    }
  });

  it('warns about lost heading ids in ci mode and fails in strict mode', () => {
    const current = snapshot({ headings: { '/docs/styles/index.html': ['overview'] } });
    const message = 'heading ids lost on /docs/styles/index.html: variants';
    expect(compareParity(snapshot(), current, 'ci')).toEqual({ errors: [], warnings: [message] });
    expect(compareParity(snapshot(), current, 'strict')).toEqual({
      errors: [message],
      warnings: [],
    });
  });

  it('only checks llms.txt and new hashed outputs in strict mode', () => {
    const current = snapshot({
      llms: '# typestyles\n- new\n',
      hashes: { ...snapshot().hashes, '/docs/new-page.md': 'n' },
    });
    expect(compareParity(snapshot(), current, 'ci').errors).toEqual([]);
    expect(compareParity(snapshot(), current, 'strict').errors).toEqual([
      'new hashed output: /docs/new-page.md',
      'llms.txt changed',
    ]);
  });
});
