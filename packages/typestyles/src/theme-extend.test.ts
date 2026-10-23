import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { reset, getRegisteredCss, flushSync } from './sheet';
import { createTypeStyles } from './create-type-styles';

describe('createTheme({ tokens })', () => {
  beforeEach(() => reset());

  it('registers token namespaces and exposes refs on Theme.tokens', () => {
    const { tokens } = createTypeStyles({ scopeId: 'ext', colorModes: ['light', 'dark'] });
    const theme = tokens.createTheme({
      name: 'brand',
      tokens: {
        brand: {
          accent: { default: { light: '#0066ff', dark: '#3399ff' } },
        },
      },
    });

    expect(theme.tokens).toBeDefined();
    expect(theme.tokens?.brand).toBeDefined();
    expect(theme.tokens?.brand.accent.default).toMatch(/var\(--/);
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.theme-ext-brand');
    expect(css).toMatch(/--ext-brand-accent-default:\s*light-dark\(#0066ff, #3399ff\)/);
  });

  it('ensureNamespace creates once and returns use refs', () => {
    const { tokens } = createTypeStyles({ scopeId: 'ens' });
    const a = tokens.ensureNamespace('metrics', { radius: { sm: '4px' } });
    const b = tokens.ensureNamespace('metrics', { radius: { sm: '4px' } });
    expect(a.radius.sm).toBe(b.radius.sm);
    flushSync();
    expect(getRegisteredCss()).toContain('--ens-metrics-radius-sm');
  });

  it('tokens refs match ensureNamespace for the same namespace', () => {
    const { tokens } = createTypeStyles({ scopeId: 'match' });
    const ensured = tokens.ensureNamespace('brand', {
      glow: { default: '#abc' },
    });
    const theme = tokens.createTheme({
      name: 't',
      tokens: {
        brand: {
          glow: { default: '#abc' },
        },
      },
    });
    expect(theme.tokens?.brand.glow.default).toBe(ensured.glow.default);
  });

  it('override deep-merges tokens onto the root surface source', () => {
    const { tokens } = createTypeStyles({ scopeId: 'fp-ext' });
    const root = tokens.createTheme({
      name: 'root',
      tokens: {
        brand: { primary: '#111', accent: { default: '#000' } },
      },
    });
    const theme = root.override({
      name: 'app',
      tokens: {
        brand: { accent: { default: '#0066ff' } },
      },
    });
    expect(theme.tokens?.brand.primary).toMatch(/var\(--/);
    expect(theme.tokens?.brand.accent.default).toMatch(/var\(--/);
    expect(theme.source.tokens).toEqual({
      brand: { primary: '#111', accent: { default: '#0066ff' } },
    });
    flushSync();
    expect(getRegisteredCss()).toContain('--fp-ext-brand-accent-default: #0066ff');
  });

  it('re-create theme with same name does not duplicate token namespace registration', () => {
    const { tokens } = createTypeStyles({ scopeId: 're' });
    tokens.createTheme({ name: 'x', tokens: { brand: { primary: '#111' } } });
    tokens.createTheme({ name: 'x', tokens: { brand: { primary: '#222' } } });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('#222');
    expect(css).not.toContain('#111');
  });
});
