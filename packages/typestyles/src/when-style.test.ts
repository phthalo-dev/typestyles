import { describe, it, expect, beforeEach } from 'vitest';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { createStyles } from './styles';
import { when, resolvedDarkWhen } from './theme';
import { whenStyle, nestedConditionSelectorKey } from './when-style';
import { compileThemeCondition } from './condition-compile';
import { registeredNamespaces } from './registry';

describe('nestedConditionSelectorKey', () => {
  it('formats ancestor, self, and descendant branches', () => {
    expect(nestedConditionSelectorKey({ selectorPrefix: '[data-mode="dark"]' })).toBe(
      '[data-mode="dark"] &',
    );
    expect(nestedConditionSelectorKey({ selectorSuffix: '[data-mode="dark"]' })).toBe(
      '&[data-mode="dark"]',
    );
    expect(nestedConditionSelectorKey({ selectorSuffix: ' [data-surface="dark"]' })).toBe(
      '& [data-surface="dark"]',
    );
    expect(
      nestedConditionSelectorKey({
        selectorPrefix: '[data-mode="dark"]',
        selectorSuffix: '[data-tone="accent"]',
      }),
    ).toBe('[data-mode="dark"] &[data-tone="accent"]');
  });
});

describe('whenStyle / styles.when', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('expands prefersDark to an @media block', () => {
    expect(whenStyle(when.prefersDark, { color: '#eee' })).toEqual({
      '@media (prefers-color-scheme: dark)': { color: '#eee' },
    });
  });

  it('expands ancestor attr to a prefix & key', () => {
    expect(
      whenStyle(when.attr('data-mode', 'dark', { scope: 'ancestor' }), { color: '#eee' }),
    ).toEqual({
      '[data-mode="dark"] &': { color: '#eee' },
    });
  });

  it('expands self attr to an &suffix key', () => {
    expect(whenStyle(when.attr('data-mode', 'dark', { scope: 'self' }), { opacity: 0.9 })).toEqual({
      '&[data-mode="dark"]': { opacity: 0.9 },
    });
  });

  it('expands descendant attr with a space after &', () => {
    expect(
      whenStyle(when.attr('data-surface', 'dark', { scope: 'descendant' }), {
        backgroundColor: '#111',
      }),
    ).toEqual({
      '& [data-surface="dark"]': { backgroundColor: '#111' },
    });
  });

  it('matches resolvedDarkWhen branches (attr dark OR system dark when not light)', () => {
    const fragment = whenStyle(resolvedDarkWhen('data-mode', 'ancestor'), {
      '&::after': { opacity: 0.85 },
    });

    expect(fragment['[data-mode="dark"] &']).toEqual({ '&::after': { opacity: 0.85 } });

    const mediaKey = '@media (prefers-color-scheme: dark)';
    expect(fragment[mediaKey]).toEqual({
      ':root:not([data-mode="light"]) &': { '&::after': { opacity: 0.85 } },
    });
  });

  it('merges multiple OR branches that share an @media key', () => {
    const condition = when.or(
      when.and(when.prefersDark, when.attr('data-a', '1', { scope: 'ancestor' })),
      when.and(when.prefersDark, when.attr('data-b', '1', { scope: 'ancestor' })),
    );
    const fragment = whenStyle(condition, { color: 'red' });
    expect(fragment['@media (prefers-color-scheme: dark)']).toEqual({
      '[data-a="1"] &': { color: 'red' },
      '[data-b="1"] &': { color: 'red' },
    });
  });

  it('styles.when emits nested CSS from a recipe base slot', () => {
    const styles = createStyles({ scopeId: 'app' });
    styles.component({
      name: 'badge',
      styles: {
        base: {
          color: '#111',
          ...styles.when(when.prefersDark, { color: '#eee' }),
          ...styles.when(when.attr('data-mode', 'dark', { scope: 'ancestor' }), {
            '&::after': { content: '""', opacity: '0.8' },
          }),
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.app-badge { color: #111; }');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain('.app-badge { color: #eee; }');
    expect(css).toContain('[data-mode="dark"] .app-badge::after');
    expect(css).toContain('opacity: 0.8');
  });

  it('compile + nested key stay aligned for className self scope', () => {
    const [branch] = compileThemeCondition(when.className('is-active', { scope: 'self' }));
    expect(nestedConditionSelectorKey(branch!)).toBe('&.is-active');
  });
});
