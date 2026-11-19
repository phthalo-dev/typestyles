/**
 * Compile-only: `Theme.tokens` typing (#234) and `Theme.override` patches.
 */
import { createTypeStyles } from './create-type-styles';
import { createTokens } from './tokens';

const { tokens } = createTypeStyles({ scopeId: 'tc', colorModes: ['light', 'dark'] });
const bare = createTokens({ scopeId: 'bare' });

const brand = tokens.createTheme({
  name: 'brand',
  tokens: {
    brand: {
      glow: { default: '#0066ff' },
    },
  } as const,
});

const _ref: string = brand.tokens!.brand.glow.default.var;
void _ref;

const bareTheme = bare.createTheme({
  name: 'brand',
  tokens: {
    brand: {
      glow: { default: '#0066ff' },
    },
  },
});
const _bareRef: string = bareTheme.tokens!.brand.glow.default.var;
void _bareRef;

const values = {
  color: {
    brand: { light: 'red', dark: 'green' },
    red: { 10: '#f90' },
  },
} as const;

const defaultTheme = tokens.createTheme({
  name: 'default',
  tokens: values,
});

const myTheme = defaultTheme.override({
  name: 'my-theme',
  tokens: {
    color: {
      brand: { light: 'blue', dark: 'navy' },
    },
  },
});
void myTheme;

defaultTheme.override({
  name: 'leaf-patch',
  tokens: {
    color: {
      brand: { light: 'navy', dark: 'skyblue' },
    },
  },
});

defaultTheme.override({
  name: 'bad-key',
  tokens: {
    color: {
      // @ts-expect-error — unknown token path under color
      nope: 'x',
    },
  },
});

defaultTheme.override({
  name: 'bad-ns',
  tokens: {
    // @ts-expect-error — unknown namespace
    space: { sm: '4px' },
  },
});

defaultTheme.override({
  name: 'component-callback',
  components: {
    button: {
      styles: ({ tokens: themeTokens }) => ({
        base: { color: themeTokens.color.border.default.var },
      }),
    },
  },
});

defaultTheme.override({
  name: 'component-fn',
  components: {
    // @ts-expect-error — a component patch is `{ styles, vars }`, not a function
    button: () => ({ base: { color: 'red' } }),
  },
});

// --- theme boundary: refs as values, partial mode leaves, non-optional tokens ---

const palette = tokens.create('palette', { red: '#f00', blue: '#00f' });

const refTheme = tokens.createTheme({
  name: 'ref-leaves',
  tokens: {
    brand: {
      plain: palette.red,
      modal: { light: palette.red, dark: palette.blue },
    },
  },
});

// `Theme.tokens` is required: no `!` / `?.` needed.
const _refVar: string = refTheme.tokens.brand.plain.var;
void _refVar;

refTheme.override({
  name: 'ref-leaves-child',
  tokens: {
    brand: {
      // ref leaf in a patch
      plain: palette.blue,
      // partial mode leaf: only `dark`
      modal: { dark: palette.red },
    },
  },
});

refTheme.override({
  name: 'ref-leaves-bad',
  tokens: {
    brand: {
      // @ts-expect-error — `sepia` is not a color mode
      modal: { sepia: '#aaa' },
    },
  },
});
