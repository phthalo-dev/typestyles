import { describe, expect, it } from 'vite-plus/test';
import { serializeStyle } from './serialize-style';
import { has, is, where } from './relational-pseudo';

describe('relational pseudo helpers', () => {
  it('builds :has keys and serializes', () => {
    expect(has('.active')).toBe('&:has(.active)');
    expect(has(' .x ', '.y')).toBe('&:has(.x, .y)');

    const rules = serializeStyle('.nav', {
      display: 'flex',
      [has('.active')]: { borderBottomWidth: '2px' },
    });
    expect(rules).toHaveLength(2);
    expect(rules[0].css).toBe('.nav { display: flex; }');
    expect(rules[1].css).toBe('.nav:has(.active) { border-bottom-width: 2px; }');
  });

  it('builds :is keys and serializes', () => {
    expect(is(':hover', ':focus-visible')).toBe('&:is(:hover, :focus-visible)');

    const rules = serializeStyle('.btn', {
      cursor: 'pointer',
      [is(':hover', ':focus-visible')]: { outline: '2px solid blue' },
    });
    expect(rules[0].css).toBe('.btn { cursor: pointer; }');
    expect(rules[1].css).toBe('.btn:is(:hover, :focus-visible) { outline: 2px solid blue; }');
  });

  it('builds :where keys and serializes', () => {
    expect(where('.nav')).toBe('&:where(.nav)');
    expect(where('.a', '.b')).toBe('&:where(.a, .b)');

    const rules = serializeStyle('.wrap', {
      boxSizing: 'border-box',
      [where('.nav')]: { display: 'flex' },
    });
    expect(rules[0].css).toBe('.wrap { box-sizing: border-box; }');
    expect(rules[1].css).toBe('.wrap:where(.nav) { display: flex; }');
  });

  it('throws when no selectors remain after trim', () => {
    expect(() => has('')).toThrow(/at least one non-empty/);
    expect(() => has('  ', '\t')).toThrow(/at least one non-empty/);
    expect(() => is()).toThrow(/at least one non-empty/);
    expect(() => where()).toThrow(/at least one non-empty/);
  });
});
