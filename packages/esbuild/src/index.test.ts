import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
import { describe, expect, it } from 'vite-plus/test';
import { verifyTypestylesBuild } from '@typestyles/build-runner';
import typestylesEsbuildPlugin from './index';

describe('typestylesEsbuildPlugin', () => {
  it('rewrites the external `typestyles` import to typestyles/core in build mode', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-esbuild-core-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src/typestyles-entry.ts'),
      `import { createTypeStyles } from 'typestyles';
const { recipe } = createTypeStyles();
recipe({ name: 'esbuild-core', styles: { base: { color: 'red' } } });`,
    );
    writeFileSync(
      join(dir, 'src/main.ts'),
      `import { createTypeStyles } from 'typestyles';
const t = createTypeStyles({ scopeId: 'core' });
export const noop = () => void t;`,
    );

    const result = await build({
      entryPoints: [join(dir, 'src/main.ts')],
      bundle: true,
      write: false,
      platform: 'browser',
      external: ['typestyles'],
      plugins: [typestylesEsbuildPlugin({ root: dir })],
    });
    const text = result.outputFiles?.[0]?.text ?? '';
    // esbuild matches `external` against the original specifier but rewrites
    // the emitted import through the alias — the runtime barrel becomes core.
    expect(text).toContain('typestyles/core');
    expect(text).not.toContain('require("typestyles")');
  });

  it('leaves the typestyles import untouched outside the client build swap', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-esbuild-runtime-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src/main.ts'), `export const noop = () => {};`);

    const result = await build({
      entryPoints: [join(dir, 'src/main.ts')],
      bundle: true,
      write: false,
      platform: 'browser',
      external: ['typestyles'],
      plugins: [typestylesEsbuildPlugin({ root: dir })],
    });
    expect(result.outputFiles?.[0]?.text).not.toContain('typestyles/core');
  });

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
