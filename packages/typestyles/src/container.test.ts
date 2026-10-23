import { describe, it, expect } from 'vite-plus/test';
import { container, createContainerRef } from './container';
import { serializeStyle } from './serialize-style';
import { createStyles } from './styles';

describe('container', () => {
  it('builds anonymous size queries', () => {
    expect(container({ minWidth: 400 })).toBe('@container (min-width: 400px)');
    expect(container({ minWidth: '30cqw' })).toBe('@container (min-width: 30cqw)');
  });

  it('joins multiple features with and', () => {
    expect(
      container({
        minWidth: 400,
        maxWidth: 800,
      }),
    ).toBe('@container (min-width: 400px) and (max-width: 800px)');
  });

  it('supports logical sizes and orientation', () => {
    expect(container({ minInlineSize: 20, maxBlockSize: '40rem' })).toBe(
      '@container (min-inline-size: 20px) and (max-block-size: 40rem)',
    );
    expect(container({ orientation: 'landscape' })).toBe('@container (orientation: landscape)');
  });

  it('supports named containers (object and two-arg)', () => {
    expect(container({ name: 'sidebar', minWidth: 300 })).toBe(
      '@container sidebar (min-width: 300px)',
    );
    expect(container('sidebar', { minWidth: 300 })).toBe('@container sidebar (min-width: 300px)');
  });

  it('passes through raw conditions', () => {
    expect(container('(min-width: 1px)')).toBe('@container (min-width: 1px)');
    expect(container('  style(--x: 1)  ')).toBe('@container style(--x: 1)');
    expect(container('not (min-width: 400px)')).toBe('@container not (min-width: 400px)');
  });

  it('throws when no conditions', () => {
    expect(() => container({})).toThrow(/at least one size feature/);
    expect(() => container('sidebar', {})).toThrow(/at least one size feature/);
    expect(() => container('')).toThrow(/must not be empty/);
  });

  it('serializes through serializeStyle like a manual key', () => {
    const key = container({ minWidth: 400 });
    const rules = serializeStyle('.card', {
      [key]: { padding: '24px' },
    });
    expect(rules[0].css).toBe('@container (min-width: 400px) { .card { padding: 24px; } }');
  });
});

describe('createContainerRef', () => {
  it('returns the same readable name for the same label and options', () => {
    expect(createContainerRef('sidebar', { scopeId: 'app', prefix: 'ts' })).toBe(
      createContainerRef('sidebar', { scopeId: 'app', prefix: 'ignored-when-scoped' }),
    );
    expect(createContainerRef('sidebar', { scopeId: 'app', prefix: 'ts' })).toBe('app-sidebar');
  });

  it('uses prefix only when scopeId is empty', () => {
    expect(createContainerRef('shell', { prefix: 'acme' })).toBe('acme-shell');
    expect(createContainerRef('shell', {})).toBe('ts-shell');
  });

  it('differs when scopeId or label changes', () => {
    const base = createContainerRef('sidebar', { scopeId: 'app-a' });
    expect(createContainerRef('sidebar', { scopeId: 'app-b' })).not.toBe(base);
    expect(createContainerRef('main', { scopeId: 'app-a' })).not.toBe(base);
  });

  it('throws on empty label', () => {
    expect(() => createContainerRef('')).toThrow(/must not be empty/);
    expect(() => createContainerRef('   ')).toThrow(/must not be empty/);
  });

  it('works as container() name and matches @container output', () => {
    const name = createContainerRef('shell', { scopeId: 'x' });
    expect(name).toBe('x-shell');
    expect(container(name, { minWidth: 400 })).toBe(`@container ${name} (min-width: 400px)`);
  });
});

describe('styles.containerRef', () => {
  it('uses the styles instance scopeId (prefix ignored when scope is set)', () => {
    const a = createStyles({ scopeId: 'pkg-a', prefix: 'ts' });
    const b = createStyles({ scopeId: 'pkg-b', prefix: 'ts' });
    expect(a.containerRef('shell')).toBe(createContainerRef('shell', { scopeId: 'pkg-a' }));
    expect(a.containerRef('shell')).toBe('pkg-a-shell');
    expect(a.containerRef('shell')).not.toBe(b.containerRef('shell'));
  });

  it('uses prefix when scopeId is empty', () => {
    const s = createStyles({ prefix: 'acme' });
    expect(s.containerRef('widget')).toBe('acme-widget');
  });
});
