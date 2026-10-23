import { variant } from 'typestyles';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vite-plus/test';
import type { ResolvedConfig } from 'vite';
import {
  discoverDefaultExtractModules,
  extractNamespaces,
  htmlLinksTypestylesCss,
  resolveTypestylesCssHref,
} from './index';

/** Vite plugin hooks may be a function or `{ handler }`. */
function viteHookFn<F>(hook: F | { handler: F } | undefined | null): F | undefined {
  if (hook == null) return undefined;
  if (typeof hook === 'function') return hook;
  return (hook as { handler: F }).handler;
}

describe('discoverDefaultExtractModules', () => {
  it('returns the first existing candidate path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-disc-'));
    mkdirSync(join(dir, 'src', 'styles'), { recursive: true });
    writeFileSync(join(dir, 'src/typestyles.ts'), '\n');
    expect(discoverDefaultExtractModules(dir)).toEqual(['src/typestyles.ts']);
  });
});

describe('extractNamespaces', () => {
  it('extracts recipe namespaces as prefixes', () => {
    const code = `
      import { createTypeStyles } from 'typestyles';
      const { recipe } = createTypeStyles();
      const button = recipe({ name: 'button', styles: { base: { color: 'red' } } });
    `;
    const result = extractNamespaces(code);
    expect(result.prefixes).toEqual(['.button-']);
    expect(result.keys).toEqual([]);
  });

  it('extracts styles.class namespaces as prefixes', () => {
    const code = `
      import { createStyles } from 'typestyles';
      const styles = createStyles();
      styles.class('card', { padding: '1rem' });
    `;
    const result = extractNamespaces(code);
    expect(result.prefixes).toEqual(['.card-']);
    expect(result.keys).toEqual([]);
  });

  it('extracts tokens.create namespaces as keys', () => {
    const code = `
      import { createTokens } from 'typestyles';
      const tokens = createTokens();
      const color = tokens.create('color', { primary: '#0066ff' });
    `;
    const result = extractNamespaces(code);
    expect(result.keys).toEqual(['tokens:color']);
    expect(result.prefixes).toEqual([]);
  });

  it('extracts createTheme as theme keys', () => {
    const code = `
      import { createTokens } from 'typestyles';
      const tokens = createTokens();
      const dark = tokens.createTheme('dark', { base: { color: { primary: '#fff' } } });
    `;
    const result = extractNamespaces(code);
    expect(result.keys).toEqual(['theme:dark']);
  });

  it('extracts standalone createTheme calls', () => {
    const code = `
      import { createTheme } from 'typestyles';
      const dark = createTheme('dark', { base: { color: { primary: '#fff' } } });
    `;
    const result = extractNamespaces(code);
    expect(result.keys).toEqual(['theme:dark']);
  });

  it('extracts keyframes.create as keyframe keys', () => {
    const code = `
      import { keyframes } from 'typestyles';
      const fadeIn = keyframes.create('fadeIn', {
        from: { opacity: 0 },
        to: { opacity: 1 },
      });
    `;
    const result = extractNamespaces(code);
    expect(result.keys).toEqual(['keyframes:fadeIn']);
    expect(result.prefixes).toEqual([]);
  });

  it('extracts multiple namespaces from a single module', () => {
    const code = `
      import { createTypeStyles, keyframes } from 'typestyles';
      const { recipe, tokens } = createTypeStyles();
      const color = tokens.create('color', { primary: '#0066ff' });
      const fadeIn = keyframes.create('fadeIn', { from: { opacity: 0 }, to: { opacity: 1 } });
      const button = recipe({ name: 'button', styles: { base: { color: color.primary } } });
      const card = recipe({ name: 'card', styles: { base: { animation: fadeIn } } });
    `;
    const result = extractNamespaces(code);
    expect(result.keys).toEqual(['tokens:color', 'keyframes:fadeIn']);
    expect(result.prefixes).toEqual(['.button-', '.card-']);
  });

  it('handles double-quoted strings', () => {
    const code = `
      const button = styles.component({ name: "button", styles: { base: { color: 'red' } } });
    `;
    const result = extractNamespaces(code);
    expect(result.prefixes).toEqual(['.button-']);
  });

  it('extracts styles.component namespaces as prefixes', () => {
    const code = `
      import { createStyles } from 'typestyles';
const styles = createStyles();
      const button = styles.component({ name: 'button', styles: { base: { color: 'red' } } });
    `;
    const result = extractNamespaces(code);
    expect(result.prefixes).toEqual(['.button-']);
    expect(result.keys).toEqual([]);
  });

  it('extracts global.style selectors as prefixes', () => {
    const code = `
      import { createGlobal } from 'typestyles';
      const global = createGlobal();
      global.rule('body', { margin: 0 });
    `;
    const result = extractNamespaces(code);
    expect(result.prefixes).toEqual(['body']);
    expect(result.keys).toEqual([]);
  });

  it('extracts global.fontFace as font-face prefixes', () => {
    const code = `
      import { createGlobal } from 'typestyles';
      const global = createGlobal();
      global.fontFace('Inter', { src: "url('/Inter.woff2')" });
    `;
    const result = extractNamespaces(code);
    expect(result.prefixes).toEqual(['font-face:Inter']);
    expect(result.keys).toEqual([]);
  });

  it('returns empty arrays for code with no typestyles calls', () => {
    const code = `
      const x = 1 + 2;
      console.log(x);
    `;
    const result = extractNamespaces(code);
    expect(result.keys).toEqual([]);
    expect(result.prefixes).toEqual([]);
  });
});

describe('resolveTypestylesCssHref', () => {
  it('returns root-absolute path when base is empty', () => {
    expect(resolveTypestylesCssHref('', 'typestyles.css')).toBe('/typestyles.css');
    expect(resolveTypestylesCssHref('/', 'typestyles.css')).toBe('/typestyles.css');
  });

  it('prefixes with Vite base when set', () => {
    expect(resolveTypestylesCssHref('/app/', 'typestyles.css')).toBe('/app/typestyles.css');
    expect(resolveTypestylesCssHref('/app', 'custom.css')).toBe('/app/custom.css');
  });
});

describe('htmlLinksTypestylesCss', () => {
  it('detects an existing stylesheet link', () => {
    const html = '<head><link rel="stylesheet" href="/typestyles.css" /></head>';
    expect(htmlLinksTypestylesCss(html, '/typestyles.css', 'typestyles.css')).toBe(true);
  });

  it('detects relative and basename hrefs', () => {
    expect(
      htmlLinksTypestylesCss(
        '<link rel="stylesheet" href="./typestyles.css">',
        '/typestyles.css',
        'typestyles.css',
      ),
    ).toBe(true);
    expect(
      htmlLinksTypestylesCss(
        '<link href="typestyles.css" rel="stylesheet">',
        '/x',
        'typestyles.css',
      ),
    ).toBe(true);
  });

  it('returns false when no matching link exists', () => {
    const html = '<head><link rel="stylesheet" href="/other.css" /></head>';
    expect(htmlLinksTypestylesCss(html, '/typestyles.css', 'typestyles.css')).toBe(false);
  });
});

describe('typestyles vite plugin', () => {
  it('exports a default function', async () => {
    const mod = await import('./index');
    expect(typeof mod.default).toBe('function');
  });

  it('returns a plugin object with correct name', async () => {
    const mod = await import('./index');
    const plugin = mod.default();
    expect(plugin.name).toBe('typestyles');
  });

  it('defaults to build mode when extract.modules is set — runtime disabled only on vite build', async () => {
    const mod = await import('./index');
    const plugin = mod.default({ extract: { modules: ['src/entry.ts'] } });
    const config = viteHookFn(plugin.config);
    const serve = await Promise.resolve(config?.({}, { command: 'serve', mode: 'development' }));
    expect(serve?.define?.['__TYPESTYLES_RUNTIME_DISABLED__']).toBeUndefined();
    const build = await Promise.resolve(config?.({}, { command: 'build', mode: 'production' }));
    expect(build?.define?.__TYPESTYLES_RUNTIME_DISABLED__).toBe(JSON.stringify('true'));
  });

  it('defaults to runtime mode when no extraction modules resolve', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-vite-empty-'));
    const mod = await import('./index');
    const plugin = mod.default();
    const config = viteHookFn(plugin.config);
    const build = await Promise.resolve(
      config?.({ root: dir }, { command: 'build', mode: 'production' }),
    );
    expect(build?.define?.__TYPESTYLES_RUNTIME_DISABLED__).toBeUndefined();
  });

  it('discovers a convention entry and defaults to build on vite build', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-vite-disco-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src/typestyles-entry.ts'), "import 'typestyles';\n");
    const mod = await import('./index');
    const plugin = mod.default();
    const config = viteHookFn(plugin.config);
    const serve = await Promise.resolve(
      config?.({ root: dir }, { command: 'serve', mode: 'development' }),
    );
    expect(serve?.define?.['__TYPESTYLES_RUNTIME_DISABLED__']).toBeUndefined();
    const build = await Promise.resolve(
      config?.({ root: dir }, { command: 'build', mode: 'production' }),
    );
    expect(build?.define?.__TYPESTYLES_RUNTIME_DISABLED__).toBe(JSON.stringify('true'));
  });

  it('honors mode: runtime with extract on build', async () => {
    const mod = await import('./index');
    const plugin = mod.default({
      mode: 'runtime',
      extract: { modules: ['a.ts'] },
    });
    const config = viteHookFn(plugin.config);
    const build = await Promise.resolve(config?.({}, { command: 'build', mode: 'production' }));
    expect(build?.define?.__TYPESTYLES_RUNTIME_DISABLED__).toBeUndefined();
  });

  it('injects HMR dispose when styles are imported from a local re-export (not from typestyles package string)', async () => {
    const mod = await import('./index');
    const plugin = mod.default();
    viteHookFn(plugin.configResolved)?.({ command: 'serve' } as ResolvedConfig);
    const code = `import { styles } from './typestyles';
styles.component({ name: 'docs-sidebar', styles: { base: { color: 'red' } } });`;
    const ctx = { warn: () => {} };
    const transform = viteHookFn(plugin.transform);
    if (transform == null) throw new Error('expected plugin.transform');
    const result = await transform.call(ctx as never, code, '/src/styles/sidebar.ts');
    expect(result).not.toBeNull();
    if (result == null) throw new Error('expected transform result');
    expect(result.code).toContain("from 'typestyles/hmr'");
    expect(result.code).toContain('__typestylesInvalidateKeys');
    expect(result.code).toContain('.docs-sidebar-');
  });

  it('injects override HMR for createDesignTheme sugar without styles.override in source', async () => {
    const mod = await import('./index');
    const plugin = mod.default();
    viteHookFn(plugin.configResolved)?.({ command: 'serve' } as ResolvedConfig);
    const code = `import { createDesignTheme } from '@var-ui/core';
export const acme = createDesignTheme({
  name: 'acme',
  components: (t) => ({ button: { base: { borderRadius: t.radius.lg } } }),
});`;
    const transform = viteHookFn(plugin.transform);
    if (transform == null) throw new Error('expected plugin.transform');
    const result = await transform.call({ warn: () => {} } as never, code, '/src/theme-acme.ts');
    expect(result).not.toBeNull();
    if (result == null) throw new Error('expected transform result');
    expect(result.code).toContain('createOverrideHmrSlot');
    expect(result.code).toContain('__tsOvHmr.activate()');
    expect(result.code).toContain('__tsOvHmr.dispose()');
  });

  it('injects override HMR for renamed createDesignTheme imports', async () => {
    const mod = await import('./index');
    const plugin = mod.default();
    viteHookFn(plugin.configResolved)?.({ command: 'serve' } as ResolvedConfig);
    const code = `import { createDesignTheme as cdt } from '@var-ui/core';
export const acme = cdt({
  name: 'acme',
  components: () => ({ button: { base: { borderRadius: '999px' } } }),
});`;
    const transform = viteHookFn(plugin.transform);
    if (transform == null) throw new Error('expected plugin.transform');
    const result = await transform.call({ warn: () => {} } as never, code, '/src/theme-renamed.ts');
    expect(result).not.toBeNull();
    if (result == null) throw new Error('expected transform result');
    expect(result.code).toContain('createOverrideHmrSlot');
    expect(result.code).toContain('__tsOvHmr.dispose()');
  });

  it('theme-file HMR loop: transform injects slot, dispose + re-exec replaces override CSS', async () => {
    const { createStyles, flushSync, getRegisteredCss, reset } = await import('typestyles');
    const { createOverrideHmrSlot } = await import('typestyles/hmr');
    const mod = await import('./index');
    const plugin = mod.default();
    viteHookFn(plugin.configResolved)?.({ command: 'serve' } as ResolvedConfig);

    // App theme file spells sugar only (aliased) — never `styles.override`.
    const themeSource = `import { createDesignTheme as cdt } from '@var-ui/core';
export const acme = cdt({
  name: 'acme',
  components: () => ({ button: { base: { borderRadius: '4px' } } }),
});`;
    const transform = viteHookFn(plugin.transform);
    if (transform == null) throw new Error('expected plugin.transform');
    const transformed = await transform.call(
      { warn: () => {} } as never,
      themeSource,
      '/src/theme-hmr-loop.ts',
    );
    expect(transformed).not.toBeNull();
    if (transformed == null) throw new Error('expected transform result');
    expect(transformed.code).toMatch(/__tsOvHmr\.activate\(\)/);
    expect(transformed.code).toMatch(/__tsOvHmr\.deactivate\(\)/);
    expect(transformed.code).toMatch(/__tsOvHmr\.dispose\(\)/);

    // Simulate what the injected bootstrap + createDesignTheme({ components }) do at runtime.
    reset();
    const styles = createStyles({
      mode: 'attribute',
      layers: ['components', 'overrides'] as const,
    });
    const button = styles.component({
      name: 'vite-hmr-btn',
      layer: 'components',
      variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { color: 'black' }, variants: { intent: { primary: { color: 'blue' } } } },
    });

    const slot = createOverrideHmrSlot();
    slot.activate();
    styles.override({
      recipe: button,
      layer: 'overrides',
      selectorPrefix: '.theme-acme',
      styles: {
        base: { borderRadius: '4px' },
        variants: { intent: { primary: { fontWeight: 700 } } },
      },
    });
    slot.deactivate();
    flushSync();
    expect(getRegisteredCss()).toContain('border-radius: 4px');
    expect(getRegisteredCss()).toContain('.theme-acme .vite-hmr-btn[data-intent="primary"]');

    // Vite hot.dispose → module re-eval with updated theme values.
    slot.dispose();
    const slot2 = createOverrideHmrSlot();
    slot2.activate();
    styles.override({
      recipe: button,
      layer: 'overrides',
      selectorPrefix: '.theme-acme',
      styles: {
        base: { borderRadius: '999px' },
        variants: { intent: { primary: { textTransform: 'uppercase' } } },
      },
    });
    slot2.deactivate();
    flushSync();

    const css = getRegisteredCss();
    expect(css).toContain('border-radius: 999px');
    expect(css).not.toContain('border-radius: 4px');
    expect(css).toContain('text-transform: uppercase');
    expect(css).not.toContain('font-weight: 700');
    // Recipe CSS from the shared styles instance is untouched.
    expect(css).toContain('color: black');
    expect(css).toContain('color: blue');
  });

  it('errors when the same style namespace is used in another module', async () => {
    const mod = await import('./index');
    const plugin = mod.default();
    const transform = viteHookFn(plugin.transform);
    if (transform == null) throw new Error('expected plugin.transform');
    const codeA = `import { createStyles } from 'typestyles';
const styles = createStyles();
styles.component({ name: 'shared-ns', styles: { base: { color: 'red' } } });`;
    const codeB = `import { createStyles } from 'typestyles';
const styles = createStyles();
styles.component({ name: 'shared-ns', styles: { base: { color: 'blue' } } });`;

    const ctx = {
      error(message: string) {
        throw new Error(message);
      },
    };

    await transform.call(ctx as never, codeA, '/src/a.ts');
    expect(() => transform.call(ctx as never, codeB, '/src/b.ts')).toThrow(
      /\[typestyles\] Style namespace "shared-ns"/,
    );
  });

  it('extracts tokens.create and createTheme CSS into the emitted asset on build', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-vite-theme-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(
      join(dir, 'src/typestyles-entry.ts'),
      `import { createTokens, createTheme } from 'typestyles';
const tokens = createTokens();
const color = tokens.create('vite-color', { primary: '#0066ff' });
createTheme('vite-dark', { base: { 'vite-color': { primary: '#66aaff' } } });`,
    );

    const mod = await import('./index');
    const plugin = mod.default();
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
    expect(emitted[0]?.source).toContain('--vite-color-primary: #0066ff');
    expect(emitted[0]?.source).toContain('.theme-vite-dark');
    expect(emitted[0]?.source).toContain('--vite-color-primary: #66aaff');
  });

  it('does not inject HMR during vite build', async () => {
    const mod = await import('./index');
    const plugin = mod.default();
    viteHookFn(plugin.configResolved)?.({ command: 'build' } as ResolvedConfig);
    const code = `import { createStyles } from 'typestyles';
const styles = createStyles();
styles.component({ name: 'x', styles: { base: {} } });`;
    const transform = viteHookFn(plugin.transform);
    if (transform == null) throw new Error('expected plugin.transform');
    const result = await transform.call({ warn: () => {} } as never, code, '/src/a.ts');
    expect(result).toBeNull();
  });

  it('auto-injects a stylesheet link into HTML when extraction is enabled', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-vite-html-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src/typestyles-entry.ts'), "import 'typestyles';\n");

    const mod = await import('./index');
    const plugin = mod.default();
    const config = viteHookFn(plugin.config);
    await Promise.resolve(config?.({ root: dir }, { command: 'build', mode: 'production' }));
    viteHookFn(plugin.configResolved)?.({
      command: 'build',
      root: dir,
      base: '/',
    } as ResolvedConfig);

    const html = '<!doctype html><html><head></head><body></body></html>';
    const transformIndexHtml = plugin.transformIndexHtml;
    if (transformIndexHtml == null) throw new Error('expected plugin.transformIndexHtml');
    const handler =
      typeof transformIndexHtml === 'function' ? transformIndexHtml : transformIndexHtml.handler;
    const tags = await Promise.resolve(handler(html, {} as never));

    expect(tags).toEqual([
      {
        tag: 'link',
        attrs: { rel: 'stylesheet', href: '/typestyles.css' },
        injectTo: 'head',
      },
    ]);
  });

  it('does not duplicate an existing stylesheet link in HTML', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-vite-html-dup-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src/typestyles-entry.ts'), "import 'typestyles';\n");

    const mod = await import('./index');
    const plugin = mod.default();
    const config = viteHookFn(plugin.config);
    await Promise.resolve(config?.({ root: dir }, { command: 'build', mode: 'production' }));
    viteHookFn(plugin.configResolved)?.({
      command: 'build',
      root: dir,
      base: '/',
    } as ResolvedConfig);

    const html =
      '<!doctype html><html><head><link rel="stylesheet" href="/typestyles.css" /></head><body></body></html>';
    const transformIndexHtml = plugin.transformIndexHtml;
    if (transformIndexHtml == null) throw new Error('expected plugin.transformIndexHtml');
    const handler =
      typeof transformIndexHtml === 'function' ? transformIndexHtml : transformIndexHtml.handler;
    const tags = await Promise.resolve(handler(html, {} as never));

    expect(tags).toBeUndefined();
  });

  it('uses Vite base in the injected stylesheet href', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-vite-html-base-'));
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src/typestyles-entry.ts'), "import 'typestyles';\n");

    const mod = await import('./index');
    const plugin = mod.default();
    const config = viteHookFn(plugin.config);
    await Promise.resolve(config?.({ root: dir }, { command: 'build', mode: 'production' }));
    viteHookFn(plugin.configResolved)?.({
      command: 'build',
      root: dir,
      base: '/my-app/',
    } as ResolvedConfig);

    const html = '<!doctype html><html><head></head><body></body></html>';
    const transformIndexHtml = plugin.transformIndexHtml;
    if (transformIndexHtml == null) throw new Error('expected plugin.transformIndexHtml');
    const handler =
      typeof transformIndexHtml === 'function' ? transformIndexHtml : transformIndexHtml.handler;
    const tags = await Promise.resolve(handler(html, {} as never));

    expect(tags).toEqual([
      {
        tag: 'link',
        attrs: { rel: 'stylesheet', href: '/my-app/typestyles.css' },
        injectTo: 'head',
      },
    ]);
  });
});
