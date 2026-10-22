import { variant } from 'typestyles';
/**
 * Style registration for the getting-started live demo.
 * Imported only by `@typestyles/build-runner` (see registry `modulePath`) so
 * `recipe('button', …)` does not collide with `@examples/design-system`
 * in the Vite duplicate-namespace check.
 */
import { createTypeStyles } from 'typestyles';

export const { style, recipe, tokens } = createTypeStyles({ scopeId: 'app' });

export const color = tokens.create('color', {
  primary: '#0066ff',
  surface: '#ffffff',
});

export const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary', 'ghost'], { default: 'primary' }) },
  styles: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 16px',
      borderRadius: '6px',
      fontWeight: 500,
      border: 'none',
      cursor: 'pointer',
      color: color.surface,
      backgroundColor: color.primary,
    },
    variants: {
      intent: {
        primary: { backgroundColor: color.primary, color: color.surface },
        ghost: {
          backgroundColor: 'transparent',
          color: color.primary,
          border: `1px solid ${color.primary}`,
        },
      },
    },
  },
});
