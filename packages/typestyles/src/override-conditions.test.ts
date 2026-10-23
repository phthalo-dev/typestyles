import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { createStyles } from './styles';
import { variant } from './variant';
import { conditional } from './override';
import { when } from './theme';
import { registeredNamespaces } from './registry';
import { colorModes } from './color-modes';

describe('styles.override() conditions + colorModes', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('emits base rule and a conditional ancestor attr rule with selectorPrefix', () => {
    const styles = createStyles({ colorModes });
    const button = styles.component({
      name: 'cond-btn',
      styles: { base: { display: 'inline-flex' } },
    });

    styles.override({
      recipe: button,
      selectorPrefix: '.theme-acme',
      styles: {
        base: {
          letterSpacing: '0.02em',
          conditions: [
            {
              when: when.attr('data-mode', 'dark', { scope: 'ancestor' }),
              style: { letterSpacing: '0.06em' },
            },
          ],
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.theme-acme .cond-btn {');
    expect(css).toContain('letter-spacing: 0.02em');
    expect(css).toContain('.theme-acme [data-mode="dark"] .cond-btn');
    expect(css).toContain('letter-spacing: 0.06em');
  });

  it('wraps prefersDark in @media', () => {
    const styles = createStyles();
    const button = styles.component({ name: 'cond-media-btn', styles: { base: {} } });

    styles.override({
      recipe: button,
      styles: {
        base: {
          conditions: [conditional(when.prefersDark, { color: 'white' })],
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain('color: white');
  });

  it('emits separate rules for when.or branches', () => {
    const styles = createStyles();
    const button = styles.component({ name: 'cond-or-btn', styles: { base: {} } });

    styles.override({
      recipe: button,
      styles: {
        base: {
          conditions: [
            conditional(
              when.or(when.attr('data-mode', 'dark', { scope: 'ancestor' }), when.prefersDark),
              { fontWeight: 600 },
            ),
          ],
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/\[data-mode="dark"\].*font-weight: 600/);
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });

  it('applies conditions on variant options only', () => {
    const styles = createStyles();
    const button = styles.component({
      name: 'cond-variant-btn',
      variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
      styles: {
        base: {},
        variants: {
          intent: { primary: { color: 'blue' } },
        },
      },
    });

    styles.override({
      recipe: button,
      styles: {
        variants: {
          intent: {
            primary: {
              conditions: [conditional(when.prefersDark, { color: 'cyan' })],
            },
          },
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.cond-variant-btn--intent-primary');
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\).+color: cyan/);
  });

  it('serializes color mode values to light-dark() on color properties', () => {
    const styles = createStyles({ colorModes });
    const button = styles.component({ name: 'mode-color-btn', styles: { base: {} } });

    styles.override({
      recipe: button,
      styles: {
        base: {
          color: { light: '#111', dark: '#eee' },
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('color: light-dark(#111, #eee)');
  });

  it('allows conditions-only base blocks', () => {
    const styles = createStyles();
    const button = styles.component({ name: 'cond-only-btn', styles: { base: {} } });

    styles.override({
      recipe: button,
      styles: {
        base: {
          conditions: [conditional(when.prefersDark, { opacity: 0.9 })],
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('opacity: 0.9');
    expect(css).not.toMatch(/\.cond-only-btn \{\s*\}/);
  });

  it('uses @layer when configured', () => {
    const styles = createStyles({
      layers: ['tokens', 'components', 'overrides'] as const,
    });
    const button = styles.component({
      name: 'cond-layer-btn',
      layer: 'components',
      styles: { base: {} },
    });

    styles.override({
      recipe: button,
      layer: 'overrides',
      styles: {
        base: {
          conditions: [conditional(when.prefersDark, { color: 'red' })],
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@layer overrides');
    expect(css).toContain('color: red');
  });

  it('supports conditional() with id and emits conditional styles', () => {
    const styles = createStyles();
    const button = styles.component({ name: 'cond-id-btn', styles: { base: {} } });

    styles.override({
      recipe: button,
      styles: {
        base: {
          conditions: [conditional(when.prefersDark, { color: 'lime' }, 'reduced-motion-fallback')],
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('color: lime');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });

  it('applies conditions on compound variant overrides', () => {
    const styles = createStyles();
    const button = styles.component({
      name: 'cond-compound-btn',
      variants: {
        intent: variant.enum(['primary'], { default: 'primary' }),
        size: variant.enum(['lg'], { default: 'lg' }),
      },
      styles: {
        base: {},
        variants: {
          intent: { primary: { color: 'blue' } },
          size: { lg: { fontSize: '18px' } },
        },
      },
    });

    styles.override({
      recipe: button,
      styles: {
        compoundVariants: [
          {
            variants: { intent: 'primary', size: 'lg' },
            style: {
              conditions: [conditional(when.prefersDark, { fontWeight: 700 })],
            },
          },
        ],
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.cond-compound-btn--intent-primary.cond-compound-btn--size-lg');
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\).+font-weight: 700/);
  });

  it('applies conditions on slot variant overrides', () => {
    const styles = createStyles();
    const input = styles.component({
      name: 'cond-slot-input',
      slots: ['root', 'icon'] as const,
      variants: { tone: variant.enum(['danger'], { default: 'danger' }) },
      styles: {
        base: { root: { display: 'flex' }, icon: { width: '16px' } },
        variants: {
          tone: {
            danger: { root: { color: 'red' }, icon: { color: 'red' } },
          },
        },
      },
    });

    styles.override({
      recipe: input,
      styles: {
        variants: {
          tone: {
            danger: {
              icon: {
                conditions: [conditional(when.prefersDark, { width: '20px' })],
              },
            },
          },
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.cond-slot-input__icon--tone-danger');
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\).+width: 20px/);
  });

  it('applies conditions on multi-slot overrides', () => {
    const styles = createStyles();
    const card = styles.component({
      name: 'cond-multi-slot',
      slots: ['root', 'title'] as const,
      styles: { base: { root: { display: 'grid' }, title: { fontWeight: 600 } } },
    });

    styles.override({
      recipe: card,
      styles: {
        base: {
          title: {
            conditions: [conditional(when.prefersDark, { fontSize: '20px' })],
          },
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.cond-multi-slot__title');
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\).+font-size: 20px/);
  });

  it('wraps when.not(prefersDark) in @media not', () => {
    const styles = createStyles();
    const button = styles.component({ name: 'cond-not-btn', styles: { base: {} } });

    styles.override({
      recipe: button,
      styles: {
        base: {
          conditions: [conditional(when.not(when.prefersDark), { color: 'black' })],
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@media not (prefers-color-scheme: dark)');
    expect(css).toContain('color: black');
  });

  it('combines selectorPrefix with self-scoped attr conditions', () => {
    const styles = createStyles();
    const button = styles.component({ name: 'cond-self-attr-btn', styles: { base: {} } });

    styles.override({
      recipe: button,
      selectorPrefix: '.theme-acme',
      styles: {
        base: {
          conditions: [
            conditional(when.attr('data-mode', 'dark', { scope: 'self' }), { opacity: 0.8 }),
          ],
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.theme-acme .cond-self-attr-btn[data-mode="dark"]');
    expect(css).toContain('opacity: 0.8');
  });
});
