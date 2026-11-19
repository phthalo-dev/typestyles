import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { createTypeStyles } from './create-type-styles';
import { flushSync, getRegisteredCss, reset } from './sheet';

describe('token refs as theme token values', () => {
  beforeEach(() => reset());

  it('createTheme({ tokens }) accepts refs, including inside mode-aware leaves', () => {
    const ts = createTypeStyles({ scopeId: 'rl', colorModes: ['light', 'dark'] });
    const base = ts.tokens.create('base', { red: '#f00', blue: '#00f' });
    const theme = ts.tokens.createTheme({
      name: 'forest',
      tokens: {
        brand: {
          plain: base.red,
          modal: { light: base.red, dark: base.blue },
        },
      },
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('--rl-brand-plain: var(--rl-base-red)');
    expect(css).toContain('light-dark(var(--rl-base-red), var(--rl-base-blue))');
    expect(css).not.toContain('[object Object]');
    expect(theme.tokens?.brand.plain.var).toBe('var(--rl-brand-plain)');
  });

  it('override({ tokens }) accepts refs and keeps the merged source as strings', () => {
    const ts = createTypeStyles({ scopeId: 'rl2' });
    const base = ts.tokens.create('base', { red: '#f00' });
    const root = ts.tokens.createTheme({ name: 'root', tokens: { brand: { a: '#111' } } });
    const child = root.override({ name: 'child', tokens: { brand: { a: base.red } } });
    expect(child.source.tokens).toEqual({ brand: { a: 'var(--rl2-base-red)' } });
  });
});

describe('partial mode leaves in override patches', () => {
  beforeEach(() => reset());

  it('patching only `dark` keeps the parent light value', () => {
    const ts = createTypeStyles({ scopeId: 'pm', colorModes: ['light', 'dark'] });
    const root = ts.tokens.createTheme({
      name: 'root',
      tokens: { brand: { accent: { light: '#111', dark: '#eee' } } },
    });
    const child = root.override({ name: 'c', tokens: { brand: { accent: { dark: '#fff' } } } });
    expect(child.source.tokens).toEqual({ brand: { accent: { light: '#111', dark: '#fff' } } });
    flushSync();
    expect(getRegisteredCss()).toContain('light-dark(#111, #fff)');
  });

  it('patching one mode of a scalar parent fills the other from the parent', () => {
    const ts = createTypeStyles({ scopeId: 'pm2', colorModes: ['light', 'dark'] });
    const root = ts.tokens.createTheme({ name: 'root', tokens: { brand: { accent: '#111' } } });
    const child = root.override({ name: 'c', tokens: { brand: { accent: { dark: '#fff' } } } });
    expect(child.source.tokens).toEqual({ brand: { accent: { light: '#111', dark: '#fff' } } });
  });
});
