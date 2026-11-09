import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vite-plus/test';
import { runTypestylesExtract } from './index';

describe('runTypestylesExtract output', () => {
  it('ignores what style modules print to stdout and still records plans', async () => {
    const projectRoot = process.cwd();
    const tempDir = await mkdtemp(join(tmpdir(), 'typestyles-extract-stdout-'));
    const entryFile = join(tempDir, 'entry.ts');
    await writeFile(
      entryFile,
      `
import { createTypeStyles, variant } from 'typestyles';
console.log('loaded tokens');
const { recipe } = createTypeStyles({ scopeId: 'out', mode: 'attribute' });
export const btn = recipe({
  name: 'extract-stdout-btn',
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({
    base: { color: 'red' },
    variants: { tone: { a: { color: 'red' }, b: { color: 'blue' } } },
  }),
});
`,
      'utf8',
    );

    // Logged output is forwarded to stderr instead of being mixed into the result.
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const { css, plans } = await runTypestylesExtract({
        root: projectRoot,
        modules: [relative(projectRoot, entryFile)],
      });
      expect(css).not.toContain('loaded tokens');
      expect(css).toContain('extract-stdout-btn');
      expect(plans.map((plan) => [plan.kind, plan.namespace])).toEqual([
        ['attrs', 'extract-stdout-btn'],
      ]);
      expect(stderr.mock.calls.map(([chunk]) => String(chunk)).join('')).toContain('loaded tokens');
    } finally {
      stderr.mockRestore();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('extracts a module under a dot directory given as a root-relative path', async () => {
    const projectRoot = process.cwd();
    // e.g. `.storybook/styles.ts`: without a leading `./` esbuild reads it as a package name.
    const dotDir = await mkdtemp(join(projectRoot, '.typestyles-dot-dir-'));
    try {
      const entryFile = join(dotDir, 'styles.ts');
      await writeFile(
        entryFile,
        `
import { createTypeStyles } from 'typestyles';
const { style } = createTypeStyles({ scopeId: 'dot' });
export const panel = style('extract-dot-dir-panel', { color: 'red' });
`,
        'utf8',
      );
      const rel = relative(projectRoot, entryFile);
      expect(rel.startsWith('.typestyles-dot-dir-')).toBe(true);
      const { css } = await runTypestylesExtract({ root: projectRoot, modules: [rel] });
      expect(css).toContain('extract-dot-dir-panel');
    } finally {
      await rm(dotDir, { recursive: true, force: true });
    }
  });
});
