/**
 * Compile-only: `withTokenRefs` types `ctx.tokens` in theme `components` factories.
 */
import { createTypeStyles } from './create-type-styles';
import { variant } from './variant';
import type { CreateTokenValues, Theme } from './types';

const base = createTypeStyles({ scopeId: 'reg', colorModes: ['light', 'dark'] });
const designTokens = base.tokens.declare({
  space: { sm: true, md: true },
  color: { text: true },
});
const ts = base.withTokenRefs(designTokens);

ts.tokens.createTheme({
  name: 'typed',
  tokens: { app: { glow: '#0f0' } },
  components: {
    button: {
      styles: ({ tokens: t }) => ({
        base: {
          // built-in refs from `withTokenRefs`
          margin: t.space.md.var,
          color: t.color.text.var,
          // the theme's own namespace
          outlineColor: t.app.glow.var,
          // @ts-expect-error — `spacing` is neither built in nor declared by this theme
          padding: t.spacing.md.var,
        },
      }),
    },
  },
});

// Without `withTokenRefs`, ctx.tokens stays the loose bag (any namespace allowed).
base.tokens.createTheme({
  name: 'loose',
  components: {
    button: { styles: ({ tokens: t }) => ({ base: { margin: t.anything.goes.var } }) },
  },
});

// Same runtime instance.
const _same: typeof base.recipe = ts.recipe;
void _same;

// --- Theme.override({ components }) ---

const parent = ts.tokens.createTheme({
  name: 'parent',
  tokens: { app: { glow: '#0f0' } },
});

parent.override({
  name: 'child',
  // new namespace for this child, visible to its own factories
  extend: { brand: { accent: '#f0f' } },
  components: {
    button: {
      styles: ({ tokens: t }) => ({
        base: {
          margin: t.space.md.var,
          outlineColor: t.app.glow.var,
          color: t.brand.accent.var,
          // @ts-expect-error — `spacing` is not built in, on the parent, or in `extend`
          padding: t.spacing.md.var,
        },
      }),
    },
  },
});

// The child keeps the instance's refs, so a grandchild still sees them.
parent.override({ name: 'child2', extend: { brand: { accent: '#f0f' } } }).override({
  name: 'grandchild',
  components: {
    button: {
      styles: ({ tokens: t }) => ({
        base: { color: t.brand.accent.var, margin: t.space.sm.var },
      }),
    },
  },
});

// Without `withTokenRefs`, a child's factory stays the loose bag.
base.tokens.createTheme({ name: 'loose-parent', tokens: { app: { glow: '#0f0' } } }).override({
  name: 'loose-child',
  components: {
    button: { styles: ({ tokens: t }) => ({ base: { margin: t.anything.goes.var } }) },
  },
});

// --- override({ styles }) ---

const widgetDef = {
  name: 'widget',
  variants: { size: variant.enum(['sm', 'lg'], { default: 'sm' }) },
  styles: {
    base: { color: 'red' },
    variants: { size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } } },
  },
} as const;
const widget = ts.recipe(widgetDef);

ts.override({
  recipe: widget,
  styles: ({ tokens: t }) => ({
    base: {
      margin: t.space.md.var,
      color: t.color.text.var,
      // @ts-expect-error — `spacing` is not a declared namespace
      padding: t.spacing.md.var,
    },
  }),
});

// Without `withTokenRefs`, `override({ styles })` ctx.tokens stays loose.
const looseWidget = base.recipe({ ...widgetDef, name: 'loose-widget' });
base.override({
  recipe: looseWidget,
  styles: ({ tokens: t }) => ({ base: { margin: t.anything.goes.var } }),
});

// A theme carrying built-in refs stays assignable to `Theme<any>` (what generic code accepts).
const _anyTheme: Theme<any> = parent; // oxlint-disable-line @typescript-eslint/no-explicit-any
void _anyTheme;

// --- extend overlapping an existing namespace (deep merge, extend wins) ---

const spaced = ts.tokens.createTheme({
  name: 'spaced',
  tokens: { space: { md: '1rem', lg: '2rem' } },
});

const widened = spaced.override({
  name: 'spaced-wide',
  // same leaf with a different literal, plus a new leaf in the same namespace
  extend: { space: { lg: '3rem', xl: '4rem' } },
  components: {
    button: {
      styles: ({ tokens: t }) => ({
        base: { gap: t.space.md.var, margin: t.space.lg.var, padding: t.space.xl.var },
      }),
    },
  },
});

// The merged theme keeps every leaf, including the one both sides defined.
const _lg: string = widened.tokens.space.lg.var;
const _md: string = widened.tokens.space.md.var;
const _xl: string = widened.tokens.space.xl.var;
void [_lg, _md, _xl];

// A wide (non-literal) `extend` has no keys to merge, so the parent's known tokens stay readable.
declare const wideExtend: Record<string, CreateTokenValues>;
const wideChild = spaced.override({ name: 'spaced-wide-index', extend: wideExtend });
const _wideMd: string = wideChild.tokens.space.md.var;
void _wideMd;
