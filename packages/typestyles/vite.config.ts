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
  pack: [
    {
      fixedExtension: false,
      outputOptions: (options, format) => ({
        ...options,
        comments: false,
        // Readable, collision-free chunk names (tsdown hashes non-entry chunks by default).
        // The d.ts plugin derives .d.ts / .d.cts from the JS extension it is given.
        chunkFileNames: `chunks/[name]${format === 'cjs' ? '.cjs' : '.js'}`,
      }),
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
    {
      // Pure, name-only build (`typestyles/core`): identical API surface, but
      // `./sheet` is stubbed for `zero-runtime-sheet` so consumer bundles never
      // tree-shake past the CSS insertion runtime — they simply never import
      // it. `clean` must stay false: this config writes into the same dist as
      // the runtime build above (the array share of `cleanOutDir` handles it).
      fixedExtension: false,
      outputOptions: (options, format) => ({
        ...options,
        comments: false,
        chunkFileNames: `chunks/[name]${format === 'cjs' ? '.cjs' : '.js'}`,
      }),
      entry: { core: 'src/core.ts' },
      alias: { './sheet': './zero-runtime-sheet' },
      format: ['esm', 'cjs'],
      dts: true,
      sourcemap: true,
      clean: false,
      treeshake: true,
      deps: {
        resolveDepSubpath: true,
        neverBundle: ['node:async_hooks'],
      },
      target: false,
    },
  ],
});
