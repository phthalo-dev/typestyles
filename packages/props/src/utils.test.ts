import { describe, it, expect } from 'vite-plus/test';
import { sanitizeValue, toKebabCase, isConditionalValue } from './utils';

describe('sanitizeValue', () => {
  it('returns clean string values unchanged', () => {
    expect(sanitizeValue('flex')).toBe('flex');
    expect(sanitizeValue('block')).toBe('block');
    expect(sanitizeValue('auto')).toBe('auto');
  });

  it('converts number to string', () => {
    expect(sanitizeValue(0)).toBe('0');
    expect(sanitizeValue(42)).toBe('42');
  });

  it('replaces spaces with hyphens', () => {
    expect(sanitizeValue('sans serif')).toBe('sans-serif');
  });

  it('removes special characters', () => {
    expect(sanitizeValue('100%')).toBe('100');
    expect(sanitizeValue('#ff0000')).toBe('ff0000');
  });

  it('preserves hyphens and underscores', () => {
    expect(sanitizeValue('my-value')).toBe('my-value');
    expect(sanitizeValue('my_value')).toBe('my_value');
  });

  it('preserves alphanumeric characters', () => {
    expect(sanitizeValue('value123')).toBe('value123');
  });
});

describe('toKebabCase', () => {
  it('leaves lowercase single word unchanged', () => {
    expect(toKebabCase('color')).toBe('color');
    expect(toKebabCase('display')).toBe('display');
  });

  it('converts camelCase to kebab-case', () => {
    expect(toKebabCase('backgroundColor')).toBe('background-color');
    expect(toKebabCase('fontSize')).toBe('font-size');
    expect(toKebabCase('borderTopWidth')).toBe('border-top-width');
  });

  it('handles multi-word camelCase', () => {
    expect(toKebabCase('paddingInlineStart')).toBe('padding-inline-start');
  });

  it('handles ms vendor prefix', () => {
    expect(toKebabCase('msTransform')).toBe('-ms-transform');
    expect(toKebabCase('msFlexDirection')).toBe('-ms-flex-direction');
  });
});

describe('isConditionalValue', () => {
  const conditions = new Set(['mobile', 'tablet', 'desktop']);

  it('returns true when object contains at least one condition key', () => {
    expect(isConditionalValue({ mobile: 'flex' }, conditions)).toBe(true);
    expect(isConditionalValue({ mobile: 'flex', desktop: 'block' }, conditions)).toBe(true);
  });

  it('returns true when only one key matches condition', () => {
    expect(isConditionalValue({ mobile: 'flex', color: 'red' }, conditions)).toBe(true);
  });

  it('returns false for primitive values', () => {
    expect(isConditionalValue('flex', conditions)).toBe(false);
    expect(isConditionalValue(42, conditions)).toBe(false);
    expect(isConditionalValue(true, conditions)).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(isConditionalValue(null, conditions)).toBe(false);
    expect(isConditionalValue(undefined, conditions)).toBe(false);
  });

  it('returns false for arrays', () => {
    expect(isConditionalValue(['mobile', 'flex'], conditions)).toBe(false);
  });

  it('returns false when no keys match any condition', () => {
    expect(isConditionalValue({ color: 'red', size: 'large' }, conditions)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isConditionalValue({}, conditions)).toBe(false);
  });

  it('returns false when condition set is empty', () => {
    expect(isConditionalValue({ mobile: 'flex' }, new Set())).toBe(false);
  });
});
