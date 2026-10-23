import { describe, it, expect, beforeEach } from 'vite-plus/test';
import {
  registerCustomProperty,
  registerCustomProperties,
  resetCustomProperties,
} from './custom-properties';
import { getRegisteredCss, reset, flushSync } from './sheet';

describe('custom-properties', () => {
  beforeEach(() => {
    reset();
    resetCustomProperties();
  });

  it('registerCustomProperty emits a single declaration on :root', () => {
    registerCustomProperty('--ts-a', '#fff');
    flushSync();
    expect(getRegisteredCss()).toContain(':root { --ts-a: #fff; }');
  });

  it('registerCustomProperties batches multiple properties on one selector', () => {
    registerCustomProperties(':root', { '--ts-a': '#fff', '--ts-b': '8px' });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain(':root { --ts-a: #fff; --ts-b: 8px; }');
  });

  it('registerCustomProperties merges later calls for the same selector', () => {
    registerCustomProperties(':root', { '--ts-a': '#fff' });
    registerCustomProperties(':root', { '--ts-b': '8px' });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('--ts-a: #fff');
    expect(css).toContain('--ts-b: 8px');
    expect(css.match(/:root \{[^}]+\}/g)?.length).toBe(1);
  });

  it('later registerCustomProperties overrides the same property name', () => {
    registerCustomProperties(':root', { '--ts-a': '#fff' });
    registerCustomProperties(':root', { '--ts-a': '#000' });
    flushSync();
    expect(getRegisteredCss()).toContain(':root { --ts-a: #000; }');
    expect(getRegisteredCss()).not.toContain('#fff');
  });
});
