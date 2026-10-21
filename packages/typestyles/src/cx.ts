import type { ComponentAttrsResult } from './types';

/**
 * Anything that coerces to a class string via `toString()`/`Symbol.toPrimitive` — covers
 * `Theme` (`tokens.createTheme(...)`) and `ComponentAttrsResult`
 * (`createStyles({ mode: 'attribute' })`) alongside plain strings.
 */
type Stringable = { toString(): string };

export function isComponentAttrsResult(value: unknown): value is ComponentAttrsResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'attrs' in value &&
    'className' in value &&
    'props' in value
  );
}

const warnedStacks = new Set<string>();

export function devWarnOnce(message: string): void {
  if (process.env.NODE_ENV === 'production') return;
  const stack = new Error().stack ?? '';
  const key = `${message}\n${stack.split('\n', 4).join('\n')}`;
  if (warnedStacks.has(key)) return;
  warnedStacks.add(key);
  console.warn(`[typestyles] ${message}`);
}

/** @internal Test helper — reset dev-warning dedupe state between tests. */
export function resetBindingDevWarnings(): void {
  warnedStacks.clear();
}

/**
 * Join class name parts, filtering out falsy values.
 *
 * A lightweight utility for combining TypeStyles classes, external class
 * strings, and conditional expressions into a single `className` string.
 *
 * @example
 * ```ts
 * import { cx, mergeProps } from 'typestyles';
 *
 * cx('card', isActive && 'active', className);
 * // => "card active my-external-class"
 *
 * cx(button({ intent: 'primary' }), button({ intent: 'ghost' }), 'extra');
 * // => "button-primary button-ghost extra" (semantic / BEM class strings)
 *
 * // Attribute mode: use mergeProps() or combine() — cx() drops variant attrs.
 * mergeProps(attrButton({ variant: 'primary' }), 'extra');
 * ```
 */
export function cx(
  ...parts: Array<string | Stringable | undefined | null | false | 0 | ''>
): string {
  if (process.env.NODE_ENV !== 'production') {
    for (const part of parts) {
      if (isComponentAttrsResult(part) && Object.keys(part.attrs).length > 0) {
        devWarnOnce(
          `cx() dropped attrs on "${part.className || 'recipe'}" — use mergeProps() or combine() instead.`,
        );
      }
    }
  }
  return parts.filter(Boolean).join(' ');
}
