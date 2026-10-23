import { describe, it, expect } from 'vite-plus/test';
import { buildTokenNameContext, defaultTokenNameTemplate, resolveTokenName } from './token-naming';
import { flattenTokenPaths } from './types';

describe('defaultTokenNameTemplate', () => {
  it('matches scopedTokenNamespace + path when scopeId is set', () => {
    const ctx = buildTokenNameContext('my-pkg', 'color', 'brand-primary', ['brand', 'primary']);
    expect(defaultTokenNameTemplate(ctx)).toBe('--my-pkg-color-brand-primary');
  });

  it('omits scope when unscoped', () => {
    const ctx = buildTokenNameContext(undefined, 'color', 'primary', ['primary']);
    expect(defaultTokenNameTemplate(ctx)).toBe('--color-primary');
  });

  it('uses scope only when namespace is empty', () => {
    const ctx = buildTokenNameContext('var-ui', '', 'color-text-primary', [
      'color',
      'text',
      'primary',
    ]);
    expect(defaultTokenNameTemplate(ctx)).toBe('--var-ui-color-text-primary');
  });

  it('omits namespace segment when namespace is empty and unscoped', () => {
    const ctx = buildTokenNameContext(undefined, '', 'color-text-primary', [
      'color',
      'text',
      'primary',
    ]);
    expect(defaultTokenNameTemplate(ctx)).toBe('--color-text-primary');
  });
});

describe('resolveTokenName', () => {
  it('normalizes unsafe characters in template output', () => {
    const ctx = buildTokenNameContext(undefined, 'color', 'brand-primary', ['brand', 'primary']);
    const name = resolveTokenName(() => '--color-brand primary!', ctx);
    expect(name).toBe('--color-brand-primary');
  });

  it('preserves underscores from custom segment joiners', () => {
    const ctx = buildTokenNameContext(undefined, 'color', 'brand-primary', ['brand', 'primary']);
    const name = resolveTokenName(({ segments }) => `--color-${segments.join('_')}`, ctx);
    expect(name).toBe('--color-brand_primary');
  });

  it('throws in dev for invalid names after sanitization', () => {
    const ctx = buildTokenNameContext(undefined, 'color', 'x', ['x']);
    expect(() => resolveTokenName(() => '--', ctx)).toThrow(/invalid custom property name/);
  });
});

describe('flattenTokenPaths', () => {
  it('preserves segment arrays for nested keys', () => {
    const entries = flattenTokenPaths({
      brand: { 500: '#0066ff', 'line-height': '1.5' },
    });

    expect(entries).toEqual([
      { path: 'brand-500', segments: ['brand', '500'], value: '#0066ff' },
      { path: 'brand-line-height', segments: ['brand', 'line-height'], value: '1.5' },
    ]);
  });

  it('preserves numeric leaf keys in segments', () => {
    const entries = flattenTokenPaths({ brand: { 500: '#0066ff' } });
    expect(entries[0]?.segments).toEqual(['brand', '500']);
  });
});
