import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectTargetFiles } from '../src/files';

describe('collectTargetFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `typestyles-files-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('finds files matching the specified extensions in a directory', async () => {
    await writeFile(join(tempDir, 'a.ts'), '');
    await writeFile(join(tempDir, 'b.tsx'), '');
    await writeFile(join(tempDir, 'c.css'), '');

    const files = await collectTargetFiles(tempDir, ['.'], ['.ts', '.tsx'], [], []);
    const names = files.map((f) => f.split('/').pop());
    expect(names).toContain('a.ts');
    expect(names).toContain('b.tsx');
    expect(names).not.toContain('c.css');
  });

  it('accepts a literal file path as a target', async () => {
    const filePath = join(tempDir, 'exact.ts');
    await writeFile(filePath, '');

    const files = await collectTargetFiles(tempDir, [filePath], ['.ts'], [], []);
    expect(files).toContain(filePath);
  });

  it('accepts extension without leading dot', async () => {
    await writeFile(join(tempDir, 'file.ts'), '');

    const files = await collectTargetFiles(tempDir, ['.'], ['ts'], [], []);
    const names = files.map((f) => f.split('/').pop());
    expect(names).toContain('file.ts');
  });

  it('excludes files matching custom exclude patterns', async () => {
    await mkdir(join(tempDir, 'generated'), { recursive: true });
    await writeFile(join(tempDir, 'keep.ts'), '');
    await writeFile(join(tempDir, 'generated', 'skip.ts'), '');

    const files = await collectTargetFiles(tempDir, ['.'], ['.ts'], [], ['**/generated/**']);
    const names = files.map((f) => f.split('/').pop());
    expect(names).toContain('keep.ts');
    expect(names).not.toContain('skip.ts');
  });

  it('returns only files matching an include pattern', async () => {
    await writeFile(join(tempDir, 'comp.ts'), '');
    await writeFile(join(tempDir, 'util.ts'), '');

    const files = await collectTargetFiles(tempDir, ['.'], ['.ts'], ['**/comp.ts'], []);
    const names = files.map((f) => f.split('/').pop());
    expect(names).toContain('comp.ts');
    expect(names).not.toContain('util.ts');
  });

  it('returns an empty array when the directory has no matching files', async () => {
    const files = await collectTargetFiles(tempDir, ['.'], ['.ts'], [], []);
    expect(files).toHaveLength(0);
  });

  it('excludes node_modules by default', async () => {
    const nodeModules = join(tempDir, 'node_modules', 'pkg');
    await mkdir(nodeModules, { recursive: true });
    await writeFile(join(nodeModules, 'index.ts'), '');
    await writeFile(join(tempDir, 'app.ts'), '');

    const files = await collectTargetFiles(tempDir, ['.'], ['.ts'], [], []);
    const names = files.map((f) => f.split('/').pop());
    expect(names).not.toContain('index.ts');
    expect(names).toContain('app.ts');
  });

  it('returns sorted results', async () => {
    await writeFile(join(tempDir, 'z.ts'), '');
    await writeFile(join(tempDir, 'a.ts'), '');
    await writeFile(join(tempDir, 'm.ts'), '');

    const files = await collectTargetFiles(tempDir, ['.'], ['.ts'], [], []);
    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
  });

  it('de-duplicates the same file when it appears as both a literal and a glob result', async () => {
    const filePath = join(tempDir, 'dup.ts');
    await writeFile(filePath, '');

    const files = await collectTargetFiles(tempDir, [filePath, '.'], ['.ts'], [], []);
    const dupCount = files.filter((f) => f === filePath).length;
    expect(dupCount).toBe(1);
  });

  it('handles a non-existent target by treating it as a glob pattern', async () => {
    // Should not throw — non-existent targets fall back to glob
    const files = await collectTargetFiles(tempDir, ['non-existent/**'], ['.ts'], [], []);
    expect(Array.isArray(files)).toBe(true);
  });
});
