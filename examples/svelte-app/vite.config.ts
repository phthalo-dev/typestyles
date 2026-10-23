import { defineConfig, lazyPlugins } from 'vite-plus';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import typestyles from '@typestyles/vite';

export default defineConfig({
  plugins: lazyPlugins(() => [svelte(), typestyles()]),
});
