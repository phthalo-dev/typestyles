import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import { createStyles } from './styles';
import { reset } from './sheet';
import { registeredNamespaces } from './registry';
import { variant } from './variant';

describe('data-ts-source attribute', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  afterEach(() => {
    globalThis.__TYPESTYLES_DEV_INSPECT__ = undefined;
  });

  it('is not added by default in attribute mode', () => {
    globalThis.__TYPESTYLES_DEV_INSPECT__ = undefined;
    const styles = createStyles({ mode: 'attribute', scopeId: 'no-source' });
    const button = styles.component({
      name: 'button',
      variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { padding: '8px' }, variants: { intent: { primary: {} } } },
    });

    expect(button().attrs).toEqual({ 'data-intent': 'primary' });
  });

  it('is added when dev inspect is explicitly enabled', () => {
    globalThis.__TYPESTYLES_DEV_INSPECT__ = true;
    const styles = createStyles({ mode: 'attribute', scopeId: 'with-source' });
    const button = styles.component({
      name: 'button',
      variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { padding: '8px' }, variants: { intent: { primary: {} } } },
    });

    const result = button();
    expect(result.attrs['data-intent']).toBe('primary');
    expect(result.attrs['data-ts-source']).toContain('dev-source-attribute.test.ts');
    expect(result.props['data-ts-source']).toContain('dev-source-attribute.test.ts');
  });

  it('is omitted when dev inspect is disabled', () => {
    globalThis.__TYPESTYLES_DEV_INSPECT__ = false;
    const styles = createStyles({ mode: 'attribute', scopeId: 'disabled-source' });
    const button = styles.component({
      name: 'button',
      variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { padding: '8px' }, variants: { intent: { primary: {} } } },
    });

    expect(button().attrs).not.toHaveProperty('data-ts-source');
  });

  it('relativizes paths when a root is configured', () => {
    globalThis.__TYPESTYLES_DEV_INSPECT__ = { root: process.cwd() };
    const styles = createStyles({ mode: 'attribute', scopeId: 'rel-source' });
    const button = styles.component({
      name: 'button',
      variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { padding: '8px' }, variants: { intent: { primary: {} } } },
    });

    const source = button().attrs['data-ts-source'];
    expect(source).toContain('dev-source-attribute.test.ts');
    expect(source).not.toContain(process.cwd());
  });
});
