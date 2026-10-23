/**
 * Runtime tests for object recipes (Issue #275).
 *
 * Covers attribute-mode slot/boolean behavior, `.defaults`, `meta.schema`, shared
 * axes, and the rejection of style maps passed as `variants`.
 */
import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { createStyles } from './styles';
import { createTypeStyles } from './create-type-styles';
import { getComponentMeta } from './component-meta';
import { isSchemaRecipeDefinition } from './component';
import { variant } from './variant';
import { reset, getRegisteredCss } from './sheet';
import { registeredNamespaces } from './registry';

describe('object recipe (variant axes)', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('returns attrs for every slot in attribute mode and applies axis defaults', () => {
    const styles = createStyles({ mode: 'attribute' });
    const alert = styles.component({
      name: 'alert',
      slots: ['root', 'title'],
      variants: {
        tone: variant.enum(['info', 'danger'], { default: 'info' }),
        elevated: variant.boolean({ default: false }),
      },
      styles: () => ({
        base: { root: { display: 'flex' } },
        variants: {
          tone: {
            info: { root: { color: 'blue' } },
            danger: { root: { color: 'red' } },
          },
          elevated: {
            true: { root: { boxShadow: '0 1px 2px rgba(0,0,0,0.2)' } },
            false: {},
          },
        },
      }),
    });

    const result = alert();
    expect(result.root.className).toBe('alert');
    expect(result.title.className).toBe('alert__title');
    // Boolean `false` is a presence-attribute omission.
    expect(result.root.attrs).toEqual({ 'data-tone': 'info' });
    expect(String(result.root)).toBe('alert');
  });

  it('sets the presence attribute for a true boolean axis and omits it for false', () => {
    const styles = createStyles({ mode: 'attribute' });
    const button = styles.component({
      name: 'schema-button',
      variants: { elevated: variant.boolean({ default: false }) },
      styles: () => ({
        base: { padding: '8px' },
        variants: {
          elevated: {
            true: { boxShadow: '0 1px 2px rgba(0,0,0,0.2)' },
            false: {},
          },
        },
      }),
    });

    expect(button({ elevated: true }).attrs).toEqual({ 'data-elevated': '' });
    expect(button({ elevated: false }).attrs).toEqual({});
  });

  it('exposes resolved defaults on `.defaults`', () => {
    const styles = createStyles({ mode: 'attribute' });
    const alert = styles.component({
      name: 'defaults-alert',
      variants: {
        tone: variant.enum(['info', 'success', 'danger'], { default: 'info' }),
        gap: variant.enum(['spaced', 'flush'], { default: 'spaced' }),
        elevated: variant.boolean({ default: false }),
      },
      styles: () => ({
        variants: {
          tone: { info: {}, success: {}, danger: {} },
          gap: { spaced: {}, flush: {} },
          elevated: { true: {}, false: {} },
        },
      }),
    });

    expect(alert.defaults).toEqual({ tone: 'info', gap: 'spaced', elevated: false });
  });

  it('records slots, axis kind, options, and defaults in meta.schema', () => {
    const styles = createStyles({ mode: 'attribute' });
    const alert = styles.component({
      name: 'meta-alert',
      slots: ['root', 'icon'],
      variants: {
        tone: variant.enum(['info', 'danger'], { default: 'info' }),
        elevated: variant.boolean({ default: false }),
      },
      styles: () => ({
        variants: {
          tone: { info: {}, danger: {} },
          elevated: { true: {}, false: {} },
        },
      }),
    });

    expect(getComponentMeta(alert)?.schema).toEqual({
      slots: ['root', 'icon'],
      variants: {
        tone: { kind: 'enum', options: ['info', 'danger'], default: 'info' },
        elevated: { kind: 'boolean', default: false },
      },
    });
  });

  it('rejects style maps passed as variants', () => {
    const styles = createStyles({ mode: 'attribute' });
    expect(() =>
      styles.component({
        name: 'legacy-alert',
        // @ts-expect-error — variants are axes, not option styles
        variants: { tone: { info: { color: 'blue' } } },
        styles: { base: { padding: '8px' } },
      }),
    ).toThrow(/variant\.enum/);
  });

  it('reuses a shared axis across recipes', () => {
    const styles = createStyles({ mode: 'attribute' });
    const appearance = variant.enum(['subtle', 'solid'], { default: 'subtle' });

    const first = styles.component({
      name: 'shared-a',
      variants: { appearance },
      styles: () => ({
        variants: { appearance: { subtle: {}, solid: {} } },
      }),
    });
    const second = styles.component({
      name: 'shared-b',
      variants: { appearance },
      styles: () => ({
        variants: { appearance: { subtle: {}, solid: {} } },
      }),
    });

    expect(first({ appearance: 'solid' }).attrs).toEqual({ 'data-appearance': 'solid' });
    expect(second().attrs).toEqual({ 'data-appearance': 'subtle' });
  });

  it('registers and exposes internal vars declared on the recipe', () => {
    const styles = createStyles({ mode: 'attribute' });
    const chip = styles.component({
      name: 'schema-chip',
      variants: { tone: variant.enum(['info'], { default: 'info' }) },
      vars: { surface: '#fff' },
      styles: ({ vars }) => ({
        base: { backgroundColor: vars.surface.var },
        variants: { tone: { info: { color: vars.surface.var } } },
      }),
    });

    expect(chip.vars.surface.var).toBe('var(--schema-chip-surface)');
    expect(getComponentMeta(chip)?.varRegistry?.vars.map((entry) => entry.path)).toContain(
      'surface',
    );
  });

  it('emits variant CSS as attribute selectors on the base class', () => {
    const styles = createStyles({ mode: 'attribute' });
    styles.component({
      name: 'css-alert',
      variants: { tone: variant.enum(['info', 'danger'], { default: 'info' }) },
      styles: () => ({
        base: { padding: '8px' },
        variants: { tone: { info: { color: 'blue' }, danger: { color: 'red' } } },
      }),
    });

    const css = getRegisteredCss();
    expect(css).toContain('[data-tone="danger"]');
  });

  it('emits combined compound-variant selectors from schema axes', () => {
    const styles = createStyles({ mode: 'attribute' });
    styles.component({
      name: 'compound-alert',
      variants: {
        tone: variant.enum(['info', 'danger'], { default: 'info' }),
        size: variant.enum(['sm', 'lg'], { default: 'sm' }),
        elevated: variant.boolean({ default: false }),
      },
      styles: () => ({
        base: { padding: '8px' },
        variants: {
          tone: { info: {}, danger: {} },
          size: { sm: {}, lg: {} },
          elevated: { true: {}, false: {} },
        },
        compoundVariants: [
          { variants: { tone: ['info', 'danger'], size: 'lg' }, style: { fontWeight: 700 } },
          { variants: { elevated: true }, style: { boxShadow: 'none' } },
        ],
      }),
    });

    const css = getRegisteredCss();
    expect(css).toContain('font-weight: 700');
    expect(css).toContain(':is([data-tone="info"], [data-tone="danger"])[data-size="lg"]');
    expect(css).toContain('[data-elevated]');
  });

  it('works in semantic mode (class modifiers for slot recipes)', () => {
    const styles = createStyles();
    const card = styles.component({
      name: 'schema-card',
      slots: ['root', 'body'],
      variants: { size: variant.enum(['sm', 'lg'], { default: 'sm' }) },
      styles: () => ({
        variants: {
          size: {
            sm: { body: { fontSize: '12px' } },
            lg: { body: { fontSize: '16px' } },
          },
        },
      }),
    });

    const c = card({ size: 'lg' });
    expect(c.root.className).toBe('schema-card');
    expect(c.body.className).toContain('schema-card__body');
    expect(card.defaults).toEqual({ size: 'sm' });
    expect(getComponentMeta(card)?.schema?.slots).toEqual(['root', 'body']);
  });

  it('supports createTypeStyles layered attribute recipes with and without layer', () => {
    const { recipe } = createTypeStyles({
      scopeId: 'schema-app',
      mode: 'attribute',
      layers: { order: ['tokens', 'components'] as const, token: 'tokens', style: 'components' },
    });

    const badge = recipe({
      name: 'schema-badge',
      variants: { tone: variant.enum(['info', 'danger'], { default: 'info' }) },
      styles: () => ({ variants: { tone: { info: {}, danger: {} } } }),
    });
    const tag = recipe({
      name: 'schema-tag',
      layer: 'components',
      variants: { tone: variant.enum(['info', 'danger'], { default: 'danger' }) },
      styles: () => ({ variants: { tone: { info: {}, danger: {} } } }),
    });

    expect(badge().attrs).toEqual({ 'data-tone': 'info' });
    expect(tag().attrs).toEqual({ 'data-tone': 'danger' });
    expect(getComponentMeta(badge)?.schema?.variants.tone).toEqual({
      kind: 'enum',
      options: ['info', 'danger'],
      default: 'info',
    });
  });

  it('requires every axis to be branded, not just one', () => {
    const axis = variant.enum(['a', 'b'], { default: 'a' });
    expect(isSchemaRecipeDefinition({ variants: { tone: axis } })).toBe(true);
    expect(isSchemaRecipeDefinition({ variants: { tone: axis, size: { sm: {} } } })).toBe(false);
    expect(isSchemaRecipeDefinition({ variants: {} })).toBe(false);
    expect(isSchemaRecipeDefinition({ base: {} })).toBe(false);
  });

  it('supports schema recipes through withUtils', () => {
    const styles = createStyles({ mode: 'attribute' });
    const withUtils = styles.withUtils({
      insetX: (value: number) => ({ paddingLeft: value, paddingRight: value }),
    });
    const chip = withUtils.component({
      name: 'util-chip',
      variants: { tone: variant.enum(['info', 'danger'], { default: 'info' }) },
      styles: () => ({ variants: { tone: { info: {}, danger: {} } } }),
    });

    expect(chip().attrs).toEqual({ 'data-tone': 'info' });
    expect(getComponentMeta(chip)?.schema?.variants.tone).toEqual({
      kind: 'enum',
      options: ['info', 'danger'],
      default: 'info',
    });
  });
});
