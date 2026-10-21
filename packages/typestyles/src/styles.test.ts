import { describe, it, expect, beforeEach, vi, expectTypeOf } from 'vitest';
import { createClass, createHashClass, compose, createStyles } from './styles';
import { cx } from './index';
import { createComponent } from './component';
import { defaultClassNamingConfig, mergeClassNaming } from './class-naming';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { registeredNamespaces } from './registry';

describe('createClass', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('returns the class name string', () => {
    const card = createClass(defaultClassNamingConfig, 'card', {
      padding: '1rem',
      borderRadius: '8px',
    });
    expect(card).toBe('card');
  });

  it('injects CSS into the style sheet', () => {
    createClass(defaultClassNamingConfig, 'class-test', { color: 'red', fontSize: '14px' });
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    expect(style).not.toBeNull();
    const rule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.class-test',
    ) as CSSStyleRule;
    expect(rule).toBeDefined();
    expect(rule.style.color).toBe('red');
  });

  it('supports nested selectors', () => {
    createClass(defaultClassNamingConfig, 'hover-card', {
      padding: '1rem',
      '&:hover': { color: 'blue' },
    });
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const rules = Array.from(style.sheet?.cssRules ?? []) as CSSStyleRule[];
    const selectors = rules.map((r) => r.selectorText);
    expect(selectors).toContain('.hover-card');
    expect(selectors).toContain('.hover-card:hover');
  });

  it('in development, re-registering the same class name succeeds (HMR / out-of-order dispose / multi-environment SSR re-evaluation)', () => {
    createClass(defaultClassNamingConfig, 'dup-class', { color: 'red' });
    expect(() =>
      createClass(defaultClassNamingConfig, 'dup-class', { color: 'blue' }),
    ).not.toThrow();
  });

  it('re-registration replaces the previous rule instead of duplicating it', () => {
    createClass(defaultClassNamingConfig, 'dup-class', { color: 'red' });
    createClass(defaultClassNamingConfig, 'dup-class', { color: 'blue' });
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const rules = Array.from(style.sheet?.cssRules ?? []).filter(
      (r): r is CSSStyleRule => r instanceof CSSStyleRule && r.selectorText === '.dup-class',
    );
    expect(rules).toHaveLength(1);
    expect(rules[0].style.color).toBe('blue');
  });

  it('allows the same class name when scopeId differs', () => {
    const a = mergeClassNaming({ scopeId: 'pkg-a' });
    const b = mergeClassNaming({ scopeId: 'pkg-b' });
    createClass(a, 'shared', { margin: '0px' });
    expect(() => createClass(b, 'shared', { margin: '0px' })).not.toThrow();
  });

  it('does not throw duplicate class in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      createClass(defaultClassNamingConfig, 'prod-dup-class', { color: 'red' });
      expect(() =>
        createClass(defaultClassNamingConfig, 'prod-dup-class', { color: 'blue' }),
      ).not.toThrow();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('createHashClass', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('returns deterministic class names for identical styles', () => {
    const a = createHashClass(defaultClassNamingConfig, { color: 'red', padding: '8px' });
    const b = createHashClass(defaultClassNamingConfig, { color: 'red', padding: '8px' });
    expect(a).toBe(b);
  });

  it('returns different class names for different styles', () => {
    const a = createHashClass(defaultClassNamingConfig, { color: 'red' });
    const b = createHashClass(defaultClassNamingConfig, { color: 'blue' });
    expect(a).not.toBe(b);
  });

  it('supports labels for readability', () => {
    const cls = createHashClass(defaultClassNamingConfig, { color: 'red' }, 'button-primary');
    expect(cls.startsWith('ts-button-primary-')).toBe(true);
  });

  it('injects CSS for the hashed selector', () => {
    const cls = createHashClass(
      defaultClassNamingConfig,
      { color: 'red', fontSize: '14px' },
      'hash-test',
    );
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const rule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === `.${cls}`,
    ) as CSSStyleRule;
    expect(rule).toBeDefined();
    expect(rule.style.color).toBe('red');
  });
});

describe('cx', () => {
  it('joins class strings', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cx('a', false, null, undefined, '', 0, 'b')).toBe('a b');
  });

  it('returns empty string for no truthy values', () => {
    expect(cx(false, null, undefined)).toBe('');
  });

  it('works with component results', () => {
    const flags = { active: true, disabled: false };
    expect(cx('card-base', flags.active && 'active', flags.disabled && 'disabled')).toBe(
      'card-base active',
    );
  });
});

describe('compose', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('composes multiple component functions', () => {
    const base = createComponent(defaultClassNamingConfig, 'base', { base: { padding: '8px' } });
    const primary = createComponent(defaultClassNamingConfig, 'primary', {
      base: { color: 'blue' },
    });
    const button = compose(base, primary);

    expect(button()).toBe('base primary');
  });

  it('composes functions with strings', () => {
    const base = createComponent(defaultClassNamingConfig, 'base2', { base: { padding: '8px' } });
    const composed = compose(base, 'custom-class');

    expect(composed()).toBe('base2 custom-class');
  });

  it('filters falsy values', () => {
    const base = createComponent(defaultClassNamingConfig, 'base3', { base: { padding: '8px' } });
    const composed = compose(base, false, null, undefined, 'valid');

    expect(composed()).toBe('base3 valid');
  });

  it('handles string-only composition', () => {
    const composed = compose('class-a', 'class-b', 'class-c');
    expect(composed()).toBe('class-a class-b class-c');
  });

  it('forwards variant selections to composed component functions', () => {
    const size = createComponent(defaultClassNamingConfig, 'compose-size', {
      variants: {
        size: { sm: { fontSize: '12px' }, lg: { fontSize: '18px' } },
      },
      defaultVariants: { size: 'sm' },
    });
    const intent = createComponent(defaultClassNamingConfig, 'compose-intent', {
      variants: {
        intent: { primary: { color: 'blue' }, ghost: { color: 'gray' } },
      },
      defaultVariants: { intent: 'primary' },
    });
    const button = compose(size, intent);

    expect(button({ size: 'lg', intent: 'ghost' })).toBe(
      'compose-size--size-lg compose-intent--intent-ghost',
    );
  });

  it('logs console.error in dev for unknown variant keys in composed function', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    const size = createComponent(defaultClassNamingConfig, 'compose-warn-size', {
      variants: { size: { sm: { fontSize: '12px' } } },
    });
    const intent = createComponent(defaultClassNamingConfig, 'compose-warn-intent', {
      variants: { intent: { primary: { color: 'blue' } } },
    });
    const button = compose(size, intent);

    button({ typoKey: 'x' } as { size?: 'sm'; intent?: 'primary' });

    expect(err).toHaveBeenCalledWith(
      expect.stringContaining('Unknown variant "typoKey" in compose()'),
    );
    err.mockRestore();
  });

  it('infers merged variant selections from composed functions', () => {
    const size = createComponent(defaultClassNamingConfig, 'compose-type-size', {
      variants: { size: { sm: {}, lg: {} } },
    });
    const intent = createComponent(defaultClassNamingConfig, 'compose-type-intent', {
      variants: { intent: { primary: {}, ghost: {} } },
    });
    const button = compose(size, intent);

    expectTypeOf(button).toBeCallableWith({ size: 'sm', intent: 'primary' });
    expectTypeOf(button).toBeCallableWith();
    expectTypeOf(button).parameter(0).toMatchObjectType<{
      size?: 'sm' | 'lg';
      intent?: 'primary' | 'ghost';
    }>();
  });

  it('returns a no-arg function for string-only composition', () => {
    const composed = compose('class-a', 'class-b');
    expectTypeOf(composed).toBeCallableWith();
    expectTypeOf(composed).parameters.toEqualTypeOf<[]>();
  });
});

describe('createStyles({ utils })', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('expands utility keys passed to createStyles({ utils })', () => {
    const viaFactory = createStyles({
      utils: {
        marginX: (value: string | number) => ({ marginLeft: value, marginRight: value }),
      },
    });

    const cls = viaFactory.class('util-create-styles', { marginX: 12 });
    expect(cls).toBe('util-create-styles');
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const rule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.util-create-styles',
    ) as CSSStyleRule;

    expect(rule.style.getPropertyValue('margin-left')).toBe('12px');
    expect(rule.style.getPropertyValue('margin-right')).toBe('12px');
  });

  it('expands utility keys in class()', () => {
    const u = createStyles({
      utils: {
        marginX: (value: string | number) => ({ marginLeft: value, marginRight: value }),
        size: (value: string | number) => ({ width: value, height: value }),
      },
    });

    const cls = u.class('util-class-test', {
      marginX: 16,
      size: 24,
    });

    expect(cls).toBe('util-class-test');
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const rule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.util-class-test',
    ) as CSSStyleRule;

    expect(rule.style.getPropertyValue('margin-left')).toBe('16px');
    expect(rule.style.getPropertyValue('margin-right')).toBe('16px');
    expect(rule.style.getPropertyValue('width')).toBe('24px');
    expect(rule.style.getPropertyValue('height')).toBe('24px');
  });

  it('expands utility keys in component() with dimensioned variants', () => {
    const u = createStyles({
      utils: {
        paddingY: (value: string | number) => ({ paddingTop: value, paddingBottom: value }),
      },
    });

    const card = u.component('util-comp', {
      base: { paddingY: 12 },
      variants: {
        size: {
          lg: { paddingY: 24 },
        },
      },
    });

    // Should be callable
    expect(card()).toContain('util-comp');

    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const rule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.util-comp',
    ) as CSSStyleRule;

    expect(rule.style.getPropertyValue('padding-top')).toBe('12px');
    expect(rule.style.getPropertyValue('padding-bottom')).toBe('12px');
  });

  it('expands utility keys when component() uses a function config', () => {
    const u = createStyles({
      utils: {
        padY: (value: string | number) => ({ paddingTop: value, paddingBottom: value }),
      },
    });

    const box = u.component('util-fn-comp', (c) => {
      const ink = c.var('ink');
      return {
        base: { padY: 8, color: ink.var },
        variants: {
          t: {
            hi: { [ink.name]: '#f00', padY: 20 },
          },
        },
      };
    });

    expect(box({ t: 'hi' })).toContain('util-fn-comp');
    flushSync();
    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const baseRule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.util-fn-comp',
    ) as CSSStyleRule;
    const hiRule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.util-fn-comp--t-hi',
    ) as CSSStyleRule;
    expect(baseRule.style.getPropertyValue('padding-top')).toBe('8px');
    expect(hiRule.style.getPropertyValue('padding-top')).toBe('20px');
  });

  it('preserves top-level config vars through withUtils component()', () => {
    const u = createStyles({
      utils: {
        padY: (value: string | number) => ({ paddingTop: value, paddingBottom: value }),
      },
    });

    const chip = u.component('util-config-vars', {
      vars: {
        background: { value: '#fff', syntax: '<color>' as const },
      },
      base: {
        backgroundColor: 'var(--util-config-vars-background)',
        padY: 8,
      },
    });

    expect(chip.vars.background.var).toBe('var(--util-config-vars-background)');
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const rule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.util-config-vars',
    ) as CSSStyleRule;
    expect(rule.style.getPropertyValue('padding-top')).toBe('8px');
    expect(rule.style.getPropertyValue('--util-config-vars-background')).toBe('#fff');
  });

  it('preserves callback vars: v through withUtils component()', () => {
    const u = createStyles({
      utils: {
        padY: (value: string | number) => ({ paddingTop: value, paddingBottom: value }),
      },
    });

    const card = u.component('util-cb-vars', (c) => {
      const v = c.vars({ accent: 'blue' });
      return {
        vars: v,
        base: { color: v.accent.var, padY: 12 },
      };
    });

    expect(card.vars.accent.var).toBe('var(--util-cb-vars-accent)');
    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const rule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.util-cb-vars',
    ) as CSSStyleRule;
    expect(rule.style.getPropertyValue('padding-top')).toBe('12px');
    expect(rule.style.getPropertyValue('--util-cb-vars-accent')).toBe('blue');
  });

  it('expands utility keys in component() with flat variants', () => {
    const u = createStyles({
      utils: {
        marginX: (value: string | number) => ({ marginLeft: value, marginRight: value }),
      },
    });

    const card = u.component('util-flat', {
      base: { marginX: 10 },
      active: { marginX: 20 },
    });

    expect(card()).toContain('util-flat');
    expect(card({ active: true })).toContain('util-flat--active');

    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const baseRule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.util-flat',
    ) as CSSStyleRule;
    const activeRule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.util-flat--active',
    ) as CSSStyleRule;

    expect(baseRule.style.getPropertyValue('margin-left')).toBe('10px');
    expect(baseRule.style.getPropertyValue('margin-right')).toBe('10px');
    expect(activeRule.style.getPropertyValue('margin-left')).toBe('20px');
    expect(activeRule.style.getPropertyValue('margin-right')).toBe('20px');
  });

  it('allows utility output to include nested selectors', () => {
    const u = createStyles({
      utils: {
        hoverColor: (value: string) => ({ '&:hover': { color: value } }),
      },
    });

    u.class('util-nested-test', {
      hoverColor: 'red',
    });

    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const selectors = Array.from(style.sheet?.cssRules ?? []).map(
      (rule) => (rule as CSSStyleRule).selectorText,
    );

    expect(selectors).toContain('.util-nested-test:hover');
  });

  it('preserves declaration order so direct props can override utility output', () => {
    const u = createStyles({
      utils: {
        marginX: (value: string | number) => ({ marginLeft: value, marginRight: value }),
      },
    });

    u.class('util-order-test', {
      marginX: 8,
      marginLeft: 20,
    });

    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const rule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === '.util-order-test',
    ) as CSSStyleRule;

    expect(rule.style.getPropertyValue('margin-left')).toBe('20px');
    expect(rule.style.getPropertyValue('margin-right')).toBe('8px');
  });

  it('expands utility keys in hashClass()', () => {
    const u = createStyles({
      utils: {
        size: (value: string | number) => ({ width: value, height: value }),
      },
    });

    const cls = u.hashClass({ size: 30 }, 'avatar');
    expect(cls.startsWith('ts-avatar-')).toBe(true);

    flushSync();

    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const rule = Array.from(style.sheet?.cssRules ?? []).find(
      (r) => r instanceof CSSStyleRule && r.selectorText === `.${cls}`,
    ) as CSSStyleRule;

    expect(rule.style.getPropertyValue('width')).toBe('30px');
    expect(rule.style.getPropertyValue('height')).toBe('30px');
  });
});

describe('style and recipe coexistence', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('does not wipe component modifiers when registering a same-named class second', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const styles = createStyles();
    styles.component('button', {
      base: { color: 'blue' },
      variants: { intent: { primary: { fontWeight: 700 } } },
    });
    styles.class('button', { color: 'red', padding: '4px' });

    const css = getRegisteredCss();
    expect(css).toContain('.button--intent-primary');
    expect(css).toMatch(/\.button\s*\{[^}]*color:\s*blue/);
    expect(css).not.toMatch(/\.button\s*\{[^}]*padding:\s*4px/);
  });

  it('does not wipe class CSS when registering a same-named component second', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const styles = createStyles();
    styles.class('button', { color: 'red', padding: '4px' });
    styles.component('button', {
      base: { color: 'blue' },
      variants: { intent: { primary: { fontWeight: 700 } } },
    });

    const css = getRegisteredCss();
    expect(css).toContain('padding: 4px');
    expect(css).toContain('.button--intent-primary');
    expect(css).toMatch(/\.button\s*\{[^}]*color:\s*red/);
  });
});

describe('styles.property', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('returns a ref and registers @property when syntax and value are set', () => {
    const s = createStyles();
    const opacity = s.property('overlay-opacity', {
      value: '0.5',
      syntax: '<number>',
      inherits: false,
    });

    expect(opacity).toMatchObject({
      name: '--property-overlay-opacity',
      var: 'var(--property-overlay-opacity)',
    });
    expect(String(opacity)).toBe('var(--property-overlay-opacity)');

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --property-overlay-opacity');
    expect(css).toContain('initial-value: 0.5');
    expect(css).toContain(':root { --property-overlay-opacity: 0.5');
  });

  it('prefixes property names with scopeId', () => {
    const s = createStyles({ scopeId: 'acme' });
    const hue = s.property('accent-hue', { value: '220', syntax: '<number>' });

    expect(hue.name).toBe('--acme-property-accent-hue');
    expect(hue.var).toBe('var(--acme-property-accent-hue)');
  });

  it('returns a bare ref when called without options', () => {
    const s = createStyles();
    const external = s.property('external-var');

    expect(external.name).toBe('--property-external-var');
    flushSync();
    expect(getRegisteredCss()).not.toContain('--property-external-var');
  });

  it('uses explicit initial override for var()-dependent values with styles.property()', () => {
    const s = createStyles();
    const color = s.property('brand-color', {
      value: 'var(--theme-primary)',
      syntax: '<color>',
      initial: 'red',
    });

    expect(color).toMatchObject({
      name: '--property-brand-color',
      var: 'var(--property-brand-color)',
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --property-brand-color');
    expect(css).toContain('initial-value: red');
    expect(css).toContain(':root { --property-brand-color: var(--theme-primary)');
  });

  it('declare emits @property without :root value', () => {
    const s = createStyles();
    const hue = s.property.declare('accent-hue', { syntax: '<number>', inherits: false });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --property-accent-hue');
    expect(css).not.toContain(':root { --property-accent-hue');
    expect(hue.var).toBe('var(--property-accent-hue)');
  });

  it('set emits :root value for a declared ref', () => {
    const s = createStyles();
    const hue = s.property.declare('accent-hue', { syntax: '<number>' });
    s.property.set(hue, '220');
    flushSync();
    expect(getRegisteredCss()).toContain(':root { --property-accent-hue: 220');
  });

  it('declare + set matches shorthand output', () => {
    reset();
    const a = createStyles();
    const split = a.property.declare('overlay-opacity', { syntax: '<number>', inherits: false });
    a.property.set(split, '0.5');

    reset();
    const b = createStyles();
    const combined = b.property('overlay-opacity', {
      value: '0.5',
      syntax: '<number>',
      inherits: false,
    });

    flushSync();
    expect(getRegisteredCss()).toContain('@property --property-overlay-opacity');
    expect(getRegisteredCss()).toContain('initial-value: 0.5');
    expect(split.var).toBe(combined.var);
  });

  it('set throws when ref is from a different styles instance', () => {
    const a = createStyles();
    const b = createStyles();
    const ref = a.property.declare('x', { syntax: '<number>' });
    expect(() => b.property.set(ref, '1')).toThrow(/different styles instance/i);
  });
});

describe('mode: template', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('throws when mode: template is set without classNameTemplate', () => {
    expect(() => createStyles({ mode: 'template' } as never)).toThrow(
      /classNameTemplate.*is required/,
    );
  });

  it('does not throw when mode: template is paired with classNameTemplate', () => {
    expect(() =>
      createStyles({ mode: 'template', classNameTemplate: (ctx) => `x-${ctx.namespace}` }),
    ).not.toThrow();
  });

  it('uses classNameTemplate for dimensioned styles.component(), unaffected for styles.class()', () => {
    const styles = createStyles({
      mode: 'template',
      classNameTemplate: ({ namespace, element, modifier }) => {
        const base = element ? `${namespace}-${element}` : namespace;
        return modifier ? `${base}-is-${modifier}` : base;
      },
    });

    const button = styles.component('button', {
      base: { padding: '8px' },
      variants: { intent: { primary: { color: 'blue' } } },
    });
    expect(button.base).toBe('button');
    expect(button['intent-primary']).toBe('button-is-primary');

    const icon = styles.class('icon', { width: '16px' });
    expect(icon).toBe('icon');
  });
});
