/**
 * Runtime tests for schema-first recipes (Issue #259).
 *
 * Covers the attribute-mode slot/boolean behavior, `.defaults`, `meta.schema`, shared
 * axes, and interop with the legacy config call shapes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createStyles } from './styles';
import { createTypeStyles } from './create-type-styles';
import { getComponentMeta } from './component-meta';
import { isSchemaRecipeDefinition } from './component';
import { variant } from './variant';
import { reset, getRegisteredCss } from './sheet';
import { registeredNamespaces } from './registry';

describe('schema-first recipe (variant axes)', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('returns attrs for every slot in attribute mode and applies axis defaults', () => {
    const styles = createStyles({ mode: 'attribute' });
    const alert = styles.component(
      'alert',
      {
        slots: ['root', 'title'] as const,
        variants: {
          tone: variant.enum(['info', 'danger'], { default: 'info' }),
          elevated: variant.boolean({ default: false }),
        },
      },
      () => ({
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
    );

    const result = alert();
    expect(result.root.className).toBe('alert');
    expect(result.title.className).toBe('alert__title');
    // Boolean `false` is a presence-attribute omission.
    expect(result.root.attrs).toEqual({ 'data-tone': 'info' });
    expect(String(result.root)).toBe('alert');
  });

  it('sets the presence attribute for a true boolean axis and omits it for false', () => {
    const styles = createStyles({ mode: 'attribute' });
    const button = styles.component(
      'schema-button',
      { variants: { elevated: variant.boolean({ default: false }) } },
      () => ({
        base: { padding: '8px' },
        variants: {
          elevated: {
            true: { boxShadow: '0 1px 2px rgba(0,0,0,0.2)' },
            false: {},
          },
        },
      }),
    );

    expect(button({ elevated: true }).attrs).toEqual({ 'data-elevated': '' });
    expect(button({ elevated: false }).attrs).toEqual({});
  });

  it('exposes resolved defaults on `.defaults`', () => {
    const styles = createStyles({ mode: 'attribute' });
    const alert = styles.component(
      'defaults-alert',
      {
        variants: {
          tone: variant.enum(['info', 'success', 'danger'], { default: 'info' }),
          gap: variant.enum(['spaced', 'flush'], { default: 'spaced' }),
          elevated: variant.boolean({ default: false }),
        },
      },
      () => ({
        variants: {
          tone: { info: {}, success: {}, danger: {} },
          gap: { spaced: {}, flush: {} },
          elevated: { true: {}, false: {} },
        },
      }),
    );

    expect(alert.defaults).toEqual({ tone: 'info', gap: 'spaced', elevated: false });
  });

  it('records slots, axis kind, options, and defaults in meta.schema', () => {
    const styles = createStyles({ mode: 'attribute' });
    const alert = styles.component(
      'meta-alert',
      {
        slots: ['root', 'icon'] as const,
        variants: {
          tone: variant.enum(['info', 'danger'], { default: 'info' }),
          elevated: variant.boolean({ default: false }),
        },
      },
      () => ({
        variants: {
          tone: { info: {}, danger: {} },
          elevated: { true: {}, false: {} },
        },
      }),
    );

    expect(getComponentMeta(alert)?.schema).toEqual({
      slots: ['root', 'icon'],
      variants: {
        tone: { kind: 'enum', options: ['info', 'danger'], default: 'info' },
        elevated: { kind: 'boolean', default: false },
      },
    });
  });

  it('leaves meta.schema undefined for legacy config shapes', () => {
    const styles = createStyles({ mode: 'attribute' });
    const legacy = styles.component('legacy-alert', {
      base: { padding: '8px' },
      variants: { tone: { info: { color: 'blue' } } },
      defaultVariants: { tone: 'info' },
    });

    expect(getComponentMeta(legacy)?.schema).toBeUndefined();
    expect(legacy({ tone: 'info' }).attrs).toEqual({ 'data-tone': 'info' });
  });

  it('reuses a shared axis across recipes', () => {
    const styles = createStyles({ mode: 'attribute' });
    const appearance = variant.enum(['subtle', 'solid'], { default: 'subtle' });

    const first = styles.component('shared-a', { variants: { appearance } }, () => ({
      variants: { appearance: { subtle: {}, solid: {} } },
    }));
    const second = styles.component('shared-b', { variants: { appearance } }, () => ({
      variants: { appearance: { subtle: {}, solid: {} } },
    }));

    expect(first({ appearance: 'solid' }).attrs).toEqual({ 'data-appearance': 'solid' });
    expect(second().attrs).toEqual({ 'data-appearance': 'subtle' });
  });

  it('registers and exposes internal vars declared via c.vars()', () => {
    const styles = createStyles({ mode: 'attribute' });
    const chip = styles.component(
      'schema-chip',
      { variants: { tone: variant.enum(['info'], { default: 'info' }) } },
      (c) => {
        const v = c.vars({ surface: '#fff' });
        return {
          vars: v,
          base: { backgroundColor: v.surface.var },
          variants: { tone: { info: { color: v.surface.var } } },
        };
      },
    );

    expect(chip.vars.surface.var).toBe('var(--schema-chip-surface)');
    expect(getComponentMeta(chip)?.varRegistry?.vars.map((entry) => entry.path)).toContain(
      'surface',
    );
  });

  it('emits variant CSS as attribute selectors on the base class', () => {
    const styles = createStyles({ mode: 'attribute' });
    styles.component(
      'css-alert',
      { variants: { tone: variant.enum(['info', 'danger'], { default: 'info' }) } },
      () => ({
        base: { padding: '8px' },
        variants: { tone: { info: { color: 'blue' }, danger: { color: 'red' } } },
      }),
    );

    const css = getRegisteredCss();
    expect(css).toContain('[data-tone="danger"]');
  });

  it('emits combined compound-variant selectors from schema axes', () => {
    const styles = createStyles({ mode: 'attribute' });
    styles.component(
      'compound-alert',
      {
        variants: {
          tone: variant.enum(['info', 'danger'], { default: 'info' }),
          size: variant.enum(['sm', 'lg'], { default: 'sm' }),
          elevated: variant.boolean({ default: false }),
        },
      },
      () => ({
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
    );

    const css = getRegisteredCss();
    expect(css).toContain('font-weight: 700');
    expect(css).toContain(':is([data-tone="info"], [data-tone="danger"])[data-size="lg"]');
    expect(css).toContain('[data-elevated]');
  });

  it('works in semantic mode (class modifiers for slot recipes)', () => {
    const styles = createStyles();
    const card = styles.component(
      'schema-card',
      {
        slots: ['root', 'body'] as const,
        variants: { size: variant.enum(['sm', 'lg'], { default: 'sm' }) },
      },
      () => ({
        variants: {
          size: {
            sm: { body: { fontSize: '12px' } },
            lg: { body: { fontSize: '16px' } },
          },
        },
      }),
    );

    const c = card({ size: 'lg' });
    expect(c.root).toBe('schema-card');
    expect(c.body).toContain('schema-card__body');
    expect(card.defaults).toEqual({ size: 'sm' });
    expect(getComponentMeta(card)?.schema?.slots).toEqual(['root', 'body']);
  });

  it('supports createTypeStyles layered attribute recipes with and without { layer }', () => {
    const { recipe } = createTypeStyles({
      scopeId: 'schema-app',
      mode: 'attribute',
      layers: { order: ['tokens', 'components'] as const, token: 'tokens', style: 'components' },
    });

    const badge = recipe(
      'schema-badge',
      { variants: { tone: variant.enum(['info', 'danger'], { default: 'info' }) } },
      () => ({ variants: { tone: { info: {}, danger: {} } } }),
    );
    const tag = recipe(
      'schema-tag',
      { variants: { tone: variant.enum(['info', 'danger'], { default: 'danger' }) } },
      () => ({ variants: { tone: { info: {}, danger: {} } } }),
      { layer: 'components' },
    );

    expect(badge().attrs).toEqual({ 'data-tone': 'info' });
    expect(tag().attrs).toEqual({ 'data-tone': 'danger' });
    expect(getComponentMeta(badge)?.schema?.variants.tone).toEqual({
      kind: 'enum',
      options: ['info', 'danger'],
      default: 'info',
    });
  });

  it('does not confuse a legacy dimensioned config for a schema definition', () => {
    const styles = createStyles({ mode: 'attribute' });
    // `variants` values are style objects, not branded axes.
    const legacy = styles.component('not-schema', {
      variants: { size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } } },
      defaultVariants: { size: 'sm' },
    });

    expect(getComponentMeta(legacy)?.schema).toBeUndefined();
    expect('defaults' in legacy).toBe(false);
  });

  it('requires every axis to be branded, not just one', () => {
    const axis = variant.enum(['a', 'b'], { default: 'a' });
    // A fully-branded definition is recognized.
    expect(isSchemaRecipeDefinition({ variants: { tone: axis } })).toBe(true);
    // A single branded axis among style objects is a hand-built object, not a definition.
    expect(isSchemaRecipeDefinition({ variants: { tone: axis, size: { sm: {} } } })).toBe(false);
    // Empty or non-definition shapes are rejected.
    expect(isSchemaRecipeDefinition({ variants: {} })).toBe(false);
    expect(isSchemaRecipeDefinition({ base: {} })).toBe(false);
  });

  it('supports schema recipes through withUtils', () => {
    const styles = createStyles({ mode: 'attribute' });
    const withUtils = styles.withUtils({
      insetX: (value: number) => ({ paddingLeft: value, paddingRight: value }),
    });
    const chip = withUtils.component(
      'util-chip',
      { variants: { tone: variant.enum(['info', 'danger'], { default: 'info' }) } },
      () => ({ variants: { tone: { info: {}, danger: {} } } }),
    );

    expect(chip().attrs).toEqual({ 'data-tone': 'info' });
    expect(getComponentMeta(chip)?.schema?.variants.tone).toEqual({
      kind: 'enum',
      options: ['info', 'danger'],
      default: 'info',
    });
  });
});
