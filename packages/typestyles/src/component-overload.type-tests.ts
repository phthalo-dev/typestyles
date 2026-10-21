/**
 * Compile-time assertions for styles.component() overload discrimination (Issue #166).
 */
import { createStyles } from './styles';

const styles = createStyles();

// Avatar-like slot names that do not overlap CSS properties
const avatar = styles.component('avatar', {
  slots: ['root', 'image', 'initials', 'status'] as const,
  base: {
    root: { display: 'flex' },
    image: { width: '100%', height: '100%' },
    initials: { fontSize: '14px' },
    status: { position: 'absolute' },
  },
  variants: {
    size: {
      xs: { root: { width: '20px' } },
      md: { root: { width: '40px' } },
    },
  },
  defaultVariants: { size: 'md' },
});

const avatarClasses = avatar({ size: 'xs' });
void avatarClasses.root;
void avatarClasses.image;
void avatarClasses.initials;
void avatarClasses.status;

// @ts-expect-error — unknown variant option
avatar({ size: 'xl' });

// Callback form (var-ui pattern) — must not fall through to dimensioned overload
const avatarCb = styles.component('avatar-cb', () => ({
  slots: ['root', 'image', 'initials', 'status'] as const,
  base: {
    root: { display: 'flex' },
    image: { width: '100%' },
    initials: { fontSize: '14px' },
    status: { position: 'absolute' },
  },
  variants: {
    size: {
      xs: { root: { width: '20px' } },
      md: { root: { width: '40px' } },
    },
  },
  defaultVariants: { size: 'md' as const },
}));

const avatarCbClasses = avatarCb({ size: 'md' });
void avatarCbClasses.root;

// Layered callback + slots (var-ui with cascade layers)
const layered = createStyles({ layers: ['components'] as const });
const layeredAvatar = layered.component(
  'layered-avatar',
  () => ({
    slots: ['root', 'image'] as const,
    base: { root: { display: 'flex' }, image: { width: '100%' } },
    variants: {
      size: {
        sm: { root: { width: '24px' } },
        lg: { root: { width: '48px' } },
      },
    },
  }),
  { layer: 'components' },
);
void layeredAvatar({ size: 'sm' }).root;

// Explicit generic escape hatch when inference still needs help
type AvatarSlots = readonly ['root', 'image', 'initials', 'status'];
type AvatarVariantDefs = {
  size: {
    xs: { root: { width: string } };
    md: { root: { width: string } };
  };
};

const pinned = styles.component<AvatarSlots, AvatarVariantDefs>('avatar-pinned', {
  slots: ['root', 'image', 'initials', 'status'] as const,
  base: { root: { display: 'flex' } },
  variants: { size: { xs: { root: { width: '20px' } }, md: { root: { width: '40px' } } } },
});
void pinned({ size: 'md' }).root;

// Flat variant still works
const badge = styles.component('badge', {
  base: { display: 'inline-flex' },
  elevated: { boxShadow: '0 1px 2px rgba(0,0,0,0.1)' },
});
void badge.base;
void badge.elevated;
void badge({ elevated: true });

// Dimensioned variant still works
const button = styles.component('button', {
  base: { padding: '8px' },
  variants: {
    intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } },
    size: { sm: { fontSize: '12px' }, lg: { fontSize: '16px' } },
  },
});
void button.base;
void button({ intent: 'primary', size: 'lg' });

// Multi-slot without variants
const card = styles.component('card', {
  slots: ['root', 'header', 'body'] as const,
  root: { display: 'grid' },
  header: { fontWeight: 600 },
  body: { padding: '8px' },
});
void card().root;
void card.header;

// Multi-slot callback with vars: v (code-block pattern) — must not match FlatComponentConfig callback
const codeBlock = styles.component('code-block', (c) => {
  const v = c.vars({ border: '#ccc', background: '#fff' });
  return {
    vars: v,
    slots: ['root', 'header', 'body'] as const,
    root: { borderColor: v.border.var, backgroundColor: v.background.var },
    header: { borderBottomColor: v.border.var },
    body: { padding: '8px' },
  };
});
void codeBlock().root;

void avatar;
void avatarCb;
void layeredAvatar;
void pinned;
void badge;
void button;
void card;
void codeBlock;

// Layered attribute mode (var-ui createTypeStyles) — multi-slot callback vars: v + layer option
const layeredAttr = createStyles({ mode: 'attribute', layers: ['components'] as const });
const layeredCodeBlock = layeredAttr.component(
  'layered-code-block',
  (c) => {
    const v = c.vars({ border: '#ccc', background: '#fff' });
    return {
      vars: v,
      slots: ['root', 'header'] as const,
      root: { borderColor: v.border.var, backgroundColor: v.background.var },
      header: { borderBottomColor: v.border.var },
    };
  },
  { layer: 'components' },
);
void layeredCodeBlock().root;
void layeredCodeBlock;
const layeredBorderName: string = layeredCodeBlock.vars.border.name;
const layeredBorderVar: string = layeredCodeBlock.vars.border.var;
void layeredBorderName;
void layeredBorderVar;

const layeredFlat = layeredAttr.component(
  'layered-flat-vars',
  (c) => {
    const v = c.vars({ zIndex: { value: '0', syntax: '<integer>' as const } });
    return { vars: v, base: { zIndex: v.zIndex.var } };
  },
  { layer: 'components' },
);
const layeredZIndex: string = layeredFlat.vars.zIndex.name;
void layeredZIndex;

const layeredSlotVariants = layeredAttr.component(
  'layered-slot-variant-vars',
  (c) => {
    const v = c.vars({ anchorX: '0px' });
    return {
      vars: v,
      slots: ['root', 'anchor'] as const,
      base: { root: { position: 'relative' }, anchor: { left: v.anchorX.var } },
      variants: {
        open: {
          true: { root: { display: 'block' } },
          false: { root: { display: 'none' } },
        },
      },
    };
  },
  { layer: 'components' },
);
const layeredAnchor: string = layeredSlotVariants.vars.anchorX.name;
void layeredSlotVariants({ open: true }).root;
void layeredAnchor;

const codeBorderName: string = codeBlock.vars.border.name;
void codeBorderName;

// Full slot map (code-block scale) — every declared slot has a style block
const layeredCodeBlockFull = layeredAttr.component(
  'layered-code-block-full',
  (c) => {
    const v = c.vars({ border: '#ccc', background: '#fff' });
    return {
      vars: v,
      slots: [
        'root',
        'rootDefault',
        'rootInline',
        'rootDiff',
        'rootTerminal',
        'header',
        'headerTerminal',
        'title',
        'filename',
        'language',
        'languageTerminal',
        'actions',
        'copyButton',
        'copyButtonIdle',
        'copyButtonCopied',
        'copyButtonError',
        'feedback',
        'feedbackInline',
        'feedbackToast',
        'feedbackSuccess',
        'feedbackError',
        'body',
        'bodyTerminal',
        'bodyScrollable',
        'pre',
        'preTerminal',
        'preWrap',
        'preScrollX',
        'code',
        'lines',
        'line',
        'lineNumber',
        'lineContent',
        'lineHighlighted',
        'lineAdded',
        'lineDeleted',
      ] as const,
      root: { borderColor: v.border.var },
      rootDefault: {},
      rootInline: {},
      rootDiff: {},
      rootTerminal: {},
      header: {},
      headerTerminal: {},
      title: {},
      filename: {},
      language: {},
      languageTerminal: {},
      actions: {},
      copyButton: {},
      copyButtonIdle: {},
      copyButtonCopied: {},
      copyButtonError: {},
      feedback: {},
      feedbackInline: {},
      feedbackToast: {},
      feedbackSuccess: {},
      feedbackError: {},
      body: {},
      bodyTerminal: {},
      bodyScrollable: {},
      pre: {},
      preTerminal: {},
      preWrap: {},
      preScrollX: {},
      code: {},
      lines: {},
      line: {},
      lineNumber: {},
      lineContent: {},
      lineHighlighted: {},
      lineAdded: {},
      lineDeleted: {},
    };
  },
  { layer: 'components' },
);
void layeredCodeBlockFull().root;
void layeredCodeBlockFull;

// Mode-aware `{ light, dark }` values (Issue #169) — must type-check in recipe authoring,
// matching what color-modes.ts already compiles to `light-dark()` at runtime.
const modeAware = styles.component('mode-aware-btn', {
  base: { color: { light: '#111', dark: '#eee' } },
  variants: {
    intent: {
      primary: { backgroundColor: { light: '#fff', dark: '#000' } },
    },
  },
});
void modeAware;

// Object-form `layers.order` keeps the layer-name union, same as a tuple.
const objectLayers = createStyles({
  layers: { order: ['tokens', 'components'] as const },
});
objectLayers.class('object-layer', { color: 'red' }, { layer: 'components' });
// @ts-expect-error — layer is not on `layers.order`
objectLayers.class('object-layer-bad', { color: 'red' }, { layer: 'nope' });

// `{ varDefinitions }` is not a recipe option. Vars come from `vars` or `c.vars()`.
layered.component(
  'no-var-definitions-option',
  { base: { color: 'red' } },
  {
    layer: 'components',
    // @ts-expect-error — varDefinitions does not declare component vars
    varDefinitions: { color: 'red' },
  },
);
