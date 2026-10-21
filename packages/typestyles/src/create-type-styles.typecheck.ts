/**
 * Compile-only fixtures for createTypeStyles().
 * Layered factories type `layer` against `layers.order`. The call result is always
 * `{ className, attrs, props }`.
 */
import { createTypeStyles } from './create-type-styles';
import { variant } from './variant';

const attributeLayered = createTypeStyles({
  scopeId: 'app',
  mode: 'attribute',
  layers: {
    order: ['tokens', 'components'] as const,
    token: 'tokens',
    style: 'components',
  },
});

const button = attributeLayered.recipe({
  name: 'button',
  layer: 'components',
  vars: { fg: { value: 'red', syntax: '<color>' } },
  variants: { size: variant.enum(['sm', 'md'], { default: 'md' }) },
  styles: ({ vars }) => ({
    base: { color: vars.fg.var },
    variants: {
      size: { sm: { fontSize: '12px' }, md: { fontSize: '14px' } },
    },
  }),
});

const buttonResult = button({ size: 'sm' });
const buttonClassName: string = buttonResult.className;
const buttonAttrs: Readonly<Record<string, string>> = buttonResult.attrs;
void buttonClassName;
void buttonAttrs;
void button.vars.fg.var;

// @ts-expect-error — would silently compile if `recipe` degraded to `any`
void buttonResult.notARealProperty;

attributeLayered.recipe({
  name: 'button-bad-layer',
  // @ts-expect-error — `layer` must be one of the configured `layers.order` names
  layer: 'nope',
  styles: { base: { padding: '8px' } },
});

const link = attributeLayered.recipe({
  name: 'link',
  variants: { tone: variant.enum(['accent'], { default: 'accent' }) },
  styles: {
    base: { textDecoration: 'underline' },
    variants: { tone: { accent: { color: 'rebeccapurple' } } },
  },
});
const linkAttrs: Readonly<Record<string, string>> = link({ tone: 'accent' }).attrs;
void linkAttrs;

const dialog = attributeLayered.recipe({
  name: 'dialog',
  slots: ['root', 'trigger'],
  variants: { size: variant.enum(['lg'], { default: 'lg' }) },
  styles: {
    base: { root: { display: 'grid' } },
    variants: { size: { lg: { trigger: { fontSize: '16px' } } } },
  },
});
const dialogTriggerAttrs: Readonly<Record<string, string>> = dialog({ size: 'lg' }).trigger.attrs;
void dialogTriggerAttrs;

const attributeOnly = createTypeStyles({ scopeId: 'attr', mode: 'attribute' });
const chip = attributeOnly.recipe({
  name: 'chip',
  variants: { tone: variant.enum(['brand'], { default: 'brand' }) },
  styles: {
    base: { padding: '4px' },
    variants: { tone: { brand: { color: 'blue' } } },
  },
});
const chipAttrs: Readonly<Record<string, string>> = chip({ tone: 'brand' }).attrs;
void chipAttrs;

const semanticLayered = createTypeStyles({
  scopeId: 'sem',
  layers: {
    order: ['tokens', 'components'] as const,
    token: 'tokens',
    style: 'components',
  },
});

const card = semanticLayered.recipe({
  name: 'card',
  variants: { size: variant.enum(['sm', 'lg'], { default: 'lg' }) },
  styles: {
    base: { display: 'grid' },
    variants: { size: { sm: { padding: '4px' }, lg: { padding: '16px' } } },
  },
});
const cardClass: string = card({ size: 'sm' }).className;
void cardClass;

const cardOverride = semanticLayered.recipe({
  name: 'card-override',
  layer: 'components',
  variants: { size: variant.enum(['sm', 'lg'], { default: 'lg' }) },
  styles: {
    base: { display: 'grid' },
    variants: { size: { sm: { padding: '4px' }, lg: { padding: '16px' } } },
  },
});
const cardOverrideClass: string = String(cardOverride());
void cardOverrideClass;

// @ts-expect-error — would silently compile if the layered call degraded to `any`
void cardOverride.bogusKey;

semanticLayered.recipe({
  name: 'card-bad-layer',
  // @ts-expect-error — `layer` must be one of the configured `layers.order` names
  layer: 'nope',
  styles: { base: { display: 'grid' } },
});

semanticLayered.style('card-style', { display: 'grid' }, { layer: 'components' });
// @ts-expect-error — `layer` must be one of the configured `layers.order` names
semanticLayered.style('card-style-bad', { display: 'grid' }, { layer: 'nope' });
semanticLayered.hash({ display: 'grid' }, { label: 'card', layer: 'tokens' });
// @ts-expect-error — `layer` must be one of the configured `layers.order` names
semanticLayered.hash({ display: 'grid' }, { layer: 'nope' });

const mutableOrder = createTypeStyles({
  scopeId: 'mutable',
  layers: {
    order: ['tokens', 'components', 'utilities'],
    token: 'tokens',
    style: 'components',
  },
});
const toggle = mutableOrder.recipe({
  name: 'toggle',
  layer: 'utilities',
  styles: { base: { display: 'inline-block' } },
});
const toggleClass: string = toggle().className;

mutableOrder.recipe({
  name: 'toggle-bad-layer',
  // @ts-expect-error — `layer` must be one of the configured `layers.order` names
  layer: 'nope',
  styles: { base: { display: 'inline-block' } },
});

const plain = createTypeStyles({ scopeId: 'plain' });
const badge = plain.recipe({
  name: 'badge',
  variants: { tone: variant.enum(['hot'], { default: 'hot' }) },
  styles: {
    base: { display: 'inline-flex' },
    variants: { tone: { hot: { color: 'red' } } },
  },
});
const badgeClass: string = badge().className;
plain.style('plain-style', { display: 'inline-flex' });
plain.hash({ color: 'red' }, { label: 'plain' });
// @ts-expect-error — unlayered factories do not take a layer override
plain.style('plain-style-bad', { display: 'inline-flex' }, { layer: 'components' });
// @ts-expect-error — unlayered factories do not take a recipe layer
plain.recipe({ name: 'plain-bad', layer: 'components', styles: { base: { color: 'red' } } });

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
  toggleClass,
};
