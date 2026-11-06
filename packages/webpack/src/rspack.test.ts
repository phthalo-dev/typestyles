import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import { rspack } from '@rspack/core';
import TypestylesWebpackPlugin from './index';

/**
 * Rspack implements webpack's plugin API, so `@typestyles/webpack` is the
 * Rspack integration too. These tests run real Rspack builds.
 */
async function bundleWithRspack(mode: 'build' | 'runtime', name: string) {
  const dir = mkdtempSync(join(tmpdir(), `typestyles-rspack-${name}-`));
  const outdir = join(dir, 'dist');
  mkdirSync(join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  symlinkSync(
    resolve(import.meta.dirname, '../../typestyles'),
    join(dir, 'node_modules/typestyles'),
    'dir',
  );
  writeFileSync(
    join(dir, 'src/typestyles-entry.js'),
    `import { createTypeStyles } from 'typestyles';
const { recipe } = createTypeStyles();
recipe({ name: 'rspack-${name}', styles: { base: { color: 'red' } } });`,
  );
  writeFileSync(
    join(dir, 'src/index.js'),
    `import { createTypeStyles } from 'typestyles';
import { atProperty } from 'typestyles/css';
const t = createTypeStyles({ scopeId: '${name}' });
atProperty('--x', { syntax: '<color>', inherits: false, initialValue: 'red' });
export const noop = () => void t;`,
  );

  await new Promise<void>((resolvePromise, reject) => {
    rspack(
      {
        mode: 'production',
        context: dir,
        entry: './src/index.js',
        target: 'web',
        optimization: { minimize: false },
        output: { path: outdir, filename: 'index.js' },
        plugins: [new TypestylesWebpackPlugin({ root: dir, mode })],
      },
      (error, stats) => {
        if (error) reject(error);
        else if (stats?.hasErrors()) reject(new Error(stats.toString()));
        else resolvePromise();
      },
    );
  });
  return {
    bundle: readFileSync(join(outdir, 'index.js'), 'utf8'),
    files: readdirSync(outdir),
    outdir,
  };
}

describe('TypestylesWebpackPlugin on Rspack', () => {
  it('ships no CSS runtime (for every subpath) and emits typestyles.css in build mode', async () => {
    const { bundle, files, outdir } = await bundleWithRspack('build', 'zero');
    expect(bundle).not.toContain('typestyles-fallback');
    expect(bundle).not.toContain('styleElement');
    expect(files).toContain('typestyles.css');
    expect(readFileSync(join(outdir, 'typestyles.css'), 'utf8')).toContain('color: red');
  }, 30_000);

  it('keeps the CSS runtime in runtime mode', async () => {
    const { bundle } = await bundleWithRspack('runtime', 'full');
    expect(bundle).toContain('typestyles-fallback');
  }, 30_000);
});
