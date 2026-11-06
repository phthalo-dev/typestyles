import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'vite';
import { describe, expect, it } from 'vite-plus/test';
import typestyles from './index';

/** A tiny attribute-mode app: one variant recipe with a distinctive style value. */
function makeApp(mode: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'typestyles-vite-compile-'));
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
export const ts = createTypeStyles({ scopeId: 'app', mode: '${mode}' });
export const button = ts.recipe({
  name: 'button',
  variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
  styles: () => ({
    base: { color: 'rebeccapurple-DISTINCTIVE' },
    variants: { tone: { a: { color: 'red' }, b: { color: 'blue' } } },
  }),
});`,
  );
  writeFileSync(
    join(dir, 'src/main.js'),
    `import { button } from './styles.js';
console.log(JSON.stringify(button({ tone: 'b' }).props));`,
  );
  writeFileSync(join(dir, 'src/entry.js'), `import './styles.js';`);
  return dir;
}

async function bundle(
  dir: string,
  compile: boolean,
  warnings: string[] = [],
): Promise<{ js: string; css: string }> {
  const outDir = join(dir, compile ? 'out-compile' : 'out-plain');
  await build({
    root: dir,
    logLevel: 'silent',
    plugins: [
      compile
        ? typestyles({ mode: 'build', compile: true, extract: { modules: ['src/entry.js'] } })
        : typestyles({ mode: 'build', extract: { modules: ['src/entry.js'] } }),
    ],
    build: {
      outDir,
      minify: false,
      lib: { entry: 'src/main.js', formats: ['es'], fileName: 'main' },
      emptyOutDir: true,
      rollupOptions: {
        onwarn: (warning) => {
          warnings.push(warning.message);
        },
      },
    },
  });
  const files = readdirSync(outDir);
  const read = (ext: string) =>
    files
      .filter((f) => f.endsWith(ext))
      .map((f) => readFileSync(join(outDir, f), 'utf8'))
      .join('\n');
  return { js: read('.js') || read('.mjs'), css: read('.css') };
}

describe('typestyles({ compile: true })', () => {
  it.each(['attribute', 'semantic', 'bem', 'hashed'])(
    'replaces recipe definitions with plans without changing the CSS (%s mode)',
    async (mode) => {
      const dir = makeApp(mode);
      const plain = await bundle(dir, false);
      const compiled = await bundle(dir, true);

      // Without compile the style config ships in the client bundle; with it, it does not.
      expect(plain.js).toContain('DISTINCTIVE');
      expect(compiled.js).not.toContain('DISTINCTIVE');
      expect(compiled.js.length).toBeLessThan(plain.js.length);
      expect(compiled.js).not.toContain('serializeStyle');

      // Extraction still produced the same CSS (one run feeds both outputs).
      expect(compiled.css).toBe(plain.css);
      expect(compiled.css).toContain('rebeccapurple-DISTINCTIVE');
    },
    60_000,
  );

  it('returns a single plugin when compile is off and two when it is on', () => {
    expect(Array.isArray(typestyles({ extract: { modules: ['src/entry.js'] } }))).toBe(false);
    expect(typestyles({ compile: true, extract: { modules: ['src/entry.js'] } })).toHaveLength(2);
  });
});

describe('compile leaves a hint when the runtime must stay', () => {
  it('names the module that still uses the runtime', async () => {
    const dir = makeApp('attribute');
    // A theme whose result the app reads at runtime can't be replaced by a plan.
    writeFileSync(
      join(dir, 'src/theme.js'),
      `import { ts } from './styles.js';
export const dark = ts.tokens.createTheme({ name: 'dark', tokens: { color: { text: '#fff' } } });`,
    );
    writeFileSync(
      join(dir, 'src/main.js'),
      `import { button } from './styles.js';
import { dark } from './theme.js';
console.log(JSON.stringify(button({ tone: 'b' }).props), dark.className);`,
    );
    const warnings: string[] = [];
    await bundle(dir, true, warnings);
    const hint = warnings.find((w) => w.includes('still in the client bundle'));
    expect(hint).toBeDefined();
    expect(hint).toContain('src/styles.js');
  }, 60_000);

  it('stays quiet when the runtime is gone', async () => {
    const warnings: string[] = [];
    await bundle(makeApp('attribute'), true, warnings);
    expect(warnings.find((w) => w.includes('still in the client bundle'))).toBeUndefined();
  }, 60_000);
});
