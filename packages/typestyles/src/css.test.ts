import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { css } from './css';
import { atProperty } from './at-property';
import { getRegisteredCss, reset, flushSync } from './sheet';
import { resetCustomProperties } from './custom-properties';

describe('css', () => {
  beforeEach(() => {
    reset();
    resetCustomProperties();
  });

  it('atProperty emits @property without a value declaration', () => {
    const ref = css.atProperty('--ts-css-color', { syntax: '<color>', inherits: false });
    flushSync();
    expect(getRegisteredCss()).toContain('@property --ts-css-color');
    expect(getRegisteredCss()).not.toContain(':root { --ts-css-color');
    expect(ref.var).toBe('var(--ts-css-color)');
  });

  it('customProperty emits a value without @property', () => {
    css.customProperty('--ts-css-a', '#fff');
    flushSync();
    expect(getRegisteredCss()).toContain(':root { --ts-css-a: #fff; }');
    expect(getRegisteredCss()).not.toContain('@property --ts-css-a');
  });

  it('atProperty + customProperty compose for dependent values', () => {
    const base = css.var('--ts-css-base');
    css.atProperty('--ts-css-base', { syntax: '<color>', inherits: false });
    css.customProperty('--ts-css-base', '#0066ff');
    css.atProperty('--ts-css-mix', { syntax: '<color>', inherits: false });
    css.customProperty('--ts-css-mix', `color-mix(in oklch, ${base.var} 50%, white)`);
    flushSync();
    const out = getRegisteredCss();
    expect(out).toContain('@property --ts-css-mix');
    expect(out).toContain('color-mix(in oklch, var(--ts-css-base) 50%, white)');
  });

  it('customProperties batches on a selector', () => {
    css.customProperties(':root', { '--ts-x': '1', '--ts-y': '2' });
    flushSync();
    expect(getRegisteredCss()).toContain(':root { --ts-x: 1; --ts-y: 2; }');
  });

  it('throws when name does not start with --', () => {
    expect(() => css.atProperty('bad-name' as '--bad', { syntax: '<color>' })).toThrow(/--/);
  });

  it('css.var returns a ref without emitting', () => {
    const ref = css.var('--ts-external');
    flushSync();
    expect(ref.name).toBe('--ts-external');
    expect(getRegisteredCss()).not.toContain('--ts-external');
  });

  it('css.atProperty accepts atProperty presets', () => {
    css.atProperty('--ts-preset-color', atProperty.color);
    flushSync();
    expect(getRegisteredCss()).toContain(
      '@property --ts-preset-color { syntax: "<color>"; inherits: false; initial-value: transparent; }',
    );
  });
});
