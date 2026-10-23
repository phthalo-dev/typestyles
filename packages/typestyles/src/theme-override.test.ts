import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { reset, getRegisteredCss, flushSync } from './sheet';
import { createTypeStyles } from './create-type-styles';
import { createTheme } from './theme';

describe('Theme.override', () => {
  beforeEach(() => reset());

  it('exposes source snapshot from createTheme tokens', () => {
    const { tokens } = createTypeStyles({ scopeId: 'ov-src', colorModes: ['light', 'dark'] });
    const values = {
      color: {
        brand: { light: 'red', dark: 'green' },
        red: { 10: '#f90' },
      },
    } as const;
    const root = tokens.createTheme({
      name: 'default',
      tokens: values,
    });

    expect(root.source.tokens).toEqual(values);
    expect(typeof root.override).toBe('function');
  });

  it('emits a child theme class with parent tokens deep-merged with patches', () => {
    const { tokens } = createTypeStyles({ scopeId: 'ov-merge', colorModes: ['light', 'dark'] });
    const root = tokens.createTheme({
      name: 'default',
      tokens: {
        color: {
          brand: { light: 'red', dark: 'green' },
          accent: { default: '#111' },
        },
      },
    });

    const child = root.override({
      name: 'brand',
      tokens: {
        color: { brand: { light: 'blue', dark: 'navy' } },
      },
    });

    expect(child.name).toBe('brand');
    expect(child.className).toBe('theme-ov-merge-brand');
    expect(child.source.tokens).toEqual({
      color: {
        brand: { light: 'blue', dark: 'navy' },
        accent: { default: '#111' },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.theme-ov-merge-brand');
    expect(css).toMatch(/--ov-merge-color-brand:\s*light-dark\(blue, navy\)/);
    expect(css).toMatch(/--ov-merge-color-accent-default:\s*#111/);
  });

  it('chains override so grandchildren merge onto the child source', () => {
    const { tokens } = createTypeStyles({ scopeId: 'ov-chain' });
    const root = tokens.createTheme({
      name: 'default',
      tokens: { color: { brand: 'red', muted: 'gray' } },
    });
    const mid = root.override({
      name: 'mid',
      tokens: { color: { brand: 'blue' } },
    });
    const leaf = mid.override({
      name: 'leaf',
      tokens: { color: { muted: 'silver' } },
    });

    expect(leaf.source.tokens).toEqual({
      color: { brand: 'blue', muted: 'silver' },
    });
  });

  it('works on low-level createTheme surfaces', () => {
    const root = createTheme('root', {
      tokens: { color: { primary: '#111' } },
    });
    const child = root.override({
      name: 'child',
      tokens: { color: { primary: '#222' } },
    });
    expect(child.className).toBe('theme-child');
    flushSync();
    expect(getRegisteredCss()).toMatch(/--color-primary:\s*#222/);
  });

  it('passes replace through so reusing a child name updates CSS', () => {
    const { tokens } = createTypeStyles({ scopeId: 'ov-rep' });
    const root = tokens.createTheme({
      name: 'default',
      tokens: { color: { brand: 'red' } },
    });
    root.override({
      name: 'brand',
      tokens: { color: { brand: 'blue' } },
    });
    root.override({
      name: 'brand',
      tokens: { color: { brand: 'green' } },
      replace: true,
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/--ov-rep-color-brand:\s*green/);
    expect(css).not.toMatch(/--ov-rep-color-brand:\s*blue/);
  });
});
