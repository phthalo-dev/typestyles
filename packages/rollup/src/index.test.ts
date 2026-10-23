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
});
