import { reset } from '#sheet';

const afterResetListeners = new Set<() => void>();

/**
 * Register a callback to run after every `resetAll()` call — typically used
 * by design-system packages to re-register package-level globals (font
 * faces, color-scheme rules, extended token namespaces) that core `reset()`
 * clears along with everything else.
 *
 * Returns an unsubscribe function.
 */
export function onAfterReset(fn: () => void): () => void {
  afterResetListeners.add(fn);
  return () => {
    afterResetListeners.delete(fn);
  };
}

/**
 * Reset all TypeStyles state (styles, tokens, custom properties, property
 * registrations — via the core `reset()`), then re-run every callback
 * registered with `onAfterReset`, in registration order.
 *
 * Use this instead of importing `reset` directly in test setup when your
 * package (or the package under test) has registered `onAfterReset` hooks.
 */
export function resetAll(): void {
  reset();
  for (const listener of afterResetListeners) {
    listener();
  }
}

/**
 * Convenience wrapper: registers each function in `options.globals` as an
 * `onAfterReset` hook, and returns a `{ reset }` object wired to `resetAll`.
 *
 * @example
 * ```ts
 * import { createTestHarness } from 'typestyles/testing';
 *
 * const harness = createTestHarness({
 *   globals: [registerColorSchemeGlobals],
 * });
 *
 * beforeEach(() => harness.reset());
 * ```
 */
export function createTestHarness(options?: { globals?: Array<() => void> }): {
  reset: () => void;
} {
  for (const fn of options?.globals ?? []) {
    onAfterReset(fn);
  }
  return { reset: resetAll };
}
