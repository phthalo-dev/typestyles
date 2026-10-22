import { variant } from './variant';
import { describe, it, expect, beforeEach } from 'vitest';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { createTypeStyles } from './create-type-styles';

describe('createTypeStyles', () => {
  beforeEach(() => {
    reset();
  });

  it('createTypeStyles({ mode: "attribute" }) returns an attrs-returning recipe API', () => {
    const { recipe } = createTypeStyles({ mode: 'attribute', scopeId: 'cts-attr' });
    const btn = recipe({
      name: 'tbtn',
      variants: { variant: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { padding: '8px' }, variants: { variant: { primary: { color: 'blue' } } } },
    });
    expect(btn({ variant: 'primary' }).attrs).toEqual({ 'data-variant': 'primary' });
  });

  it('exposes flat style/hash/recipe/global surface with nested layers defaults', () => {
    const { style, hash, recipe, global } = createTypeStyles({
      scopeId: 'flat',
      layers: {
        order: ['reset', 'tokens', 'components'],
        token: 'tokens',
        style: 'components',
        global: 'reset',
      },
    });
    style('card', { padding: '1rem' });
    const hashed = hash({ color: 'blue' }, { label: 'chip' });
    expect(hashed).toMatch(/^ts-chip-/);
    recipe({ name: 'btn', styles: { base: { color: 'red' } } });
    global.rules({ body: { margin: 0 } });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/@layer components/);
    expect(css).toMatch(/@layer reset/);
    expect(css).toContain('padding: 1rem');
    expect(css).toContain('color: blue');
    expect(css).toContain('body { margin: 0');
  });

  it('hash and style expand createTypeStyles utils', () => {
    const { style, hash } = createTypeStyles({
      scopeId: 'utils',
      utils: {
        size: (value: string | number) => ({ width: value, height: value }),
      },
    });
    style('box', { size: 40 });
    hash({ size: 20 }, { label: 'sq' });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('width: 40px');
    expect(css).toContain('height: 40px');
    expect(css).toContain('width: 20px');
    expect(css).toContain('height: 20px');
  });

  it('utils + layers uses layers.style default when options are omitted', () => {
    const { style, hash } = createTypeStyles({
      scopeId: 'utils-layers',
      utils: {
        size: (value: string | number) => ({ width: value, height: value }),
      },
      layers: {
        order: ['tokens', 'components'],
        token: 'tokens',
        style: 'components',
      },
    });
    expect(() => style('box', { size: 40 })).not.toThrow();
    expect(() => hash({ size: 20 }, { label: 'sq' })).not.toThrow();
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/@layer components/);
    expect(css).toContain('width: 40px');
    expect(css).toContain('width: 20px');
  });
});
