import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'docs-variants' });

export const button = recipe({
  name: 'variant-button',
  variants: {
    intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
    size: variant.enum(['sm', 'lg'], { default: 'sm' }),
  },
  styles: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid transparent',
      borderRadius: '8px',
      fontWeight: 500,
    },
    variants: {
      intent: {
        primary: { backgroundColor: '#2563eb', color: 'white' },
        ghost: { backgroundColor: 'transparent', color: '#1f2937' },
      },
      size: {
        sm: { padding: '6px 10px', fontSize: '14px' },
        lg: { padding: '10px 16px', fontSize: '16px' },
      },
    },
  },
});

export const demoSourceCode = `import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'docs-variants' });

const button = recipe({ name: 'variant-button', variants: { intent: variant.enum(["primary", "ghost"], { default: "primary" }), size: variant.enum(["sm", "lg"], { default: "sm" }) }, styles: { base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid transparent',
    borderRadius: '8px',
    fontWeight: 500,
  }, variants: { intent: {
      primary: { backgroundColor: '#2563eb', color: 'white' },
      ghost: { backgroundColor: 'transparent', color: '#1f2937' },
    }, size: {
      sm: { padding: '6px 10px', fontSize: '14px' },
      lg: { padding: '10px 16px', fontSize: '16px' },
    } } } });`;

export const demoVariants = [
  {
    id: 'default',
    label: 'Default',
    className: button().className,
    usageCode: `button();
// → "${button()}"`,
    usageLang: 'typescript',
  },
  {
    id: 'ghost-lg',
    label: 'Ghost · large',
    className: button({ intent: 'ghost', size: 'lg' }).className,
    usageCode: `button({ intent: 'ghost', size: 'lg' });
// → "${button({ intent: 'ghost', size: 'lg' })}"`,
    usageLang: 'typescript',
  },
] as const;
