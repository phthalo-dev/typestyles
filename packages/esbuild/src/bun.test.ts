import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';

/**
 * `Bun.build` accepts esbuild-style plugins and exposes an esbuild-compatible
 * `initialOptions.platform` (`node` for `bun`/`node` targets), so
 * `@typestyles/esbuild` is the Bun integration too. Skipped where Bun is not
 * installed.
 */
const hasBun = spawnSync('bun', ['--version'], { encoding: 'utf8' }).status === 0;

function bunBundle(mode: 'build' | 'runtime', target: 'browser' | 'bun'): string {
  const dir = mkdtempSync(join(tmpdir(), `typestyles-bun-${mode}-${target}-`));
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
recipe({ name: 'bun-${mode}', styles: { base: { color: 'red' } } });`,
  );
  writeFileSync(
    join(dir, 'src/main.js'),
    `import { createTypeStyles } from 'typestyles';
import { atProperty } from 'typestyles/css';
const t = createTypeStyles({ scopeId: 'bun' });
atProperty('--x', { syntax: '<color>', inherits: false, initialValue: 'red' });
export const noop = () => void t;`,
  );
  writeFileSync(
    join(dir, 'build.mjs'),
    `import plugin from ${JSON.stringify(resolve(import.meta.dirname, './index.ts'))};
const r = await Bun.build({
  entrypoints: ['./src/main.js'],
  target: ${JSON.stringify(target)},
  plugins: [plugin({ root: process.cwd(), mode: ${JSON.stringify(mode)} })],
});
if (!r.success) { console.error(r.logs.join('\\n')); process.exit(1); }
process.stdout.write(await r.outputs[0].text());`,
  );
  const result = spawnSync('bun', ['build.mjs'], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  if (result.status !== 0) throw new Error(result.stderr || 'bun build failed');
  return result.stdout;
}

describe.skipIf(!hasBun)('@typestyles/esbuild on Bun', () => {
  it('ships no CSS runtime for browser targets in build mode', () => {
    const text = bunBundle('build', 'browser');
    expect(text).not.toContain('typestyles-fallback');
    expect(text).not.toContain('styleElement');
  }, 30_000);

  it('keeps the CSS runtime in runtime mode', () => {
    expect(bunBundle('runtime', 'browser')).toContain('typestyles-fallback');
  }, 30_000);

  it('keeps the CSS runtime for bun (server) targets even in build mode', () => {
    expect(bunBundle('build', 'bun')).toContain('typestyles-fallback');
  }, 30_000);
});

describe.skipIf(!hasBun)('@typestyles/esbuild compile on Bun', () => {
  function bunCompileBundle(compile: boolean): string {
    const dir = mkdtempSync(join(tmpdir(), `typestyles-bun-compile-${compile}-`));
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
      join(dir, 'src/main.js'),
      `import { button } from './styles.js';\nconsole.log(JSON.stringify(button({ tone: 'b' }).props));`,
    );
    writeFileSync(join(dir, 'src/typestyles-entry.js'), `import './styles.js';`);
    writeFileSync(
      join(dir, 'build.mjs'),
      `import plugin from ${JSON.stringify(resolve(import.meta.dirname, './index.ts'))};
const r = await Bun.build({
  entrypoints: ['./src/main.js'],
  target: 'browser',
  plugins: [plugin({ root: process.cwd(), mode: 'build', compile: ${compile}, extract: { modules: ['src/typestyles-entry.js'] } })],
});
if (!r.success) { console.error(r.logs.join('\\\\n')); process.exit(1); }
process.stdout.write(await r.outputs[0].text());`,
    );
    const result = spawnSync('bun', ['build.mjs'], {
      cwd: dir,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    });
    if (result.status !== 0) throw new Error(result.stderr || 'bun build failed');
    return result.stdout;
  }

  it('drops the style config and runtime from the bundle', () => {
    const plain = bunCompileBundle(false);
    const compiled = bunCompileBundle(true);
    expect(plain).toContain('DISTINCTIVE');
    expect(compiled).not.toContain('DISTINCTIVE');
    expect(compiled).toContain('app-button');
    expect(compiled.length).toBeLessThan(plain.length / 2);
  }, 60_000);
});
