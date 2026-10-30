import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { runTypestylesBuild } from './index';

describe('runTypestylesBuild (sourceComments)', () => {
  it('precedes rules with the path:line of the registering call', async () => {
    const projectRoot = process.cwd();
    const tempDir = await mkdtemp(join(projectRoot, 'tmp-source-comments-'));
    const entryFile = join(tempDir, 'entry.ts');
    await mkdir(tempDir, { recursive: true });
    await writeFile(
      entryFile,
      `import { createTypeStyles } from 'typestyles';

const ts = createTypeStyles({ scopeId: 'src-comments' });

export const card = ts.style('fx-card', { padding: '8px' });
`,
      'utf8',
    );
    const modules = [relative(projectRoot, entryFile)];
    const dir = relative(projectRoot, tempDir);

    try {
      const withComments = await runTypestylesBuild({
        root: projectRoot,
        modules,
        sourceComments: true,
      });
      expect(withComments).toContain(`/* ${dir}/entry.ts:5 */`);
      expect(withComments).toMatch(/\*\/\s*\.src-comments-fx-card/);

      const without = await runTypestylesBuild({ root: projectRoot, modules });
      expect(without).toContain('fx-card');
      expect(without).not.toContain('/*');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
