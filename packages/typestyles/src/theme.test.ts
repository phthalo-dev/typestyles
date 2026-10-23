import { describe, it, expect, beforeEach, vi } from 'vite-plus/test';
import { createTheme, createDarkMode, when, colorMode } from './theme';
import { reset, flushSync, getRegisteredCss } from './sheet';

function getRules(): CSSRule[] {
  const style = document.getElementById('typestyles') as HTMLStyleElement;
  return Array.from(style?.sheet?.cssRules ?? []);
}

function getRuleTexts(): string[] {
  return getRules().map((r) => r.cssText);
}

function findRule(predicate: (text: string) => boolean): string | undefined {
  return getRuleTexts().find(predicate);
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

describe('Theme', () => {
  beforeEach(() => reset());

  it('has className and name properties', () => {
    const acme = createTheme('acme', { tokens: { color: { primary: '#111' } } });
    expect(acme.className).toBe('theme-acme');
    expect(acme.name).toBe('acme');
  });

  it('coerces to className via toString()', () => {
    const acme = createTheme('acme', { tokens: { color: { primary: '#111' } } });
    expect(acme.toString()).toBe('theme-acme');
    expect(`${acme}`).toBe('theme-acme');
    expect(String(acme)).toBe('theme-acme');
  });

  it('coerces via Symbol.toPrimitive', () => {
    const acme = createTheme('acme', { tokens: { color: { primary: '#111' } } });
    // Template literal uses Symbol.toPrimitive
    expect(`wrapper ${acme} end`).toBe('wrapper theme-acme end');
  });

  it('works in string concatenation', () => {
    const acme = createTheme('acme', {});
    expect('cls-' + acme).toBe('cls-theme-acme');
  });
});

// ---------------------------------------------------------------------------
// createTheme — base rules
// ---------------------------------------------------------------------------

describe('createTheme base rules', () => {
  beforeEach(() => reset());

  it('emits a base rule with declarations', () => {
    createTheme('brand', {
      tokens: {
        color: { text: '#111', bg: '#fff' },
        spacing: { sm: '4px' },
      },
    });
    flushSync();

    const rule = findRule((t) => t.includes('.theme-brand'));
    expect(rule).toBeDefined();
    expect(rule).toContain('--color-text: #111');
    expect(rule).toContain('--color-bg: #fff');
    expect(rule).toContain('--spacing-sm: 4px');
  });

  it('emits an empty base rule when base is omitted', () => {
    createTheme('empty', {});
    flushSync();

    const rule = findRule((t) => t.includes('.theme-empty'));
    expect(rule).toBeDefined();
  });

  it('emits an empty base rule when base is empty object', () => {
    createTheme('empty2', { tokens: {} });
    flushSync();

    const rule = findRule((t) => t.includes('.theme-empty2'));
    expect(rule).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// when.* condition builders
// ---------------------------------------------------------------------------

describe('when condition builders', () => {
  it('when.media creates a media condition', () => {
    const cond = when.media('(min-width: 768px)');
    expect(cond).toEqual({ type: 'media', query: '(min-width: 768px)' });
  });

  it('when.prefersDark is prefers-color-scheme: dark', () => {
    expect(when.prefersDark).toEqual({
      type: 'media',
      query: '(prefers-color-scheme: dark)',
    });
  });

  it('when.prefersLight is prefers-color-scheme: light', () => {
    expect(when.prefersLight).toEqual({
      type: 'media',
      query: '(prefers-color-scheme: light)',
    });
  });

  it('when.attr creates an attribute condition', () => {
    const cond = when.attr('data-mode', 'dark', { scope: 'ancestor' });
    expect(cond).toEqual({
      type: 'attr',
      name: 'data-mode',
      value: 'dark',
      scope: 'ancestor',
    });
  });

  it('when.className creates a class condition', () => {
    const cond = when.className('dark-mode', { scope: 'self' });
    expect(cond).toEqual({
      type: 'class',
      name: 'dark-mode',
      scope: 'self',
    });
  });

  it('when.selector creates a selector condition', () => {
    const cond = when.selector('.legacy-app');
    expect(cond).toEqual({ type: 'selector', selector: '.legacy-app' });
  });

  it('when.and composes conditions', () => {
    const cond = when.and(when.prefersDark, when.attr('data-mode', 'light', { scope: 'self' }));
    expect(cond.type).toBe('and');
    expect(cond.conditions).toHaveLength(2);
  });

  it('when.or composes conditions', () => {
    const cond = when.or(when.prefersDark, when.attr('data-mode', 'dark', { scope: 'self' }));
    expect(cond.type).toBe('or');
    expect(cond.conditions).toHaveLength(2);
  });

  it('when.not wraps a condition and folds double negation', () => {
    const once = when.not(when.prefersDark);
    expect(once).toEqual({ type: 'not', condition: when.prefersDark });

    const twice = when.not(when.not(when.prefersDark));
    expect(twice).toEqual(when.prefersDark);
  });
});

// ---------------------------------------------------------------------------
// Mode layers — media conditions
// ---------------------------------------------------------------------------

describe('mode layers with media conditions', () => {
  beforeEach(() => reset());

  it('wraps overrides in @media when using when.media', () => {
    createTheme('t1', {
      tokens: { color: { text: '#000' } },
      modes: [
        {
          id: 'dark',
          overrides: { color: { text: '#fff' } },
          when: when.media('(prefers-color-scheme: dark)'),
        },
      ],
    });
    flushSync();

    const mediaRule = findRule((t) => t.includes('@media') && t.includes('prefers-color-scheme'));
    expect(mediaRule).toBeDefined();
    expect(mediaRule).toContain('.theme-t1');
    expect(mediaRule).toContain('--color-text: #fff');
  });

  it('wraps overrides in @media when using when.prefersDark', () => {
    createTheme('t2', {
      modes: [
        {
          id: 'dark',
          overrides: { color: { bg: '#111' } },
          when: when.prefersDark,
        },
      ],
    });
    flushSync();

    const mediaRule = findRule((t) => t.includes('@media') && t.includes('.theme-t2'));
    expect(mediaRule).toBeDefined();
    expect(mediaRule).toContain('--color-bg: #111');
  });
});

// ---------------------------------------------------------------------------
// Mode layers — attribute conditions
// ---------------------------------------------------------------------------

describe('mode layers with attribute conditions', () => {
  beforeEach(() => reset());

  it('attr scope=self appends attribute to theme class', () => {
    createTheme('t3', {
      modes: [
        {
          id: 'dark',
          overrides: { color: { text: '#eee' } },
          when: when.attr('data-mode', 'dark', { scope: 'self' }),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes('[data-mode="dark"]'));
    expect(rule).toBeDefined();
    // Self scope: .theme-t3[data-mode="dark"]
    expect(rule).toContain('.theme-t3[data-mode="dark"]');
    expect(rule).toContain('--color-text: #eee');
  });

  it('attr scope=ancestor prepends attribute selector', () => {
    createTheme('t4', {
      modes: [
        {
          id: 'dark',
          overrides: { color: { text: '#eee' } },
          when: when.attr('data-mode', 'dark', { scope: 'ancestor' }),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes('[data-mode="dark"]'));
    expect(rule).toBeDefined();
    // Ancestor scope: [data-mode="dark"] .theme-t4
    expect(rule).toContain('[data-mode="dark"] .theme-t4');
    expect(rule).toContain('--color-text: #eee');
  });

  it('attr scope=descendant appends a descendant-combinator selector', () => {
    createTheme('t4d', {
      modes: [
        {
          id: 'surface-dark',
          overrides: { color: { text: '#eee' } },
          when: when.attr('data-surface', 'dark', { scope: 'descendant' }),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes('[data-surface="dark"]'));
    expect(rule).toBeDefined();
    // Descendant scope: .theme-t4d [data-surface="dark"] (space = descendant combinator)
    expect(rule).toContain('.theme-t4d [data-surface="dark"]');
    expect(rule).not.toContain('.theme-t4d[data-surface="dark"]');
    expect(rule).toContain('--color-text: #eee');
  });
});

// ---------------------------------------------------------------------------
// Mode layers — class conditions
// ---------------------------------------------------------------------------

describe('mode layers with class conditions', () => {
  beforeEach(() => reset());

  it('className scope=self appends class to theme selector', () => {
    createTheme('t5', {
      modes: [
        {
          id: 'dark',
          overrides: { color: { text: '#ddd' } },
          when: when.className('dark', { scope: 'self' }),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes('.theme-t5.dark'));
    expect(rule).toBeDefined();
    expect(rule).toContain('--color-text: #ddd');
  });

  it('className scope=ancestor prepends class selector', () => {
    createTheme('t6', {
      modes: [
        {
          id: 'dark',
          overrides: { color: { text: '#ddd' } },
          when: when.className('dark', { scope: 'ancestor' }),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes('.dark .theme-t6'));
    expect(rule).toBeDefined();
    expect(rule).toContain('--color-text: #ddd');
  });

  it('className scope=descendant appends a descendant-combinator selector', () => {
    createTheme('t6d', {
      modes: [
        {
          id: 'surface-dark',
          overrides: { color: { text: '#ddd' } },
          when: when.className('surface-dark', { scope: 'descendant' }),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes('.theme-t6d .surface-dark'));
    expect(rule).toBeDefined();
    expect(rule).not.toContain('.theme-t6d.surface-dark');
    expect(rule).toContain('--color-text: #ddd');
  });
});

// ---------------------------------------------------------------------------
// Mode layers — selector escape hatch
// ---------------------------------------------------------------------------

describe('mode layers with selector escape hatch', () => {
  beforeEach(() => reset());

  it('uses raw selector as ancestor context', () => {
    createTheme('t7', {
      modes: [
        {
          id: 'legacy',
          overrides: { color: { text: '#999' } },
          when: when.selector('.legacy-app'),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes('.legacy-app'));
    expect(rule).toBeDefined();
    expect(rule).toContain('.legacy-app .theme-t7');
    expect(rule).toContain('--color-text: #999');
  });

  it('warns on empty selector in dev mode', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    when.selector('');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('empty string'));
    spy.mockRestore();
  });

  it('warns on unmatched brackets in dev mode', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    when.selector('.foo[bar');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('unmatched brackets'));
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Composed conditions — and / or
// ---------------------------------------------------------------------------

describe('composed conditions', () => {
  beforeEach(() => reset());

  it('when.and combines media + attribute into nested rule', () => {
    createTheme('t8', {
      modes: [
        {
          id: 'light-override',
          overrides: { color: { text: '#111' } },
          when: when.and(when.prefersDark, when.attr('data-mode', 'light', { scope: 'ancestor' })),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes('@media') && t.includes('[data-mode="light"]'));
    expect(rule).toBeDefined();
    expect(rule).toContain('prefers-color-scheme: dark');
    expect(rule).toContain('[data-mode="light"] .theme-t8');
    expect(rule).toContain('--color-text: #111');
  });

  it('when.and combines media + self attribute', () => {
    createTheme('t8b', {
      modes: [
        {
          id: 'override',
          overrides: { color: { a: '#000' } },
          when: when.and(when.prefersDark, when.attr('data-mode', 'light', { scope: 'self' })),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes('@media') && t.includes('[data-mode="light"]'));
    expect(rule).toBeDefined();
    expect(rule).toContain('.theme-t8b[data-mode="light"]');
  });

  it('when.or emits separate rules for each branch', () => {
    createTheme('t9', {
      modes: [
        {
          id: 'dark',
          overrides: { color: { text: '#eee' } },
          when: when.or(when.prefersDark, when.attr('data-mode', 'dark', { scope: 'ancestor' })),
        },
      ],
    });
    flushSync();

    const rules = getRuleTexts();
    const mediaRule = rules.find((t) => t.includes('@media') && t.includes('prefers-color-scheme'));
    const attrRule = rules.find((t) => t.includes('[data-mode="dark"]') && !t.includes('@media'));

    expect(mediaRule).toBeDefined();
    expect(attrRule).toBeDefined();
    // Both should have the same declarations
    expect(mediaRule).toContain('--color-text: #eee');
    expect(attrRule).toContain('--color-text: #eee');
  });

  it('when.or branches get distinct keys', () => {
    createTheme('t9b', {
      modes: [
        {
          id: 'dark',
          overrides: { color: { x: '#000' } },
          when: when.or(when.prefersDark, when.className('dark', { scope: 'self' })),
        },
      ],
    });
    flushSync();

    const rules = getRuleTexts();
    // Should have base + 2 mode rules
    const themeRules = rules.filter((t) => t.includes('theme-t9b'));
    expect(themeRules.length).toBe(3); // base + 2 or-branches
  });
});

// ---------------------------------------------------------------------------
// when.not
// ---------------------------------------------------------------------------

describe('when.not', () => {
  beforeEach(() => reset());

  it('negates prefersDark to @media not (prefers-color-scheme: dark)', () => {
    createTheme('n1', {
      tokens: { color: { text: '#000' } },
      modes: [
        {
          id: 'non-dark-media',
          overrides: { color: { text: '#111' } },
          when: when.not(when.prefersDark),
        },
      ],
    });
    flushSync();

    const rule = findRule(
      (t) => t.includes('@media') && t.includes('not') && t.includes('prefers-color-scheme: dark'),
    );
    expect(rule).toBeDefined();
    expect(rule).toContain('.theme-n1');
    expect(rule).toContain('--color-text: #111');
  });

  it('ancestor attr negation uses :root:not([attr]) .theme', () => {
    createTheme('n2', {
      modes: [
        {
          id: 'no-dark-attr',
          overrides: { color: { text: '#222' } },
          when: when.not(when.attr('data-mode', 'dark', { scope: 'ancestor' })),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes(':root:not([data-mode="dark"])'));
    expect(rule).toBeDefined();
    expect(rule).toContain(':root:not([data-mode="dark"]) .theme-n2');
  });

  it('self attr negation uses .theme:not([attr])', () => {
    createTheme('n3', {
      modes: [
        {
          id: 'x',
          overrides: { color: { text: '#333' } },
          when: when.not(when.attr('data-x', 'on', { scope: 'self' })),
        },
      ],
    });
    flushSync();

    const rule = findRule((t) => t.includes('.theme-n3:not([data-x="on"])'));
    expect(rule).toBeDefined();
  });

  it('peels paired not at compile time (AST double negation)', () => {
    createTheme('n4', {
      tokens: { color: { text: '#000' } },
      modes: [
        {
          id: 'dark',
          overrides: { color: { text: '#fff' } },
          when: {
            type: 'not',
            condition: {
              type: 'not',
              condition: when.prefersDark,
            },
          },
        },
      ],
    });
    flushSync();

    const rules = getRuleTexts().filter((t) => t.includes('theme-n4'));
    expect(rules).toHaveLength(2);
    expect(rules[1]).toContain('@media');
    expect(rules[1]).toContain('prefers-color-scheme: dark');
    expect(rules[1]).not.toContain('not (prefers-color-scheme: dark)');
  });

  it('warns when inner is when.or', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createTheme('n5', {
      modes: [
        {
          id: 'bad',
          overrides: { color: { text: '#fff' } },
          when: when.not(when.or(when.prefersDark, when.className('d', { scope: 'self' }))),
        },
      ],
    });
    flushSync();

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/single rule branch/));
    const rules = getRuleTexts().filter((t) => t.includes('theme-n5'));
    expect(rules).toHaveLength(1); // base only
    spy.mockRestore();
  });

  it('warns for when.not(when.selector(...))', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createTheme('n6', {
      modes: [
        {
          id: 'bad',
          overrides: { color: { text: '#999' } },
          when: when.not(when.selector('.legacy')),
        },
      ],
    });
    flushSync();

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/when\.selector/));
    spy.mockRestore();
  });

  it('warns for when.not on a descendant-scoped attr condition and emits no rule', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createTheme('n7', {
      tokens: { color: { text: '#000' } },
      modes: [
        {
          id: 'bad',
          overrides: { color: { text: '#999' } },
          when: when.not(when.attr('data-surface', 'dark', { scope: 'descendant' })),
        },
      ],
    });
    flushSync();

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/descendant/));
    // Must hit the explicit descendant branch, not the generic fallback warning.
    expect(spy).not.toHaveBeenCalledWith(expect.stringMatching(/unexpected selector suffix shape/));
    const rules = getRuleTexts().filter((t) => t.includes('theme-n7'));
    expect(rules).toHaveLength(1); // base only
    spy.mockRestore();
  });

  it('warns for when.not on a descendant-scoped className condition and emits no rule', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createTheme('n8', {
      modes: [
        {
          id: 'bad',
          overrides: { color: { text: '#999' } },
          when: when.not(when.className('surface-dark', { scope: 'descendant' })),
        },
      ],
    });
    flushSync();

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/descendant/));
    expect(spy).not.toHaveBeenCalledWith(expect.stringMatching(/unexpected selector suffix shape/));
    const rules = getRuleTexts().filter((t) => t.includes('theme-n8'));
    expect(rules).toHaveLength(1); // base only, no mode rule
    expect(rules[0]).not.toContain('surface-dark');
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Fixed-tone surface — descendant scope integration
// ---------------------------------------------------------------------------

describe('fixed-tone surface (descendant scope integration)', () => {
  beforeEach(() => reset());

  it('mixes ambient color modes and a descendant-scoped mode in one modes array', () => {
    createTheme('acme', {
      tokens: { color: { bg: '#fff' } },
      modes: [
        ...colorMode.systemWithLightDarkOverride({
          attribute: 'data-color-mode',
          values: { light: 'light', dark: 'dark' },
          scope: 'ancestor',
          light: { color: { bg: '#fff' } },
          dark: { color: { bg: '#111' } },
        }),
        {
          id: 'surface-dark',
          overrides: { color: { bg: '#111' } },
          when: when.attr('data-surface', 'dark', { scope: 'descendant' }),
        },
      ],
    });
    flushSync();

    // Ambient light/dark rules are unaffected.
    expect(findRule((t) => t.includes('prefers-color-scheme: dark'))).toBeDefined();
    expect(findRule((t) => t.includes('[data-color-mode="dark"] .theme-acme'))).toBeDefined();

    // Fixed-tone surface rule matches a marker inside the themed subtree.
    const surfaceRule = findRule((t) => t.includes('.theme-acme [data-surface="dark"]'));
    expect(surfaceRule).toBeDefined();
    expect(surfaceRule).toContain('--color-bg: #111');
  });
});

// ---------------------------------------------------------------------------
// colorMode presets
// ---------------------------------------------------------------------------

describe('colorMode.mediaOnly', () => {
  beforeEach(() => reset());

  it('produces a single dark mode under prefers-color-scheme: dark', () => {
    createTheme('m1', {
      tokens: { color: { text: '#000' } },
      modes: colorMode.mediaOnly({
        dark: { color: { text: '#fff' } },
      }),
    });
    flushSync();

    const rules = getRuleTexts();
    expect(rules).toHaveLength(2); // base + dark media
    expect(rules[1]).toContain('@media');
    expect(rules[1]).toContain('prefers-color-scheme: dark');
    expect(rules[1]).toContain('--color-text: #fff');
  });
});

describe('colorMode.attributeOnly', () => {
  beforeEach(() => reset());

  it('produces dark mode via attribute only', () => {
    createTheme('a1', {
      tokens: { color: { text: '#000' } },
      modes: colorMode.attributeOnly({
        attribute: 'data-theme',
        values: { dark: 'dark' },
        scope: 'ancestor',
        dark: { color: { text: '#fff' } },
      }),
    });
    flushSync();

    const rules = getRuleTexts();
    const darkRule = rules.find((t) => t.includes('[data-theme="dark"]'));
    expect(darkRule).toBeDefined();
    expect(darkRule).toContain('[data-theme="dark"] .theme-a1');
    // No @media rule
    expect(rules.filter((t) => t.includes('@media'))).toHaveLength(0);
  });

  it('includes optional light override', () => {
    createTheme('a2', {
      tokens: { color: { text: '#333' } },
      modes: colorMode.attributeOnly({
        attribute: 'data-theme',
        values: { dark: 'dark', light: 'light' },
        scope: 'self',
        dark: { color: { text: '#fff' } },
        light: { color: { text: '#000' } },
      }),
    });
    flushSync();

    const rules = getRuleTexts();
    const darkRule = rules.find((t) => t.includes('[data-theme="dark"]'));
    const lightRule = rules.find((t) => t.includes('[data-theme="light"]'));
    expect(darkRule).toBeDefined();
    expect(lightRule).toBeDefined();
    expect(darkRule).toContain('.theme-a2[data-theme="dark"]');
    expect(lightRule).toContain('.theme-a2[data-theme="light"]');
  });
});

describe('colorMode.mediaOrAttribute', () => {
  beforeEach(() => reset());

  it('dark applies under either media or attribute (OR)', () => {
    createTheme('ma1', {
      tokens: { color: { bg: '#fff' } },
      modes: colorMode.mediaOrAttribute({
        attribute: 'data-color-mode',
        values: { dark: 'dark' },
        scope: 'ancestor',
        dark: { color: { bg: '#111' } },
      }),
    });
    flushSync();

    const rules = getRuleTexts();
    const mediaRule = rules.find((t) => t.includes('@media') && t.includes('prefers-color-scheme'));
    const attrRule = rules.find(
      (t) => t.includes('[data-color-mode="dark"]') && !t.includes('@media'),
    );

    expect(mediaRule).toBeDefined();
    expect(attrRule).toBeDefined();
  });
});

describe('colorMode.systemWithLightDarkOverride', () => {
  beforeEach(() => reset());

  it('produces the four-rule pattern (base + 3 modes)', () => {
    const lightTokens = { color: { text: '#111', bg: '#fff' } };
    const darkTokens = { color: { text: '#eee', bg: '#0f172a' } };

    createTheme('sw1', {
      tokens: lightTokens,
      modes: colorMode.systemWithLightDarkOverride({
        attribute: 'data-color-mode',
        values: { light: 'light', dark: 'dark' },
        scope: 'ancestor',
        light: lightTokens,
        dark: darkTokens,
      }),
    });
    flushSync();

    const rules = getRuleTexts();
    // 1. base: .theme-sw1 { ... }
    // 2. dark-media: @media (prefers-color-scheme: dark) { .theme-sw1 { ... } }
    // 3. dark-attr: [data-color-mode="dark"] .theme-sw1 { ... }
    // 4. light-override: @media (...dark) { [data-color-mode="light"] .theme-sw1 { ... } }
    expect(rules).toHaveLength(4);

    // Rule 1: base
    expect(rules[0]).toContain('.theme-sw1');
    expect(rules[0]).toContain('--color-text: #111');

    // Rule 2: dark under media
    expect(rules[1]).toContain('@media');
    expect(rules[1]).toContain('prefers-color-scheme: dark');
    expect(rules[1]).toContain('--color-text: #eee');

    // Rule 3: dark under attribute
    expect(rules[2]).toContain('[data-color-mode="dark"] .theme-sw1');
    expect(rules[2]).toContain('--color-text: #eee');
    expect(rules[2]).not.toContain('@media');

    // Rule 4: forced light under media+attribute
    expect(rules[3]).toContain('@media');
    expect(rules[3]).toContain('[data-color-mode="light"] .theme-sw1');
    expect(rules[3]).toContain('--color-text: #111');
  });

  it('works with self scope', () => {
    createTheme('sw2', {
      tokens: { color: { text: '#000' } },
      modes: colorMode.systemWithLightDarkOverride({
        attribute: 'data-mode',
        values: { light: 'light', dark: 'dark' },
        scope: 'self',
        light: { color: { text: '#000' } },
        dark: { color: { text: '#fff' } },
      }),
    });
    flushSync();

    const rules = getRuleTexts();
    // dark-attr rule should be self-scope
    const darkAttr = rules.find((t) => t.includes('[data-mode="dark"]') && !t.includes('@media'));
    expect(darkAttr).toContain('.theme-sw2[data-mode="dark"]');

    // light-override rule should also be self-scope
    const lightOverride = rules.find(
      (t) => t.includes('[data-mode="light"]') && t.includes('@media'),
    );
    expect(lightOverride).toContain('.theme-sw2[data-mode="light"]');
  });
});

// ---------------------------------------------------------------------------
// mode-aware leaves + modes
// ---------------------------------------------------------------------------

describe('mode-aware leaves with modes', () => {
  beforeEach(() => reset());

  it('allows mode-aware leaves alongside manual modes', () => {
    createTheme(
      'both',
      {
        tokens: { color: { text: { light: '#111', dark: '#eee' } } },
        modes: [
          { id: 'shadow', overrides: { shadow: { sm: '0 1px 2px #000' } }, when: when.prefersDark },
        ],
      },
      undefined,
      undefined,
      undefined,
      { colorModes: ['light', 'dark'] },
    );
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('light-dark(#111, #eee)');
    expect(css).toContain('--shadow-sm:');
  });

  it('emits dark-only values for mode-aware leaves inside manual modes', () => {
    createTheme(
      'shadow-mode',
      {
        tokens: { shadow: { glow: '0 0 0 1px #000' } },
        modes: [
          {
            id: 'dark',
            overrides: {
              shadow: { glow: { light: '0 0 0 1px #000', dark: '0 0 16px #fff' } },
            },
            when: when.prefersDark,
          },
        ],
      },
      undefined,
      undefined,
      undefined,
      { colorModes: ['light', 'dark'] },
    );
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('--shadow-glow: 0 0 0 1px #000');
    expect(css).toMatch(/prefers-color-scheme:\s*dark[\s\S]*--shadow-glow:\s*0 0 16px #fff/);
  });

  it('uses self-scoped dark fallback for incompatible colorMode leaves', () => {
    createTheme(
      'fallback-self',
      {
        tokens: {
          shadow: { glow: { light: '0 0 0 1px #000', dark: '0 0 16px #fff' } },
        },
      },
      undefined,
      undefined,
      undefined,
      { colorModes: ['light', 'dark'] },
    );
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.theme-fallback-self[data-color-mode="dark"]');
    expect(css).toContain('.theme-fallback-self [data-color-mode="dark"]');
    expect(css).toMatch(
      /\.theme-fallback-self\[data-color-mode="dark"\][\s\S]*--shadow-glow:\s*0 0 16px #fff/,
    );
  });
});

// ---------------------------------------------------------------------------
// createDarkMode shorthand
// ---------------------------------------------------------------------------

describe('createDarkMode', () => {
  beforeEach(() => reset());

  it('returns a Theme', () => {
    const dm = createDarkMode('simple', { color: { text: '#eee' } });
    expect(dm.className).toBe('theme-simple');
    expect(dm.name).toBe('simple');
  });

  it('emits base + dark media rule', () => {
    createDarkMode('simple', { color: { text: '#eee' } });
    flushSync();

    const rules = getRuleTexts();
    // base (empty) + dark media
    expect(rules).toHaveLength(2);
    expect(rules[1]).toContain('@media');
    expect(rules[1]).toContain('prefers-color-scheme: dark');
    expect(rules[1]).toContain('--color-text: #eee');
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

describe('deduplication', () => {
  beforeEach(() => reset());

  it('does not emit duplicate rules on repeated createTheme calls with same name', () => {
    createTheme('dup', {
      tokens: { color: { text: '#000' } },
      modes: [{ id: 'dark', overrides: { color: { text: '#fff' } }, when: when.prefersDark }],
    });
    // Call again with same name
    createTheme('dup', {
      tokens: { color: { text: '#000' } },
      modes: [{ id: 'dark', overrides: { color: { text: '#fff' } }, when: when.prefersDark }],
    });
    flushSync();

    const rules = getRuleTexts();
    const themeRules = rules.filter((t) => t.includes('theme-dup'));
    // Should only have 2 rules (base + dark) not 4
    expect(themeRules).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  beforeEach(() => reset());

  it('skips mode rules with empty overrides', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createTheme('edge1', {
      tokens: { color: { text: '#000' } },
      modes: [{ id: 'dark', overrides: {}, when: when.prefersDark }],
    });
    flushSync();

    const rules = getRuleTexts();
    expect(rules).toHaveLength(1); // only base
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/mode "dark" has empty overrides/));
    spy.mockRestore();
  });

  it('handles deeply nested token overrides', () => {
    createTheme('edge2', {
      tokens: {
        color: {
          brand: { primary: { DEFAULT: '#0066ff', hover: '#0052cc' } },
        },
      },
    });
    flushSync();

    const rule = findRule((t) => t.includes('.theme-edge2'));
    expect(rule).toContain('--color-brand-primary-DEFAULT: #0066ff');
    expect(rule).toContain('--color-brand-primary-hover: #0052cc');
  });

  it('handles multiple namespaces in overrides', () => {
    createTheme('edge3', {
      tokens: {
        color: { text: '#000' },
        spacing: { sm: '4px' },
        typography: { size: { body: '16px' } },
      },
    });
    flushSync();

    const rule = findRule((t) => t.includes('.theme-edge3'));
    expect(rule).toContain('--color-text: #000');
    expect(rule).toContain('--spacing-sm: 4px');
    expect(rule).toContain('--typography-size-body: 16px');
  });

  it('numeric token values are stringified', () => {
    createTheme('edge4', {
      tokens: { spacing: { sm: 4 as unknown as string } },
    });
    flushSync();

    const rule = findRule((t) => t.includes('.theme-edge4'));
    expect(rule).toContain('--spacing-sm: 4');
  });
});

// ---------------------------------------------------------------------------
// Multiple themes (brand switching)
// ---------------------------------------------------------------------------

describe('multiple themes (brand switching)', () => {
  beforeEach(() => reset());

  it('independent themes do not interfere', () => {
    const acme = createTheme('acme', {
      tokens: { color: { primary: '#0066ff' } },
      modes: colorMode.mediaOnly({ dark: { color: { primary: '#66b3ff' } } }),
    });

    const contoso = createTheme('contoso', {
      tokens: { color: { primary: '#ff6600' } },
      modes: colorMode.mediaOnly({ dark: { color: { primary: '#ffaa66' } } }),
    });

    flushSync();

    expect(acme.className).toBe('theme-acme');
    expect(contoso.className).toBe('theme-contoso');

    const rules = getRuleTexts();
    expect(rules.filter((t) => t.includes('theme-acme'))).toHaveLength(2);
    expect(rules.filter((t) => t.includes('theme-contoso'))).toHaveLength(2);
  });

  it('shared mode factory reuses preset logic', () => {
    const darkTokens = { color: { text: '#eee' } };
    const sharedModes = () => colorMode.mediaOnly({ dark: darkTokens });

    createTheme('brand-a', { tokens: { color: { text: '#111' } }, modes: sharedModes() });
    createTheme('brand-b', { tokens: { color: { text: '#222' } }, modes: sharedModes() });

    flushSync();

    const rules = getRuleTexts();
    expect(rules.filter((t) => t.includes('theme-brand-a'))).toHaveLength(2);
    expect(rules.filter((t) => t.includes('theme-brand-b'))).toHaveLength(2);
  });
});
