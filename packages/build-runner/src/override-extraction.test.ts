import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { flushSync, getRegisteredCss, reset } from 'typestyles';
import { runTypestylesBuild } from './index';

describe('runTypestylesBuild (styles.override extraction)', () => {
  it('includes styles.override rules when reachable from the extraction entry', async () => {
    const projectRoot = process.cwd();
    const tempDir = await mkdtemp(join(tmpdir(), 'typestyles-override-extract-'));
    const libDir = join(tempDir, 'fixture-theme');
    const libFile = join(libDir, 'index.ts');
    const entryFile = join(tempDir, 'entry.ts');

    await mkdir(libDir, { recursive: true });
    await writeFile(
      join(libDir, 'package.json'),
      JSON.stringify({ name: 'fixture-theme', sideEffects: false }),
      'utf8',
    );

    await writeFile(
      libFile,
      `
import { createStyles, variant } from 'typestyles';

const styles = createStyles({
  layers: ['components', 'overrides'],
});

export const FixtureOverrideButton = styles.component({
  name: 'fixture-override-btn',
  layer: 'components',
  variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
  styles: {
    base: { borderRadius: '6px' },
    variants: { intent: { primary: { backgroundColor: 'blue' } } },
  },
});

// Theme/app override — side-effect registration like createDesignTheme({ components })
styles.override({
  recipe: FixtureOverrideButton,
  selectorPrefix: '.theme-acme',
  layer: 'overrides',
  styles: {
    base: { borderRadius: '999px' },
    variants: { intent: { primary: { textTransform: 'uppercase' } } },
  },
});
`,
      'utf8',
    );

    await writeFile(
      entryFile,
      `
import './fixture-theme';
globalThis.__typestylesOverrideExtractMarker = true;
`,
      'utf8',
    );

    const moduleForBuild = relative(projectRoot, entryFile);

    try {
      reset();
      await import(`${pathToFileURL(entryFile).href}?runtime=${Date.now()}`);
      flushSync();
      const runtimeCss = getRegisteredCss();
      expect(runtimeCss).toContain('.theme-acme .fixture-override-btn');
      expect(runtimeCss).toContain('border-radius: 999px');
      expect(runtimeCss).toContain('.theme-acme .fixture-override-btn--intent-primary');
      expect(runtimeCss).toContain('text-transform: uppercase');
      expect(runtimeCss).toMatch(/@layer overrides/);

      reset();
      const buildCss = await runTypestylesBuild({
        root: projectRoot,
        modules: [moduleForBuild],
      });

      expect(buildCss).toContain('.theme-acme .fixture-override-btn');
      expect(buildCss).toContain('border-radius: 999px');
      expect(buildCss).toContain('.theme-acme .fixture-override-btn--intent-primary');
      expect(buildCss).toContain('text-transform: uppercase');
      expect(buildCss).toBe(runtimeCss);
    } finally {
      reset();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('includes conditional override rules and light-dark() mode values', async () => {
    const projectRoot = process.cwd();
    const tempDir = await mkdtemp(join(tmpdir(), 'typestyles-override-cond-extract-'));
    const libDir = join(tempDir, 'fixture-theme-cond');
    const libFile = join(libDir, 'index.ts');
    const entryFile = join(tempDir, 'entry-cond.ts');

    await mkdir(libDir, { recursive: true });
    await writeFile(
      join(libDir, 'package.json'),
      JSON.stringify({ name: 'fixture-theme-cond', sideEffects: false }),
      'utf8',
    );

    await writeFile(
      libFile,
      `
import { createStyles, colorModes, conditional, variant } from 'typestyles';
import { when } from 'typestyles';

const styles = createStyles({
  colorModes,
  layers: ['components', 'overrides'],
});

export const FixtureCondButton = styles.component({
  name: 'fixture-cond-btn',
  layer: 'components',
  styles: { base: { borderRadius: '6px' } },
});

styles.override({
  recipe: FixtureCondButton,
  selectorPrefix: '.theme-acme',
  layer: 'overrides',
  styles: {
    base: {
      color: { light: '#111', dark: '#eee' },
      conditions: [conditional(when.prefersDark, { opacity: 0.9 })],
    },
  },
});
`,
      'utf8',
    );

    await writeFile(
      entryFile,
      `
import './fixture-theme-cond';
globalThis.__typestylesOverrideCondExtractMarker = true;
`,
      'utf8',
    );

    const moduleForBuild = relative(projectRoot, entryFile);

    try {
      reset();
      await import(`${pathToFileURL(entryFile).href}?runtime=${Date.now()}`);
      flushSync();
      const runtimeCss = getRegisteredCss();
      expect(runtimeCss).toContain('color: light-dark(#111, #eee)');
      expect(runtimeCss).toContain('@media (prefers-color-scheme: dark)');
      expect(runtimeCss).toContain('opacity: 0.9');
      expect(runtimeCss).toContain('.theme-acme .fixture-cond-btn');

      reset();
      const buildCss = await runTypestylesBuild({
        root: projectRoot,
        modules: [moduleForBuild],
      });

      expect(buildCss).toContain('color: light-dark(#111, #eee)');
      expect(buildCss).toContain('@media (prefers-color-scheme: dark)');
      expect(buildCss).toContain('opacity: 0.9');
      expect(buildCss).toBe(runtimeCss);
    } finally {
      reset();
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
