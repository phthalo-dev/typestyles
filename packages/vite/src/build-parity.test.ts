import { describe, it, expect } from 'vite-plus/test';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { RunTypestylesBuildOptions } from '@typestyles/build-runner';
import { flushSync, getRegisteredCss, reset } from 'typestyles';

const runnerDist = fileURLToPath(new URL('../../build-runner/dist/index.js', import.meta.url));
const parityEnabled = existsSync(runnerDist);

type RunTypestylesBuildFn = (options: RunTypestylesBuildOptions) => Promise<string>;

describe.skipIf(!parityEnabled)('runtime/build parity', () => {
  it('emits identical CSS for component variant APIs', async () => {
    const mod = await import(pathToFileURL(runnerDist).href);
    const runTypestylesBuild = mod.runTypestylesBuild as RunTypestylesBuildFn;

    const projectRoot = process.cwd();
    const tempDir = await mkdtemp(join(tmpdir(), 'typestyles-parity-'));
    const entryFile = join(tempDir, 'entry.ts');

    await writeFile(
      entryFile,
      `
import { createStyles, variant } from 'typestyles';
const styles = createStyles();

styles.component({ name: 'parity-button', variants: { intent: variant.enum(["primary", "ghost"], { default: "primary" }), outlined: variant.boolean({ default: false }) }, styles: { base: { padding: '8px', borderWidth: '1px', borderStyle: 'solid' }, compoundVariants: [
    { variants: { intent: ['primary', 'ghost'], outlined: true }, style: { fontWeight: 700 } },
  ], variants: { intent: {
      primary: { color: 'white', backgroundColor: 'blue' },
      ghost: { color: 'blue', backgroundColor: 'transparent' },
    }, outlined: {
      true: { borderColor: 'currentColor' },
      false: { borderColor: 'transparent' },
    } } } });

`,
      'utf8',
    );

    const modulePath = pathToFileURL(entryFile).href;
    const moduleForBuild = relative(projectRoot, entryFile);

    try {
      reset();
      await import(`${modulePath}?runtime=${Date.now()}`);
      flushSync();
      const runtimeCss = getRegisteredCss();

      reset();
      const buildCss = await runTypestylesBuild({
        root: projectRoot,
        modules: [moduleForBuild],
      });

      expect(buildCss).toBe(runtimeCss);
    } finally {
      reset();
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('emits identical CSS for tokens.create and createTheme (build-time theme extraction)', async () => {
    const mod = await import(pathToFileURL(runnerDist).href);
    const runTypestylesBuild = mod.runTypestylesBuild as RunTypestylesBuildFn;

    const projectRoot = process.cwd();
    const tempDir = await mkdtemp(join(tmpdir(), 'typestyles-parity-theme-'));
    const entryFile = join(tempDir, 'entry.ts');

    await writeFile(
      entryFile,
      `
import { createTypeStyles, createTheme } from 'typestyles';
const { style, recipe, tokens } = createTypeStyles();

const color = tokens.create('parity-color', { primary: '#0066ff', surface: '#ffffff' });
createTheme('parity-dark', {
  base: { 'parity-color': { primary: '#66aaff', surface: '#111111' } },
});

recipe({ name: 'parity-themed-card', styles: { base: { color: color.primary, backgroundColor: color.surface } } });
`,
      'utf8',
    );

    const modulePath = pathToFileURL(entryFile).href;
    const moduleForBuild = relative(projectRoot, entryFile);

    try {
      reset();
      await import(`${modulePath}?runtime=${Date.now()}`);
      flushSync();
      const runtimeCss = getRegisteredCss();

      reset();
      const buildCss = await runTypestylesBuild({
        root: projectRoot,
        modules: [moduleForBuild],
      });

      expect(buildCss).toBe(runtimeCss);
      // Token defaults and the theme class are both present in the static output.
      expect(buildCss).toContain('--parity-color-primary: #0066ff');
      expect(buildCss).toContain('.theme-parity-dark');
      expect(buildCss).toContain('--parity-color-primary: #66aaff');
    } finally {
      reset();
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
