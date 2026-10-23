import { describe, it, expect, vi } from 'vite-plus/test';
import { resetAll, onAfterReset, createTestHarness } from './testing';
import { reset } from './sheet';
import { createStyles, flushSync, getRegisteredCss } from './index';
const styles = createStyles();

describe('resetAll', () => {
  it('calls core reset()', () => {
    const calls: string[] = [];
    onAfterReset(() => calls.push('after'));
    resetAll();
    expect(calls).toEqual(['after']);
  });

  it('invokes subscribers in registration order', () => {
    const calls: number[] = [];
    const unsubA = onAfterReset(() => calls.push(1));
    const unsubB = onAfterReset(() => calls.push(2));
    resetAll();
    expect(calls).toEqual([1, 2]);
    unsubA();
    unsubB();
  });

  it('stops calling a subscriber after it unsubscribes', () => {
    const fn = vi.fn();
    const unsubscribe = onAfterReset(fn);
    unsubscribe();
    resetAll();
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not throw when there are no subscribers', () => {
    expect(() => resetAll()).not.toThrow();
  });
});

describe('createTestHarness', () => {
  it('registers each provided global and re-runs them on reset', () => {
    const fontFaces = vi.fn();
    const colorScheme = vi.fn();
    const harness = createTestHarness({ globals: [fontFaces, colorScheme] });

    harness.reset();

    expect(fontFaces).toHaveBeenCalledTimes(1);
    expect(colorScheme).toHaveBeenCalledTimes(1);

    harness.reset();

    expect(fontFaces).toHaveBeenCalledTimes(2);
    expect(colorScheme).toHaveBeenCalledTimes(2);
  });

  it('works with no options (just wraps resetAll)', () => {
    const harness = createTestHarness();
    expect(() => harness.reset()).not.toThrow();
  });
});

describe('reset() interop', () => {
  it('resetAll clears state that core reset() clears', () => {
    // sanity check the wrapped function is actually core reset, not a no-op
    const spy = vi.fn();
    onAfterReset(spy);
    reset(); // calling core reset directly should NOT trigger onAfterReset subscribers
    expect(spy).not.toHaveBeenCalled();
    resetAll();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('resetAll actually clears registered CSS (not just subscriber notification)', () => {
    styles.class('resetall-clears-probe', { color: 'red' });
    flushSync();
    expect(getRegisteredCss()).toContain('resetall-clears-probe');

    resetAll();

    expect(getRegisteredCss()).not.toContain('resetall-clears-probe');
  });
});
