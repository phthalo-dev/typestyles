import { variant } from './variant';
import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { reset, getRegisteredCss, flushSync } from './sheet';
import { createTypeStyles } from './create-type-styles';

describe('createTheme({ components })', () => {
  beforeEach(() => {
    reset();
  });

  it('applies scoped overrides for registered namespaces', () => {
    const { recipe, tokens } = createTypeStyles({ scopeId: 'tc' });
    recipe({
      name: 'button',
      variants: { size: variant.enum(['sm', 'lg'], { default: 'sm' }) },
      styles: {
        base: { color: 'black' },
        variants: { size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } } },
      },
    });

    const theme = tokens.createTheme({
      name: 'brand',
      components: {
        button: { styles: { base: { color: 'rebeccapurple' } } },
      },
    });
    flushSync();

    const css = getRegisteredCss();
    expect(theme.className).toBe('theme-tc-brand');
    expect(css).toContain('.theme-tc-brand');
    expect(css).toMatch(/rebeccapurple/);
  });

  it('accepts components on the theme input object', () => {
    const { recipe, tokens } = createTypeStyles({ scopeId: 'tc3' });
    recipe({ name: 'button', styles: { base: { color: 'black' } } });

    tokens.createTheme({
      name: 'brand',
      tokens: { fontSize: { md: '14px' } },
      components: {
        button: { styles: { base: { color: 'rebeccapurple' } } },
      },
    });
    flushSync();
    expect(getRegisteredCss()).toMatch(/rebeccapurple/);
  });

  it('emits component var overrides on the host and on named slots', () => {
    const { recipe, tokens } = createTypeStyles({ scopeId: 'tc' });
    recipe({
      name: 'menu',
      slots: ['root', 'popover'] as const,
      vars: {
        popoverBackground: {
          value: 'var(--color-surface)',
          syntax: '<color>' as const,
          slots: ['popover'],
        },
        anchorX: '0px',
      },
      styles: ({ vars }) => ({
        base: {
          popover: { backgroundColor: vars.popoverBackground.var },
        },
      }),
    });

    tokens.createTheme({
      name: 'forest',
      components: {
        menu: {
          vars: {
            popoverBackground: 'var(--color-app)',
            anchorX: '4px',
          },
        },
      },
    });
    flushSync();

    const css = getRegisteredCss();
    expect(css).toContain(
      '.theme-tc-forest .tc-menu { --tc-menu-popoverbackground: var(--color-app); --tc-menu-anchorx: 4px; }',
    );
    expect(css).toContain(
      '.theme-tc-forest .tc-menu__popover { --tc-menu-popoverbackground: var(--color-app); }',
    );
    expect(css).not.toContain('.theme-tc-forest .tc-menu__popover { --tc-menu-anchorx');
  });

  it('throws in dev for unknown namespace', () => {
    const { tokens } = createTypeStyles({ scopeId: 'tc2' });
    expect(() =>
      tokens.createTheme({
        name: 'x',
        components: { ghost: { styles: { base: { color: 'red' } } } },
      }),
    ).toThrow(/unknown component namespace "ghost"/);
  });
});

describe('Theme.override({ components }) token context', () => {
  beforeEach(() => {
    reset();
  });

  it("a child theme's factory reads built-in and parent refs as var() strings", () => {
    const { recipe, tokens } = createTypeStyles({ scopeId: 'tco' });
    tokens.create('space', { md: '1rem' });
    recipe({ name: 'button', styles: { base: { color: 'black' } } });

    const parent = tokens.createTheme({ name: 'parent', tokens: { app: { glow: '#0f0' } } });
    parent.override({
      name: 'child',
      extend: { brand: { accent: '#f0f' } },
      components: {
        button: {
          styles: ({ tokens: t }) => ({
            base: {
              margin: t.space.md.var,
              outlineColor: t.app.glow.var,
              color: t.brand.accent.var,
            },
          }),
        },
      },
    });
    flushSync();

    const css = getRegisteredCss();
    expect(css).toMatch(/margin:\s*var\(--[\w-]*space-md\)/);
    expect(css).toMatch(/outline-color:\s*var\(--[\w-]*app-glow\)/);
    expect(css).toMatch(/color:\s*var\(--[\w-]*brand-accent\)/);
  });
});
