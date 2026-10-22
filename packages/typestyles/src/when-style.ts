import type { ThemeCondition, VariantOptionStyle } from './types';
import { compileThemeCondition, type CompiledCondition } from './condition-compile';

/**
 * Nested `&`-relative selector key for a compiled condition branch.
 * Ancestor → `"prefix &"`; self → `"&suffix"`; descendant → `"& suffix"`.
 */
export function nestedConditionSelectorKey(compiled: CompiledCondition): string | undefined {
  const prefix = compiled.selectorPrefix?.trim();
  const suffix = compiled.selectorSuffix;

  if (prefix && suffix != null && suffix !== '') {
    return `${prefix} &${suffix}`;
  }
  if (prefix) {
    return `${prefix} &`;
  }
  if (suffix != null && suffix !== '') {
    return `&${suffix}`;
  }
  return undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function mergeInto(target: Record<string, unknown>, key: string, value: VariantOptionStyle): void {
  const existing = target[key];
  if (isPlainObject(existing) && isPlainObject(value)) {
    target[key] = { ...existing, ...value };
  } else {
    target[key] = value;
  }
}

/**
 * Expand a {@link ThemeCondition} into a **spreadable** style fragment for recipe
 * slots / `style` maps (nested `&` keys + optional `@media` wrappers).
 *
 * Use this inside `recipe` — `conditional()` / `conditions[]` only work on
 * `override`. Same `tokens.when.*` / `resolvedDarkWhen` builders as themes.
 *
 * @example
 * ```ts
 * recipe({
 *   name: 'badge',
 *   styles: {
 *     base: {
 *       color: '#111',
 *       ...styles.when(when.prefersDark, { color: '#eee' }),
 *       ...styles.when(resolvedDarkWhen(), {
 *         '&::after': { opacity: 0.85 },
 *       }),
 *     },
 *   },
 * });
 * ```
 */
export function whenStyle(
  condition: ThemeCondition,
  style: VariantOptionStyle,
): VariantOptionStyle {
  const out: Record<string, unknown> = {};

  for (const branch of compileThemeCondition(condition)) {
    const nestedKey = nestedConditionSelectorKey(branch);
    const media = branch.media;

    if (media) {
      const mediaKey = `@media ${media}`;
      const inner: VariantOptionStyle = nestedKey ? { [nestedKey]: style } : { ...style };
      mergeInto(out, mediaKey, inner);
      continue;
    }

    if (nestedKey) {
      mergeInto(out, nestedKey, style);
      continue;
    }

    Object.assign(out, style);
  }

  return out as VariantOptionStyle;
}
