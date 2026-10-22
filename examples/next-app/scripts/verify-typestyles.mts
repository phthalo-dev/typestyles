import { verifyTypestylesBuild } from '@typestyles/build-runner';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

try {
  const result = verifyTypestylesBuild({
    root,
    cssFile: 'app/typestyles.css',
    manifestFile: 'app/typestyles.manifest.json',
    manifestVersion: 2,
    minRouteEntries: 1,
    minBytes: 500,
    // Semantic class names are prefixed with the sanitized scopeId
    // (`example-ds` / `example-app`), matching how tokens are scoped.
    requiredCssSubstrings: [
      ':root { --example-ds-color-background-app:',
      '.example-ds-button {',
      '.theme-example-ds-default {',
      '.example-ds-ds-layout__base {',
      '.example-app-app-site-page {',
    ],
  });

  console.log(
    `[typestyles:verify] OK — ${result.cssPath} (${result.cssBytes} bytes), manifest v${result.manifestVersion}`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
