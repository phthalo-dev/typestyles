import { describe, it, expect, beforeEach, vi } from 'vite-plus/test';
import { reset, getRegisteredCss, flushSync } from './sheet';
import { createTypeStyles } from './create-type-styles';

describe('withRecipes', () => {
  beforeEach(() => {
    reset();
    vi.restoreAllMocks();
  });

  it('returns the same instance and themes recipes as before', () => {
    const base = createTypeStyles({ scopeId: 'wrr' });
    const button = base.recipe({ name: 'button', styles: { base: { color: 'black' } } });
    const ts = base.withRecipes({ button });
    expect(ts).toBe(base);

    ts.tokens.createTheme({
      name: 'themed',
      components: { button: { styles: { base: { color: 'rebeccapurple' } } } },
    });
    flushSync();
    expect(getRegisteredCss()).toMatch(/rebeccapurple/);
  });

  it('warns in development when a key is not the recipe name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const base = createTypeStyles({ scopeId: 'wrw' });
    const button = base.recipe({ name: 'button', styles: { base: { color: 'black' } } });

    base.withRecipes({ btn: button });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('key "btn" is recipe "button"'));
  });

  it('stays quiet when keys match recipe names', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const base = createTypeStyles({ scopeId: 'wrq' });
    const button = base.recipe({ name: 'button', styles: { base: { color: 'black' } } });

    base.withRecipes({ button });

    expect(warn).not.toHaveBeenCalled();
  });
});
