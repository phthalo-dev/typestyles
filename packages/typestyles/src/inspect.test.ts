import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import { createStyles } from './styles';
import { reset } from './sheet';
import { registeredNamespaces } from './registry';
import { inspect, inspectClassList, inspectElement } from './inspect';
import { getSheetState } from './sheet-context';

const enableDevInspect = () => {
  globalThis.__TYPESTYLES_DEV_INSPECT__ = true;
};

const disableDevInspect = () => {
  globalThis.__TYPESTYLES_DEV_INSPECT__ = false;
};

describe('inspect', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  afterEach(() => {
    disableDevInspect();
  });

  it('returns source and css for a registered class', () => {
    enableDevInspect();
    const styles = createStyles({ scopeId: 'inspect' });
    styles.class('card', { padding: '16px' });

    const result = inspect('inspect-card');
    expect(result).toBeDefined();
    expect(result!.className).toBe('inspect-card');
    expect(result!.source).toContain('inspect.test.ts');
    expect(result!.css).toHaveLength(1);
    expect(result!.css[0]).toContain('padding');
  });

  it('aggregates css for classes used in multiple rules', () => {
    enableDevInspect();
    const styles = createStyles({ scopeId: 'inspect-multi' });
    const button = styles.component({
      name: 'button',
      styles: {
        base: { padding: '8px' },
        primary: { backgroundColor: 'blue' },
      },
    });

    const result = inspect(`${button.base}`);
    expect(result).toBeDefined();
    expect(result!.css.length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to scanning all rules when class is not in the registry', () => {
    enableDevInspect();
    const styles = createStyles({ scopeId: 'inspect-fallback' });
    styles.class('fallback', { margin: '0' });

    // Force a reset of the class registry but keep allRules for the fallback path
    getSheetState().sourceByClassName.clear();

    const result = inspect('inspect-fallback-fallback');
    expect(result).toBeDefined();
    expect(result!.css).toHaveLength(1);
  });

  it('returns undefined for unknown classes', () => {
    enableDevInspect();
    expect(inspect('does-not-exist')).toBeUndefined();
  });

  it('is disabled when dev inspect is turned off', () => {
    disableDevInspect();
    const styles = createStyles({ scopeId: 'inspect-off' });
    styles.class('box', { display: 'flex' });

    expect(inspect('inspect-off-box')).toBeUndefined();
  });

  it('inspectClassList returns results for multiple classes', () => {
    enableDevInspect();
    const styles = createStyles({ scopeId: 'inspect-list' });
    styles.class('a', { color: 'red' });
    styles.class('b', { color: 'blue' });

    const results = inspectClassList('inspect-list-a inspect-list-b');
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.className)).toContain('inspect-list-a');
    expect(results.map((r) => r.className)).toContain('inspect-list-b');
  });

  it('inspectElement reads classes from a DOM element', () => {
    enableDevInspect();
    const styles = createStyles({ scopeId: 'inspect-el' });
    styles.class('el', { color: 'green' });

    const div = document.createElement('div');
    div.className = 'inspect-el-el';
    const results = inspectElement(div);
    expect(results).toHaveLength(1);
    expect(results[0]!.className).toBe('inspect-el-el');
  });

  it('registers helpers on window.__TYPESTYLES_INSPECT__', () => {
    enableDevInspect();
    expect(globalThis.__TYPESTYLES_INSPECT__).toBeDefined();
    expect(typeof globalThis.__TYPESTYLES_INSPECT__!.inspect).toBe('function');
  });
});
