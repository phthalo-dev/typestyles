import { describe, it, expect } from 'vite-plus/test';
import { mkdtemp, rm, writeFile, readdir, readFile, mkdir } from 'node:fs/promises';
import { existsSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'vite';
import type { Plugin } from 'vite';
import type defaultTypestylesPlugin from './index';

type PluginForTest = typeof defaultTypestylesPlugin;

async function getPlugin(): Promise<PluginForTest> {
  const cached = (globalThis as Record<string, unknown>).__typestylesPluginForTest as
    | PluginForTest
    | undefined;
  if (cached) return cached;
  const mod = await import('./index');
  (globalThis as Record<string, unknown>).__typestylesPluginForTest = mod.default;
  return mod.default;
}

async function makeSourceMapApp(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'typestyles-source-map-'));
  await mkdir(join(dir, 'src'));
  await mkdir(join(dir, 'node_modules'), { recursive: true });
  symlinkSync(
    resolve(import.meta.dirname, '../../typestyles'),
    join(dir, 'node_modules/typestyles'),
    'dir',
  );
  await writeFile(
    join(dir, 'index.html'),
    `<!doctype html><html><head></head><body><script type="module" src="/src/main.js"></script></body></html>`,
  );
  await writeFile(
    join(dir, 'src/main.js'),
    `import { styles } from './styles.js';
console.log(styles);`,
  );
  await writeFile(
    join(dir, 'src/styles.js'),
    `import { createStyles } from 'typestyles';
export const styles = createStyles({ scopeId: 'sm-test' });
styles.class('box', { padding: '8px' });`,
  );
  await writeFile(join(dir, 'src/entry.js'), `import './styles.js';`);
  return dir;
}

describe('typestyles({ extract: { sourceMap: true } })', () => {
  it('emits a CSS source map asset in build mode', async () => {
    const typestyles = await getPlugin();
    const dir = await makeSourceMapApp();
    const outDir = join(dir, 'dist');
    try {
      await build({
        root: dir,
        logLevel: 'silent',
        plugins: [
          typestyles({
            mode: 'build',
            extract: { modules: ['src/entry.js'], sourceMap: true },
          }) as Plugin,
        ],
        build: { outDir, minify: false },
      });

      const files = existsSync(outDir) ? await readdir(outDir, { recursive: true }) : [];
      const cssFiles = files.filter((f) => typeof f === 'string' && f.endsWith('.css'));
      const mapFiles = files.filter((f) => typeof f === 'string' && f.endsWith('.map'));

      expect(cssFiles.length).toBeGreaterThan(0);
      expect(mapFiles.length).toBeGreaterThan(0);

      const cssFile = cssFiles[0];
      if (!cssFile) throw new Error('expected a CSS file');
      const css = await readFile(join(outDir, cssFile), 'utf8');
      expect(css.includes('/*# sourceMappingURL=')).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
