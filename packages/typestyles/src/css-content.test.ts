import { describe, it, expect } from 'vite-plus/test';
import { serializeStyle } from './serialize-style';
import { content } from './css-content';

describe('content', () => {
  it('returns empty string for null, undefined, or no argument', () => {
    expect(content(null)).toBe('');
    expect(content(undefined)).toBe('');
    expect(content()).toBe('');
  });

  it('wraps text as a CSS string', () => {
    expect(content('')).toBe('""');
    expect(content('*')).toBe('"*"');
    expect(content('#')).toBe('"#"');
  });

  it('escapes characters like JSON/CSS string rules', () => {
    expect(content('a"b')).toBe('"a\\"b"');
  });

  it('serializes to valid content in CSS when non-empty', () => {
    const [rule] = serializeStyle('.x::after', { content: content('') });
    expect(rule.css).toContain('content: "";');
  });
});
