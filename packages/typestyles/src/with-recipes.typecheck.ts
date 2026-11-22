/**
 * Compile-only: `withRecipes` types theme `components` per recipe (slots, axes, vars, tokens).
 */
import { createTypeStyles } from './create-type-styles';
import { variant } from './variant';

const base = createTypeStyles({ scopeId: 'wr' });
const designTokens = base.tokens.declare({ space: { sm: true, md: true } });

const button = base.recipe({
  name: 'button',
  variants: {
    intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
    size: variant.enum(['sm', 'lg'], { default: 'sm' }),
  },
  styles: {
    base: { color: 'black' },
    variants: {
      intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } },
      size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } },
    },
  },
});

const card = base.recipe({
  name: 'card',
  slots: ['root', 'header'] as const,
  variants: { tone: variant.enum(['plain', 'accent'], { default: 'plain' }) },
  styles: {
    base: { root: { padding: '8px' }, header: { fontWeight: 600 } },
    variants: {
      tone: {
        plain: { root: {}, header: {} },
        accent: { root: { background: 'red' }, header: {} },
      },
    },
  },
});

const ts = base.withTokenRefs(designTokens).withRecipes({ button, card });

ts.tokens.createTheme({
  name: 'themed',
  tokens: { app: { glow: '#0f0' } },
  components: {
    button: {
      styles: {
        base: { color: 'red' },
        variants: { intent: { primary: { textTransform: 'uppercase' } } },
        compoundVariants: [
          { variants: { intent: 'primary', size: 'lg' }, style: { letterSpacing: '0.05em' } },
        ],
      },
    },
    card: {
      styles: ({ tokens: t }) => ({
        base: {
          // slots are checked
          header: { margin: t.space.md.var, outlineColor: t.app.glow.var },
        },
      }),
    },
  },
});

ts.tokens.createTheme({
  name: 'bad-axis',
  components: {
    button: {
      styles: {
        // @ts-expect-error — `shape` is not an axis of `button`
        variants: { shape: { round: { borderRadius: '9px' } } },
      },
    },
  },
});

ts.tokens.createTheme({
  name: 'bad-option',
  components: {
    button: {
      styles: {
        // @ts-expect-error — `huge` is not an option of `size`
        variants: { size: { huge: { fontSize: '99px' } } },
      },
    },
  },
});

ts.tokens.createTheme({
  name: 'bad-slot',
  components: {
    card: {
      styles: {
        base: {
          // @ts-expect-error — `footer` is not a slot of `card`
          footer: { color: 'red' },
        },
      },
    },
  },
});

ts.tokens.createTheme({
  name: 'bad-namespace',
  components: {
    // @ts-expect-error — `buton` is not a registered recipe
    buton: { styles: { base: { color: 'red' } } },
  },
});

ts.tokens.createTheme({
  name: 'bad-token',
  components: {
    card: {
      styles: ({ tokens: t }) => ({
        base: {
          // @ts-expect-error — `spacing` is neither built in nor declared by this theme
          header: { margin: t.spacing.md.var },
        },
      }),
    },
  },
});

// Theme.override gets the same per-recipe typing, with the child's `extend` visible to factories.
const parent = ts.tokens.createTheme({ name: 'p', tokens: { app: { glow: '#0f0' } } });

parent.override({
  name: 'child',
  extend: { brand: { accent: '#f0f' } },
  components: {
    button: {
      styles: ({ tokens: t }) => ({
        base: { color: t.brand.accent.var, margin: t.space.sm.var },
      }),
    },
  },
});

parent.override({
  name: 'child-bad',
  components: {
    button: {
      styles: {
        // @ts-expect-error — `shape` is not an axis of `button`
        variants: { shape: { round: {} } },
      },
    },
  },
});

// Without `withRecipes`, `components` stays an open namespace → patch record.
base.tokens.createTheme({
  name: 'loose',
  components: { anything: { styles: { base: { color: 'red' } } } },
});

// Same runtime instance.
const _same: typeof base.recipe = ts.recipe;
void _same;
