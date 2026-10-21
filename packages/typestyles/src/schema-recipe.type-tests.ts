/**
 * Compile-time assertions for the object `recipe()` call (Issue #275).
 *
 * Failures here fail `pnpm typecheck`. Slots, axes, and vars are inferred from
 * those fields. `styles` is checked against them.
 */
import { createStyles } from './styles';
import { createTypeStyles } from './create-type-styles';
import { variant } from './variant';
import type { RecipeDefaultsOf, RecipeVariants } from './schema-recipe';
import type { VariantOptions } from './variant';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

const attribute = createStyles({ mode: 'attribute' });
const attributeLayered = createStyles({ mode: 'attribute', layers: ['components'] as const });
const surfaceAppearance = variant.enum(['subtle', 'solid', 'outline'], { default: 'subtle' });

const alert = attributeLayered.component({
  name: 'alert',
  layer: 'components',
  slots: ['root', 'icon', 'body', 'title', 'content', 'action'],
  variants: {
    tone: variant.enum(['info', 'success', 'warning', 'danger', 'tip'], { default: 'info' }),
    appearance: surfaceAppearance,
    contentGap: variant.enum(['spaced', 'flush'], { default: 'spaced' }),
    elevated: variant.boolean({ default: false }),
  },
  vars: { surface: '#fff' },
  styles: ({ vars }) => ({
    base: { root: { display: 'flex' } },
    variants: {
      tone: {
        info: { root: { color: vars.surface.var } },
        success: { root: {} },
        warning: { root: {} },
        danger: { root: {} },
        tip: { root: {} },
      },
      appearance: {
        subtle: { root: {} },
        solid: { root: {}, title: { color: 'inherit' } },
        outline: { root: {} },
      },
      contentGap: {
        spaced: { content: { marginTop: '4px' } },
        flush: { content: { marginTop: 0 } },
      },
      elevated: {
        true: { root: { boxShadow: 'var(--shadow-md)' } },
        false: {},
      },
    },
  }),
});
void alert;

// @ts-expect-error — option "b" is missing from the style map
const _missingOption = attribute.component({
  name: 'missing-option',
  slots: ['root'],
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({
    variants: { tone: { a: {} } },
  }),
});
void _missingOption;

// @ts-expect-error — "nope" is not a declared slot
const _wrongSlot = attribute.component({
  name: 'wrong-slot',
  slots: ['root'],
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({
    variants: {
      tone: {
        a: { nope: {} },
        b: {},
      },
    },
  }),
});
void _wrongSlot;

// @ts-expect-error — "nope" is not a declared axis
const _unknownAxis = attribute.component({
  name: 'unknown-axis',
  slots: ['root'],
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({
    variants: {
      tone: { a: {}, b: {} },
      nope: { a: {}, b: {} },
    },
  }),
});
void _unknownAxis;

// @ts-expect-error — "extra" is not a declared option
const _unknownOption = attribute.component({
  name: 'unknown-option',
  slots: ['root'],
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({
    variants: {
      tone: { a: {}, b: {}, extra: {} },
    },
  }),
});
void _unknownOption;

const fromAlert = alert({ tone: 'tip', appearance: 'solid' });
void fromAlert.root.props;
void fromAlert.content.attrs;
// @ts-expect-error — unknown option
alert({ tone: 'nope' });
// @ts-expect-error — unknown axis
alert({ material: 'glass' });

type AlertDefaults = RecipeDefaultsOf<typeof alert>;
const _defaultTone: Expect<Equal<AlertDefaults['tone'], 'info'>> = true;
const _defaultElevated: Expect<Equal<AlertDefaults['elevated'], false>> = true;
void _defaultTone;
void _defaultElevated;
void alert.defaults;
void alert.vars.surface.var;

type AlertVariants = RecipeVariants<typeof alert>;
const _elevatedIsBoolean: Expect<Equal<NonNullable<AlertVariants['elevated']>, boolean>> = true;
const _toneUnion: Expect<
  Equal<NonNullable<AlertVariants['tone']>, 'info' | 'success' | 'warning' | 'danger' | 'tip'>
> = true;
void _elevatedIsBoolean;
void _toneUnion;

const _alertPropsShape: {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'tip';
  appearance?: 'subtle' | 'solid' | 'outline';
  contentGap?: 'spaced' | 'flush';
  elevated?: boolean;
} = {} as AlertVariants;
const _alertPropsBack: AlertVariants = {} as {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'tip';
  appearance?: 'subtle' | 'solid' | 'outline';
  contentGap?: 'spaced' | 'flush';
  elevated?: boolean;
};
void _alertPropsShape;
void _alertPropsBack;
// @ts-expect-error — `null` is not a valid axis prop value
const _noNullTone: AlertVariants = { tone: null };
void _noNullTone;

const controlSize = variant.enum(['sm', 'md', 'lg'], { default: 'md' });
const button = attribute.component({
  name: 'button',
  variants: { size: controlSize, elevated: variant.boolean({ default: false }) },
  styles: {
    base: { padding: '8px' },
    variants: {
      size: { sm: { padding: '4px' }, md: { padding: '8px' }, lg: { padding: '12px' } },
      elevated: { true: { boxShadow: 'var(--shadow-md)' }, false: {} },
    },
  },
});
void button({ size: 'sm', elevated: true });
// @ts-expect-error — "ghost" is not a size
button({ size: 'ghost' });

const _sizeOptions: Expect<Equal<VariantOptions<typeof controlSize>, 'sm' | 'md' | 'lg'>> = true;
const _appearanceOptions: Expect<
  Equal<VariantOptions<typeof surfaceAppearance>, 'subtle' | 'solid' | 'outline'>
> = true;
void _sizeOptions;
void _appearanceOptions;

const buttonResult = button({ size: 'lg' });
void buttonResult.className;
void buttonResult.attrs;
void buttonResult.props;
// @ts-expect-error — no slots on a single-target recipe
void buttonResult.root;

const compound = attribute.component({
  name: 'compound',
  variants: {
    tone: variant.enum(['info', 'danger'], { default: 'info' }),
    size: variant.enum(['sm', 'lg'], { default: 'sm' }),
    elevated: variant.boolean({ default: false }),
  },
  styles: {
    variants: {
      tone: { info: {}, danger: {} },
      size: { sm: {}, lg: {} },
      elevated: { true: {}, false: {} },
    },
    compoundVariants: [
      { variants: { tone: ['info', 'danger'], size: 'lg' }, style: { fontWeight: 700 } },
      { variants: { elevated: true }, style: { boxShadow: 'none' } },
    ],
  },
});
void compound;

// @ts-expect-error — 'nope' is not one of the schema's options
const _badCompound = attribute.component({
  name: 'compound-bad',
  variants: { tone: variant.enum(['info', 'danger'], { default: 'info' }) },
  styles: {
    variants: { tone: { info: {}, danger: {} } },
    compoundVariants: [{ variants: { tone: 'nope' }, style: {} }],
  },
});
void _badCompound;

const ts = createTypeStyles({
  scopeId: 'app',
  mode: 'attribute',
  layers: { order: ['tokens', 'components'] as const, token: 'tokens', style: 'components' },
});

const tsAlert = ts.recipe({
  name: 'ts-alert',
  slots: ['root', 'body'],
  variants: { tone: surfaceAppearance },
  styles: {
    variants: {
      tone: { subtle: { root: {} }, solid: { root: {} }, outline: { root: {} } },
    },
  },
});
void tsAlert({ tone: 'subtle' }).root.props;

const tsBadge = ts.recipe({
  name: 'ts-badge',
  variants: { tone: surfaceAppearance },
  styles: { variants: { tone: { subtle: {}, solid: {}, outline: {} } } },
});
void tsBadge({ tone: 'solid' }).attrs;

const utilApi = attribute.withUtils({ pad: (n: number) => ({ padding: n }) });
const utilRecipe = utilApi.component({
  name: 'util-recipe',
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: { variants: { tone: { a: {}, b: {} } } },
});
void utilRecipe({ tone: 'a' }).attrs;
