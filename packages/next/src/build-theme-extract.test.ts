import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import { buildTypestylesForNext, verifyTypestylesBuild } from './build';

describe('buildTypestylesForNext theme extraction', () => {
  it('extracts tokens.create and createTheme CSS into the global stylesheet', async () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-next-theme-'));
    mkdirSync(join(root, 'styles'), { recursive: true });

    writeFileSync(
      join(root, 'styles/typestyles-entry.ts'),
      `import { createTokens, createTheme } from 'typestyles';
const tokens = createTokens();
const color = tokens.create('next-color', { primary: '#0066ff' });
createTheme('next-dark', { base: { 'next-color': { primary: '#66aaff' } } });
`,
    );

    try {
      await buildTypestylesForNext({ root });

      // Theme/token CSS is a byproduct of normal extraction — verify with the P1.7 build verifier.
      const result = verifyTypestylesBuild({
        root,
        cssFile: 'app/typestyles.css',
        manifestFile: 'app/typestyles.manifest.json',
        requiredCssSubstrings: [
          '--next-color-primary: #0066ff',
          '.theme-next-dark',
          '--next-color-primary: #66aaff',
        ],
      });
      expect(result.cssBytes).toBeGreaterThan(0);
      expect(result.manifestVersion).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
