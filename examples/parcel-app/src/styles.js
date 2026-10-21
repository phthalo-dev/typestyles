import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

export const heading = recipe({
  name: 'parcel-heading',
  styles: {
    base: {
      fontSize: '24px',
      fontWeight: 700,
      fontFamily: 'system-ui, sans-serif',
      margin: '24px',
    },
  },
});
