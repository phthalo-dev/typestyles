/**
 * Bare specifier of the full runtime barrel (`typestyles` package main entry).
 */
export const TYPESTYLES_RUNTIME_SPECIFIER = 'typestyles';

/**
 * Bare specifier of the pure, name-only build (`typestyles/core`): same API
 * surface, but the CSS insertion runtime, stylesheet state, and DOM plumbing
 * are absent from the module graph. Class-name / data-attribute output is
 * identical to the runtime barrel.
 */
export const TYPESTYLES_CORE_SPECIFIER = 'typestyles/core';

/**
 * True when a bundler alias `find` (string key or pattern) already redirects
 * the bare `typestyles` runtime specifier. Integrations check this before
 * injecting their own `typestyles` → `typestyles/core` alias so user-provided
 * swaps stay authoritative and swaps are never double-applied.
 *
 * `typestyles$` (webpack's exact-match suffix) counts as capturing; regexes
 * that also match the `typestyles/core` subpath do not, since such a pattern
 * cannot be assumed to be the runtime→core bootstrap itself.
 */
export function aliasCapturesTypestylesRuntime(find: string | RegExp): boolean {
  if (typeof find === 'string') {
    return find === TYPESTYLES_RUNTIME_SPECIFIER || find === `${TYPESTYLES_RUNTIME_SPECIFIER}$`;
  }
  // Drop stateful flags so repeated `.test()` calls are independent.
  const pattern =
    find.global || find.sticky ? new RegExp(find.source, find.flags.replace(/[gy]/g, '')) : find;
  return (
    pattern.test(TYPESTYLES_RUNTIME_SPECIFIER) && !pattern.test(`${TYPESTYLES_RUNTIME_SPECIFIER}/`)
  );
}
