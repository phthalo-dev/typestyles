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
    expect(String(theme.tokens?.brand.accent.default)).toMatch(/var\(--/);
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.theme-ext-brand');
    expect(css).toMatch(/--ext-brand-accent-default:\s*light-dark\(#0066ff, #3399ff\)/);
  });

  it('ensureNamespace creates once and returns use refs', () => {
    const { tokens } = createTypeStyles({ scopeId: 'ens' });
    const a = tokens.ensureNamespace('metrics', { radius: { sm: '4px' } });
    const b = tokens.ensureNamespace('metrics', { radius: { sm: '4px' } });
    expect(a.radius.sm.var).toBe(b.radius.sm.var);
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
    expect(theme.tokens?.brand.glow.default.var).toBe(ensured.glow.default.var);
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
    expect(String(theme.tokens?.brand.primary)).toMatch(/var\(--/);
    expect(String(theme.tokens?.brand.accent.default)).toMatch(/var\(--/);
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

  it('emits mode-aware leaves that cannot use light-dark() on the theme class only (#325)', () => {
    const { tokens } = createTypeStyles({
      scopeId: 'var-ui',
      colorModes: ['light', 'dark'],
    });
    tokens.createTheme({
      name: 'ai-glow',
      tokens: {
        shadow: {
          sm: {
            light: '0 0.5rem 1.5rem color-mix(in oklch, #DB2777 12%, transparent)',
            dark: '0 0.5rem 1.875rem color-mix(in oklch, #F0ABFC 18%, transparent)',
          },
        },
      },
    });
    flushSync();
    const css = getRegisteredCss();

    // Light value on the theme class.
    expect(css).toMatch(
      /\.theme-var-ui-ai-glow \{[^}]*--var-ui-shadow-sm: 0 0\.5rem 1\.5rem color-mix\(in oklch, #DB2777 12%, transparent\)/,
    );
    // Dark-only fallback rules anchored on the theme class (same selector as extraction).
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\) \{ \.theme-var-ui-ai-glow:not\(\[data-color-mode="light"\]\) \{ --var-ui-shadow-sm: 0 0\.5rem 1\.875rem color-mix\(in oklch, #F0ABFC 18%, transparent\); \} \}/,
    );
    // Never on :root — importing the theme module must not restyle the page.
    expect(css).not.toMatch(/^:root[^.]*--var-ui-shadow-sm/m);
    expect(css).not.toMatch(/:root[^.]*\{[^}]*--var-ui-shadow-sm/);
  });

  it('never emits theme token values on :root, including light values', () => {
    const { tokens } = createTypeStyles({ scopeId: 'nr', colorModes: ['light', 'dark'] });
    tokens.createTheme({
      name: 'brand',
      tokens: {
        color: { brand: { light: 'red', dark: 'green' } },
      },
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/\.theme-nr-brand \{[^}]*--nr-color-brand: light-dark\(red, green\)/);
    expect(css).not.toMatch(/:root[^.]*\{[^}]*--nr-color-brand/);
  });

  it('keeps :root defaults when a theme registers overrides on the same namespace', () => {
    const { tokens } = createTypeStyles({ scopeId: 'mix', colorModes: ['light', 'dark'] });
    tokens.create('shadow', { sm: '0 1px 2px black' });
    tokens.createTheme({
      name: 'brand',
      tokens: {
        shadow: {
          sm: {
            light: '0 2px 4px red',
            dark: '0 2px 4px blue',
          },
        },
      },
    });
    flushSync();
    const css = getRegisteredCss();
    // :root keeps the shared default…
    expect(css).toContain(':root { --mix-shadow-sm: 0 1px 2px black; }');
    // …the theme class carries its own values…
    expect(css).toMatch(/\.theme-mix-brand \{[^}]*--mix-shadow-sm: 0 2px 4px red/);
    // …and a later tokens.create() does not re-emit theme values at :root.
    tokens.create('shadow', { xl: '0 8px 16px black' });
    flushSync();
    const updated = getRegisteredCss();
    expect(updated).toContain('--mix-shadow-xl: 0 8px 16px black');
    expect(updated).not.toMatch(/:root[^.]*\{[^}]*--mix-shadow-sm: 0 2px 4px red/);
    expect(updated).not.toMatch(/:root[^.]*\{[^}]*--mix-shadow-sm: 0 2px 4px blue/);
  });

  it('override({ extend }) adds a new namespace to a child theme', () => {
    const { tokens } = createTypeStyles({ scopeId: 'child-ext' });
    const root = tokens.createTheme({
      name: 'root',
      tokens: { brand: { primary: '#111' } },
    });
    const child = root.override({
      name: 'forest',
      extend: { app: { glow: '#0f0' } },
    });
    expect(child.tokens.app.glow.var).toBe('var(--child-ext-app-glow)');
    expect(child.tokens.brand.primary.var).toMatch(/var\(--/);
    expect(child.source.tokens).toEqual({ brand: { primary: '#111' }, app: { glow: '#0f0' } });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.theme-child-ext-forest');
    expect(css).toContain('--child-ext-app-glow: #0f0');
    // The root theme source is untouched.
    expect(root.source.tokens).toEqual({ brand: { primary: '#111' } });
  });
});
