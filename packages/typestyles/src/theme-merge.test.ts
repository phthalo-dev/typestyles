import { describe, it, expect } from 'vite-plus/test';
import { createTokens } from './tokens';
import { cloneThemeValues, mergeThemeOverrides } from './token-color-modes';

describe('theme-merge', () => {
  it('cloneThemeValues stringifies declare token refs at leaves', () => {
    const api = createTokens();
    const color = api.declare('color', {
      accent: { default: { syntax: '<color>', inherits: false } },
      background: { app: true },
    });

    expect(
      cloneThemeValues({
        accent: { default: color.accent.default },
        background: { app: color.background.app },
      }),
    ).toEqual({
      accent: { default: 'var(--color-accent-default)' },
      background: { app: 'var(--color-background-app)' },
    });
  });

  it('cloneThemeValues preserves plain strings and mode-aware leaves', () => {
    expect(
      cloneThemeValues({
        accent: '#111',
        border: { light: '#000', dark: '#fff' },
      }),
    ).toEqual({
      accent: '#111',
      border: { light: '#000', dark: '#fff' },
    });
  });

  it('cloneThemeValues deep-clones arrays', () => {
    const layers = ['a', 'b'];
    const cloned = cloneThemeValues({ layers }) as { layers: string[] };
    expect(cloned).toEqual({ layers: ['a', 'b'] });
    expect(cloned.layers).not.toBe(layers);
  });

  it('mergeThemeOverrides deep-merges nested objects', () => {
    expect(
      mergeThemeOverrides(
        { color: { text: '#111', accent: { default: '#0066ff' } } },
        { color: { accent: { subtle: '#cce0ff' } } },
      ),
    ).toEqual({
      color: { text: '#111', accent: { default: '#0066ff', subtle: '#cce0ff' } },
    });
  });

  it('mergeThemeOverrides replaces arrays and scalars from patch', () => {
    expect(
      mergeThemeOverrides(
        { motion: { duration: ['100ms', '200ms'] }, color: { text: '#111' } },
        { motion: { duration: ['300ms'] }, color: { text: '#eee' } },
      ),
    ).toEqual({
      motion: { duration: ['300ms'] },
      color: { text: '#eee' },
    });
  });

  it('mergeThemeOverrides stringifies token refs in patches', () => {
    const api = createTokens();
    const color = api.declare('color', {
      accent: { default: { syntax: '<color>', inherits: false } },
    });

    expect(
      mergeThemeOverrides(
        { color: { text: '#111' } },
        { color: { accent: { default: color.accent.default } } },
      ),
    ).toEqual({
      color: { text: '#111', accent: { default: 'var(--color-accent-default)' } },
    });
  });

  it('mergeThemeOverrides clones base when patch is omitted', () => {
    const base = { color: { text: '#111' } };
    const merged = mergeThemeOverrides(base);
    expect(merged).toEqual(base);
    expect(merged).not.toBe(base);
    expect(merged.color).not.toBe(base.color);
  });

  it('does not stringify branch declare proxies as a single var()', () => {
    const api = createTokens();
    const semantic = api.declare('semantic', {
      accent: { default: true, hover: true },
    });

    expect(cloneThemeValues(semantic.accent)).toEqual({});
    expect(
      mergeThemeOverrides(
        { color: { accent: { default: '#0066ff', hover: '#0055dd' } } },
        { color: { accent: semantic.accent } },
      ),
    ).toEqual({
      color: { accent: { default: '#0066ff', hover: '#0055dd' } },
    });
  });

  it('does not stringify branch create() proxies as a single var()', () => {
    const api = createTokens();
    const color = api.create('color', {
      accent: { default: '#0066ff', hover: '#0055dd' },
    });

    expect(cloneThemeValues(color.accent)).toEqual({});
  });

  it('mergeThemeOverrides supports createTheme-style preset + override flow', () => {
    const api = createTokens();
    const semantic = api.declare('semantic', {
      accent: { default: true },
    });

    const preset = {
      color: {
        text: '#111827',
        accent: { default: '#0066ff' },
      },
    };

    const overrides = {
      color: {
        accent: { default: semantic.accent.default },
      },
    };

    expect(mergeThemeOverrides(preset, overrides)).toEqual({
      color: {
        text: '#111827',
        accent: { default: 'var(--semantic-accent-default)' },
      },
    });
  });
});
