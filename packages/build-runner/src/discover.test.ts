import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import { discoverDefaultExtractModules, discoverRegisteredComponentsModule } from './discover';

describe('discoverDefaultExtractModules', () => {
  it('discovers .ts convention entries first', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-discover-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src/typestyles-entry.ts'), "import 'typestyles';\n");
    expect(discoverDefaultExtractModules(root)).toEqual(['src/typestyles-entry.ts']);
  });

  it('falls back to .js convention entries', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-discover-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src/typestyles-entry.js'), "import 'typestyles';\n");
    expect(discoverDefaultExtractModules(root)).toEqual(['src/typestyles-entry.js']);
  });

  it('returns empty when no convention entry exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-discover-'));
    expect(discoverDefaultExtractModules(root)).toEqual([]);
  });
});

describe('discoverRegisteredComponentsModule', () => {
  it('discovers src/themeable-refs.ts', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-registry-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src/themeable-refs.ts'), 'export {};\n');
    expect(discoverRegisteredComponentsModule(root)).toBe('src/themeable-refs.ts');
  });
});
