import { defineConfig, lazyPlugins } from 'vite-plus';
import react from '@vitejs/plugin-react';
import typestyles from '@typestyles/vite';

/**
 * With `src/typestyles-entry.ts` present, `@typestyles/vite` discovers it and defaults to
 * `mode: "build"`: runtime + HMR during `vite dev`, extracted CSS at `typestyles.css`, zero client
 * injection on `vite build`. Override with `extract` / `mode` when you need a different entry or
 * filename.
 */
export default defineConfig({
  plugins: lazyPlugins(() => [react(), typestyles()]),
});
