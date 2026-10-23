import { describe, it, expect, beforeEach, afterEach, vi } from 'vite-plus/test';
import { cx } from './cx';
import { resetBindingDevWarnings } from './cx';

describe('cx', () => {
  it('joins multiple class strings', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out false', () => {
    // oxlint-disable-next-line no-constant-binary-expression
    expect(cx('a', false && 'b', 'c')).toBe('a c');
  });

  it('filters out undefined', () => {
    expect(cx('a', undefined, 'c')).toBe('a c');
  });

  it('filters out null', () => {
    expect(cx('a', null, 'c')).toBe('a c');
  });

  it('filters out empty string', () => {
    expect(cx('a', '', 'c')).toBe('a c');
  });

  it('filters out 0', () => {
    expect(cx('a', 0, 'c')).toBe('a c');
  });

  it('returns empty string when all parts are falsy', () => {
    expect(cx(false, undefined, null, '')).toBe('');
  });

  it('returns empty string when called with no arguments', () => {
    expect(cx()).toBe('');
  });

  it('handles a single class', () => {
    expect(cx('only')).toBe('only');
  });

  it('works with conditional expressions', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cx('btn', isActive && 'active', isDisabled && 'disabled')).toBe('btn active');
  });

  it('preserves spaces within individual class strings', () => {
    // If someone passes a pre-joined string, it passes through unchanged
    expect(cx('btn-base btn-primary', 'extra')).toBe('btn-base btn-primary extra');
  });

  describe('dev warnings', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      resetBindingDevWarnings();
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      vi.restoreAllMocks();
    });

    it('warns when a ComponentAttrsResult is passed in development', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = {
        className: 'btn',
        attrs: { 'data-tone': 'accent' },
        props: { className: 'btn', 'data-tone': 'accent' },
        toString: () => 'btn',
      };

      expect(cx(result, 'extra')).toBe('btn extra');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('cx() dropped attrs on "btn"'));
    });

    it('does not warn for plain strings', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(cx('a', 'b')).toBe('a b');
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn in production', () => {
      process.env.NODE_ENV = 'production';
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = {
        className: 'btn',
        attrs: { 'data-tone': 'accent' },
        props: { className: 'btn', 'data-tone': 'accent' },
        toString: () => 'btn',
      };

      expect(cx(result)).toBe('btn');
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
