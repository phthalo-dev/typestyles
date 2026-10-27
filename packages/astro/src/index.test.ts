import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import type { Plugin, ResolvedConfig } from 'vite';
import typestyles from './index';

/** Vite plugin hooks may be a function or `{ handler }`. */
function viteHookFn<F>(hook: F | { handler: F } | undefined | null): F | undefined {
  if (hook == null) return undefined;
  if (typeof hook === 'function') return hook;
  return (hook as { handler: F }).handler;
}

/** Run `astro:config:setup` with a mock `updateConfig` and return the injected Vite plugin. */
function setupIntegrationPlugin(options: Parameters<typeof typestyles>[0] = {}): Plugin {
  const integration = typestyles(options);
  const setup = integration.hooks['astro:config:setup'];
  if (setup == null) throw new Error('expected astro:config:setup hook');

  let plugin: Plugin | undefined;
  const updateConfig = (config: { vite?: { plugins?: unknown[] } }) => {
    plugin = config.vite?.plugins?.[0] as Plugin | undefined;
    return {} as never;
  };
  (setup as (args: { updateConfig: typeof updateConfig }) => void)({ updateConfig });

  if (plugin == null) throw new Error('expected the integration to inject a Vite plugin');
  return plugin;
}

describe('typestyles astro integration', () => {
  it('injects the typestyles Vite plugin via astro:config:setup', () => {
    const plugin = setupIntegrationPlugin();
    expect(plugin.name).toBe('typestyles');
  });

  it('extracts tokens.create and createTheme CSS into the emitted asset on build', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-astro-theme-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src/typestyles-entry.ts'),
      `import { createTokens, createTheme } from 'typestyles';
const tokens = createTokens();
const color = tokens.create('astro-color', { primary: '#0066ff' });
createTheme('astro-dark', { base: { 'astro-color': { primary: '#66aaff' } } });`,
    );

    const plugin = setupIntegrationPlugin();
    const config = viteHookFn(plugin.config);
    await Promise.resolve(config?.({ root: dir }, { command: 'build', mode: 'production' }));
    viteHookFn(plugin.configResolved)?.({ command: 'build', root: dir } as ResolvedConfig);

    const emitted: Array<{ fileName: string; source: string }> = [];
    const ctx = {
      emitFile(file: { type: 'asset'; fileName: string; source: string }) {
        emitted.push({ fileName: file.fileName, source: file.source });
      },
      error(message: string) {
        throw new Error(message);
      },
    };
    const generateBundle = viteHookFn(plugin.generateBundle);
    if (generateBundle == null) throw new Error('expected plugin.generateBundle');
    await generateBundle.call(ctx as never);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.fileName).toBe('typestyles.css');
    expect(emitted[0]?.source).toContain('--astro-color-primary: #0066ff');
    expect(emitted[0]?.source).toContain('.theme-astro-dark');
    expect(emitted[0]?.source).toContain('--astro-color-primary: #66aaff');
  });
});
