import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

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
    environment: 'node',
  },
});
