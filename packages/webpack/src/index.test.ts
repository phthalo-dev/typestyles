import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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

describe('compile option (real bundle)', () => {
  async function bundleApp(compile: boolean): Promise<string> {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-webpack-compile-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    symlinkSync(
      resolve(import.meta.dirname, '../../typestyles'),
      join(dir, 'node_modules/typestyles'),
      'dir',
    );
    writeFileSync(
      join(dir, 'src/styles.js'),
      `import { createTypeStyles, variant } from 'typestyles';
export const ts = createTypeStyles({ scopeId: 'app', mode: 'attribute' });
export const button = ts.recipe({
  name: 'button',
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({ base: { color: 'rebeccapurple-DISTINCTIVE' }, variants: { tone: { a: {}, b: {} } } }),
});`,
    );
    writeFileSync(
      join(dir, 'src/index.js'),
      `import { button } from './styles.js';\nconsole.log(JSON.stringify(button({ tone: 'b' }).props));`,
    );
    writeFileSync(join(dir, 'src/typestyles-entry.js'), `import './styles.js';`);
    const outdir = join(dir, 'dist');
    const compiler = webpack({
      mode: 'production',
      context: dir,
      entry: './src/index.js',
      output: { path: outdir, filename: 'index.js' },
      // webpack drops pure-annotated unused calls in its minifier, not while bundling.
      optimization: { minimize: true },
      plugins: [
        new TypestylesWebpackPlugin({
          root: dir,
          mode: 'build',
          compile,
          extract: { modules: ['src/typestyles-entry.js'] },
        }),
      ],
    });
    await new Promise<void>((resolvePromise, reject) => {
      compiler?.run((error, stats) => {
        if (error) reject(error);
        else if (stats?.hasErrors()) reject(new Error(stats.toString()));
        else resolvePromise();
      });
    });
    return readFileSync(join(outdir, 'index.js'), 'utf8');
  }

  it('drops the style config and runtime from the bundle', async () => {
    const plain = await bundleApp(false);
    const compiled = await bundleApp(true);
    expect(plain).toContain('DISTINCTIVE');
    expect(compiled).not.toContain('DISTINCTIVE');
    expect(compiled).toContain('app-button');
    expect(compiled.length).toBeLessThan(plain.length / 2);
  }, 60_000);
  it('re-plans a cached module when a module it depends on changes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-webpack-compile-cache-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    symlinkSync(
      resolve(import.meta.dirname, '../../typestyles'),
      join(dir, 'node_modules/typestyles'),
      'dir',
    );
    // The class names come from `config.js`; `styles.js` itself never changes.
    writeFileSync(join(dir, 'src/config.js'), `export const scope = 'first';`);
    writeFileSync(
      join(dir, 'src/styles.js'),
      `import { createTypeStyles, variant } from 'typestyles';
import { scope } from './config.js';
export const ts = createTypeStyles({ scopeId: scope, mode: 'attribute' });
export const button = ts.recipe({
  name: 'button',
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({ base: { color: 'red' }, variants: { tone: { a: {}, b: {} } } }),
});`,
    );
    writeFileSync(
      join(dir, 'src/index.js'),
      `import { button } from './styles.js';\nconsole.log(JSON.stringify(button({ tone: 'b' }).props));`,
    );
    writeFileSync(join(dir, 'src/typestyles-entry.js'), `import './styles.js';`);
    const outdir = join(dir, 'dist');
    const compiler = webpack({
      mode: 'production',
      context: dir,
      entry: './src/index.js',
      output: { path: outdir, filename: 'index.js' },
      cache: { type: 'memory' },
      optimization: { minimize: false },
      plugins: [
        new TypestylesWebpackPlugin({
          root: dir,
          mode: 'build',
          compile: true,
          extract: { modules: ['src/typestyles-entry.js'] },
        }),
      ],
    });
    const run = () =>
      new Promise<string>((resolvePromise, reject) => {
        compiler?.run((error, stats) => {
          if (error) reject(error);
          else if (stats?.hasErrors()) reject(new Error(stats.toString()));
          else resolvePromise(readFileSync(join(outdir, 'index.js'), 'utf8'));
        });
      });

    expect(await run()).toContain('first-button');
    writeFileSync(join(dir, 'src/config.js'), `export const scope = 'second';`);
    const second = await run();
    expect(second).toContain('second-button');
    expect(second).not.toContain('first-button');
    expect(readFileSync(join(outdir, 'typestyles.css'), 'utf8')).toContain('second-button');
  }, 60_000);
});
