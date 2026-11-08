/**
 * Editor completion tests for CSS property **values** in style objects (Issue #311).
 *
 * `CSSValue` used to be `string | number`, which collapsed csstype keyword unions
 * (`'flex' | 'block' | … | string`) to `string`, so tsserver had nothing to suggest.
 * These tests run the TypeScript language service against virtual fixtures and assert
 * that keyword literals show up at the cursor.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vite-plus/test';

const srcDir = dirname(fileURLToPath(import.meta.url));
const tsconfigPath = join(srcDir, '..', 'tsconfig.json');
const CURSOR = '/*|*/';

function createService(fileName: string, text: string) {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(tsconfigPath));
  const options = { ...parsed.options, noEmit: true };
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => options,
    getScriptFileNames: () => [fileName],
    getScriptVersion: () => '1',
    getScriptSnapshot: (name) => {
      const content = name === fileName ? text : ts.sys.readFile(name);
      return content === undefined ? undefined : ts.ScriptSnapshot.fromString(content);
    },
    getCurrentDirectory: () => srcDir,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (name) => name === fileName || ts.sys.fileExists(name),
    readFile: (name) => (name === fileName ? text : ts.sys.readFile(name)),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
  return ts.createLanguageService(host, ts.createDocumentRegistry());
}

/** Completion entry names at the `CURSOR` marker in `source` (marker sits inside the quotes). */
function completionsAt(source: string): string[] {
  const offset = source.indexOf(CURSOR);
  if (offset < 0) throw new Error('fixture is missing the cursor marker');
  const text = source.replace(CURSOR, '');
  const fileName = join(srcDir, '__completion-fixture__.ts');
  const service = createService(fileName, text);
  const info = service.getCompletionsAtPosition(fileName, offset, {});
  return info?.entries.map((e) => e.name) ?? [];
}

const header = `
import { createTypeStyles } from './create-type-styles';
import { variant } from './variant';
const ts = createTypeStyles({ scopeId: 'completions' });
`;

describe('CSS value completions (Issue #311)', () => {
  it('sanity: fixtures resolve against the real source', () => {
    expect(readFileSync(join(srcDir, 'create-type-styles.ts'), 'utf8')).toContain(
      'createTypeStyles',
    );
  });

  it('suggests `display` keywords in a flat recipe `styles` callback', () => {
    const names = completionsAt(`${header}
ts.recipe({
  name: 'flat',
  variants: { size: variant.enum(['sm'], { default: 'sm' }) },
  styles: () => ({
    base: { display: '${CURSOR}' },
  }),
});
`);
    expect(names).toEqual(expect.arrayContaining(['flex', 'grid', 'none', 'block']));
  });

  it('suggests `flexDirection` keywords in a variant option of a flat recipe', () => {
    const names = completionsAt(`${header}
ts.recipe({
  name: 'flat-variant',
  variants: { dir: variant.enum(['col'], { default: 'col' }) },
  styles: () => ({
    base: {},
    variants: { dir: { col: { flexDirection: '${CURSOR}' } } },
  }),
});
`);
    expect(names).toEqual(
      expect.arrayContaining(['row', 'column', 'row-reverse', 'column-reverse']),
    );
  });

  it('suggests `display` keywords inside a slot of a slot recipe `styles` callback', () => {
    const names = completionsAt(`${header}
ts.recipe({
  name: 'slotted',
  slots: ['root', 'panel'],
  vars: { gap: { value: '4px', syntax: '<length>' } },
  variants: { size: variant.enum(['sm'], { default: 'sm' }) },
  styles: ({ vars }) => ({
    base: { root: { gap: vars.gap.var }, panel: { display: '${CURSOR}' } },
  }),
});
`);
    expect(names).toEqual(expect.arrayContaining(['flex', 'grid', 'none', 'block']));
  });

  it('suggests `flexDirection` keywords inside a slot variant option', () => {
    const names = completionsAt(`${header}
ts.recipe({
  name: 'slotted-variant',
  slots: ['root', 'panel'],
  variants: { dir: variant.enum(['col'], { default: 'col' }) },
  styles: () => ({
    base: { root: {}, panel: {} },
    variants: { dir: { col: { panel: { flexDirection: '${CURSOR}' } } } },
  }),
});
`);
    expect(names).toEqual(expect.arrayContaining(['row', 'column']));
  });

  it('suggests keywords for syntax-aware longhands (`width`, `color`)', () => {
    const width = completionsAt(`${header}
ts.style('w', { width: '${CURSOR}' });
`);
    expect(width).toEqual(expect.arrayContaining(['auto', 'fit-content', 'max-content']));

    const color = completionsAt(`${header}
ts.style('c', { color: '${CURSOR}' });
`);
    expect(color).toEqual(expect.arrayContaining(['currentColor', 'transparent', 'rebeccapurple']));
  });

  it('suggests keywords in `style()` objects', () => {
    const names = completionsAt(`${header}
ts.style('s', { display: '${CURSOR}' });
`);
    expect(names).toEqual(expect.arrayContaining(['flex', 'grid']));
  });
});
