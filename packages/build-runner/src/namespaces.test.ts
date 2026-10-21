import { describe, expect, it } from 'vitest';
import { extractNamespaces, moduleNeedsOverrideHmr, TYPESTYLES_IMPORT_RE } from './namespaces';

describe('extractNamespaces', () => {
  it('extracts component and token namespaces', () => {
    const code = `
      import { createTypeStyles } from 'typestyles';
      const { recipe, tokens } = createTypeStyles();
      tokens.create('color', { primary: '#0066ff' });
      recipe({ name: 'button', styles: { base: { color: 'red' } } });
      styles.component({ name: 'card', styles: { base: {} } });
      recipe({ name: 'legacy', styles: { base: { color: 'red' } } });
    `;
    const result = extractNamespaces(code);
    expect(result.keys).toEqual(['tokens:color']);
    expect(result.prefixes).toEqual(['.button-', '.card-', '.legacy-']);
  });

  it('extracts createTheme names from positional and named-argument forms', () => {
    expect(
      extractNamespaces(`tokens.createTheme('dark', { tokens: { color: { primary: '#fff' } } })`)
        .keys,
    ).toEqual(['theme:dark']);
    expect(
      extractNamespaces(
        `tokens.createTheme({ name: 'brand', tokens: { color: { primary: '#fff' } } })`,
      ).keys,
    ).toEqual(['theme:brand']);
    expect(extractNamespaces(`createTheme({ name: "acme", tokens: {} })`).keys).toEqual([
      'theme:acme',
    ]);
    expect(
      extractNamespaces(`
        tokens.createTheme({
          from: designPreset,
          tokens: { color: { accent: '#0066ff' } },
          name: 'app',
        })
      `).keys,
    ).toEqual(['theme:app']);
  });

  it('matches typestyles package imports', () => {
    expect(TYPESTYLES_IMPORT_RE.test("import { createTypeStyles } from 'typestyles'")).toBe(true);
    expect(TYPESTYLES_IMPORT_RE.test("import { styles } from './typestyles'")).toBe(false);
  });
});

describe('moduleNeedsOverrideHmr', () => {
  it('detects styles.override and design-system sugar', () => {
    expect(moduleNeedsOverrideHmr('override(button, { base: {} });')).toBe(true);
    expect(moduleNeedsOverrideHmr('export const acme = createDesignTheme({ name: "acme" });')).toBe(
      true,
    );
    expect(moduleNeedsOverrideHmr('overrideComponent(button, { base: {} });')).toBe(true);
    expect(moduleNeedsOverrideHmr("recipe({ name: 'button', styles: { base: {} } });")).toBe(false);
  });

  it('detects renamed createDesignTheme / overrideComponent imports', () => {
    expect(
      moduleNeedsOverrideHmr(`
        import { createDesignTheme as cdt } from '@var-ui/core';
        export const acme = cdt({ name: 'acme', components: () => ({}) });
      `),
    ).toBe(true);

    expect(
      moduleNeedsOverrideHmr(`
        import { overrideComponent as restyle } from '@var-ui/core';
        restyle(button, { base: { borderRadius: '999px' } });
      `),
    ).toBe(true);

    expect(
      moduleNeedsOverrideHmr(`
        import * as Core from '@var-ui/core';
        export const acme = Core.createDesignTheme({ name: 'acme' });
      `),
    ).toBe(true);
  });

  it('ignores createDesignTheme mentioned only in comments', () => {
    expect(
      moduleNeedsOverrideHmr(`
        // createDesignTheme({ name: 'docs-only' })
        import { createStyles } from 'typestyles';
const styles = createStyles();
        styles.component({ name: 'button', styles: { base: { color: 'red' } } });
      `),
    ).toBe(false);
  });
});
