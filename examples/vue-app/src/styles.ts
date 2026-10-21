import { variant } from 'typestyles';
import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

export const button = recipe({
  name: 'vue-button',
  variants: { ghost: variant.boolean({ default: false }) },
  styles: {
    base: {
      padding: '10px 16px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
      color: '#fff',
      backgroundColor: '#0066ff',
    },
    variants: {
      ghost: {
        true: {
          color: '#0066ff',
          backgroundColor: 'transparent',
          border: '1px solid #0066ff',
        },
        false: {},
      },
    },
  },
});
