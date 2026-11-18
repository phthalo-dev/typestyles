import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { runTypestylesExtract } from './index';

describe('runTypestylesExtract (sourceMap)', () => {
  it('returns a CSS source map mapping rules to their registering call', async () => {
    const projectRoot = process.cwd();
    const tempDir = await mkdtemp(join(projectRoot, 'tmp-source-map-'));
    const entryFile = join(tempDir, 'entry.ts');
    await mkdir(tempDir, { recursive: true });
    await writeFile(
      entryFile,
      `import { createTypeStyles } from 'typestyles';

const ts = createTypeStyles({ scopeId: 'src-map' });

export const card = ts.style('fx-card', { padding: '8px' });
`,
      'utf8',
    );
    const modules = [relative(projectRoot, entryFile)];

    try {
      const result = await runTypestylesExtract({
        root: projectRoot,
        modules,
        sourceMap: true,
      });
      expect(result.css).toContain('src-map-fx-card');
      expect(result.map).toBeDefined();

      const map = result.map;
      if (!map) throw new Error('map should be defined');
      const parsed = JSON.parse(map);
      expect(parsed.version).toBe(3);
      expect(parsed.sources.some((s: string) => s.includes('entry.ts'))).toBe(true);
      expect(parsed.mappings).toBeTruthy();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('does not return a map when sourceMap is disabled', async () => {
    const projectRoot = process.cwd();
    const tempDir = await mkdtemp(join(projectRoot, 'tmp-source-map-off-'));
    const entryFile = join(tempDir, 'entry.ts');
    await mkdir(tempDir, { recursive: true });
    await writeFile(
      entryFile,
      `import { createTypeStyles } from 'typestyles';
const ts = createTypeStyles({ scopeId: 'src-map-off' });
ts.style('fx-card', { padding: '8px' });
`,
      'utf8',
    );
    const modules = [relative(projectRoot, entryFile)];

    try {
      const result = await runTypestylesExtract({ root: projectRoot, modules });
      expect(result.css).toContain('src-map-off-fx-card');
      expect(result.map).toBeUndefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
