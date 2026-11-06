import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import webpack from 'webpack';
import { verifyTypestylesBuild } from '@typestyles/build-runner';
import TypestylesWebpackPlugin from './index';

describe('TypestylesWebpackPlugin', () => {
  it('discovers a convention entry and emits typestyles.css', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-webpack-disco-'));
    const outdir = join(dir, 'dist');
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src/typestyles-entry.js'),
      `import { createTypeStyles } from 'typestyles';
const { recipe } = createTypeStyles();
recipe({ name: 'webpack-convention', styles: { base: { color: 'purple' } } });`,
    );
    writeFileSync(
      join(dir, 'src/index.js'),
      `import { createStyles } from 'typestyles';
const styles = createStyles();
export const badge = styles.component({ name: 'webpack-badge', styles: { base: { padding: '4px' } } });`,
    );

    const errors: Error[] = [];
    const compiler = webpack({
      mode: 'production',
      context: dir,
      entry: './src/index.js',
      output: {
        path: outdir,
        filename: 'index.js',
      },
      externals: {
        typestyles: 'typestyles',
      },
      plugins: [new TypestylesWebpackPlugin({ root: dir })],
    });

    await new Promise<void>((resolve, reject) => {
      compiler?.run((error, stats) => {
        if (error) {
          reject(error);
          return;
        }
        if (stats?.hasErrors()) {
          for (const detail of stats.compilation.errors) {
            errors.push(detail as Error);
          }
        }
        resolve();
      });
    });

    expect(errors).toEqual([]);

    const cssPath = join(outdir, 'typestyles.css');
    expect(existsSync(cssPath)).toBe(true);
    const css = await import('node:fs/promises').then((fs) => fs.readFile(cssPath, 'utf8'));
    expect(css).toContain('webpack-convention');
  }, 15_000);

  it('extracts tokens.create and createTheme CSS into the emitted stylesheet', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-webpack-theme-'));
    const outdir = join(dir, 'dist');
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src/typestyles-entry.js'),
      `import { createTokens, createTheme } from 'typestyles';
const tokens = createTokens();
const color = tokens.create('webpack-color', { primary: '#0066ff' });
createTheme('webpack-dark', { base: { 'webpack-color': { primary: '#66aaff' } } });`,
    );
    writeFileSync(join(dir, 'src/index.js'), `export const noop = () => {};`);

    const errors: Error[] = [];
    const compiler = webpack({
      mode: 'production',
      context: dir,
      entry: './src/index.js',
      output: {
        path: outdir,
        filename: 'index.js',
      },
      externals: {
        typestyles: 'typestyles',
      },
      plugins: [new TypestylesWebpackPlugin({ root: dir })],
    });

    await new Promise<void>((resolve, reject) => {
      compiler?.run((error, stats) => {
        if (error) {
          reject(error);
          return;
        }
        if (stats?.hasErrors()) {
          for (const detail of stats.compilation.errors) {
            errors.push(detail as Error);
          }
        }
        resolve();
      });
    });

    expect(errors).toEqual([]);

    // Theme/token CSS is a byproduct of normal extraction — verify with the P1.7 build verifier.
    const result = verifyTypestylesBuild({
      root: dir,
      cssFile: 'dist/typestyles.css',
      requiredCssSubstrings: [
        '--webpack-color-primary: #0066ff',
        '.theme-webpack-dark',
        '--webpack-color-primary: #66aaff',
      ],
    });
    expect(result.cssBytes).toBeGreaterThan(0);
  }, 15_000);

  it('bundles the no-op sheet instead of the CSS runtime in build mode', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-webpack-core-'));
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
recipe({ name: 'webpack-core', styles: { base: { color: 'red' } } });`,
    );
    writeFileSync(
      join(dir, 'src/index.js'),
      `import { createTypeStyles } from 'typestyles';
const t = createTypeStyles({ scopeId: 'core' });
export const noop = () => void t;`,
    );

    const errors: Error[] = [];
    const compiler = webpack({
      mode: 'production',
      context: dir,
      entry: './src/index.js',
      output: { path: outdir, filename: 'index.js' },
      plugins: [new TypestylesWebpackPlugin({ root: dir })],
    });

    await new Promise<void>((resolvePromise, reject) => {
      compiler?.run((error, stats) => {
        if (error) {
          reject(error);
          return;
        }
        if (stats?.hasErrors()) {
          for (const detail of stats.compilation.errors) {
            errors.push(detail as Error);
          }
        }
        resolvePromise();
      });
    });

    expect(errors).toEqual([]);

    const bundle = await import('node:fs/promises').then((fs) =>
      fs.readFile(join(outdir, 'index.js'), 'utf8'),
    );
    // The runtime sheet ships `typestyles-fallback` + `styleElement` DOM
    // plumbing; the no-op sheet contains neither.
    expect(bundle).not.toContain('typestyles-fallback');
    expect(bundle).not.toContain('styleElement');
  }, 15_000);
});
