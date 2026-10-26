import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { findUnextractedRecipes } from './unextracted-recipes';

function writeProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'typestyles-coverage-'));
  for (const [rel, contents] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, contents);
  }
  return root;
}

describe('findUnextractedRecipes', () => {
  it('reports a local recipe module the extract entry does not import', async () => {
    const root = writeProject({
      'src/typestyles-entry.ts': `export {};\n`,
      'src/player.ts': `export const libraryPlayer = recipe({ name: 'libraryPlayer' });\n`,
    });

    try {
      const missing = await findUnextractedRecipes({
        root,
        extractEntries: ['src/typestyles-entry.ts'],
        recipeModules: [
          { id: join(root, 'src/player.ts'), names: ['libraryPlayer'] },
          { id: `${join(root, 'src/shell.ts')}?t=1`, names: [] },
        ],
      });
      // An empty name list is ignored. The next call covers a Vite `/@fs` id.
      writeFileSync(
        join(root, 'src/shell.ts'),
        `export const libraryShell = recipe({ name: 'libraryShell' });\n`,
      );
      const withShell = await findUnextractedRecipes({
        root,
        extractEntries: ['src/typestyles-entry.ts'],
        recipeModules: [
          { id: join(root, 'src/player.ts') + '?used', names: ['libraryPlayer'] },
          { id: '/@fs' + join(root, 'src/shell.ts'), names: ['libraryShell', 'libraryWave'] },
        ],
      });
      expect(missing).toEqual([{ modulePath: 'src/player.ts', names: ['libraryPlayer'] }]);
      expect(withShell).toEqual([
        { modulePath: 'src/player.ts', names: ['libraryPlayer'] },
        { modulePath: 'src/shell.ts', names: ['libraryShell', 'libraryWave'] },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('ignores a recipe module the extract entry imports, including side-effect-free packages', async () => {
    const root = writeProject({
      'package.json': JSON.stringify({ name: 'fixture-app', sideEffects: false }),
      'src/typestyles-entry.ts': `import '../fixture-lib';\n`,
      'fixture-lib/package.json': JSON.stringify({ name: 'fixture-lib', sideEffects: false }),
      'fixture-lib/index.ts': `export const libraryPlayer = recipe({ name: 'libraryPlayer' });\n`,
      'src/alias-player.ts': `export const aliased = recipe({ name: 'aliased' });\n`,
      'src/alias-entry.ts': `import '@/src/alias-player';\n`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@/*': ['./*'] } },
      }),
    });

    try {
      const missing = await findUnextractedRecipes({
        root,
        extractEntries: ['src/typestyles-entry.ts', 'src/alias-entry.ts'],
        recipeModules: [
          { id: join(root, 'fixture-lib/index.ts'), names: ['libraryPlayer'] },
          { id: join(root, 'src/alias-player.ts'), names: ['aliased'] },
        ],
      });
      expect(missing).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips node_modules and modules that do not call recipe()', async () => {
    const root = writeProject({
      'src/typestyles-entry.ts': `export {};\n`,
      'node_modules/ui/button.ts': `export const button = recipe({ name: 'button' });\n`,
    });

    try {
      const missing = await findUnextractedRecipes({
        root,
        extractEntries: ['src/typestyles-entry.ts'],
        recipeModules: [
          { id: join(root, 'node_modules/ui/button.ts'), names: ['button'] },
          { id: join(root, 'src/missing.ts'), names: ['ghost'] },
        ],
      });
      expect(missing).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
