import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { createStyles } from './styles';
import { resolveCascadeLayers } from './layers';
import { scopeRulesForTest } from './scope';

describe('styles.scope()', () => {
  beforeEach(() => {
    reset();
  });

  it('wraps serialized rules in @scope and registers them', () => {
    const styles = createStyles({ scopeId: 'scope-test' });
    styles.scope({ root: '.theme-acme' }, 'button-base', {
      backgroundColor: 'rebeccapurple',
      color: 'white',
    });
    flushSync();

    const css = getRegisteredCss();
    expect(css).toContain('@scope (.theme-acme) {');
    expect(css).toContain('.button-base {');
    expect(css).toContain('background-color: rebeccapurple');
  });

  it('supports optional `to` on @scope', () => {
    const styles = createStyles();
    styles.scope({ root: '.theme-beta', to: '.theme-acme' }, 'card-base', { padding: '8px' });
    flushSync();

    expect(getRegisteredCss()).toContain('@scope (.theme-beta) to (.theme-acme) {');
  });

  it('reuses serializeStyle recursion for pseudo-selectors', () => {
    const styles = createStyles();
    styles.scope({ root: '.theme-acme' }, 'button-base', {
      color: 'white',
      '&:hover': { opacity: 0.9 },
    });
    flushSync();

    const css = getRegisteredCss();
    expect(css).toContain('.button-base:hover');
    expect(css).toContain('opacity: 0.9');
  });

  it('nests @layer outside @scope when layer option is set', () => {
    const stack = resolveCascadeLayers(['components'], 'layer-scope');
    const cssChunks = scopeRulesForTest(
      { root: '.theme-acme' },
      'button-base',
      { color: 'white' },
      stack,
      'components',
    );
    expect(cssChunks).toHaveLength(1);
    expect(cssChunks[0]).toMatch(/^@layer components \{/);
    expect(cssChunks[0]).toContain('@scope (.theme-acme) {');
    expect(cssChunks[0]).toContain('.button-base {');
  });

  it('wraps scoped rules in cascade layer via createStyles({ layers })', () => {
    const styles = createStyles({
      scopeId: 'layered-scope',
      layers: ['overrides'] as const,
    });
    styles.scope({ root: '.theme-acme', layer: 'overrides' }, 'btn-base', {
      borderRadius: '999px',
    });
    flushSync();

    const css = getRegisteredCss();
    expect(css).toContain('@layer overrides;');
    expect(css).toMatch(/@layer overrides \{[\s\S]*@scope \(\.theme-acme\)/);
  });

  it('keeps scoped rules distinct when the same class is scoped in different layers', () => {
    const styles = createStyles({
      layers: ['theme-a', 'theme-b'] as const,
    });
    styles.scope({ root: '.theme-acme', layer: 'theme-a' }, 'btn-base', { color: 'red' });
    styles.scope({ root: '.theme-acme', layer: 'theme-b' }, 'btn-base', { color: 'blue' });
    flushSync();

    const css = getRegisteredCss();
    expect(css).toContain('color: red');
    expect(css).toContain('color: blue');
  });
});
