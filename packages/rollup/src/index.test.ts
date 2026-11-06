import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import typestylesRollupPlugin, { extractNamespaces } from './index';

/** Rollup plugin hooks may be a function or `{ handler }`. */
function rollupHookFn<F>(hook: F | { handler: F } | undefined | null): F | undefined {
  if (hook == null) return undefined;
  if (typeof hook === 'function') return hook;
  return (hook as { handler: F }).handler;
}

describe('extractNamespaces', () => {
  it('extracts styles and tokens namespaces', () => {
    const code = `
      import { createTypeStyles } from 'typestyles';
      const { recipe, tokens } = createTypeStyles();
      const color = tokens.create('color', { primary: '#0066ff' });
      const button = recipe({ name: 'button', styles: { base: { color: color.primary } } });
    `;
    const result = extractNamespaces(code);
    expect(result.keys).toEqual(['tokens:color']);
    expect(result.prefixes).toEqual(['.button-']);
  });

  it('extracts styles.class namespaces as prefixes', () => {
    const code = `
      import { createStyles } from 'typestyles';
const styles = createStyles();
      styles.class('hero', { display: 'flex' });
    `;
    const result = extractNamespaces(code);
    expect(result.prefixes).toEqual(['.hero-']);
    expect(result.keys).toEqual([]);
  });
});

describe('typestylesRollupPlugin', () => {
  it('discovers a convention entry and emits CSS in build mode', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-rollup-disco-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src/typestyles-entry.ts'),
      `import { createTypeStyles } from 'typestyles';
const { recipe } = createTypeStyles();
recipe({ name: 'rollup-convention', styles: { base: { color: 'red' } } });`,
    );

    const plugin = typestylesRollupPlugin({ root: dir });
    const buildStart = rollupHookFn(plugin.buildStart);
    const generateBundle = rollupHookFn(plugin.generateBundle);
    if (buildStart == null || generateBundle == null) {
      throw new Error('expected buildStart and generateBundle hooks');
    }

    const emitted: Array<{ fileName: string; source: string }> = [];
    const ctx = {
      emitFile(file: { type: 'asset'; fileName: string; source: string }) {
        emitted.push({ fileName: file.fileName, source: file.source });
      },
      error(message: string) {
        throw new Error(message);
      },
    };

    await buildStart.call(ctx as never);
    await generateBundle.call(ctx as never);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.fileName).toBe('typestyles.css');
    expect(emitted[0]?.source).toContain('rollup-convention');
  });

  it('extracts tokens.create and createTheme CSS into the emitted asset', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-rollup-theme-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src/typestyles-entry.ts'),
      `import { createTokens, createTheme } from 'typestyles';
const tokens = createTokens();
const color = tokens.create('rollup-color', { primary: '#0066ff' });
createTheme('rollup-dark', { base: { 'rollup-color': { primary: '#66aaff' } } });`,
    );

    const plugin = typestylesRollupPlugin({ root: dir });
    const buildStart = rollupHookFn(plugin.buildStart);
    const generateBundle = rollupHookFn(plugin.generateBundle);
    if (buildStart == null || generateBundle == null) {
      throw new Error('expected buildStart and generateBundle hooks');
    }

    const emitted: Array<{ fileName: string; source: string }> = [];
    const ctx = {
      emitFile(file: { type: 'asset'; fileName: string; source: string }) {
        emitted.push({ fileName: file.fileName, source: file.source });
      },
      error(message: string) {
        throw new Error(message);
      },
    };

    await buildStart.call(ctx as never);
    await generateBundle.call(ctx as never);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.source).toContain('--rollup-color-primary: #0066ff');
    expect(emitted[0]?.source).toContain('.theme-rollup-dark');
    expect(emitted[0]?.source).toContain('--rollup-color-primary: #66aaff');
  });

  it('errors when the same style namespace is used in another module', async () => {
    const plugin = typestylesRollupPlugin();
    const transform = rollupHookFn(plugin.transform);
    if (transform == null) throw new Error('expected plugin.transform');
    const codeA = `import { createTypeStyles } from 'typestyles';
const { recipe } = createTypeStyles();
recipe({ name: 'rollup-dup', styles: { base: { color: 'red' } } });`;
    const codeB = `import { createTypeStyles } from 'typestyles';
const { recipe } = createTypeStyles();
recipe({ name: 'rollup-dup', styles: { base: { color: 'blue' } } });`;

    const ctx = {
      error(message: string) {
        throw new Error(message);
      },
    };

    await transform.call(ctx as never, codeA, '/src/a.ts');
    expect(() => transform.call(ctx as never, codeB, '/src/b.ts')).toThrow(
      /\[typestyles\] Style namespace "rollup-dup"/,
    );
  });

  describe('zero-runtime sheet redirect', () => {
    const REAL = '/n/node_modules/typestyles/dist/sheet.js';

    async function redirect(
      plugin: ReturnType<typeof typestylesRollupPlugin>,
      source: string,
      resolvedId = REAL,
    ): Promise<unknown> {
      const buildStart = rollupHookFn(plugin.buildStart);
      const resolveId = rollupHookFn(plugin.resolveId);
      if (buildStart == null || resolveId == null) {
        throw new Error('expected buildStart and resolveId hooks');
      }
      const context = { resolve: async () => ({ id: resolvedId }) };
      await buildStart.call(context as never);
      return resolveId.call(context as never, source, '/n/node_modules/typestyles/dist/index.js');
    }

    it('points the sheet at the no-op sheet in build mode', async () => {
      const plugin = typestylesRollupPlugin({
        mode: 'build',
        extract: { modules: ['src/typestyles-entry.ts'] },
      });
      expect(await redirect(plugin, './sheet.js')).toEqual({
        id: '/n/node_modules/typestyles/dist/sheet-noop.js',
      });
    });

    it('leaves other specifiers and other packages untouched', async () => {
      const plugin = typestylesRollupPlugin({
        mode: 'build',
        extract: { modules: ['src/typestyles-entry.ts'] },
      });
      expect(await redirect(plugin, 'typestyles')).toBeNull();
      expect(
        await redirect(plugin, './sheet.js', '/n/node_modules/other/dist/sheet.js'),
      ).toBeNull();
    });

    it('does not redirect in runtime or hybrid mode', async () => {
      for (const mode of ['runtime', 'hybrid'] as const) {
        const plugin = typestylesRollupPlugin({
          mode,
          extract: { modules: ['src/typestyles-entry.ts'] },
        });
        expect(await redirect(plugin, './sheet.js')).toBeNull();
      }
    });
  });
});

describe('compile option (real bundle)', () => {
  async function bundleApp(compile: boolean): Promise<string> {
    const { rollup } = await import('rollup');
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join, resolve } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-rollup-compile-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    const tsDist = resolve(import.meta.dirname, '../../typestyles/dist');
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
      join(dir, 'src/main.js'),
      `import { button } from './styles.js';\nconsole.log(JSON.stringify(button({ tone: 'b' }).props));`,
    );
    writeFileSync(join(dir, 'src/entry.js'), `import './styles.js';`);
    const resolveTypestyles = {
      name: 'resolve-typestyles',
      resolveId(source: string) {
        if (source === 'typestyles') return join(tsDist, 'index.js');
        if (source === 'typestyles/lite') return join(tsDist, 'lite.js');
        return null;
      },
    };
    const bundle = await rollup({
      input: join(dir, 'src/main.js'),
      onwarn() {},
      plugins: [
        resolveTypestyles,
        typestylesRollupPlugin({
          root: dir,
          mode: 'build',
          compile,
          extract: { modules: ['src/entry.js'] },
        }),
      ],
    });
    const { output } = await bundle.generate({ format: 'es' });
    return output.map((o) => (o.type === 'chunk' ? o.code : '')).join('\n');
  }

  it('drops the style config and runtime from the bundle', async () => {
    const plain = await bundleApp(false);
    const compiled = await bundleApp(true);
    expect(plain).toContain('DISTINCTIVE');
    expect(compiled).not.toContain('DISTINCTIVE');
    expect(compiled).toContain('app-button');
    expect(compiled.length).toBeLessThan(plain.length / 2);
  }, 60_000);
});
