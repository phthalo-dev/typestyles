import { describe, it, expect, beforeEach } from 'vite-plus/test';
import {
  createTypeStyles,
  colorModes,
  atProperty,
  flushSync,
  getRegisteredCss,
  reset,
} from './index';

describe('mode-aware leaves with tokens.declare', () => {
  beforeEach(() => reset());

  it('emits light-dark via namespace-less create with decl', () => {
    const typestyles = createTypeStyles({ scopeId: 'app', colorModes });
    const tokensDeclaration = typestyles.tokens.declare({
      color: {
        brand: atProperty.color,
        red: { 10: atProperty.color },
      },
    });

    typestyles.tokens.create(
      {
        color: {
          brand: { light: '#111', dark: '#eee' },
          red: { 10: { light: '#fee', dark: '#900' } },
        },
      },
      { decl: tokensDeclaration },
    );

    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/--app-color-brand:\s*light-dark\(#111, #eee\)/);
    expect(css).toMatch(/--app-color-red-10:\s*light-dark\(#fee, #900\)/);
  });

  it('emits light-dark via namespaced create with decl', () => {
    const typestyles = createTypeStyles({ scopeId: 'app', colorModes });
    const colorDecl = typestyles.tokens.declare('color', {
      brand: atProperty.color,
    });

    typestyles.tokens.create(
      'color',
      { brand: { light: '#111', dark: '#eee' } },
      { decl: colorDecl },
    );

    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/--app-color-brand:\s*light-dark\(#111, #eee\)/);
  });

  it('still rejects undeclared paths when values include mode-aware leaves', () => {
    const typestyles = createTypeStyles({ scopeId: 'app', colorModes });
    const colorDecl = typestyles.tokens.declare('color', {
      brand: atProperty.color,
    });

    expect(() =>
      typestyles.tokens.create(
        'color',
        {
          brand: { light: '#111', dark: '#eee' },
          bogus: { light: '#000', dark: '#fff' },
        },
        { decl: colorDecl },
      ),
    ).toThrow(/path "bogus" is not in the declared schema/);
  });

  it('emits light-dark via createTheme with mode-aware leaves', () => {
    const typestyles = createTypeStyles({ scopeId: 'app', colorModes });
    typestyles.tokens.declare({
      color: { brand: atProperty.color },
    });

    typestyles.tokens.createTheme({
      name: 'acme',
      tokens: {
        color: {
          brand: { light: '#111', dark: '#eee' },
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/--app-color-brand:\s*light-dark\(#111, #eee\)/);
    expect(css).toContain('color-scheme: light dark');
  });
});
