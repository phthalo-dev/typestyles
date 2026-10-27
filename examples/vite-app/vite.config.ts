import { defineConfig, lazyPlugins } from 'vite-plus';
import react from '@vitejs/plugin-react';
import typestyles from '@typestyles/vite';

/**
 * With `src/typestyles-entry.ts` present, `@typestyles/vite` discovers it and defaults to
 * `mode: "build"`: runtime + HMR during `vite dev` (stable `/typestyles.css`), and a
 * content-hashed CSS asset on `vite build` with zero client injection. Override with
 * `extract` / `mode` when you need a different entry or filename.
 */
export default defineConfig({
  plugins: lazyPlugins(() => [react(), typestyles()]),
});
