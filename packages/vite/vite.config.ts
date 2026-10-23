import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  resolve: {
    // Tests write fixtures to os.tmpdir() that import 'typestyles'. Vitest 4 resolves bare
    // imports from the importing file, so pin them to this workspace's build (one shared
    // module instance with the test itself).
    alias: [
      {
        find: /^typestyles$/,
        replacement: fileURLToPath(new URL('../typestyles/dist/index.js', import.meta.url)),
      },
    ],
  },
  test: {
    // These tests spawn `node` from temp dirs and `require('typestyles')` there. pnpm's bin shims
    // used to export NODE_PATH for that; `vp test` does not, so point it at the workspace packages.
    env: { NODE_PATH: fileURLToPath(new URL('..', import.meta.url)) },
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    environment: 'node',
  },
  pack: {
    fixedExtension: false,
    outputOptions: { comments: false },
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    deps: {
      neverBundle: ['typestyles', '@typestyles/build-runner'],
    },
  },
});
