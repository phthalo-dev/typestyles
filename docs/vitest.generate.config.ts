import { defineConfig } from 'vite-plus';
import tsConfigPaths from 'vite-tsconfig-paths';

/** One-shot generator: `pnpm --filter docs generate:mcp-content` */
export default defineConfig({
  plugins: [tsConfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    environment: 'node',
    include: ['scripts/generate-mcp-content.test.ts'],
  },
});
