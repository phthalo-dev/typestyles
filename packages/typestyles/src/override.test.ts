import { describe, it, expect, beforeEach, vi } from 'vite-plus/test';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { createStyles } from './styles';
import { createTypeStyles } from './create-type-styles';
import { createComponent } from './component';
import { variant } from './variant';
import { getComponentMeta } from './component-meta';
import { registeredNamespaces } from './registry';
import { colorModes } from './color-modes';

describe('styles.override() + __tsMeta', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  describe('getComponentMeta', () => {
    it('attaches non-enumerable dimensioned meta for semantic mode', () => {
      const styles = createStyles();
      const button = styles.component({
        name: 'ov-meta-btn',
        variants: {
          intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
          size: variant.enum(['sm', 'lg'], { default: 'sm' }),
        },
        styles: {
          base: { display: 'inline-flex' },
          variants: {
            intent: { primary: { color: 'blue' }, ghost: { color: 'transparent' } },
            size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } },
          },
        },
      });

      const meta = getComponentMeta(button);
      expect(meta).toMatchObject({
        namespace: 'ov-meta-btn',
        kind: 'dimensioned',
        namingMode: 'semantic',
        base: 'ov-meta-btn',
      });
      expect(meta?.kind === 'dimensioned' && meta.variants.intent.primary).toBe(
        'ov-meta-btn--intent-primary',
      );
      expect(Object.keys(button)).not.toContain('__tsMeta');
    });

    it('records attribute selector fragments', () => {
      const styles = createStyles({ mode: 'attribute' });
      const button = styles.component({
        name: 'ov-attr-btn',
        variants: {
          intent: variant.enum(['primary'], { default: 'primary' }),
          disabled: variant.boolean({ default: false }),
        },
        styles: {
          base: { display: 'inline-flex' },
          variants: {
            intent: { primary: { color: 'blue' } },
            disabled: { true: { opacity: 0.5 }, false: { opacity: 1 } },
          },
        },
      });

      const meta = getComponentMeta(button);
      expect(meta?.kind).toBe('dimensioned');
      expect(meta?.namingMode).toBe('attribute');
      if (meta?.kind === 'dimensioned') {
        expect(meta.base).toBe('ov-attr-btn');
        expect(meta.variants.intent.primary).toBe('[data-intent="primary"]');
        expect(meta.variants.disabled.true).toBe('[data-disabled]');
        expect(meta.variants.disabled.false).toBe(':not([data-disabled])');
      }
    });

    it('attaches flat and slot meta', () => {
      const styles = createStyles();
      const card = styles.component({
        name: 'ov-flat-card',
        variants: { elevated: variant.boolean({ default: false }) },
        styles: {
          base: { padding: '8px' },
          variants: { elevated: { true: { boxShadow: '0 2px 4px black' }, false: {} } },
        },
      });
      const alert = styles.component({
        name: 'ov-slot-alert',
        slots: ['root', 'icon'] as const,
        variants: { tone: variant.enum(['danger'], { default: 'danger' }) },
        styles: {
          base: { root: { display: 'flex' }, icon: { width: '16px' } },
          variants: {
            tone: {
              danger: { root: { color: 'red' }, icon: { scale: '1.2' } },
            },
          },
        },
      });

      expect(getComponentMeta(card)).toMatchObject({
        kind: 'dimensioned',
        base: 'ov-flat-card',
        variants: {
          elevated: {
            true: 'ov-flat-card--elevated-true',
            false: 'ov-flat-card--elevated-false',
          },
        },
      });
      const slotMeta = getComponentMeta(alert);
      expect(slotMeta?.kind).toBe('slot');
      if (slotMeta?.kind === 'slot') {
        expect(slotMeta.base.root).toBe('ov-slot-alert');
        expect(slotMeta.base.icon).toBe('ov-slot-alert__icon');
        expect(slotMeta.variants.icon.tone.danger).toBe('ov-slot-alert__icon--tone-danger');
      }
    });
  });

  describe('emission', () => {
    it('emits base, variant, and compound overrides for semantic mode', () => {
      const styles = createStyles();
      const button = styles.component({
        name: 'ov-sem-btn',
        variants: {
          intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
          size: variant.enum(['sm', 'lg'], { default: 'sm' }),
        },
        styles: {
          base: { borderRadius: '6px' },
          variants: {
            intent: {
              primary: { backgroundColor: 'blue' },
              ghost: { backgroundColor: 'transparent' },
            },
            size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } },
          },
        },
      });

      styles.override({
        recipe: button,
        styles: {
          base: { borderRadius: '999px' },
          variants: {
            intent: { primary: { textTransform: 'uppercase' } },
          },
          compoundVariants: [
            {
              variants: { intent: 'primary', size: 'lg' },
              style: { letterSpacing: '0.05em' },
            },
          ],
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.ov-sem-btn {');
      expect(css).toContain('border-radius: 999px');
      expect(css).toContain('.ov-sem-btn--intent-primary {');
      expect(css).toContain('text-transform: uppercase');
      expect(css).toContain('.ov-sem-btn--intent-primary.ov-sem-btn--size-lg {');
      expect(css).toContain('letter-spacing: 0.05em');
    });

    it('emits attribute-mode variant and compound selectors', () => {
      const styles = createStyles({ mode: 'attribute' });
      const button = styles.component({
        name: 'ov-attr-emit',
        variants: {
          intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
          size: variant.enum(['sm', 'lg'], { default: 'sm' }),
        },
        styles: {
          base: { display: 'inline-flex' },
          variants: {
            intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } },
            size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } },
          },
        },
      });

      styles.override({
        recipe: button,
        styles: {
          variants: {
            intent: { primary: { textTransform: 'uppercase' } },
          },
          compoundVariants: [
            {
              variants: { intent: 'primary', size: 'lg' },
              style: { fontWeight: 700 },
            },
          ],
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.ov-attr-emit[data-intent="primary"] {');
      expect(css).toContain('text-transform: uppercase');
      expect(css).toContain('.ov-attr-emit[data-intent="primary"][data-size="lg"] {');
      expect(css).toContain('font-weight: 700');
    });

    it('emits :is() for compound array selections (semantic + attribute)', () => {
      const semantic = createStyles();
      const btn = semantic.component({
        name: 'ov-is-sem',
        variants: {
          intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
          size: variant.enum(['lg'], { default: 'lg' }),
        },
        styles: {
          base: { display: 'flex' },
          variants: {
            intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } },
            size: { lg: { fontSize: '16px' } },
          },
        },
      });
      semantic.override({
        recipe: btn,
        styles: {
          compoundVariants: [
            {
              variants: { intent: ['primary', 'ghost'], size: 'lg' },
              style: { fontWeight: 700 },
            },
          ],
        },
      });
      flushSync();
      expect(getRegisteredCss()).toContain(
        ':is(.ov-is-sem--intent-primary, .ov-is-sem--intent-ghost).ov-is-sem--size-lg',
      );

      reset();
      registeredNamespaces.clear();

      const attribute = createStyles({ mode: 'attribute' });
      const abtn = attribute.component({
        name: 'ov-is-attr',
        variants: {
          intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
          size: variant.enum(['lg'], { default: 'lg' }),
        },
        styles: {
          base: { display: 'flex' },
          variants: {
            intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } },
            size: { lg: { fontSize: '16px' } },
          },
        },
      });
      attribute.override({
        recipe: abtn,
        styles: {
          compoundVariants: [
            {
              variants: { intent: ['primary', 'ghost'], size: 'lg' },
              style: { fontWeight: 700 },
            },
          ],
        },
      });
      flushSync();
      expect(getRegisteredCss()).toContain(
        '.ov-is-attr:is([data-intent="primary"], [data-intent="ghost"])[data-size="lg"]',
      );
    });

    it('applies selectorPrefix as a descendant combinator', () => {
      const styles = createStyles();
      const button = styles.component({
        name: 'ov-prefix-btn',
        variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
        styles: { base: { color: 'black' }, variants: { intent: { primary: { color: 'blue' } } } },
      });
      styles.override({
        recipe: button,
        selectorPrefix: '.theme-acme',
        styles: {
          base: { boxShadow: 'none' },
          variants: { intent: { primary: { color: 'red' } } },
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.theme-acme .ov-prefix-btn {');
      expect(css).toContain('.theme-acme .ov-prefix-btn--intent-primary {');
    });

    it('wraps rules in cascade layer when layer is set', () => {
      const styles = createStyles({
        layers: ['components', 'overrides'] as const,
      });
      const button = styles.component({
        name: 'ov-layer-btn',
        layer: 'components',
        styles: { base: { color: 'black' } },
      });
      styles.override({ recipe: button, layer: 'overrides', styles: { base: { color: 'red' } } });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('@layer components, overrides;');
      expect(css).toMatch(/@layer overrides \{[\s\S]*\.ov-layer-btn \{/);
      expect(css).toContain('color: red');
    });

    it('overrides slot recipes per slot', () => {
      const styles = createStyles();
      const alert = styles.component({
        name: 'ov-slot-emit',
        slots: ['root', 'icon'] as const,
        variants: { tone: variant.enum(['danger'], { default: 'danger' }) },
        styles: {
          base: { root: { display: 'flex' }, icon: { width: '16px' } },
          variants: {
            tone: {
              danger: { root: { color: 'red' }, icon: { opacity: 1 } },
            },
          },
        },
      });

      styles.override({
        recipe: alert,
        styles: {
          base: { root: { borderStyle: 'dashed' } },
          variants: { tone: { danger: { icon: { scale: '1.2' } } } },
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.ov-slot-emit {');
      expect(css).toContain('border-style: dashed');
      expect(css).toContain('.ov-slot-emit__icon--tone-danger {');
      expect(css).toContain('scale: 1.2');
    });

    it('emits attribute-mode slot base, variant, and compound with selectorPrefix + layer', () => {
      const styles = createStyles({
        mode: 'attribute',
        layers: ['components', 'overrides', 'utilities'] as const,
      });
      const alert = styles.component({
        name: 'ov-attr-slot',
        layer: 'components',
        slots: ['root', 'icon'] as const,
        variants: {
          tone: variant.enum(['danger', 'info'], { default: 'danger' }),
          size: variant.enum(['lg'], { default: 'lg' }),
        },
        styles: {
          base: { root: { display: 'flex' }, icon: { width: '16px' } },
          variants: {
            tone: {
              danger: { root: { color: 'red' }, icon: { opacity: 1 } },
              info: { root: { color: 'blue' }, icon: { opacity: 1 } },
            },
            size: {
              lg: { root: { gap: '12px' }, icon: { width: '24px' } },
            },
          },
        },
      });

      const meta = getComponentMeta(alert);
      expect(meta).toMatchObject({
        kind: 'slot',
        namingMode: 'attribute',
        base: { root: 'ov-attr-slot', icon: 'ov-attr-slot__icon' },
      });
      if (meta?.kind === 'slot') {
        expect(meta.variants.icon.tone.danger).toBe('[data-tone="danger"]');
      }

      styles.override({
        recipe: alert,
        layer: 'overrides',
        selectorPrefix: '.theme-acme',
        styles: {
          base: { root: { borderStyle: 'dashed' } },
          variants: { tone: { danger: { icon: { scale: '1.2' } } } },
          compoundVariants: [
            {
              variants: { tone: 'danger', size: 'lg' },
              style: { root: { outline: '2px solid red' } },
            },
            {
              variants: { tone: ['danger', 'info'], size: 'lg' },
              style: { icon: { opacity: 0.8 } },
            },
          ],
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('@layer components, overrides, utilities;');
      expect(css).toMatch(
        /@layer overrides \{[\s\S]*\.theme-acme \.ov-attr-slot \{[\s\S]*border-style: dashed/,
      );
      expect(css).toContain('.theme-acme .ov-attr-slot__icon[data-tone="danger"]');
      expect(css).toContain('scale: 1.2');
      expect(css).toContain('.theme-acme .ov-attr-slot[data-tone="danger"][data-size="lg"]');
      expect(css).toContain('outline: 2px solid red');
      expect(css).toContain(
        '.theme-acme .ov-attr-slot__icon:is([data-tone="danger"], [data-tone="info"])[data-size="lg"]',
      );
    });

    it('overrides flat variants', () => {
      const styles = createStyles();
      const card = styles.component({
        name: 'ov-flat-emit',
        variants: { elevated: variant.boolean({ default: false }) },
        styles: {
          base: { padding: '8px' },
          variants: { elevated: { true: { boxShadow: '0 1px 2px black' }, false: {} } },
        },
      });
      styles.override({
        recipe: card,
        styles: {
          base: { padding: '16px' },
          variants: { elevated: { true: { boxShadow: 'none' } } },
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.ov-flat-emit {');
      expect(css).toContain('padding: 16px');
      expect(css).toContain('.ov-flat-emit--elevated-true {');
      expect(css).toContain('box-shadow: none');
    });

    it('emits bem-mode variant and compound selectors', () => {
      const styles = createStyles({ mode: 'bem' });
      const button = styles.component({
        name: 'ov-bem-btn',
        variants: {
          intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
          size: variant.enum(['sm', 'lg'], { default: 'sm' }),
        },
        styles: {
          base: { borderRadius: '6px' },
          variants: {
            intent: {
              primary: { backgroundColor: 'blue' },
              ghost: { backgroundColor: 'transparent' },
            },
            size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } },
          },
        },
      });

      styles.override({
        recipe: button,
        styles: {
          base: { borderRadius: '999px' },
          variants: { intent: { primary: { textTransform: 'uppercase' } } },
          compoundVariants: [
            {
              variants: { intent: 'primary', size: 'lg' },
              style: { letterSpacing: '0.05em' },
            },
            {
              variants: { intent: ['primary', 'ghost'], size: 'lg' },
              style: { fontWeight: 700 },
            },
          ],
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.ov-bem-btn {');
      expect(css).toContain('border-radius: 999px');
      expect(css).toContain('.ov-bem-btn--primary {');
      expect(css).toContain('text-transform: uppercase');
      expect(css).toContain('.ov-bem-btn--primary.ov-bem-btn--lg {');
      expect(css).toContain('letter-spacing: 0.05em');
      expect(css).toContain(':is(.ov-bem-btn--primary, .ov-bem-btn--ghost).ov-bem-btn--lg');
      expect(css).toContain('font-weight: 700');
    });

    it('emits template-mode dimensioned, flat, and slot overrides', () => {
      const styles = createStyles({
        mode: 'template',
        classNameTemplate: ({ scope, namespace, element, modifier }) => {
          const base = element ? `${scope}${namespace}__${element}` : `${scope}${namespace}`;
          return modifier ? `${base}--${modifier}` : base;
        },
      });

      const button = styles.component({
        name: 'ov-tpl-btn',
        variants: {
          intent: variant.enum(['primary'], { default: 'primary' }),
          size: variant.enum(['lg'], { default: 'lg' }),
        },
        styles: {
          base: { display: 'inline-flex' },
          variants: {
            intent: { primary: { color: 'blue' } },
            size: { lg: { fontSize: '16px' } },
          },
        },
      });
      styles.override({
        recipe: button,
        styles: {
          variants: { intent: { primary: { textTransform: 'uppercase' } } },
          compoundVariants: [
            {
              variants: { intent: 'primary', size: 'lg' },
              style: { fontWeight: 700 },
            },
          ],
        },
      });
      flushSync();
      let css = getRegisteredCss();
      expect(css).toContain('.ov-tpl-btn--primary {');
      expect(css).toContain('text-transform: uppercase');
      expect(css).toContain('.ov-tpl-btn--primary.ov-tpl-btn--lg {');
      expect(css).toContain('font-weight: 700');

      reset();
      registeredNamespaces.clear();

      const card = styles.component({
        name: 'ov-tpl-flat',
        variants: { elevated: variant.boolean({ default: false }) },
        styles: {
          base: { padding: '8px' },
          variants: { elevated: { true: { boxShadow: '0 1px 2px black' }, false: {} } },
        },
      });
      styles.override({
        recipe: card,
        styles: {
          base: { padding: '16px' },
          variants: { elevated: { true: { boxShadow: 'none' } } },
        },
      });
      flushSync();
      css = getRegisteredCss();
      expect(css).toContain('.ov-tpl-flat {');
      expect(css).toContain('padding: 16px');
      expect(css).toContain('.ov-tpl-flat--true {');
      expect(css).toContain('box-shadow: none');

      reset();
      registeredNamespaces.clear();

      const alert = styles.component({
        name: 'ov-tpl-slot',
        slots: ['root', 'icon'] as const,
        variants: { tone: variant.enum(['danger'], { default: 'danger' }) },
        styles: {
          base: { root: { display: 'flex' }, icon: { width: '16px' } },
          variants: {
            tone: {
              danger: { root: { color: 'red' }, icon: { opacity: 1 } },
            },
          },
        },
      });
      styles.override({
        recipe: alert,
        styles: {
          base: { root: { gap: '8px' } },
          variants: { tone: { danger: { icon: { scale: '1.2' } } } },
          compoundVariants: [
            {
              variants: { tone: 'danger' },
              style: { root: { outline: '1px solid red' } },
            },
          ],
        },
      });
      flushSync();
      css = getRegisteredCss();
      expect(css).toContain('.ov-tpl-slot {');
      expect(css).toContain('gap: 8px');
      expect(css).toContain('.ov-tpl-slot__icon--danger {');
      expect(css).toContain('scale: 1.2');
      expect(css).toContain('.ov-tpl-slot--danger {');
      expect(css).toContain('outline: 1px solid red');
    });

    it('expands utils on slot override leaves (not slot names as CSS keys)', () => {
      const styles = createStyles({
        utils: {
          marginX: (value: string | number) => ({ marginLeft: value, marginRight: value }),
        },
      });
      const alert = styles.component({
        name: 'ov-util-slot',
        slots: ['root', 'icon'] as const,
        variants: { tone: variant.enum(['danger'], { default: 'danger' }) },
        styles: {
          base: { root: { display: 'flex' }, icon: { width: '16px' } },
          variants: {
            tone: {
              danger: { root: { color: 'red' }, icon: { opacity: 1 } },
            },
          },
        },
      });

      styles.override({
        recipe: alert,
        styles: {
          base: { root: { marginX: 12 }, icon: { gap: '4px' } },
          variants: { tone: { danger: { icon: { marginX: 4 } } } },
          compoundVariants: [
            {
              variants: { tone: 'danger' },
              style: { root: { marginX: 8 } },
            },
          ],
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).not.toContain('root:');
      expect(css).not.toContain('icon:');
      expect(css).toContain('.ov-util-slot {');
      expect(css).toContain('margin-left: 12px');
      expect(css).toContain('margin-right: 12px');
      expect(css).toContain('.ov-util-slot__icon {');
      expect(css).toContain('gap: 4px');
      expect(css).toContain('.ov-util-slot__icon--tone-danger {');
      expect(css).toContain('margin-left: 4px');
      expect(css).toContain('.ov-util-slot--tone-danger {');
      expect(css).toContain('margin-left: 8px');
    });

    it('overrides multi-slot recipes per slot', () => {
      const styles = createStyles();
      const card = styles.component({
        name: 'ov-multi-emit',
        slots: ['root', 'title', 'body'] as const,
        styles: {
          base: { root: { display: 'grid' }, title: { fontWeight: 600 }, body: { color: 'gray' } },
        },
      });

      expect(getComponentMeta(card)?.kind).toBe('multi-slot');

      styles.override({
        recipe: card,
        styles: {
          base: {
            root: { gap: '12px' },
            title: { fontSize: '18px' },
          },
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.ov-multi-emit {');
      expect(css).toContain('gap: 12px');
      expect(css).toContain('.ov-multi-emit__title {');
      expect(css).toContain('font-size: 18px');
    });

    it('emits boolean attribute compounds and nested selectors', () => {
      const styles = createStyles({ mode: 'attribute' });
      const button = styles.component({
        name: 'ov-bool-attr',
        variants: {
          intent: variant.enum(['primary'], { default: 'primary' }),
          disabled: variant.boolean({ default: false }),
        },
        styles: {
          base: { display: 'inline-flex' },
          variants: {
            intent: { primary: { color: 'blue' } },
            disabled: { true: { opacity: 0.5 }, false: { opacity: 1 } },
          },
        },
      });

      styles.override({
        recipe: button,
        styles: {
          base: { '&:hover': { textDecoration: 'underline' } },
          variants: { disabled: { true: { cursor: 'not-allowed' } } },
          compoundVariants: [
            {
              variants: { intent: 'primary', disabled: true },
              style: { outline: 'none' },
            },
          ],
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.ov-bool-attr:hover {');
      expect(css).toContain('text-decoration: underline');
      expect(css).toContain('.ov-bool-attr[data-disabled] {');
      expect(css).toContain('cursor: not-allowed');
      expect(css).toContain('.ov-bool-attr[data-intent="primary"][data-disabled] {');
      expect(css).toContain('outline: none');
    });

    it('emits semantic boolean compounds and nested &:hover', () => {
      const styles = createStyles();
      const button = styles.component({
        name: 'ov-bool-sem',
        variants: {
          intent: variant.enum(['primary'], { default: 'primary' }),
          disabled: variant.boolean({ default: false }),
        },
        styles: {
          base: { display: 'inline-flex' },
          variants: {
            intent: { primary: { color: 'blue' } },
            disabled: { true: { opacity: 0.5 }, false: { opacity: 1 } },
          },
        },
      });

      styles.override({
        recipe: button,
        styles: {
          base: { '&:focus-visible': { outline: '2px solid blue' } },
          compoundVariants: [
            {
              variants: { intent: 'primary', disabled: true },
              style: { pointerEvents: 'none' },
            },
          ],
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.ov-bool-sem:focus-visible {');
      expect(css).toContain('outline: 2px solid blue');
      expect(css).toContain('.ov-bool-sem--intent-primary.ov-bool-sem--disabled-true {');
      expect(css).toContain('pointer-events: none');
    });
  });

  describe('dev warnings', () => {
    it('warns on missing meta, unknown keys, and unsupported mode', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const styles = createStyles();
      const button = styles.component({
        name: 'ov-warn-btn',
        variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
        styles: { base: { color: 'black' }, variants: { intent: { primary: { color: 'blue' } } } },
      });

      styles.override({
        recipe: button,
        styles: { variants: { nope: { primary: { color: 'red' } } } as never },
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown variant dimension "nope"'),
      );

      styles.override({ recipe: {} as typeof button, styles: { base: { color: 'red' } } });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('requires a recipe() return'));

      const hashed = createStyles({ mode: 'hashed' });
      const hashedBtn = hashed.component({
        name: 'ov-hashed-btn',
        styles: { base: { color: 'black' } },
      });
      hashed.override({ recipe: hashedBtn, styles: { base: { color: 'red' } } });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('does not support naming mode "hashed"'),
      );

      warn.mockRestore();
    });

    it('skips compound overrides with unknown selections instead of emitting partial selectors', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const styles = createStyles();
      const button = styles.component({
        name: 'ov-compound-warn',
        variants: {
          intent: variant.enum(['primary'], { default: 'primary' }),
          size: variant.enum(['lg'], { default: 'lg' }),
        },
        styles: {
          base: { display: 'flex' },
          variants: {
            intent: { primary: { color: 'blue' } },
            size: { lg: { fontSize: '16px' } },
          },
        },
      });

      styles.override({
        recipe: button,
        styles: {
          compoundVariants: [
            {
              // Intentional unknown option — runtime warn path (compile-time covered in override.type-tests.ts)
              variants: { intent: 'primary', size: 'xl' as 'lg' },
              style: { fontWeight: 700 },
            },
          ],
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).not.toContain('font-weight: 700');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown variant option "size.xl"'),
      );
      warn.mockRestore();
    });

    it('skips empty compound selections instead of emitting a bare attribute base selector', () => {
      const styles = createStyles({ mode: 'attribute' });
      const button = styles.component({
        name: 'ov-empty-compound',
        variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
        styles: { base: { display: 'flex' }, variants: { intent: { primary: { color: 'blue' } } } },
      });

      styles.override({
        recipe: button,
        styles: {
          compoundVariants: [
            {
              variants: {} as { intent: 'primary' },
              style: { outline: '2px solid red' },
            },
          ],
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).not.toContain('outline: 2px solid red');
      expect(css).not.toMatch(/\.ov-empty-compound \{[^}]*outline/);
    });

    it('defaults omitted layer to "overrides" when that layer exists', () => {
      const styles = createStyles({
        layers: ['components', 'overrides', 'utilities'] as const,
      });
      const button = styles.component({
        name: 'ov-default-layer',
        layer: 'components',
        styles: { base: { color: 'black' } },
      });
      styles.override({ recipe: button, styles: { base: { color: 'red' } } });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toMatch(/@layer overrides \{[\s\S]*\.ov-default-layer \{/);
      expect(css).toContain('color: red');
    });

    it('throws when layered without "overrides" and no explicit layer', () => {
      const styles = createStyles({
        layers: ['components', 'theme'] as const,
      });
      const button = styles.component({
        name: 'ov-require-layer',
        layer: 'components',
        styles: { base: { color: 'black' } },
      });
      expect(() => styles.override({ recipe: button, styles: { base: { color: 'red' } } })).toThrow(
        /requires `\{ layer:/,
      );
    });

    it('warns and skips base override when meta.base is empty', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const styles = createStyles();
      // The engine still builds flat recipes with an empty base class. The public
      // recipe object has no flat-key form, so this goes through createComponent.
      const card = createComponent(styles.classNaming, 'ov-nobase-flat', {
        elevated: { boxShadow: '0 1px 2px black' },
      });
      expect(getComponentMeta(card)?.kind === 'flat' && getComponentMeta(card)?.base).toBe('');

      styles.override({
        recipe: card,
        styles: { base: { color: 'red' }, elevated: { boxShadow: 'none' } },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).not.toMatch(/(^|\n)\. \{/);
      expect(css).not.toContain('color: red');
      expect(css).toContain('.ov-nobase-flat--elevated {');
      expect(css).toContain('box-shadow: none');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('meta.base is empty'));
      warn.mockRestore();
    });

    it('throws when layer is set without createStyles({ layers })', () => {
      const styles = createStyles();
      const button = styles.component({
        name: 'ov-throw-btn',
        styles: { base: { color: 'black' } },
      });
      expect(() =>
        styles.override({ recipe: button, layer: 'overrides', styles: { base: { color: 'red' } } }),
      ).toThrow(/requires `createStyles\(\{ layers:/);
    });
  });

  describe('vars overrides', () => {
    it('emits typed vars on the var host class for dimensioned recipes', () => {
      const styles = createStyles();
      const button = styles.component({
        name: 'ov-vars-btn',
        vars: {
          background: { value: 'blue', syntax: '<color>' as const },
          foreground: '#fff',
        },
        styles: ({ vars: v }) => ({
          base: {
            backgroundColor: v.background.var,
            color: v.foreground.var,
          },
        }),
      });

      styles.override({
        recipe: button,
        vars: { background: 'crimson', foreground: 'white' },
        styles: { base: { borderRadius: '999px' } },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.ov-vars-btn {');
      expect(css).toContain('--ov-vars-btn-background: crimson');
      expect(css).toContain('--ov-vars-btn-foreground: white');
      expect(css).toContain('border-radius: 999px');
    });

    it('emits vars on the root slot for slotted recipes', () => {
      const styles = createStyles();
      const sideNav = styles.component({
        name: 'ov-vars-nav',
        slots: ['root', 'heading'] as const,
        vars: {
          border: { value: '#ccc', syntax: '<color>' as const },
          headingColor: '#111',
        },
        styles: ({ vars: v }) => ({
          base: {
            root: { borderColor: v.border.var },
            heading: { color: v.headingColor.var },
          },
        }),
      });

      styles.override({
        recipe: sideNav,
        vars: { border: 'transparent', headingColor: 'var(--brand-heading)' },
        styles: { base: { root: { margin: '8px' } } },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('.ov-vars-nav {');
      expect(css).toContain('--ov-vars-nav-border: transparent');
      expect(css).toContain('--ov-vars-nav-headingcolor: var(--brand-heading)');
      expect(css).toContain('margin: 8px');
    });

    it('supports nested vars paths and dotted keys', () => {
      const styles = createStyles();
      const layout = styles.component({
        name: 'ov-vars-layout',
        vars: {
          padding: { outer: { x: '8px', y: '8px' } },
        },
        styles: ({ vars: v }) => ({
          base: { paddingInline: v.padding.outer.x.var, paddingBlock: v.padding.outer.y.var },
        }),
      });

      styles.override({
        recipe: layout,
        vars: {
          padding: { outer: { x: '24px', y: '16px' } },
        },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('--ov-vars-layout-padding-outer-x: 24px');
      expect(css).toContain('--ov-vars-layout-padding-outer-y: 16px');
    });

    it('lets base override the same custom property when both set vars', () => {
      const styles = createStyles();
      const chip = styles.component({
        name: 'ov-vars-collision',
        vars: { border: '#ccc' },
        styles: ({ vars: v }) => ({ base: { borderColor: v.border.var } }),
      });

      styles.override({
        recipe: chip,
        vars: { border: 'transparent' },
        styles: { base: { '--ov-vars-collision-border': 'red' } },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('--ov-vars-collision-border: red');
      expect(css).toContain('--ov-vars-collision-border: transparent');
      expect(css.lastIndexOf('--ov-vars-collision-border: red')).toBeGreaterThan(
        css.lastIndexOf('--ov-vars-collision-border: transparent'),
      );
    });

    it('respects selectorPrefix and default overrides layer', () => {
      const styles = createStyles({
        layers: ['components', 'overrides'] as const,
      });
      const button = styles.component({
        name: 'ov-vars-layer',
        layer: 'components',
        vars: { accent: 'blue' },
        styles: ({ vars: v }) => ({ base: { color: v.accent.var } }),
      });

      styles.override({ recipe: button, selectorPrefix: '.theme-acme', vars: { accent: 'green' } });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('@layer overrides');
      expect(css).toContain('.theme-acme .ov-vars-layer {');
      expect(css).toContain('--ov-vars-layer-accent: green');
    });

    it('compiles mode-aware var overrides to light-dark() when colorModes is configured', () => {
      const styles = createStyles({ colorModes });
      const chip = styles.component({
        name: 'ov-vars-mode',
        vars: { border: { value: '#ccc', syntax: '<color>' as const } },
        styles: ({ vars: v }) => ({ base: { borderColor: v.border.var } }),
      });

      styles.override({ recipe: chip, vars: { border: { light: '#fff', dark: '#111' } } });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('--ov-vars-mode-border: light-dark(#fff, #111)');
    });

    it('emits prefers-dark override for incompatible mode-aware var values', () => {
      const styles = createStyles({ colorModes });
      const card = styles.component({
        name: 'ov-vars-mode-shadow',
        vars: { glow: '0 0 0 3px blue' },
        styles: ({ vars: v }) => ({ base: { boxShadow: v.glow.var } }),
      });

      styles.override({
        recipe: card,
        vars: { glow: { light: '0 0 0 3px blue', dark: '0 0 16px navy' } },
      });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('--ov-vars-mode-shadow-glow: 0 0 0 3px blue');
      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('--ov-vars-mode-shadow-glow: 0 0 16px navy');
    });

    it('warns when vars is set on a component with no registry', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const styles = createStyles();
      const plain = styles.component({ name: 'ov-no-vars', styles: { base: { color: 'black' } } });

      styles.override({ recipe: plain, vars: { border: 'red' } });
      flushSync();

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no registered internal vars'));
      warn.mockRestore();
    });

    it('attaches varRegistry to component meta from c.vars()', () => {
      const styles = createStyles();
      const nav = styles.component({
        name: 'ov-meta-vars',
        slots: ['root'] as const,
        vars: { border: '#ccc' },
        styles: () => ({ base: { root: { display: 'flex' } } }),
      });

      const meta = getComponentMeta(nav);
      expect(meta?.varRegistry?.hostSlot).toBe('root');
      expect(meta?.varRegistry?.byPath.has('border')).toBe(true);
      expect(meta?.varRegistry?.byPath.get('border')?.name).toBe('--ov-meta-vars-border');
    });

    it('resolves c.var() paths with the authoring id (not sanitized registry key)', () => {
      const styles = createStyles();
      const chip = styles.component({
        name: 'ov-var-path',
        vars: { headingColor: { value: '#111', syntax: '<color>' as const } },
        styles: ({ vars: v }) => ({ base: { color: v.headingColor.var } }),
      });

      styles.override({ recipe: chip, vars: { headingColor: '#222' } });
      flushSync();

      expect(getRegisteredCss()).toContain('--ov-var-path-headingcolor: #222');
    });

    it('overrides split surface-light / surface-dark vars instead of a color-mode pair', () => {
      const styles = createStyles();
      const card = styles.component({
        name: 'ov-split-surface',
        vars: {
          surface: { light: '#fff', dark: '#111' },
        },
        styles: ({ vars: v }) => ({
          base: {
            backgroundColor: v.surface.light.var,
            color: v.surface.dark.var,
          },
        }),
      });

      styles.override({ recipe: card, vars: { surface: { light: '#eee', dark: '#222' } } });
      flushSync();

      const css = getRegisteredCss();
      expect(css).toContain('--ov-split-surface-surface-light: #eee');
      expect(css).toContain('--ov-split-surface-surface-dark: #222');
    });
  });

  describe('typing', () => {
    it('documents that compile-time checks live in override.type-tests.ts', () => {
      // Runtime smoke: valid calls still work. Negative cases are enforced by
      // `pnpm typecheck` via src/override.type-tests.ts (@ts-expect-error).
      const styles = createStyles();
      const button = styles.component({
        name: 'ov-types-btn',
        variants: { intent: variant.enum(['primary', 'ghost'], { default: 'primary' }) },
        styles: {
          base: { color: 'black' },
          variants: {
            intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } },
          },
        },
      });

      styles.override({
        recipe: button,
        styles: {
          base: { color: 'red' },
          variants: { intent: { primary: { textTransform: 'uppercase' } } },
          compoundVariants: [
            {
              variants: { intent: 'ghost' },
              style: { fontWeight: 700 },
            },
          ],
        },
      });
      expect(button.base).toBe('ov-types-btn');
    });
  });

  describe('style callbacks', () => {
    it('rejects a styles callback on createStyles().override', () => {
      const styles = createStyles();
      const button = styles.component({
        name: 'ov-cb-raw',
        styles: { base: { color: 'black' } },
      });
      expect(() =>
        styles.override({
          recipe: button,
          styles: () => ({ base: { color: 'red' } }),
        }),
      ).toThrow(/createTypeStyles/);
    });

    it('resolves tokens inside a createTypeStyles override callback', () => {
      const { recipe, tokens, override } = createTypeStyles({ scopeId: 'ov-tok' });
      tokens.create('color', { border: { default: 'red' } });
      const button = recipe({
        name: 'ov-tok-btn',
        styles: { base: { color: 'black' } },
      });

      override({
        recipe: button,
        styles: ({ tokens: themeTokens }) => ({
          base: { borderColor: themeTokens.color.border.default },
        }),
      });
      flushSync();

      expect(getRegisteredCss()).toContain('border-color: var(--ov-tok-color-border-default)');
    });
  });
});
