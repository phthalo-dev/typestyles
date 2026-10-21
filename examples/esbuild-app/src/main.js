import './typestyles-entry.js';
import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const title = recipe({
  name: 'esbuild-title',
  styles: {
    base: {
      fontSize: '24px',
      fontWeight: 700,
      marginBottom: '8px',
    },
  },
});

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app');

app.innerHTML = `<h1 class="${title()}">typestyles + esbuild</h1>`;
