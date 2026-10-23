import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect } from 'vite-plus/test';
import { resolveExtractModules } from './resolve-extract';

describe('resolveExtractModules', () => {
  it('appends discovered themeable-refs when include is allRegisteredComponents', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-extract-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src/typestyles-entry.ts'), "import './site';\n");
    writeFileSync(join(root, 'src/themeable-refs.ts'), "import { styles } from './runtime';\n");

    const modules = resolveExtractModules(root, {
      modules: ['src/typestyles-entry.ts'],
      include: 'allRegisteredComponents',
    });
    expect(modules).toEqual(['src/typestyles-entry.ts', 'src/themeable-refs.ts']);
  });

  it('does not duplicate extract modules when include is set but no registry file exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-extract-'));
    const modules = resolveExtractModules(root, {
      modules: ['src/styles.ts', 'src/recipes/index.ts'],
      include: 'allRegisteredComponents',
    });
    expect(modules).toEqual(['src/styles.ts', 'src/recipes/index.ts']);
  });

  it('adds registeredComponentsModule when not already in modules list', () => {
    const modules = resolveExtractModules('/tmp', {
      modules: ['src/entry.ts'],
      registeredComponentsModule: 'src/themeable-refs.ts',
    });
    expect(modules).toEqual(['src/entry.ts', 'src/themeable-refs.ts']);
  });
});
