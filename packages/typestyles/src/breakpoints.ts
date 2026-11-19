import { isRegisteredPropertyRef } from './var-ref-tree';
import type { CSSProperties, CreatedTokenRef, TokenValues } from './types';
import { getTokenLeafValues } from './tokens';
import { looksLikeUnconfiguredModeObject, validateColorModeObject } from './color-modes';

export type BreakpointMap = Record<string, string>;

export type BreakpointsFromTokensConfig = {
  fromTokens: CreatedTokenRef<TokenValues, string>;
} & Partial<BreakpointMap>;

export type BreakpointsConfig = BreakpointMap | BreakpointsFromTokensConfig;

const BASE_KEYS = new Set(['base', '_']);

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function validateMediaCondition(name: string, condition: string): void {
  if (process.env.NODE_ENV === 'production') return;
  if (/^@media\s/i.test(condition.trim())) {
    throw new Error(
      `[typestyles] Breakpoint "${name}" must be a media condition without the \`@media\` wrapper — ` +
        `e.g. \`(min-width: 768px)\`. Got ${JSON.stringify(condition)}.`,
    );
  }
}

/** Strip a mistaken `@media` prefix so prod still emits valid CSS. */
function normalizeMediaCondition(condition: string): string {
  const trimmed = condition.trim();
  if (/^@media\s/i.test(trimmed)) {
    return trimmed.replace(/^@media\s+/i, '').trim();
  }
  return trimmed;
}

/** Wrap a media condition (with or without parentheses) as a style-object `@media` key. */
export function toMediaAtRuleKey(condition: string): `@media ${string}` {
  const trimmed = normalizeMediaCondition(condition);
  if (trimmed.startsWith('(')) {
    return `@media ${trimmed}`;
  }
  return `@media (${trimmed})`;
}

/**
 * Wrap a bare length (`80rem`) as an explicit `(min-width: 80rem)` condition —
 * `@media (80rem)` is invalid CSS and silently never matches. Conditions that
 * already name a feature (`min-width: 80rem`) or carry parentheses pass through.
 */
export function normalizeBareBreakpoint(condition: string): string {
  const trimmed = condition.trim();
  if (!trimmed || trimmed.includes('(') || trimmed.includes(':')) return trimmed;
  return `(min-width: ${trimmed})`;
}

function finalizeBreakpointMap(map: BreakpointMap): BreakpointMap {
  const result: BreakpointMap = {};
  for (const [name, condition] of Object.entries(map)) {
    validateMediaCondition(name, condition);
    const normalized = normalizeMediaCondition(condition);
    const withFeature = normalizeBareBreakpoint(normalized);
    if (process.env.NODE_ENV !== 'production' && withFeature !== normalized) {
      console.warn(
        `[typestyles] Breakpoint "${name}" is a bare value ${JSON.stringify(normalized)}; ` +
          `treating it as ${JSON.stringify(withFeature)}. ` +
          `Register a full condition like \`(min-width: 768px)\` to make the feature explicit.`,
      );
    }
    result[name] = withFeature;
  }
  return result;
}

export function resolveBreakpoints(
  config: BreakpointsConfig | undefined,
): BreakpointMap | undefined {
  if (config == null) return undefined;

  if (typeof config === 'object' && config !== null && 'fromTokens' in config) {
    const tokenConfig = config as BreakpointsFromTokensConfig;
    const fromTokenMap = getTokenLeafValues(tokenConfig.fromTokens);
    const { fromTokens: _, ...explicit } = tokenConfig;
    const merged: BreakpointMap = { ...fromTokenMap };
    for (const [key, value] of Object.entries(explicit)) {
      if (typeof value === 'string') merged[key] = value;
    }
    return finalizeBreakpointMap(merged);
  }

  return finalizeBreakpointMap(config as BreakpointMap);
}

function responsiveObjectKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).filter((key) => !BASE_KEYS.has(key));
}

export function validateResponsiveObject(
  prop: string,
  value: Record<string, unknown>,
  breakpoints: BreakpointMap | undefined,
): void {
  if (process.env.NODE_ENV === 'production') return;

  for (const [key, entry] of Object.entries(value)) {
    if (!isScalar(entry)) {
      throw new Error(
        `[typestyles] Responsive value for "${prop}" has non-scalar entry at key "${key}". ` +
          `Use explicit '@media …' keys for nested styles per breakpoint.`,
      );
    }
  }

  if (!breakpoints) {
    throw new Error(
      `[typestyles] Responsive object on "${prop}" requires \`breakpoints\` on \`createStyles\` / \`createTypeStyles\`. ` +
        `Register breakpoints once, e.g. \`createTypeStyles({ breakpoints: { md: '(min-width: 768px)' } })\`.`,
    );
  }

  const breakpointNames = new Set(Object.keys(breakpoints));
  for (const key of responsiveObjectKeys(value)) {
    if (!breakpointNames.has(key)) {
      throw new Error(
        `[typestyles] Unknown breakpoint "${key}" in responsive value for "${prop}". ` +
          `Registered breakpoints: ${Object.keys(breakpoints).join(', ') || '(none)'}.`,
      );
    }
  }
}

export function isResponsiveObject(
  value: unknown,
  breakpoints: BreakpointMap | undefined,
): value is Record<string, string | number> {
  if (!isPlainObject(value)) return false;

  const keys = Object.keys(value);
  if (keys.length === 0) return false;

  for (const entry of Object.values(value)) {
    if (!isScalar(entry)) return false;
  }

  const breakpointNames = breakpoints ? new Set(Object.keys(breakpoints)) : null;

  for (const key of keys) {
    if (BASE_KEYS.has(key)) continue;
    if (breakpointNames?.has(key)) continue;
    if (key.startsWith('&') || key.startsWith('[') || key.startsWith('@')) return false;
    if (breakpointNames == null) continue;
    return false;
  }

  return keys.some((key) => BASE_KEYS.has(key) || breakpointNames?.has(key));
}

export function looksLikeResponsiveObject(value: unknown): boolean {
  if (!isPlainObject(value)) return false;

  const keys = Object.keys(value);
  if (keys.length === 0) return false;

  for (const entry of Object.values(value)) {
    if (!isScalar(entry)) return false;
  }

  for (const key of keys) {
    if (BASE_KEYS.has(key)) continue;
    if (key.startsWith('&') || key.startsWith('[') || key.startsWith('@')) return false;
  }

  return true;
}

export function expandResponsiveProperty(
  prop: string,
  value: Record<string, string | number>,
  breakpoints: BreakpointMap,
): CSSProperties {
  validateResponsiveObject(prop, value, breakpoints);

  if (process.env.NODE_ENV !== 'production' && 'base' in value && '_' in value) {
    console.warn(
      `[typestyles] Responsive object on "${prop}" has both \`base\` and \`_\`; \`base\` wins.`,
    );
  }

  const result: CSSProperties = {};
  const baseValue = value.base ?? value._;

  if (baseValue !== undefined) {
    (result as unknown as Record<string, string | number>)[prop] = baseValue;
  }

  for (const [name, bpValue] of Object.entries(value)) {
    if (name === 'base' || name === '_') continue;

    const condition = breakpoints[name];
    if (!condition) continue;

    const mediaKey = toMediaAtRuleKey(condition);
    const existing = result[mediaKey];
    if (existing && isPlainObject(existing)) {
      (existing as Record<string, string | number>)[prop] = bpValue;
    } else {
      const mediaBlock: CSSProperties = {};
      (mediaBlock as unknown as Record<string, string | number>)[prop] = bpValue;
      result[mediaKey] = mediaBlock;
    }
  }

  return result;
}

function mergeStyleFragments(base: CSSProperties, fragment: CSSProperties): CSSProperties {
  const merged: CSSProperties = { ...base };

  for (const [key, value] of Object.entries(fragment)) {
    if (value == null) continue;

    if (key.startsWith('@') && isPlainObject(value)) {
      const existing = merged[key as `@${string}`];
      if (existing && isPlainObject(existing)) {
        merged[key as `@${string}`] = {
          ...(existing as CSSProperties),
          ...(value as CSSProperties),
        };
      } else {
        merged[key as `@${string}`] = value as CSSProperties;
      }
      continue;
    }

    (merged as Record<string, unknown>)[key] = value;
  }

  return merged;
}

function isNestedPropertyKey(key: string): boolean {
  return key.includes('&') || key.startsWith('[');
}

/**
 * Expand responsive object values in a style tree before serialization.
 */
export function expandResponsiveInProperties(
  properties: CSSProperties,
  breakpoints: BreakpointMap | undefined,
): CSSProperties {
  let result: CSSProperties = {};

  for (const [prop, value] of Object.entries(properties)) {
    if (value == null) continue;

    if (isNestedPropertyKey(prop) || prop.startsWith('@')) {
      const expandedChild = expandResponsiveInProperties(value as CSSProperties, breakpoints);
      const existing = (result as Record<string, unknown>)[prop];
      if (existing && isPlainObject(existing)) {
        (result as Record<string, unknown>)[prop] = mergeStyleFragments(
          existing as CSSProperties,
          expandedChild,
        );
      } else {
        (result as Record<string, unknown>)[prop] = expandedChild;
      }
      continue;
    }

    if (isRegisteredPropertyRef(value)) {
      (result as Record<string, unknown>)[prop] = String(value);
      continue;
    }

    if (isPlainObject(value)) {
      if (looksLikeUnconfiguredModeObject(value)) {
        if (process.env.NODE_ENV !== 'production') {
          validateColorModeObject(prop, value, undefined, breakpoints);
        }
        continue;
      }

      if (looksLikeResponsiveObject(value)) {
        validateResponsiveObject(prop, value, breakpoints);
        if (breakpoints && isResponsiveObject(value, breakpoints)) {
          result = mergeStyleFragments(result, expandResponsiveProperty(prop, value, breakpoints));
          continue;
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        throw new Error(
          `[typestyles] Invalid object value for CSS property "${prop}". ` +
            `Use responsive breakpoint keys with \`breakpoints\` configured, or nested selectors / at-rules as object keys.`,
        );
      }
      continue;
    }

    (result as Record<string, unknown>)[prop] = value;
  }

  return result;
}

export type ResponsiveValue<T extends string | number, B extends BreakpointMap> =
  | T
  | ({ base?: T; _?: T } & { [K in keyof B]?: T });
