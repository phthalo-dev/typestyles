import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { flushSync, getRegisteredCss, reset } from 'typestyles';
import { runTypestylesBuild } from './index';

describe('runTypestylesBuild (tree-shaking of imported barrel exports)', () => {
  it('retains CSS from a component only reachable through an unread namespace re-export', async () => {
    const projectRoot = process.cwd();
    const tempDir = await mkdtemp(join(tmpdir(), 'typestyles-tree-shake-'));
    // The library lives in its own subdirectory with its own package.json,
    // mimicking a real npm package boundary (e.g. node_modules/some-lib).
    const libDir = join(tempDir, 'fixture-lib');
    const libFile = join(libDir, 'index.ts');
    const entryFile = join(tempDir, 'entry.ts');

    // Real tree-shakeable component libraries mark their own package.json
    // "sideEffects": false so bundlers can drop unused components from a
    // consumer's app. Without this marker esbuild conservatively assumes any
    // call expression may have side effects and won't remove it, so the
    // marker is required to reproduce the bug realistically. Crucially, this
    // marker lives at the library's package boundary, not the consumer's
    // entry file — the entry itself still has ordinary side-effect semantics.
    await mkdir(libDir, { recursive: true });
    await writeFile(
      join(libDir, 'package.json'),
      JSON.stringify({ name: 'fixture-lib', sideEffects: false }),
      'utf8',
    );

    // Simulates an internal module of a tree-shakeable component library:
    // registering the component is a side effect, independent of whether
    // the returned classname function is ever read.
    await writeFile(
      libFile,
      `
import { createStyles } from 'typestyles';
const styles = createStyles();

export const FixtureButton = styles.component({ name: 'fixture-tree-shake-button', styles: { base: { padding: '8px' } } });
`,
      'utf8',
    );

    // Simulates a consumer's extraction-entry barrel import: it imports the
    // library only via a namespace, and never destructures/reads a named
    // export off it. Under esbuild's default tree shaking, this makes the
    // library's internal `recipe(...)` call look like dead code.
    // The unrelated global assignment below has nothing to do with `lib` —
    // it just keeps this entry file itself from being pruned to nothing, the
    // same way a real consumer entry has other, unrelated content.
    await writeFile(
      entryFile,
      `
import * as lib from './fixture-lib';
globalThis.__typestylesTreeShakeFixtureEntryMarker = true;
export { lib };
`,
      'utf8',
    );

    const moduleForBuild = relative(projectRoot, entryFile);

    try {
      reset();
      await import(`${pathToFileURL(entryFile).href}?runtime=${Date.now()}`);
      flushSync();
      const runtimeCss = getRegisteredCss();
      expect(runtimeCss).toContain('.fixture-tree-shake-button');

      reset();
      const buildCss = await runTypestylesBuild({
        root: projectRoot,
        modules: [moduleForBuild],
      });

      expect(buildCss).toContain('.fixture-tree-shake-button');
      expect(buildCss).toBe(runtimeCss);
    } finally {
      reset();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('retains CSS from a component reachable through a plain bare import of a sideEffects:false package', async () => {
    const projectRoot = process.cwd();
    const tempDir = await mkdtemp(join(tmpdir(), 'typestyles-tree-shake-bare-'));
    const libDir = join(tempDir, 'fixture-lib-bare');
    const libFile = join(libDir, 'index.ts');
    const entryFile = join(tempDir, 'entry.ts');

    await mkdir(libDir, { recursive: true });
    await writeFile(
      libDir + '/package.json',
      JSON.stringify({ name: 'fixture-lib-bare', sideEffects: false }),
      'utf8',
    );

    await writeFile(
      libFile,
      `
import { createStyles } from 'typestyles';
const styles = createStyles();

export const FixtureBareButton = styles.component({ name: 'fixture-tree-shake-bare-button', styles: { base: { padding: '8px' } } });
`,
      'utf8',
    );

    // Unlike the namespace-import case above, this entry imports the library
    // with a completely bare `import './fixture-lib-bare';` — no binding at
    // all, not even an unread namespace. esbuild has a separate optimization,
    // independent of `treeShaking`, that drops a bare import entirely when it
    // resolves to a module/package marked "sideEffects": false — this is the
    // exact shape of a real consumer's extraction entry when one of several
    // side-effect-only imports happens to point at a "sideEffects": false
    // package (a common, correct marking for a tree-shakeable component
    // library). The unrelated global assignment keeps the entry file itself
    // from bundling to nothing (matching a real multi-import entry file).
    await writeFile(
      entryFile,
      `
import './fixture-lib-bare';
globalThis.__typestylesTreeShakeBareFixtureEntryMarker = true;
`,
      'utf8',
    );

    const moduleForBuild = relative(projectRoot, entryFile);

    try {
      reset();
      await import(`${pathToFileURL(entryFile).href}?runtime=${Date.now()}`);
      flushSync();
      const runtimeCss = getRegisteredCss();
      expect(runtimeCss).toContain('.fixture-tree-shake-bare-button');

      reset();
      const buildCss = await runTypestylesBuild({
        root: projectRoot,
        modules: [moduleForBuild],
      });

      expect(buildCss).toContain('.fixture-tree-shake-bare-button');
      expect(buildCss).toBe(runtimeCss);
    } finally {
      reset();
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
