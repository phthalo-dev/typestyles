import { defineConfig, lazyPlugins } from 'vite-plus';
import vue from '@vitejs/plugin-vue';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: lazyPlugins(() => [vue(), typestyles()]),
});
