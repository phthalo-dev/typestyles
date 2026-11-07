import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { SourceMap } from 'node:module';
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

describe('compile option (real bundle)', () => {
  async function bundleApp(
    compile: boolean,
    ext: 'js' | 'ts',
    {
      main,
      files = {},
      sourcemap = false,
    }: { main?: string; files?: Record<string, string>; sourcemap?: boolean } = {},
  ): Promise<string> {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-esbuild-compile-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    symlinkSync(
      resolve(import.meta.dirname, '../../typestyles'),
      join(dir, 'node_modules/typestyles'),
      'dir',
    );
    const typeAnnotation = ext === 'ts' ? ': string' : '';
    writeFileSync(
      join(dir, `src/styles.${ext}`),
      `import { createTypeStyles, variant } from 'typestyles';
const label${typeAnnotation} = 'x';
export const ts = createTypeStyles({ scopeId: 'app', mode: 'attribute' });
export const button = ts.recipe({
  name: 'button',
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({ base: { color: 'rebeccapurple-DISTINCTIVE' }, variants: { tone: { a: {}, b: {} } } }),
});
export { label };`,
    );
    writeFileSync(
      join(dir, 'src/main.js'),
      main ??
        `import { button } from './styles';\nconsole.log(JSON.stringify(button({ tone: 'b' }).props));`,
    );
    writeFileSync(join(dir, 'src/typestyles-entry.js'), `import './styles';`);
    for (const [file, code] of Object.entries(files)) writeFileSync(join(dir, file), code);
    const result = await build({
      entryPoints: [join(dir, 'src/main.js')],
      bundle: true,
      write: false,
      platform: 'browser',
      format: 'esm',
      logLevel: 'silent',
      sourcemap: sourcemap ? 'inline' : false,
      plugins: [
        typestylesEsbuildPlugin({
          root: dir,
          mode: 'build',
          compile,
          extract: { modules: ['src/typestyles-entry.js'] },
        }),
      ],
    });
    return result.outputFiles?.[0]?.text ?? '';
  }

  it.each(['js', 'ts'] as const)(
    'drops the style config and runtime (%s source)',
    async (ext) => {
      const plain = await bundleApp(false, ext);
      const compiled = await bundleApp(true, ext);
      expect(plain).toContain('DISTINCTIVE');
      expect(compiled).not.toContain('DISTINCTIVE');
      expect(compiled).toContain('app-button');
      expect(compiled.length).toBeLessThan(plain.length / 2);
    },
    60_000,
  );

  it('still reports duplicate recipe names in modules it rewrites', async () => {
    const dup = (color: string) => `import { createTypeStyles, variant } from 'typestyles';
const { recipe } = createTypeStyles({ scopeId: 'app', mode: 'attribute' });
export const copy = recipe({ name: 'dup', variants: { tone: variant.enum(['a'], { default: 'a' }) }, styles: () => ({ base: { color: '${color}' }, variants: { tone: { a: {} } } }) });`;
    const files = {
      // Only `a.js` is extracted, so `dup` has one plan and both modules get rewritten.
      'src/typestyles-entry.js': `import './a.js';`,
      'src/a.js': dup('red'),
      'src/b.js': dup('blue'),
    };
    const main = `import { copy as a } from './a.js';\nimport { copy as b } from './b.js';\nconsole.log(a(), b());`;
    await expect(bundleApp(true, 'js', { main, files })).rejects.toThrow(
      /\[typestyles\] Style namespace "dup"/,
    );
  }, 60_000);

  it("strips TypeScript with the project's tsconfig.json", async () => {
    const main = `import { button, Box } from './styles';\nconsole.log(button().className, new Box());`;
    const files = {
      'tsconfig.json': JSON.stringify({ compilerOptions: { useDefineForClassFields: false } }),
      'src/styles.ts': `import { createTypeStyles, variant } from 'typestyles';
export class Box { size: number = 1; }
export const ts = createTypeStyles({ scopeId: 'app', mode: 'attribute' });
export const button = ts.recipe({
  name: 'button',
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({ base: { color: 'red' }, variants: { tone: { a: {}, b: {} } } }),
});`,
    };
    const out = await bundleApp(true, 'ts', { main, files });
    expect(out).toContain('app-button');
    // `useDefineForClassFields: false` assigns in the constructor instead of declaring a field.
    expect(out).toContain('this.size = 1');
  }, 60_000);

  it('maps rewritten TypeScript back to the original source', async () => {
    // The interface disappears when types are stripped, so the TS -> JS step moves lines too.
    const files = {
      'src/styles.ts': `import { createTypeStyles, variant } from 'typestyles';
interface Props {
  tone: 'a' | 'b';
}
export const ts = createTypeStyles({ scopeId: 'app', mode: 'attribute' });
export const button = ts.recipe({
  name: 'button',
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({ base: { color: 'red' }, variants: { tone: { a: {}, b: {} } } }),
});
export type { Props };`,
    };
    const out = await bundleApp(true, 'ts', { sourcemap: true, files });
    const encoded = /sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)\s*$/.exec(
      out,
    );
    expect(encoded).not.toBeNull();
    const map = JSON.parse(Buffer.from(encoded![1]!, 'base64').toString('utf8'));
    const lines = out.split('\n');
    const line = lines.findIndex((text) => /\bbutton = /.test(text));
    const entry = new SourceMap(map).findEntry(line, lines[line]!.indexOf('button'));
    expect('originalSource' in entry && entry.originalSource).toMatch(/src\/styles\.ts$/);
    // `export const button = ts.recipe({` is line 6 of styles.ts.
    expect('originalLine' in entry && entry.originalLine).toBe(5);
  }, 60_000);
});
