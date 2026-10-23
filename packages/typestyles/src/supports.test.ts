import { describe, it, expect } from 'vite-plus/test';
import { supports } from './supports';
import { serializeStyle } from './serialize-style';
import { createStyles } from './styles';

describe('supports', () => {
  it('builds single declaration queries from camelCase properties', () => {
    expect(supports({ display: 'grid' })).toBe('@supports (display: grid)');
    expect(supports({ backdropFilter: 'blur(4px)' })).toBe(
      '@supports (backdrop-filter: blur(4px))',
    );
  });

  it('joins multiple declarations with and', () => {
    expect(
      supports({
        display: 'grid',
        gridTemplateColumns: 'subgrid',
      }),
    ).toBe('@supports (display: grid) and (grid-template-columns: subgrid)');
  });

  it('passes through raw conditions', () => {
    expect(supports('(display: grid)')).toBe('@supports (display: grid)');
    expect(supports('  (backdrop-filter: blur(4px))  ')).toBe(
      '@supports (backdrop-filter: blur(4px))',
    );
    expect(supports('not (display: grid)')).toBe('@supports not (display: grid)');
    expect(supports('selector(:has(*))')).toBe('@supports selector(:has(*))');
  });

  it('throws when no conditions', () => {
    expect(() => supports({})).toThrow(/at least one declaration/);
    expect(() => supports('')).toThrow(/must not be empty/);
  });

  it('serializes through serializeStyle like a manual key', () => {
    const key = supports({ display: 'grid' });
    const rules = serializeStyle('.card', {
      [key]: { padding: '24px' },
    });
    expect(rules[0].css).toBe('@supports (display: grid) { .card { padding: 24px; } }');
  });
});

describe('styles.supports', () => {
  it('is the same function as the named export', () => {
    const styles = createStyles();
    expect(styles.supports({ display: 'grid' })).toBe(supports({ display: 'grid' }));
  });
});
