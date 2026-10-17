/**
 * Compile-time assertions for schema-first recipes (Issue #259).
 *
 * Failures here fail `pnpm typecheck`. Each block maps to an acceptance item on the
 * issue: contextual style map, callable props, boolean axes, shared axes, `.defaults`,
 * and interop with the legacy config shapes.
 */
import { createStyles } from './styles';
import { createTypeStyles } from './create-type-styles';
import { variant } from './variant';
import type { RecipeDefaultsOf, RecipeVariants } from './schema-recipe';
import type { VariantOptions } from './variant';

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

const attribute = createStyles({ mode: 'attribute' });
const attributeLayered = createStyles({ mode: 'attribute', layers: ['components'] as const });

// Shared axes — the whole point: one definition, many recipes.
const surfaceAppearance = variant.enum(['subtle', 'solid', 'outline'], { default: 'subtle' });

// Acceptance 1: slot recipe, c.vars(), { layer }, no type argument, no `satisfies`.
const alert = attributeLayered.component(
  'alert',
  {
    slots: ['root', 'icon', 'body', 'title', 'content', 'action'] as const,
    variants: {
      tone: variant.enum(['info', 'success', 'warning', 'danger', 'tip'], { default: 'info' }),
      appearance: surfaceAppearance,
      contentGap: variant.enum(['spaced', 'flush'], { default: 'spaced' }),
      elevated: variant.boolean({ default: false }),
    },
  },
  (c) => {
    const v = c.vars({ surface: '#fff' });
    return {
      vars: v,
      base: { root: { display: 'flex' } },
      variants: {
        tone: {
          info: { root: { color: v.surface.var } },
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
    };
  },
  { layer: 'components' },
);

void alert;

// Acceptance 1: missing an option is an error inside the callback.
const def = {
  slots: ['root'] as const,
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
};
const _missingOption = attribute.component('missing-option', def, () => ({
  // @ts-expect-error — option "b" is missing from the style map
  variants: { tone: { a: {} } },
}));
void _missingOption;

// Acceptance 1: a slot style on an unknown slot is an error.
const _wrongSlot = attribute.component('wrong-slot', def, () => ({
  // @ts-expect-error — "nope" is not a declared slot
  variants: { tone: { a: { nope: {} }, b: {} } },
}));
void _wrongSlot;

// Acceptance 2: the callable accepts schema options and rejects unknown ones; props optional.
const fromAlert = alert({ tone: 'tip', appearance: 'solid' });
void fromAlert.root.props;
void fromAlert.content.attrs;
// @ts-expect-error — unknown option
alert({ tone: 'nope' });
// @ts-expect-error — unknown axis
alert({ material: 'glass' });

// Acceptance 2: `.defaults` matches the axis defaults.
type AlertDefaults = RecipeDefaultsOf<typeof alert>;
const _defaultTone: Expect<Equal<AlertDefaults['tone'], 'info'>> = true;
const _defaultElevated: Expect<Equal<AlertDefaults['elevated'], false>> = true;
void _defaultTone;
void _defaultElevated;
void alert.defaults;

// Acceptance 3: boolean axis is `boolean` on the callable and on RecipeVariants.
type AlertVariants = RecipeVariants<typeof alert>;
const _elevatedIsBoolean: Expect<Equal<NonNullable<AlertVariants['elevated']>, boolean>> = true;
const _toneUnion: Expect<
  Equal<NonNullable<AlertVariants['tone']>, 'info' | 'success' | 'warning' | 'danger' | 'tip'>
> = true;
void _elevatedIsBoolean;
void _toneUnion;

// Acceptance 4: a shared enum axis is reusable, and VariantOptions is its union.
const controlSize = variant.enum(['sm', 'md', 'lg'], { default: 'md' });

const button = attribute.component(
  'button',
  { variants: { size: controlSize, elevated: variant.boolean({ default: false }) } },
  () => ({
    base: { padding: '8px' },
    variants: {
      size: { sm: { padding: '4px' }, md: { padding: '8px' }, lg: { padding: '12px' } },
      elevated: { true: { boxShadow: 'var(--shadow-md)' }, false: {} },
    },
  }),
);
void button({ size: 'sm', elevated: true });

const _sizeOptions: Expect<Equal<VariantOptions<typeof controlSize>, 'sm' | 'md' | 'lg'>> = true;
const _appearanceOptions: Expect<
  Equal<VariantOptions<typeof surfaceAppearance>, 'subtle' | 'solid' | 'outline'>
> = true;
void _sizeOptions;
void _appearanceOptions;

// Single-target (no slots) returns a single attrs result, not a slot map.
const buttonResult = button({ size: 'lg' });
void buttonResult.className;
// @ts-expect-error — no slots on a single-target recipe
void buttonResult.root;

// Acceptance 6: legacy config shapes still compile (see component-overload.type-tests.ts).
const legacy = attribute.component('legacy', {
  base: { padding: '8px' },
  variants: { size: { sm: { fontSize: '12px' } } },
  defaultVariants: { size: 'sm' },
});
void legacy({ size: 'sm' });

// compoundVariants are checked against the schema's option unions.
const compound = attribute.component(
  'compound',
  {
    variants: {
      tone: variant.enum(['info', 'danger'], { default: 'info' }),
      size: variant.enum(['sm', 'lg'], { default: 'sm' }),
      elevated: variant.boolean({ default: false }),
    },
  },
  () => ({
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
void compound;

// 'nope' is not one of the schema's options.
const _badCompound = attribute.component(
  'compound-bad',
  { variants: { tone: variant.enum(['info', 'danger'], { default: 'info' }) } },
  () => ({
    variants: { tone: { info: {}, danger: {} } },
    // @ts-expect-error — 'nope' is not one of the schema's options
    compoundVariants: [{ variants: { tone: 'nope' }, style: {} }],
  }),
);
void _badCompound;

// ---------------------------------------------------------------------------
// createTypeStyles public surface
// ---------------------------------------------------------------------------
const ts = createTypeStyles({
  scopeId: 'app',
  mode: 'attribute',
  layers: { order: ['tokens', 'components'] as const, token: 'tokens', style: 'components' },
});

const tsAlert = ts.recipe(
  'ts-alert',
  { slots: ['root', 'body'] as const, variants: { tone: surfaceAppearance } },
  () => ({
    variants: {
      tone: { subtle: { root: {} }, solid: { root: {} }, outline: { root: {} } },
    },
  }),
);
void tsAlert({ tone: 'subtle' }).root.props;

// Bare call works — the factory `layers.style` default applies.
const tsBadge = ts.recipe('ts-badge', { variants: { tone: surfaceAppearance } }, () => ({
  variants: { tone: { subtle: {}, solid: {}, outline: {} } },
}));
void tsBadge({ tone: 'solid' }).attrs;
