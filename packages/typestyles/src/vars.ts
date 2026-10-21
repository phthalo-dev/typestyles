import { sanitizeClassSegment } from './class-naming';
import type { CSSVarRef } from './types';

let counter = 0;
const namedVarCounts = new Map<string, number>();

/** Reset counters. Used in tests only. */
export function __resetVarCounter(): void {
  counter = 0;
  namedVarCounts.clear();
}

function buildVarName(debugName?: string): string {
  if (!debugName) {
    return `--ts-${++counter}`;
  }

  const safe = sanitizeClassSegment(debugName);
  const count = (namedVarCounts.get(safe) ?? 0) + 1;
  namedVarCounts.set(safe, count);
  if (count === 1) {
    return `--ts-${safe}`;
  }
  return `--ts-${safe}-${count}`;
}

/** Extract the raw `--property-name` from a `var(...)` reference string. */
function extractVarName(varRef: string): string | undefined {
  const match = varRef.match(/^var\(\s*(--[^,)]+)/);
  return match?.[1];
}

/**
 * Create a unique CSS custom property reference.
 *
 * Returns a `var(--ts-…)` string that can be used anywhere a CSS value is
 * accepted. Use assignVars() to set its value per element via inline styles.
 *
 * Pass a debug name to get readable custom property names in DevTools
 * (e.g. `createVar('cardBg')` → `var(--ts-cardbg)`). Anonymous vars use
 * numeric ids (`--ts-1`, `--ts-2`, …).
 *
 * @example
 * ```ts
 * const cardBg = createVar('cardBg');
 *
 * const card = recipe({
 *   name: 'card',
 *   styles: { base: { background: cardBg, padding: '16px' } },
 * });
 *
 * // Consumer sets the variable per instance:
 * <div className={card('base')} style={assignVars({ [cardBg]: '#ff0099' })} />
 * ```
 */
export function createVar(name?: string, fallback?: string): CSSVarRef {
  const propName = buildVarName(name);
  if (fallback !== undefined) {
    return `var(${propName}, ${fallback})` as CSSVarRef;
  }
  return `var(${propName})` as CSSVarRef;
}

/**
 * Build a CSS custom property assignment map from var refs to values.
 *
 * The returned object is safe to spread into a React (or any framework)
 * inline `style` prop.
 *
 * @example
 * ```ts
 * assignVars({ [cardBg]: '#ff0099' })
 * // → { '--ts-cardbg': '#ff0099' }
 * ```
 */
export function assignVars(vars: Partial<Record<CSSVarRef, string>>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [varRef, value] of Object.entries(vars)) {
    if (value == null) continue;
    const propName = extractVarName(varRef);
    if (propName) result[propName] = value;
  }
  return result;
}
