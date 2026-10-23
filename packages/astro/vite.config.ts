import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    // These tests spawn `node` from temp dirs and `require('typestyles')` there. pnpm's bin shims
    // used to export NODE_PATH for that; `vp test` does not, so point it at the workspace packages.
    env: { NODE_PATH: fileURLToPath(new URL('..', import.meta.url)) },
    clearMocks: false,
  },
  pack: {
    fixedExtension: false,
    outputOptions: { comments: false },
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    deps: {
      neverBundle: ['astro', '@typestyles/vite'],
    },
  },
});
