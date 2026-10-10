/**
 * Compile-only fixtures (included in `tsc --noEmit`, not shipped in the bundle entry).
 * Verifies createTypeStyles() overloads keep `recipe` typing per factory config (Issue #254):
 * `mode: 'attribute'` returns `{ className, attrs, props }` results, layered factories type the
 * `{ layer }` override against the configured layer order, and no call shape degrades to `any`.
 */
import { createTypeStyles } from './create-type-styles';

// ---------------------------------------------------------------------------
// Issue #254 repro — attribute mode + layers: the callback ctx stays typed and
// the result exposes attrs; `{ layer }` is checked against `layers.order`.
// ---------------------------------------------------------------------------
const attributeLayered = createTypeStyles({
  scopeId: 'app',
  mode: 'attribute',
  layers: {
    order: ['tokens', 'components'] as const,
    token: 'tokens',
    style: 'components',
  },
});

const button = attributeLayered.recipe(
  'button',
  (c) => {
    const v = c.vars({ fg: { value: 'red', syntax: '<color>' } });
    return {
      base: { color: v.fg.var },
      variants: {
        size: { sm: { fontSize: '12px' }, md: { fontSize: '14px' } },
      },
      defaultVariants: { size: 'md' as const },
    };
  },
  { layer: 'components' },
);

const buttonResult = button({ size: 'sm' });
const buttonClassName: string = buttonResult.className;
const buttonAttrs: Readonly<Record<string, string>> = buttonResult.attrs;

// @ts-expect-error — would silently compile if `recipe` degraded to `any`
void buttonResult.notARealProperty;

// @ts-expect-error — `layer` must be one of the configured `layers.order` names
attributeLayered.recipe('button-bad-layer', { base: { padding: '8px' } }, { layer: 'nope' });

// Bare calls work — the factory `layers.style` default applies.
const link = attributeLayered.recipe('link', {
  base: { textDecoration: 'underline' },
  variants: { tone: { accent: { color: 'rebeccapurple' } } },
  defaultVariants: { tone: 'accent' },
});
const linkAttrs: Readonly<Record<string, string>> = link({ tone: 'accent' }).attrs;

// Attribute-mode slots return per-slot attrs results.
const dialog = attributeLayered.recipe('dialog', {
  slots: ['root', 'trigger'] as const,
  base: { root: { display: 'grid' } },
  variants: { size: { lg: { trigger: { fontSize: '16px' } } } },
  defaultVariants: { size: 'lg' },
});
const dialogTriggerAttrs: Readonly<Record<string, string>> = dialog({ size: 'lg' }).trigger.attrs;

// ---------------------------------------------------------------------------
// Attribute mode without layers.
// ---------------------------------------------------------------------------
const attributeOnly = createTypeStyles({ scopeId: 'attr', mode: 'attribute' });
const chip = attributeOnly.recipe('chip', {
  base: { padding: '4px' },
  variants: { tone: { brand: { color: 'blue' } } },
  defaultVariants: { tone: 'brand' },
});
const chipAttrs: Readonly<Record<string, string>> = chip({ tone: 'brand' }).attrs;

// ---------------------------------------------------------------------------
// Semantic mode + layers — bare calls and `{ layer }` overrides stay typed.
// ---------------------------------------------------------------------------
const semanticLayered = createTypeStyles({
  scopeId: 'sem',
  layers: {
    order: ['tokens', 'components'] as const,
    token: 'tokens',
    style: 'components',
  },
});

const card = semanticLayered.recipe('card', {
  base: { display: 'grid' },
  variants: { size: { sm: { padding: '4px' }, lg: { padding: '16px' } } },
  defaultVariants: { size: 'lg' },
});
const cardClass: string = card({ size: 'sm' });

const cardOverride = semanticLayered.recipe(
  'card-override',
  (c) => {
    void c;
    return {
      base: { display: 'grid' },
      variants: { size: { sm: { padding: '4px' }, lg: { padding: '16px' } } },
      defaultVariants: { size: 'lg' as const },
    };
  },
  { layer: 'components' },
);
const cardOverrideClass: string = cardOverride();

// @ts-expect-error — would silently compile if the layered call degraded to `any`
void cardOverride.bogusKey;

// @ts-expect-error — `layer` must be one of the configured `layers.order` names
semanticLayered.recipe('card-bad-layer', { base: { display: 'grid' } }, { layer: 'nope' });

// `layers.order` as a plain mutable array (no `as const`, as in most app code) still infers
// the layer-name union for `{ layer }` overrides.
const mutableOrder = createTypeStyles({
  scopeId: 'mutable',
  layers: {
    order: ['tokens', 'components', 'utilities'],
    token: 'tokens',
    style: 'components',
  },
});
const toggle = mutableOrder.recipe(
  'toggle',
  { base: { display: 'inline-block' } },
  { layer: 'utilities' },
);
const toggleClass: string = toggle();

// @ts-expect-error — `layer` must be one of the configured `layers.order` names
mutableOrder.recipe('toggle-bad-layer', { base: { display: 'inline-block' } }, { layer: 'nope' });

export { toggleClass };

// ---------------------------------------------------------------------------
// Default (semantic, unlayered) — unchanged behavior.
// ---------------------------------------------------------------------------
const plain = createTypeStyles({ scopeId: 'plain' });
const badge = plain.recipe('badge', {
  base: { display: 'inline-flex' },
  variants: { tone: { hot: { color: 'red' } } },
  defaultVariants: { tone: 'hot' },
});
const badgeClass: string = badge();

export {
  button,
  buttonClassName,
  buttonAttrs,
  linkAttrs,
  dialogTriggerAttrs,
  chipAttrs,
  cardClass,
  cardOverrideClass,
  badgeClass,
};
