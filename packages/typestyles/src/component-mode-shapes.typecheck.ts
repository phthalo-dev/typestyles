/**
 * Compile-only fixtures. Every recipe call returns `{ className, attrs, props }`.
 * Attribute mode still fills `attrs`; other modes leave `attrs` empty and put the
 * composed class on `className`.
 */
import { createStyles } from './styles';
import { variant } from './variant';

const attributeStyles = createStyles({ mode: 'attribute' });

export function _attributeComponentReturnsAttrsResult() {
  const button = attributeStyles.component({
    name: 'shape-button',
    variants: { variant: variant.enum(['primary'], { default: 'primary' }) },
    styles: {
      base: { padding: '8px' },
      variants: { variant: { primary: { color: 'blue' } } },
    },
  });
  const b = button({ variant: 'primary' });
  return b.attrs;
}

export function _attributeComponentAcceptsSlots() {
  const dialog = attributeStyles.component({
    name: 'shape-dialog',
    slots: ['root', 'trigger'],
    variants: { size: variant.enum(['lg'], { default: 'lg' }) },
    styles: {
      base: { root: { display: 'grid' } },
      variants: { size: { lg: { trigger: { fontSize: '16px' } } } },
    },
  });
  return dialog({ size: 'lg' }).trigger.attrs;
}

const bemStyles = createStyles({ mode: 'bem' });

export function _bemComponentReturnsAttrsObject() {
  const button = bemStyles.component({
    name: 'shape-bem-button',
    variants: { variant: variant.enum(['primary'], { default: 'primary' }) },
    styles: {
      base: { padding: '8px' },
      variants: { variant: { primary: { color: 'blue' } } },
    },
  });
  const result = button({ variant: 'primary' });
  const cls: string = result.className;
  const attrs: Readonly<Record<string, string>> = result.attrs;
  return { cls, attrs };
}
