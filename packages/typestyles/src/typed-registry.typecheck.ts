/**
 * Compile-only: `withTokenRefs` types `ctx.tokens` in theme `components` factories.
 */
import { createTypeStyles } from './create-type-styles';

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
