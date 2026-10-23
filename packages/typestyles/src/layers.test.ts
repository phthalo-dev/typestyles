import { variant } from './variant';
import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { createStyles } from './styles';
import { createTokens } from './tokens';
import { createTypeStyles } from './create-type-styles';
import { resolveCascadeLayers } from './layers';
import { colorModes } from './color-modes';
import { collectStyles } from './server';

describe('cascade layers', () => {
  beforeEach(() => {
    reset();
  });

  it('emits @layer preamble before wrapped rules and orders bootstrap first when prepended', () => {
    const styles = createStyles({
      scopeId: 'ds',
      layers: { order: ['reset', 'components'] as const, prependFrameworkLayers: ['bootstrap'] },
    });

    styles.class('box', { margin: 0 }, { layer: 'reset' });
    flushSync();

    const css = getRegisteredCss();
    expect(css).toContain('@layer bootstrap, reset, components;');
    const preambleIdx = css.indexOf('@layer bootstrap, reset, components;');
    const wrappedIdx = css.indexOf('@layer reset');
    expect(preambleIdx).toBeLessThan(wrappedIdx);
    expect(css).toContain('@layer reset');
    // scopeId is prefixed onto semantic class names
    expect(css).toContain('.ds-box');
  });

  it('requires layer on class when layers are enabled', () => {
    const styles = createStyles({
      layers: ['a', 'b'] as const,
    });
    expect(() => {
      (styles as { class(n: string, p: { color: string }): string }).class('x', { color: 'red' });
    }).toThrow(/layer/);
  });

  it('rejects unknown layer names', () => {
    const styles = createStyles({
      layers: ['reset', 'utilities'] as const,
    });
    expect(() => {
      styles.class('x', { color: 'red' }, { layer: 'unknown' as 'reset' });
    }).toThrow(/Invalid/);
  });

  it('wraps component rules in the given layer', () => {
    const styles = createStyles({
      layers: ['components'] as const,
    });
    styles.component({
      name: 'btn',
      layer: 'components',
      variants: { size: variant.enum(['sm'], { default: 'sm' }) },
      styles: { base: { padding: '8px' }, variants: { size: { sm: { fontSize: '12px' } } } },
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/@layer components/);
    expect(css).toContain('.btn');
  });

  it('layered component: function config + internal vars uses dimensioned overload (intent selection types)', () => {
    const styles = createStyles({
      scopeId: 'layer-fn',
      layers: ['components'] as const,
    });
    const btn = styles.component({
      name: 'layered-fn-btn',
      layer: 'components',
      variants: { intent: variant.enum(['primary', 'ghost'], { default: 'ghost' }) },
      vars: {
        fg: { value: '#111', syntax: '<color>', inherits: false },
      },
      styles: ({ vars: v }) => ({
        base: { color: v.fg.var },
        variants: {
          intent: {
            primary: { [v.fg.name]: '#fff', backgroundColor: '#336699' },
            ghost: { [v.fg.name]: '#222', backgroundColor: 'transparent' },
          },
        },
      }),
    });
    const classes = btn({ intent: 'primary' });
    expect(classes.className).toContain('layered-fn-btn');
    flushSync();
    expect(getRegisteredCss()).toContain('@layer components');
  });

  it('createTokens emits :root inside tokenLayer', () => {
    createTokens({
      scopeId: 'app',
      layers: ['tokens', 'components'] as const,
      tokenLayer: 'tokens',
    }).create('color', { primary: '#336699' });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@layer tokens');
    expect(css).toContain(':root');
    expect(css).toContain('--app-color-primary');
  });

  it('createTypeStyles shares stack between styles and tokens', () => {
    const { style, tokens } = createTypeStyles({
      scopeId: 'ds',
      layers: {
        order: ['tokens', 'components'],
        token: 'tokens',
        style: 'components',
      },
    });
    tokens.create('space', { md: '16px' });
    style('card', { padding: '8px' }, { layer: 'components' });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@layer tokens, components;');
    expect(css).toContain('@layer tokens');
    expect(css).toContain('@layer components');
  });

  it('tokens.create can override tokenLayer', () => {
    const { tokens } = createTypeStyles({
      scopeId: 'ov',
      layers: {
        order: ['tokens', 'components'],
        token: 'tokens',
        style: 'components',
      },
    });
    tokens.create('space', { md: '8px' });
    tokens.create('radius', { sm: '4px' }, { layer: 'components' });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/@layer tokens[\s\S]*:root/);
    expect(css).toMatch(/@layer components[\s\S]*:root/);
    expect(css).toContain('--ov-space-md');
    expect(css).toContain('--ov-radius-sm');
  });

  it('resolveCascadeLayers throws on duplicate layer names', () => {
    expect(() => resolveCascadeLayers(['a', 'a'], undefined)).toThrow(/Duplicate/);
  });

  it('getRegisteredCss consolidates same-named @layer blocks', () => {
    const styles = createStyles({
      layers: ['components'] as const,
    });
    styles.component({
      name: 'merge-btn',
      layer: 'components',
      variants: { size: variant.enum(['sm', 'lg'], { default: 'sm' }) },
      styles: {
        base: { padding: '8px' },
        variants: {
          size: {
            sm: { fontSize: '12px' },
            lg: { fontSize: '18px' },
          },
        },
      },
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css.match(/@layer components \{/g)?.length).toBe(1);
    expect(css).toContain('.merge-btn');
    expect(css).toContain('.merge-btn--size-sm');
    expect(css).toContain('.merge-btn--size-lg');
  });

  it('snapshots consolidated layered CSS for a small design-system shape', async () => {
    const { recipe, tokens } = createTypeStyles({
      scopeId: 'vui',
      mode: 'attribute',
      layers: {
        order: ['reset', 'base', 'tokens', 'components', 'overrides', 'utilities'],
        token: 'tokens',
        style: 'components',
      },
      colorModes,
    });

    tokens.create('color', {
      brand: 'red',
      red: { 10: '#f90' },
    });

    tokens.createTheme({
      name: 'default',
      tokens: {
        color: {
          brand: { light: 'red', dark: 'blue' },
          red: { 10: '#f90' },
        },
      },
    });

    recipe({
      name: 'button',
      layer: 'components',
      variants: { role: variant.enum(['primary', 'secondary'], { default: 'primary' }) },
      vars: {
        bg: {
          value: 'var(--vui-color-brand)',
          syntax: '<color>',
        },
      },
      styles: ({ vars: v }) => ({
        base: {
          background: v.bg.var,
        },
        variants: {
          role: {
            primary: { background: 'var(--vui-color-red-10)' },
            secondary: { border: '1px solid black' },
          },
        },
      }),
    });

    flushSync();
    await expect(getRegisteredCss()).toMatchFileSnapshot(
      './__snapshots__/consolidate-cascade-layers-design-system.css',
    );
  });

  it('collectStyles SSR output consolidates @layer blocks', () => {
    const { css } = collectStyles(() => {
      const styles = createStyles({ layers: ['components'] as const });
      styles.class('a', { color: 'red' }, { layer: 'components' });
      styles.class('b', { color: 'blue' }, { layer: 'components' });
      return '';
    });
    expect(css.match(/@layer components \{/g)?.length).toBe(1);
    expect(css).toContain('.a');
    expect(css).toContain('.b');
  });
});
