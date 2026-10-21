import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

recipe({
  name: 'esbuild-hero',
  styles: {
    base: {
      padding: '24px',
      fontFamily: 'system-ui, sans-serif',
      color: '#111827',
    },
  },
});
