import { describe, it, expect, beforeEach } from 'vitest';
import { decomposeAtomicStyle } from './atomic-decompose';
import { mergeClassNaming } from './class-naming';
import { createStyles } from './styles';
import { getRegisteredCss, reset } from './sheet';
import { registeredNamespaces } from './registry';

describe('decomposeAtomicStyle', () => {
  const cfg = mergeClassNaming({ mode: 'atomic', prefix: 'a' });

  it('emits one class per top-level declaration', () => {
    const { classNames, rules } = decomposeAtomicStyle(cfg, {
      color: 'red',
      padding: '8px',
    });
    const parts = classNames.split(' ');
    expect(parts).toHaveLength(2);
    expect(rules).toHaveLength(2);
    expect(rules[0]?.css).toMatch(/^\.a-[a-z0-9]+ \{ color: red; \}$/);
    expect(rules[1]?.css).toMatch(/^\.a-[a-z0-9]+ \{ padding: 8px; \}$/);
  });

  it('dedupes identical declarations by selector key', () => {
    const first = decomposeAtomicStyle(cfg, { color: 'red' });
    const second = decomposeAtomicStyle(cfg, { color: 'red' });
    expect(first.classNames).toBe(second.classNames);
    expect(first.rules[0]?.key).toBe(second.rules[0]?.key);
  });

  it('scopes identical declarations when scopeId differs', () => {
    const a = mergeClassNaming({ mode: 'atomic', prefix: 'a', scopeId: 'pkg-a' });
    const b = mergeClassNaming({ mode: 'atomic', prefix: 'a', scopeId: 'pkg-b' });
    const x = decomposeAtomicStyle(a, { color: 'red' });
    const y = decomposeAtomicStyle(b, { color: 'red' });
    expect(x.classNames).not.toBe(y.classNames);
  });

  it('handles nested pseudo selectors', () => {
    const { classNames, rules } = decomposeAtomicStyle(cfg, {
      color: 'black',
      '&:hover': { color: 'blue' },
    });
    expect(classNames.split(' ')).toHaveLength(2);
    expect(rules.some((r) => r.css.includes(':hover'))).toBe(true);
  });

  it('wraps @media blocks around inner atomic rules', () => {
    const { rules } = decomposeAtomicStyle(cfg, {
      '@media (min-width: 768px)': { color: 'green' },
    });
    expect(rules).toHaveLength(1);
    expect(rules[0]?.css).toMatch(
      /^@media \(min-width: 768px\) \{ \.a-[a-z0-9]+ \{ color: green; \} \}$/,
    );
  });
});

describe('atomic mode integration', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('shares declaration classes across components', () => {
    const styles = createStyles({ mode: 'atomic', prefix: 'x' });
    const a = styles.component({
      name: 'btn-a',
      styles: { base: { color: 'red', padding: '4px' } },
    });
    registeredNamespaces.clear();
    const b = styles.component({
      name: 'btn-b',
      styles: { base: { color: 'red', margin: '8px' } },
    });

    const aClasses = a.base.split(' ');
    const bClasses = b.base.split(' ');
    const shared = aClasses.find((c) => bClasses.includes(c));
    expect(shared).toBeDefined();

    const css = getRegisteredCss();
    const colorRules = css.match(/color: red/g) ?? [];
    expect(colorRules).toHaveLength(1);
  });

  it('compact mode keeps whole-object hash-only names', () => {
    const styles = createStyles({ mode: 'compact', prefix: 'c' });
    const button = styles.component({
      name: 'btn',
      styles: { base: { color: 'red', padding: '8px' } },
    });
    expect(button.base).toMatch(/^c-[a-z0-9]+$/);
    expect(button.base.split(' ')).toHaveLength(1);
  });
});
