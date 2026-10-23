import { defineConfig, lazyPlugins } from 'vite-plus';
import react from '@vitejs/plugin-react';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: lazyPlugins(() => [
    react(),
    typestyles({
      extract: {
        modules: ['src/typestyles-entry.ts'],
        fileName: 'typestyles.css',
      },
    }),
  ]),
});
