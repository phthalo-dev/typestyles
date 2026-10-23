/**
 * Libraries that export a `recipe()` result must be able to emit `.d.ts` files.
 *
 * `RecipeCallResult` has to stay a name the consumer can print. Expanding it
 * inlines `recipeDefinitionBrand` from an internal `dist/types-*.d.ts` chunk,
 * which is TS4023 (issue #278).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';

const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/bin/tsc');
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = join(packageRoot, 'dist/index.d.ts');

const librarySource = `
import { createTypeStyles, variant } from 'typestyles';

const styles = createTypeStyles({ scopeId: 'demo' });

export const button = styles.recipe({
  name: 'button',
  styles: () => ({ base: { color: 'red' } }),
});

export const box = styles.recipe({
  name: 'box',
  vars: { size: '1rem' },
  styles: ({ vars }) => ({ base: { width: vars.size.var } }),
});

export const layout = styles.recipe({
  name: 'layout',
  slots: ['root', 'stack'],
  styles: { base: { root: { display: 'flex' }, stack: { display: 'grid' } } },
});

const tone = variant.enum(['info', 'danger'], { default: 'info' });

export const alert = styles.recipe({
  name: 'alert',
  variants: { tone },
  slots: ['root'],
  vars: { surface: '#fff' },
  styles: ({ vars }) => ({
    base: { root: { color: vars.surface.var } },
    variants: {
      tone: {
        info: { root: {} },
        danger: { root: {} },
      },
    },
  }),
});
`;

const downstreamSource = `
import type { OverrideConfigFor } from 'typestyles';
import { alert, box, button, layout } from './lib';

const root: string = layout.root;
const size: string = box.vars.size.var;
void button().className;
void root;
void size;

const ok: OverrideConfigFor<typeof alert> = {
  base: { root: { color: 'red' } },
  variants: {
    tone: {
      info: { root: { color: 'blue' } },
      danger: { root: {} },
    },
  },
  vars: { surface: '#000' },
};
void ok;

const bad: OverrideConfigFor<typeof alert> = {
  variants: {
    tone: {
      // @ts-expect-error — "nope" is not a declared option
      nope: { root: {} },
    },
  },
};
void bad;

const noVars: OverrideConfigFor<typeof button> = {
  base: { color: 'red' },
  // @ts-expect-error — this recipe declared no vars
  vars: { size: '1rem' },
};
void noVars;
`;

function emitDeclarations(project: string) {
  try {
    execFileSync(tsc, ['-p', project, '--pretty', 'false'], {
      encoding: 'utf8',
      cwd: packageRoot,
    });
  } catch (error) {
    const failed = error as { stderr?: string; stdout?: string };
    const output = failed.stderr || failed.stdout;
    throw new Error(output && output.length > 0 ? output : String(error));
  }
}

function writeProject(dir: string, files: Record<string, string>, fileNames: string[]) {
  const config = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      declaration: true,
      emitDeclarationOnly: true,
      strict: true,
      skipLibCheck: true,
      outDir: 'out',
      rootDir: '.',
      paths: { typestyles: [distIndex] },
    },
    files: fileNames,
  };
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(config, null, 2));
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents);
  }
}

describe('recipe() declaration emit', () => {
  // Two cold `tsc` runs over the published typestyles program. Locally this is
  // under a second; GitHub runners exceed Vitest's 5s default.
  it('names RecipeCallResult in consumer .d.ts files and keeps override inference', () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-recipe-dts-'));
    writeProject(dir, { 'lib.ts': librarySource }, ['lib.ts']);

    emitDeclarations(dir);

    const emitted = readFileSync(join(dir, 'out/lib.d.ts'), 'utf8');
    expect(emitted).toContain('RecipeCallResult');
    expect(emitted).not.toContain('recipeDefinitionBrand');
    for (const name of ['button', 'box', 'layout', 'alert']) {
      expect(emitted).toMatch(
        new RegExp(`declare const ${name}: import\\("typestyles"\\)\\.RecipeCallResult<`),
      );
    }

    const downstream = join(dir, 'downstream');
    mkdirSync(downstream);
    writeProject(downstream, { 'use.ts': downstreamSource }, ['use.ts']);
    writeFileSync(join(downstream, 'lib.d.ts'), emitted);
    emitDeclarations(downstream);
  }, 60_000);
});
