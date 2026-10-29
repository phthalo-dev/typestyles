import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  pack: {
    fixedExtension: false,
    outputOptions: { comments: false },
    entry: {
      index: 'src/index.ts',
      color: 'src/color-entry.ts',
      'color-scale': 'src/color-scale-entry.ts',
      'token-scale': 'src/token-scale-entry.ts',
      dtcg: 'src/dtcg-entry.ts',
      globals: 'src/globals.ts',
      css: 'src/css-entry.ts',
      server: 'src/server.ts',
      hmr: 'src/hmr.ts',
      build: 'src/build.ts',
      testing: 'src/testing.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    deps: {
      // tsdown <0.23 compatibility: resolve external dependency subpaths.
      // Remove to preserve subpath imports as written (the new default).
      // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
      resolveDepSubpath: true,
      neverBundle: ['node:async_hooks'],
    },
    target: false,
  },
});
