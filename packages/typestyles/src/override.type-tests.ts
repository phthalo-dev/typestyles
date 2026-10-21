/**
 * Compile-time assertions for `override({ recipe, styles })`.
 * Failures here fail `pnpm typecheck`.
 */
import { createStyles } from './styles';
import { conditional } from './override';
import { when } from './theme';
import { variant } from './variant';
import type { OverrideConfigFor } from './override';
import type { VariantOptionStyle } from './types';

const styles = createStyles();

const button = styles.component({
  name: 'ov-type-btn',
  variants: {
    intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
    size: variant.enum(['sm', 'lg'], { default: 'sm' }),
    disabled: variant.boolean({ default: false }),
  },
  styles: {
    base: { color: 'black' },
    variants: {
      intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } },
      size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } },
      disabled: { true: { opacity: 0.5 }, false: { opacity: 1 } },
    },
  },
});

styles.override({
  recipe: button,
  styles: {
    base: { color: 'red' },
    variants: { intent: { primary: { textTransform: 'uppercase' } } },
    compoundVariants: [
      { variants: { intent: 'primary', size: 'lg' }, style: { letterSpacing: '0.05em' } },
      { variants: { intent: ['primary', 'ghost'], size: 'sm' }, style: { fontWeight: 700 } },
      { variants: { disabled: true, intent: 'primary' }, style: { outline: 'none' } },
    ],
  },
});

styles.override({
  recipe: button,
  styles: {
    // @ts-expect-error — unknown variant dimension
    variants: { missing: { primary: { color: 'red' } } },
  },
});

styles.override({
  recipe: button,
  styles: {
    variants: {
      // @ts-expect-error — unknown variant option
      intent: { xl: { color: 'red' } },
    },
  },
});

const layered = createStyles({
  layers: ['components', 'overrides'] as const,
});
const layeredBtn = layered.component({
  name: 'ov-type-layer',
  layer: 'components',
  variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
  styles: {
    base: { color: 'black' },
    variants: { intent: { primary: { color: 'blue' } } },
  },
});
layered.override({ recipe: layeredBtn, layer: 'overrides', styles: { base: { color: 'red' } } });
layered.override({ recipe: layeredBtn, styles: { base: { color: 'red' } } });
layered.override({
  recipe: layeredBtn,
  // @ts-expect-error — layer not on this instance's stack
  layer: 'not-a-real-layer',
  styles: { base: { color: 'red' } },
});

const alert = styles.component({
  name: 'ov-type-slot',
  slots: ['root', 'icon'],
  variants: { tone: variant.enum(['danger', 'info'], { default: 'info' }) },
  styles: {
    base: { root: { display: 'flex' }, icon: { width: '16px' } },
    variants: {
      tone: {
        danger: { root: { color: 'red' }, icon: { opacity: 1 } },
        info: { root: { color: 'blue' }, icon: { opacity: 1 } },
      },
    },
  },
});

styles.override({
  recipe: alert,
  styles: {
    base: { root: { gap: '8px' } },
    compoundVariants: [
      { variants: { tone: 'danger' }, style: { root: { outline: '1px solid red' } } },
    ],
  },
});

styles.override({
  recipe: alert,
  styles: {
    compoundVariants: [
      {
        // @ts-expect-error — unknown compound option
        variants: { tone: 'warning' },
        style: { root: { outline: '1px solid orange' } },
      },
    ],
  },
});

const multi = styles.component({
  name: 'ov-type-multi',
  slots: ['root', 'title'],
  styles: { base: { root: { display: 'grid' }, title: { fontWeight: 600 } } },
});

styles.override({
  recipe: multi,
  styles: { base: { root: { gap: '4px' }, title: { fontSize: '14px' } } },
});
styles.override({
  recipe: multi,
  styles: {
    base: { root: { gap: '4px' } },
    // @ts-expect-error — a recipe with no axes has no variants
    variants: { tone: { danger: { root: { color: 'red' } } } },
  },
});

const condBtn = styles.component({
  name: 'ov-type-cond-btn',
  variants: { intent: variant.enum(['primary', 'ghost'], { default: 'primary' }) },
  styles: {
    base: { color: 'black' },
    variants: { intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } } },
  },
});

styles.override({
  recipe: condBtn,
  styles: {
    base: {
      color: 'red',
      conditions: [conditional(when.prefersDark, { color: 'white' })],
    },
    variants: {
      intent: {
        primary: {
          conditions: [conditional(when.prefersDark, { color: 'lightblue' }, 'primary-dark')],
        },
      },
    },
  },
});

styles.override({
  recipe: condBtn,
  styles: {
    base: {
      // @ts-expect-error — conditions entry missing required `when`
      conditions: [{ style: { color: 'red' } }],
    },
  },
});

styles.override({
  recipe: button,
  styles: ({ vars, tokens }) => ({
    base: { color: vars && tokens.color.border.default.var },
  }),
});

const modeOk: VariantOptionStyle = { color: { light: '#111', dark: '#eee' } };
void modeOk;
// @ts-expect-error — mode object missing required `dark` key
const modeMissingDark: VariantOptionStyle = { color: { light: '#111' } };
void modeMissingDark;

styles.override({
  recipe: button,
  styles: {
    base: { color: { light: '#111', dark: '#eee' } },
    variants: { intent: { primary: { backgroundColor: { light: '#fff', dark: '#000' } } } },
  },
});

const sideNavVarDefinitions = {
  border: { value: '1px solid #ccc', syntax: '<color>' as const },
  headingColor: { value: '#111', syntax: '<color>' as const },
} as const;

const sideNav = styles.component({
  name: 'ov-type-vars-nav',
  slots: ['root'],
  vars: sideNavVarDefinitions,
  styles: ({ vars }) => ({
    base: { root: { borderColor: vars.border.var, color: vars.headingColor.var } },
  }),
});

styles.override({
  recipe: sideNav,
  vars: { border: 'transparent', headingColor: 'var(--brand-heading)' },
  styles: { base: { root: { margin: '8px' } } },
});
styles.override({
  recipe: sideNav,
  vars: {
    // @ts-expect-error — unknown var key
    missing: 'x',
  },
});

const layoutRecipe = styles.component({
  name: 'ov-type-vars-layout',
  vars: { padding: { outer: { x: '8px', y: '8px' } } },
  styles: ({ vars }) => ({
    base: {
      paddingInline: vars.padding.outer.x.var,
      paddingBlock: vars.padding.outer.y.var,
    },
  }),
});

void layoutRecipe;
const layoutVarsOk: OverrideConfigFor<typeof layoutRecipe> = {
  vars: { padding: { outer: { x: '24px' } } },
};
void layoutVarsOk;

styles.override({
  recipe: button,
  styles: { base: { color: 'red' } },
  // @ts-expect-error — component declared no vars
  vars: { background: 'crimson' },
});

const widenedLeaf = { flexWrap: 'wrap' as const, columnGap: '8px' as string };
const widenedOk: VariantOptionStyle = widenedLeaf;
void widenedOk;
