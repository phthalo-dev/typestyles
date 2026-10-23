import { describe, it, expect, beforeEach, vi } from 'vite-plus/test';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { createGlobal } from './create-global';
import { createTypeStyles } from './create-type-styles';
import { boxSizing, body } from './globals';

describe('createGlobal', () => {
  beforeEach(() => {
    reset();
  });

  it('inserts unlayered rules when layers are omitted', () => {
    const g = createGlobal();
    g.rule('body', { margin: 0 });
    flushSync();
    expect(getRegisteredCss()).toContain('body { margin: 0');
    expect(getRegisteredCss()).not.toMatch(/@layer/);
  });

  it('wraps rules in @layer when layers are set', () => {
    const g = createGlobal({
      layers: ['reset', 'components'] as const,
      globalLayer: 'reset',
    });
    g.rule('body', { margin: 0 });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@layer reset, components;');
    expect(css).toMatch(/@layer reset\s*\{/);
    expect(css).toContain('body { margin: 0');
  });

  it('requires layer when no globalLayer', () => {
    const g = createGlobal({ layers: ['reset', 'components'] as const });
    expect(() => {
      g.rule('body', { margin: 0 });
    }).toThrow(/layers\.global|globalLayer/);
    g.rule('body', { margin: 0 }, { layer: 'reset' });
    flushSync();
    expect(getRegisteredCss()).toContain('body { margin: 0');
  });

  it('rules() applies many selectors with a shared layer', () => {
    const g = createGlobal({
      layers: ['reset', 'components'] as const,
      globalLayer: 'reset',
    });
    g.rules({
      '*': { boxSizing: 'border-box' },
      body: { margin: 0 },
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('box-sizing: border-box');
    expect(css).toContain('body { margin: 0');
    expect(css).toMatch(/@layer reset/);
  });

  it('scopeId allows a second body rule alongside unscoped createGlobal (separate dedupe keys)', () => {
    const scoped = createGlobal({ scopeId: 'app' });
    scoped.rule('body', { margin: 0 });
    const unscoped = createGlobal();
    unscoped.rule('body', { padding: 0 });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/body \{ margin: 0/);
    expect(css).toMatch(/body \{ padding: 0/);
  });

  it('warns when layer is passed without layers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const g = createGlobal();
    g.rule('p', { color: 'red' }, { layer: 'reset' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('createTypeStyles().global accepts globals recipes via apply', () => {
    const { global } = createTypeStyles({
      scopeId: 't',
      layers: {
        order: ['reset', 'tokens', 'components'],
        token: 'tokens',
        style: 'components',
        global: 'reset',
      },
    });
    global.apply(boxSizing(), body({ margin: 0 }));
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@layer reset, tokens, components;');
    expect(css).toContain('box-sizing: border-box');
    expect(css).toContain('body { margin: 0');
  });

  it('recipe tuple can override globalLayer', () => {
    const { global } = createTypeStyles({
      layers: {
        order: ['reset', 'tokens', 'components'],
        token: 'tokens',
        style: 'components',
        global: 'reset',
      },
    });
    global.apply(body({ margin: 0 }, { layer: 'components' }));
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/@layer components/);
    expect(css).toContain('body { margin: 0');
  });

  it('createTypeStyles rejects layers without token/style', () => {
    expect(() => {
      createTypeStyles({
        scopeId: 'x',
        layers: { order: ['reset'], token: '', style: 'reset' } as never,
      });
    }).toThrow(/layers\.token/);
  });

  it('warns in non-production when the same global dedupe key is reused with different CSS', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { global } = createTypeStyles({
      scopeId: 'dedupe-warn',
      layers: {
        order: ['reset', 'tokens', 'components'],
        token: 'tokens',
        style: 'components',
        global: 'reset',
      },
    });
    global.rule('body', { margin: 0 });
    global.rule('body', { padding: 0 });
    flushSync();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/dedupe key/);
    warn.mockRestore();
  });

  it('does not warn when the same global dedupe key is reused with identical CSS', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { global } = createTypeStyles({
      scopeId: 'dedupe-idem',
      layers: {
        order: ['reset', 'tokens', 'components'],
        token: 'tokens',
        style: 'components',
        global: 'reset',
      },
    });
    global.rule('p', { color: 'red' });
    global.rule('p', { color: 'red' });
    flushSync();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
