import { variant } from './variant';
import { describe, it, expect, beforeEach } from 'vitest';
import { invalidatePrefix, invalidateKeys, createOverrideHmrSlot } from './hmr';
import { createStyles } from './styles';
import { createTokens } from './tokens';
import { registeredNamespaces } from './registry';
import {
  insertRule,
  flushSync,
  reset,
  invalidateComponentNamespaceForDev,
  invalidateClassNamespaceForDev,
  getRegisteredCss,
  TYPESTYLES_FALLBACK_STYLE_ID,
} from './sheet';

function sheetCssText(): string {
  const style = document.getElementById('typestyles') as HTMLStyleElement | null;
  return Array.from(style?.sheet?.cssRules ?? [])
    .map((rule) => rule.cssText)
    .join('\n');
}

function fallbackCssText(): string {
  return document.getElementById(TYPESTYLES_FALLBACK_STYLE_ID)?.textContent ?? '';
}

/** Live injected CSS: CSSOM on `#typestyles` plus text fallback (jsdom rejects `@layer`). */
function cssomFullText(): string {
  const style = document.getElementById('typestyles') as HTMLStyleElement | null;
  return [sheetCssText(), style?.textContent ?? '', fallbackCssText()].join('\n');
}

/** Minimal CSSOM stand-in: jsdom cannot parse `@layer` into grouping rules. */
type FakeCssRule = {
  cssText: string;
  selectorText?: string;
  cssRules?: FakeCssRule[];
  deleteRule?: (index: number) => void;
};

function fakeStyleRule(cssText: string, selectorText: string): FakeCssRule {
  return { cssText, selectorText };
}

function fakeGrouping(cssText: string, children: FakeCssRule[]): FakeCssRule {
  const inner = children;
  return {
    cssText,
    get cssRules() {
      return inner;
    },
    deleteRule(index: number) {
      inner.splice(index, 1);
    },
  };
}

function fakeSheet(rules: FakeCssRule[]): {
  cssRules: FakeCssRule[];
  deleteRule: (index: number) => void;
} {
  const list = rules;
  return {
    get cssRules() {
      return list;
    },
    deleteRule(index: number) {
      list.splice(index, 1);
    },
  };
}

function installFakeSheet(sheet: {
  cssRules: FakeCssRule[];
  deleteRule: (index: number) => void;
}): void {
  const el = document.getElementById('typestyles');
  if (!el) throw new Error('expected #typestyles');
  Object.defineProperty(el, 'sheet', {
    configurable: true,
    get() {
      return sheet;
    },
  });
}

function countInCssom(needle: string): number {
  const text = cssomFullText();
  let count = 0;
  let from = 0;
  while (from < text.length) {
    const found = text.indexOf(needle, from);
    if (found === -1) return count;
    count += 1;
    from = found + needle.length;
  }
  return count;
}

describe('invalidatePrefix', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('allows re-insertion of rules after invalidating by prefix', () => {
    insertRule('.button-base', '.button-base { color: red; }');
    insertRule('.button-primary', '.button-primary { color: blue; }');
    insertRule('.card-base', '.card-base { display: flex; }');
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    expect(style.sheet?.cssRules.length).toBe(3);

    // Invalidate button- styles
    invalidatePrefix('.button-');

    // Re-insert with updated values
    insertRule('.button-base', '.button-base { color: green; }');
    insertRule('.button-primary', '.button-primary { color: yellow; }');
    flushSync();

    // card-base (1 original) + button-base + button-primary (2 re-inserted)
    expect(style.sheet?.cssRules.length).toBe(3);

    // Verify updated rules are present
    const rules = Array.from(style.sheet?.cssRules ?? []) as CSSStyleRule[];
    const buttonBase = rules.find((r) => r.selectorText === '.button-base');
    expect(buttonBase).toBeDefined();
  });

  it('does not affect rules with a different prefix', () => {
    insertRule('.button-base', '.button-base { color: red; }');
    insertRule('.card-base', '.card-base { display: flex; }');
    flushSync();

    invalidatePrefix('.button-');

    // card-base should still be deduped
    insertRule('.card-base', '.card-base { display: block; }');
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    // Only card-base remains (button was removed), no duplicate card
    expect(style.sheet?.cssRules.length).toBe(1);
    const rule = style.sheet?.cssRules[0] as CSSStyleRule;
    expect(rule.selectorText).toBe('.card-base');
  });
});

describe('invalidateKeys', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('invalidates exact keys', () => {
    insertRule('tokens:color', ':root { --color-primary: #0066ff; }');
    insertRule('keyframes:fadeIn', '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }');
    flushSync();

    invalidateKeys(['tokens:color'], []);

    // tokens:color should be re-insertable
    insertRule('tokens:color', ':root { --color-primary: #ff0000; }');
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    // keyframes (1 original) + tokens (1 re-inserted)
    expect(style.sheet?.cssRules.length).toBe(2);
  });

  it('invalidates both keys and prefixes together', () => {
    insertRule('.button-base', '.button-base { color: red; }');
    insertRule('tokens:color', ':root { --color-primary: #0066ff; }');
    flushSync();

    invalidateKeys(['tokens:color'], ['.button-']);

    // Both should be re-insertable
    insertRule('.button-base', '.button-base { color: green; }');
    insertRule('tokens:color', ':root { --color-primary: #ff0000; }');
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    expect(style.sheet?.cssRules.length).toBe(2);
  });

  it('does nothing with empty arrays', () => {
    insertRule('.button-base', '.button-base { color: red; }');
    flushSync();

    invalidateKeys([], []);

    // Rule should still be deduped
    insertRule('.button-base', '.button-base { color: green; }');
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    expect(style.sheet?.cssRules.length).toBe(1);
  });

  it('drops layered theme CSSOM rules by sheet-key prefix without deleting sibling themes', () => {
    const tokens = createTokens({
      scopeId: 'var-ui',
      layers: ['tokens', 'overrides'] as const,
      tokenLayer: 'tokens',
    });
    tokens.createTheme({ name: 'live-edit', tokens: { fontSize: { md: '16px' } } });
    tokens.createTheme({ name: 'keep', tokens: { fontSize: { md: '12px' } } });
    flushSync();

    expect(fallbackCssText()).toContain('.theme-var-ui-live-edit');
    expect(fallbackCssText()).toContain('16px');
    expect(fallbackCssText()).toContain('.theme-var-ui-keep');
    expect(sheetCssText()).not.toContain('.theme-var-ui-live-edit');

    invalidateKeys([], ['layer:tokens:theme:var-ui-live-edit:', 'theme:var-ui-live-edit:']);

    expect(fallbackCssText()).not.toContain('.theme-var-ui-live-edit');
    expect(fallbackCssText()).not.toMatch(/\.theme-var-ui-live-edit[\s\S]*16px/);
    expect(fallbackCssText()).toContain('.theme-var-ui-keep');
    expect(fallbackCssText()).toContain('12px');
  });

  it('strips a layered theme from a concatenated fallback text node without dropping the sibling', () => {
    const liveEdit = `@layer tokens {\n.theme-var-ui-live-edit { --font-size-md: 16px; }\n}`;
    const keep = `@layer tokens {\n.theme-var-ui-keep { --font-size-md: 12px; }\n}`;
    insertRule('layer:tokens:theme:var-ui-live-edit:base', liveEdit);
    insertRule('layer:tokens:theme:var-ui-keep:base', keep);
    flushSync();

    const fallback = document.getElementById(TYPESTYLES_FALLBACK_STYLE_ID);
    if (!fallback) throw new Error('expected #typestyles-fallback');
    fallback.replaceChildren(document.createTextNode(`${liveEdit}\n${keep}\n`));

    invalidateKeys([], ['layer:tokens:theme:var-ui-live-edit:']);

    expect(fallbackCssText()).not.toContain('.theme-var-ui-live-edit');
    expect(fallbackCssText()).toContain('.theme-var-ui-keep');
  });

  it('deletes a nested @media theme from a fake CSSOM layer without removing the sibling', () => {
    const liveEdit = `@layer tokens {\n@media (prefers-color-scheme: dark) { .theme-var-ui-live-edit { --font-size-md: 16px; } }\n}`;
    const keep = `@layer tokens {\n.theme-var-ui-keep { --font-size-md: 12px; }\n}`;
    insertRule('layer:tokens:theme:var-ui-live-edit:mode:dark:branch:0', liveEdit);
    insertRule('layer:tokens:theme:var-ui-keep:base', keep);
    flushSync();

    const keepRule = fakeStyleRule(
      '.theme-var-ui-keep { --font-size-md: 12px; }',
      '.theme-var-ui-keep',
    );
    const media = fakeGrouping(
      // Browser-like serialization: missing trailing semicolon so it does not equal registered CSS.
      '@media (prefers-color-scheme: dark) { .theme-var-ui-live-edit { --font-size-md: 16px } }',
      [
        fakeStyleRule(
          '.theme-var-ui-live-edit { --font-size-md: 16px; }',
          '.theme-var-ui-live-edit',
        ),
      ],
    );
    const layer = fakeGrouping('@layer tokens { /* merged */ }', [media, keepRule]);
    const sheet = fakeSheet([layer]);
    installFakeSheet(sheet);

    invalidateKeys([], ['layer:tokens:theme:var-ui-live-edit:']);

    expect(sheet.cssRules).toHaveLength(1);
    expect(sheet.cssRules[0].cssRules).toHaveLength(1);
    expect(sheet.cssRules[0].cssRules?.[0].selectorText).toBe('.theme-var-ui-keep');
  });

  it('removes an emptied @layer grouping from fake CSSOM after deleting its last inner rule', () => {
    const liveEdit = `@layer tokens {\n.theme-var-ui-live-edit { --font-size-md: 16px; }\n}`;
    insertRule('layer:tokens:theme:var-ui-live-edit:base', liveEdit);
    flushSync();

    const inner = fakeStyleRule(
      '.theme-var-ui-live-edit { --font-size-md: 16px; }',
      '.theme-var-ui-live-edit',
    );
    // Grouping cssText does not equal registered CSS, so the walker must recurse.
    const layer = fakeGrouping('@layer tokens { /* serialized */ }', [inner]);
    const sheet = fakeSheet([layer]);
    installFakeSheet(sheet);

    invalidateKeys([], ['layer:tokens:theme:var-ui-live-edit:']);

    expect(sheet.cssRules).toHaveLength(0);
  });

  it('replaces a layered theme in CSSOM without leaving the previous value', () => {
    const tokens = createTokens({
      scopeId: 'var-ui',
      layers: ['tokens'] as const,
      tokenLayer: 'tokens',
    });
    tokens.createTheme({ name: 'live-edit', tokens: { fontSize: { md: '16px' } } });
    flushSync();
    invalidateKeys([], ['layer:tokens:theme:var-ui-live-edit:', 'theme:var-ui-live-edit:']);
    tokens.createTheme({ name: 'live-edit', tokens: { fontSize: { md: '19px' } } });
    flushSync();

    expect(fallbackCssText()).toContain('19px');
    expect(fallbackCssText()).not.toMatch(/\.theme-var-ui-live-edit[\s\S]*16px/);
    expect(countInCssom('.theme-var-ui-live-edit')).toBe(1);
  });

  it('invalidates semantic class family at boundaries without touching prefix siblings', () => {
    insertRule('.button', '.button { color: red; }');
    insertRule('.button--intent-primary', '.button--intent-primary { color: blue; }');
    insertRule('.button__icon', '.button__icon { width: 1rem; }');
    insertRule('.button[data-size="lg"]', '.button[data-size="lg"] { padding: 16px; }');
    insertRule('.buttongroup', '.buttongroup { display: flex; }');
    insertRule('.button-group', '.button-group { gap: 8px; }');
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    expect(style.sheet?.cssRules.length).toBe(6);

    invalidateComponentNamespaceForDev('button', 'button');

    const selectors = Array.from(style.sheet?.cssRules ?? []).map(
      (r) => (r as CSSStyleRule).selectorText,
    );
    expect(selectors.sort()).toEqual(['.button-group', '.buttongroup']);
  });

  it('preserves override rules when a component namespace is invalidated', () => {
    const styles = createStyles();
    const button = styles.component({
      name: 'hmr-ov-btn',
      variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { color: 'black' }, variants: { intent: { primary: { color: 'blue' } } } },
    });
    styles.override({
      recipe: button,
      styles: {
        base: { borderRadius: '999px' },
        variants: { intent: { primary: { textTransform: 'uppercase' } } },
      },
    });
    flushSync();

    invalidateComponentNamespaceForDev('hmr-ov-btn', 'hmr-ov-btn');
    flushSync();

    const css = getRegisteredCss();
    expect(css).toContain('border-radius: 999px');
    expect(css).toContain('text-transform: uppercase');
    expect(css).toContain('.hmr-ov-btn {');
    expect(css).toContain('.hmr-ov-btn--intent-primary {');
    // Recipe rules were dropped; only override CSS remains for those selectors.
    expect(css).not.toContain('color: black');
    expect(css).not.toContain('color: blue');
  });

  it('updates override CSS when the same keys are re-registered with new values', () => {
    const styles = createStyles();
    const button = styles.component({
      name: 'hmr-ov-replace',
      styles: { base: { color: 'black' } },
    });
    styles.override({ recipe: button, styles: { base: { borderRadius: '4px' } } });
    flushSync();
    expect(getRegisteredCss()).toContain('border-radius: 4px');

    styles.override({ recipe: button, styles: { base: { borderRadius: '999px' } } });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('border-radius: 999px');
    expect(css).not.toContain('border-radius: 4px');
  });

  it('upserts conflicting override rules even when NODE_ENV is production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const styles = createStyles();
      const button = styles.component({
        name: 'hmr-ov-prod',
        styles: { base: { color: 'black' } },
      });
      styles.override({ recipe: button, styles: { base: { borderRadius: '4px' } } });
      flushSync();
      styles.override({ recipe: button, styles: { base: { borderRadius: '999px' } } });
      flushSync();
      const css = getRegisteredCss();
      expect(css).toContain('border-radius: 999px');
      expect(css).not.toContain('border-radius: 4px');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('dispose does not drop sibling override rules that share attribute substrings', () => {
    const styles = createStyles({ mode: 'attribute' });
    const button = styles.component({
      name: 'hmr-ov-attr',
      variants: { intent: variant.enum(['primary', 'ghost'], { default: 'primary' }) },
      styles: {
        base: { color: 'black' },
        variants: { intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } } },
      },
    });

    const themeA = createOverrideHmrSlot();
    themeA.activate();
    styles.override({
      recipe: button,
      selectorPrefix: '.theme-a',
      styles: { variants: { intent: { primary: { textTransform: 'uppercase' } } } },
    });
    themeA.deactivate();

    const themeB = createOverrideHmrSlot();
    themeB.activate();
    styles.override({
      recipe: button,
      selectorPrefix: '.theme-b',
      styles: { variants: { intent: { primary: { fontWeight: 700 } } } },
    });
    themeB.deactivate();
    flushSync();

    expect(getRegisteredCss()).toContain('.theme-a .hmr-ov-attr[data-intent="primary"]');
    expect(getRegisteredCss()).toContain('.theme-b .hmr-ov-attr[data-intent="primary"]');

    themeA.dispose();
    flushSync();

    const css = getRegisteredCss();
    expect(css).not.toContain('text-transform: uppercase');
    expect(css).toContain('.theme-b .hmr-ov-attr[data-intent="primary"]');
    expect(css).toContain('font-weight: 700');
    // Recipe CSS remains.
    expect(css).toContain('color: black');
  });

  it('dispose of an override HMR slot drops tracked override rules (theme module HMR)', () => {
    const styles = createStyles();
    const button = styles.component({
      name: 'hmr-ov-slot',
      variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { color: 'black' }, variants: { intent: { primary: { color: 'blue' } } } },
    });

    const slot = createOverrideHmrSlot();
    slot.activate();
    styles.override({
      recipe: button,
      selectorPrefix: '.theme-acme',
      styles: {
        base: { borderRadius: '999px' },
        variants: { intent: { primary: { fontWeight: 700 } } },
      },
    });
    slot.deactivate();
    flushSync();

    expect(getRegisteredCss()).toContain('.theme-acme .hmr-ov-slot');
    expect(getRegisteredCss()).toContain('border-radius: 999px');

    slot.dispose();
    flushSync();

    const css = getRegisteredCss();
    expect(css).not.toContain('border-radius: 999px');
    expect(css).not.toContain('font-weight: 700');
    // Recipe CSS from recipe is untouched.
    expect(css).toContain('color: black');
    expect(css).toContain('color: blue');
  });

  it('invalidates style rules without dropping component modifiers', () => {
    insertRule('.button', '.button { color: red; }');
    insertRule('.button--intent-primary', '.button--intent-primary { color: blue; }');
    insertRule('.button:hover', '.button:hover { opacity: 0.9; }');
    insertRule('.button-group', '.button-group { gap: 8px; }');
    flushSync();

    invalidateClassNamespaceForDev('button');

    const selectors = Array.from(
      (document.getElementById('typestyles') as HTMLStyleElement).sheet?.cssRules ?? [],
    ).map((r) => (r as CSSStyleRule).selectorText);
    expect(selectors.sort()).toEqual(['.button--intent-primary', '.button-group']);
  });

  it('releases component namespace reservations so the same module can re-register (HMR)', () => {
    const styles = createStyles({ scopeId: 'docs' });
    styles.component({ name: 'docs-sidebar', styles: { base: { color: 'red' } } });

    invalidateKeys([], ['.docs-sidebar-']);

    expect(() =>
      styles.component({ name: 'docs-sidebar', styles: { base: { color: 'blue' } } }),
    ).not.toThrow();
  });
});
