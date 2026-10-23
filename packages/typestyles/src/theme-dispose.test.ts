import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { reset, getRegisteredCss, flushSync } from './sheet';
import { createTokens } from './tokens';
import { createTypeStyles } from './create-type-styles';

describe('disposeTheme', () => {
  beforeEach(() => {
    reset();
  });

  it('createTheme replaces by name without duplicating theme CSS', () => {
    const tokens = createTokens({ scopeId: 'ds' });
    tokens.createTheme({ name: 'brand', tokens: { fontSize: { md: '14px' } } });
    flushSync();
    tokens.createTheme({ name: 'brand', tokens: { fontSize: { md: '18px' } } });
    flushSync();

    const css = getRegisteredCss();
    expect(css).toContain('18px');
    expect(css).not.toContain('14px');
  });

  it('disposeTheme removes theme class rules without touching prefix sibling themes', () => {
    const tokens = createTokens({ scopeId: 'var-ui' });
    tokens.createTheme({ name: 'dark', tokens: { color: { text: { primary: '#111' } } } });
    tokens.createTheme({ name: 'dark-mode', tokens: { color: { text: { primary: '#222' } } } });
    flushSync();
    tokens.disposeTheme('dark');
    flushSync();

    const css = getRegisteredCss();
    expect(css).not.toMatch(/\.theme-var-ui-dark\s*\{/);
    expect(css).toContain('.theme-var-ui-dark-mode');
  });

  it('exposes disposeTheme on createTypeStyles tokens', () => {
    const { tokens } = createTypeStyles({ scopeId: 'cts' });
    tokens.createTheme({ name: 'x', tokens: { fontSize: { sm: '12px' } } });
    flushSync();
    tokens.disposeTheme('x');
    flushSync();
    expect(getRegisteredCss()).not.toContain('.theme-cts-x');
  });
});
