import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { createTypeStyles } from './create-type-styles';
import { flushSync, getRegisteredCss, reset } from './sheet';

describe('token leaves are { name, var } refs everywhere', () => {
  beforeEach(() => reset());

  it('create / use / theme.tokens / ctx.tokens all return the same ref shape', () => {
    const ts = createTypeStyles({ scopeId: 'rf' });
    const created = ts.tokens.create('space', { md: '1rem' });
    const used = ts.tokens.use('space') as typeof created;
    const theme = ts.tokens.createTheme({ name: 'x', tokens: { app: { glow: 'red' } } });
    for (const ref of [created.md, used.md]) {
      expect(ref.var).toBe('var(--rf-space-md)');
      expect(ref.name).toBe('--rf-space-md');
      expect(`${ref}`).toBe('var(--rf-space-md)');
    }
    expect(theme.tokens?.app.glow.var).toBe('var(--rf-app-glow)');
  });

  it('refs work directly as style values in style(), recipe, global and nested rules', () => {
    const ts = createTypeStyles({ scopeId: 'rv' });
    const t = ts.tokens.create('c', { fg: '#111', bg: '#fff' });
    ts.style('box', {
      color: t.fg,
      '&:hover': { color: t.bg },
      '@media (min-width: 1px)': { color: t.bg },
    });
    ts.recipe({ name: 'card', styles: { base: { background: t.bg } } });
    ts.global.rule('body', { color: t.fg });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('color: var(--rv-c-fg)');
    expect(css).toContain('background: var(--rv-c-bg)');
    expect(css).not.toContain('[object Object]');
  });

  it('refs work as values of other tokens and as recipe var values', () => {
    const ts = createTypeStyles({ scopeId: 'rd' });
    const base = ts.tokens.create('base', { gap: '4px' });
    ts.tokens.create('derived', { gap: base.gap } as never);
    flushSync();
    expect(getRegisteredCss()).toContain('--rd-derived-gap: var(--rd-base-gap)');
  });
});
