import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
import { describe, expect, it } from 'vite-plus/test';
import { verifyTypestylesBuild } from '@typestyles/build-runner';
import typestylesEsbuildPlugin from './index';

describe('typestylesEsbuildPlugin', () => {
  async function bundleWith(mode: 'build' | 'runtime', name: string): Promise<string> {
    const dir = mkdtempSync(join(tmpdir(), `typestyles-esbuild-${name}-`));
    mkdirSync(join(dir, 'src'), { recursive: true });
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    symlinkSync(
      resolve(import.meta.dirname, '../../typestyles'),
      join(dir, 'node_modules/typestyles'),
      'dir',
    );
    writeFileSync(
      join(dir, 'src/typestyles-entry.ts'),
      `import { createTypeStyles } from 'typestyles';
const { recipe } = createTypeStyles();
recipe({ name: 'esbuild-${name}', styles: { base: { color: 'red' } } });`,
    );
    writeFileSync(
      join(dir, 'src/main.ts'),
      `import { createTypeStyles } from 'typestyles';
import { atProperty } from 'typestyles/css';
const t = createTypeStyles({ scopeId: '${name}' });
atProperty('--x', { syntax: '<color>', inherits: false, initialValue: 'red' });
export const noop = () => void t;`,
    );
    const result = await build({
      entryPoints: [join(dir, 'src/main.ts')],
      bundle: true,
      write: false,
      platform: 'browser',
      format: 'esm',
      logLevel: 'silent',
      plugins: [typestylesEsbuildPlugin({ root: dir, mode })],
    });
    return result.outputFiles?.[0]?.text ?? '';
  }

  it('bundles the no-op sheet (for every subpath) in build mode', async () => {
    const text = await bundleWith('build', 'zero');
    // The real sheet ships `typestyles-fallback` + `styleElement` DOM plumbing.
    expect(text).not.toContain('typestyles-fallback');
    expect(text).not.toContain('styleElement');
  }, 20_000);

  // Regression guard for the "zero runtime really counts" promise: every
  // client-reachable typestyles entry point must end up without the real sheet.
  // Entry points come from typestyles' own `exports`, so a new subpath is
  // covered automatically (node-only ones are skipped).
  const NODE_ONLY = new Set(['./server', './build', './hmr', './testing', './package.json']);
  const typestylesPkg = JSON.parse(
    readFileSync(resolve(import.meta.dirname, '../../typestyles/package.json'), 'utf8'),
  ) as { exports: Record<string, unknown> };
  const clientSubpaths = Object.keys(typestylesPkg.exports).filter((k) => !NODE_ONLY.has(k));

  it.each(clientSubpaths)(
    'ships no CSS runtime when importing %s in build mode',
    async (sub) => {
      const specifier = sub === '.' ? 'typestyles' : `typestyles/${sub.slice(2)}`;
      const dir = mkdtempSync(join(tmpdir(), 'typestyles-esbuild-guard-'));
      mkdirSync(join(dir, 'src'), { recursive: true });
      mkdirSync(join(dir, 'node_modules'), { recursive: true });
      symlinkSync(
        resolve(import.meta.dirname, '../../typestyles'),
        join(dir, 'node_modules/typestyles'),
        'dir',
      );
      writeFileSync(
        join(dir, 'src/typestyles-entry.ts'),
        `import { createTypeStyles } from 'typestyles';
const { recipe } = createTypeStyles();
recipe({ name: 'guard', styles: { base: { color: 'red' } } });`,
      );
      writeFileSync(
        join(dir, 'src/main.ts'),
        `import * as m from '${specifier}';\nexport default m;\n`,
      );
      const result = await build({
        entryPoints: [join(dir, 'src/main.ts')],
        bundle: true,
        write: false,
        platform: 'browser',
        format: 'esm',
        logLevel: 'silent',
        metafile: true,
        plugins: [typestylesEsbuildPlugin({ root: dir, mode: 'build' })],
      });
      const inputs = Object.keys(result.metafile?.inputs ?? {});
      // Compare on the compiled file the bundler actually read, not source maps.
      expect(inputs.filter((id) => /typestyles\/dist\/sheet\.c?js$/.test(id))).toEqual([]);
      expect(result.outputFiles?.[0]?.text ?? '').not.toContain('typestyles-fallback');
    },
    20_000,
  );

  it('keeps the CSS runtime in runtime mode', async () => {
    const text = await bundleWith('runtime', 'full');
    expect(text).toContain('typestyles-fallback');
  }, 20_000);

  it('discovers a convention entry and writes typestyles.css on build', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-esbuild-disco-'));
    const outdir = join(dir, 'dist');
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src/typestyles-entry.ts'),
      `import { createTypeStyles } from 'typestyles';
const { recipe } = createTypeStyles();
recipe({ name: 'esbuild-convention', styles: { base: { color: 'green' } } });`,
    );
    writeFileSync(
      join(dir, 'src/main.ts'),
      `import { createStyles } from 'typestyles';
const styles = createStyles();
export const label = styles.component({ name: 'esbuild-label', styles: { base: { fontSize: '14px' } } });`,
    );

    await build({
      entryPoints: [join(dir, 'src/main.ts')],
      bundle: true,
      outfile: join(outdir, 'index.js'),
      platform: 'browser',
      external: ['typestyles'],
      plugins: [typestylesEsbuildPlugin({ root: dir })],
    });

    const cssPath = join(outdir, 'typestyles.css');
    expect(existsSync(cssPath)).toBe(true);
    const css = await import('node:fs/promises').then((fs) => fs.readFile(cssPath, 'utf8'));
    expect(css).toContain('esbuild-convention');
  });

  it('extracts tokens.create and createTheme CSS into the written stylesheet', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-esbuild-theme-'));
    const outdir = join(dir, 'dist');
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src/typestyles-entry.ts'),
      `import { createTokens, createTheme } from 'typestyles';
const tokens = createTokens();
const color = tokens.create('esbuild-color', { primary: '#0066ff' });
createTheme('esbuild-dark', { base: { 'esbuild-color': { primary: '#66aaff' } } });`,
    );
    writeFileSync(join(dir, 'src/main.ts'), `export const noop = () => {};`);

    await build({
      entryPoints: [join(dir, 'src/main.ts')],
      bundle: true,
      outfile: join(outdir, 'index.js'),
      platform: 'browser',
      external: ['typestyles'],
      plugins: [typestylesEsbuildPlugin({ root: dir })],
    });

    // Theme/token CSS is a byproduct of normal extraction — verify with the P1.7 build verifier.
    const result = verifyTypestylesBuild({
      root: dir,
      cssFile: 'dist/typestyles.css',
      requiredCssSubstrings: [
        '--esbuild-color-primary: #0066ff',
        '.theme-esbuild-dark',
        '--esbuild-color-primary: #66aaff',
      ],
    });
    expect(result.cssBytes).toBeGreaterThan(0);
  });
});
