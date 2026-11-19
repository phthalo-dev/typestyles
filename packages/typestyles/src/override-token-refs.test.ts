import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { createTypeStyles } from './create-type-styles';
import { flushSync, getRegisteredCss, reset } from './sheet';

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
type Tok = Record<string, any>;

describe('ctx.tokens leaves are { name, var } refs (#367)', () => {
  beforeEach(() => reset());

  it('override() factories get working .var / .name and string interpolation', () => {
    const ts = createTypeStyles({ scopeId: 'ovr-tok' });
    ts.tokens.create('space', { md: '1rem', nest: { a: '2rem' } });
    const card = ts.recipe({
      name: 'card',
      styles: { base: { padding: '1px' } },
    } as never);
    let seen: Record<string, unknown> = {};
    ts.override({
      recipe: card,
      styles: ({ tokens }: { tokens: Tok }) => {
        seen = {
          varMd: tokens.space.md.var,
          nameMd: tokens.space.md.name,
          nested: tokens.space.nest.a.var,
          interpolated: `${tokens.space.md}`,
        };
        return { base: { margin: tokens.space.md.var, padding: tokens.space.md } };
      },
    } as never);
    flushSync();
    expect(seen).toEqual({
      varMd: 'var(--ovr-tok-space-md)',
      nameMd: '--ovr-tok-space-md',
      nested: 'var(--ovr-tok-space-nest-a)',
      interpolated: 'var(--ovr-tok-space-md)',
    });
    expect(getRegisteredCss()).toContain('margin: var(--ovr-tok-space-md)');
    expect(getRegisteredCss()).toContain('padding: var(--ovr-tok-space-md)');
  });

  it('theme component factories get working .var refs', () => {
    const { recipe, tokens } = createTypeStyles({ scopeId: 'thm-tok' });
    tokens.create('space', { xs: '2px' });
    recipe({ name: 'chip', styles: { base: { color: 'black' } } });
    tokens.createTheme({
      name: 'forest',
      tokens: { app: { glow: 'red' } },
      components: {
        chip: {
          styles: ({ tokens: t }: { tokens: Tok }) => ({
            base: { margin: t.space.xs.var, outlineColor: t.app.glow.var },
          }),
        },
      },
    } as never);
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('margin: var(--thm-tok-space-xs)');
    expect(css).toContain('outline-color: var(--thm-tok-app-glow)');
  });
});
