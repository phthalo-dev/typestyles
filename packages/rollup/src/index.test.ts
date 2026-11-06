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

  describe('typestyles -> typestyles/core resolve swap', () => {
    function makeSwapContext(): {
      context: { resolve(source: string, importer?: string): Promise<unknown> };
      lastResolveArgs: () => { source: string; importer: string | undefined } | null;
    } {
      let last: { source: string; importer: string | undefined } | null = null;
      return {
        lastResolveArgs: () => last,
        context: {
          async resolve(source: string, importer?: string) {
            last = { source, importer };
            return { id: `/node_modules/typestyles/dist/${source.replace('typestyles/', '')}.js` };
          },
        },
      };
    }

    async function swapResolution(
      plugin: ReturnType<typeof typestylesRollupPlugin>,
      source: string,
      importer: string,
    ): Promise<{
      resolved: unknown;
      resolveArgs: { source: string; importer: string | undefined } | null;
    }> {
      const buildStart = rollupHookFn(plugin.buildStart);
      const resolveId = rollupHookFn(plugin.resolveId);
      if (buildStart == null || resolveId == null) {
        throw new Error('expected buildStart and resolveId hooks');
      }
      const { context, lastResolveArgs } = makeSwapContext();
      await buildStart.call(context as never);
      const resolved = await resolveId.call(context as never, source, importer);
      return { resolved, resolveArgs: lastResolveArgs() };
    }

    it('resolves the runtime barrel to the core build in build mode', async () => {
      const plugin = typestylesRollupPlugin({
        mode: 'build',
        extract: { modules: ['src/typestyles-entry.ts'] },
      });
      const result = await swapResolution(plugin, 'typestyles', '/src/main.ts');
      expect(result.resolveArgs).toEqual({ source: 'typestyles/core', importer: '/src/main.ts' });
      expect(result.resolved).toEqual({ id: '/node_modules/typestyles/dist/core.js' });
    });

    it('leaves subpath imports untouched', async () => {
      const plugin = typestylesRollupPlugin({
        mode: 'build',
        extract: { modules: ['src/typestyles-entry.ts'] },
      });
      expect(
        (await swapResolution(plugin, 'typestyles/server', '/src/ssr.ts')).resolved,
      ).toBeNull();
    });

    it('does not swap in runtime or hybrid mode', async () => {
      for (const mode of ['runtime', 'hybrid'] as const) {
        const plugin = typestylesRollupPlugin({
          mode,
          extract: { modules: ['src/typestyles-entry.ts'] },
        });
        expect((await swapResolution(plugin, 'typestyles', '/src/main.ts')).resolved).toBeNull();
      }
    });
  });
});
