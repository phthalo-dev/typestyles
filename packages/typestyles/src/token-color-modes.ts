import { lightDark } from './color';
import {
  isColorModeObject,
  looksLikeUnconfiguredModeObject,
  validateColorModeObject,
  type ColorModeMap,
} from './color-modes';
import { isPlainObject } from './breakpoints';
import type { ThemeConfig, ThemeOverrides, TokenValues, RegisteredPropertyRef } from './types';

const defaultModeMap: ColorModeMap = ['light', 'dark'];

function isModeLeaf(value: unknown): boolean {
  return looksLikeUnconfiguredModeObject(value);
}

/** Whether a scalar token value can be wrapped in CSS `light-dark()` (color or image). */
export function canUseLightDarkForTokenValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.startsWith('light-dark(')) return true;
  if (
    /^(#|oklch|oklab|hsl|hwb|rgb|var\(|color-mix|linear-gradient|radial-gradient|url\()/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  if (/^-?\d/.test(trimmed)) return false;
  return true;
}

function scalar(value: string | number): string {
  return String(value);
}

function isNestedTokenObject(value: unknown): value is Record<string, TokenValues> {
  return isPlainObject(value);
}

function expandScalarPair(
  lightVal: string,
  darkVal: string,
  path: string,
): { merged: string; darkOnly?: string } {
  if (lightVal === darkVal) return { merged: lightVal };
  if (canUseLightDarkForTokenValue(lightVal) && canUseLightDarkForTokenValue(darkVal)) {
    return { merged: lightDark(lightVal, darkVal) };
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[typestyles] Token "${path}" cannot use \`light-dark()\` — emitting a dark-mode override rule instead.`,
    );
  }
  return { merged: lightVal, darkOnly: darkVal };
}

function expandModeAwareLeaf(
  value: Record<string, string | number>,
  path: string,
  colorModes: ColorModeMap,
): { merged: string; darkOnly?: string } {
  validateColorModeObject(path, value, colorModes);
  const lightKey = colorModes[0];
  const darkKey = colorModes[1] ?? colorModes.find((m) => m !== lightKey);
  const lightVal = value[lightKey] != null ? scalar(value[lightKey]) : undefined;
  const darkVal = darkKey != null && value[darkKey] != null ? scalar(value[darkKey]) : undefined;
  if (lightVal === undefined && darkVal === undefined) return { merged: '' };
  if (lightVal === undefined || darkVal === undefined) {
    return { merged: lightVal ?? darkVal! };
  }
  return expandScalarPair(lightVal, darkVal, path);
}

/**
 * Deep-merge light/dark token trees into one tree with `light-dark()` leaves where possible.
 * Returns `darkOnly` for leaves that cannot use `light-dark()` (e.g. box-shadow strings).
 */
export function mergeTokenTreesWithColorModes(
  light: TokenValues,
  dark: TokenValues,
): { merged: TokenValues; darkOnly: TokenValues | null } {
  const merged: Record<string, unknown> = {};
  const darkOnly: Record<string, unknown> = {};
  let hasDarkOnly = false;
  const keys = new Set([
    ...(isNestedTokenObject(light) ? Object.keys(light) : []),
    ...(isNestedTokenObject(dark) ? Object.keys(dark) : []),
  ]);

  for (const key of keys) {
    const lightValue = isNestedTokenObject(light) ? light[key] : undefined;
    const darkValue = isNestedTokenObject(dark) ? dark[key] : undefined;

    if (isNestedTokenObject(lightValue) && isNestedTokenObject(darkValue)) {
      if (!isModeLeaf(lightValue) && !isModeLeaf(darkValue)) {
        const nested = mergeTokenTreesWithColorModes(lightValue, darkValue);
        merged[key] = nested.merged;
        if (nested.darkOnly) {
          darkOnly[key] = nested.darkOnly;
          hasDarkOnly = true;
        }
        continue;
      }
    }

    if (typeof lightValue === 'string' && typeof darkValue === 'string') {
      const result = expandScalarPair(lightValue, darkValue, key);
      merged[key] = result.merged;
      if (result.darkOnly) {
        darkOnly[key] = result.darkOnly;
        hasDarkOnly = true;
      }
      continue;
    }

    if (typeof lightValue === 'number' && typeof darkValue === 'number') {
      const result = expandScalarPair(scalar(lightValue), scalar(darkValue), key);
      merged[key] = result.merged;
      if (result.darkOnly) {
        darkOnly[key] = result.darkOnly;
        hasDarkOnly = true;
      }
      continue;
    }

    if (isModeLeaf(lightValue) && typeof darkValue === 'string') {
      const modeLeaf = lightValue as Record<string, string | number>;
      const lightVal = scalar(modeLeaf.light ?? modeLeaf.dark!);
      const result = expandScalarPair(lightVal, darkValue, key);
      merged[key] = result.merged;
      if (result.darkOnly) {
        darkOnly[key] = result.darkOnly;
        hasDarkOnly = true;
      }
      continue;
    }

    if (typeof lightValue === 'string' && isModeLeaf(darkValue)) {
      const modeLeaf = darkValue as Record<string, string | number>;
      const darkVal = scalar(modeLeaf.dark ?? modeLeaf.light!);
      const result = expandScalarPair(lightValue, darkVal, key);
      merged[key] = result.merged;
      if (result.darkOnly) {
        darkOnly[key] = result.darkOnly;
        hasDarkOnly = true;
      }
      continue;
    }

    if (isModeLeaf(lightValue) && isModeLeaf(darkValue)) {
      const lightLeaf = lightValue as Record<string, string | number>;
      const darkLeaf = darkValue as Record<string, string | number>;
      const lightVal = scalar(lightLeaf.light ?? darkLeaf.light!);
      const darkVal = scalar(darkLeaf.dark ?? lightLeaf.dark!);
      const result = expandScalarPair(lightVal, darkVal, key);
      merged[key] = result.merged;
      if (result.darkOnly) {
        darkOnly[key] = result.darkOnly;
        hasDarkOnly = true;
      }
      continue;
    }

    merged[key] = lightValue ?? darkValue;
  }

  return {
    merged: merged as TokenValues,
    darkOnly: hasDarkOnly ? (darkOnly as TokenValues) : null,
  };
}

function isRefLeaf(value: unknown): value is RegisteredPropertyRef {
  if (typeof value !== 'object' || value === null) return false;
  const { name, var: varRef } = value as RegisteredPropertyRef;
  return (
    typeof name === 'string' &&
    name.startsWith('--') &&
    typeof varRef === 'string' &&
    varRef === `var(${name})`
  );
}

/** Deep-clone theme values; token refs stringify to `var(--…)` instead of `structuredClone`. */
/**
 * `tokens.declare()` group proxies. They enumerate their schema keys, but a group is a
 * reference, not a value: using one as an override must stay a no-op (never `var()` of itself).
 */
const declaredGroupProxies = new WeakSet<object>();
export function markDeclaredGroupProxy(proxy: object): void {
  declaredGroupProxies.add(proxy);
}

function unwrapGroupProxy<T>(value: T): T {
  return value != null && typeof value === 'object' && declaredGroupProxies.has(value)
    ? ({} as T)
    : value;
}

export function cloneThemeValues<T>(values: T): T {
  if (values == null || typeof values !== 'object') return values;
  if (isRefLeaf(values)) return String(values) as T;
  if (declaredGroupProxies.has(values)) return {} as T;
  if (Array.isArray(values)) return values.map(cloneThemeValues) as T;
  if (!isPlainObject(values)) return String(values) as T;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(values)) {
    out[key] = cloneThemeValues(child);
  }
  return out as T;
}

export function mergeTokenValues(base: TokenValues, patch: TokenValues): TokenValues {
  if (!isPlainObject(base) || !isPlainObject(patch)) return cloneThemeValues(patch);

  const out = cloneThemeValues(base) as Record<string, TokenValues>;
  for (const [key, rawPatch] of Object.entries(unwrapGroupProxy(patch))) {
    const patchValue = unwrapGroupProxy(rawPatch);
    const baseValue = out[key];
    out[key] =
      baseValue != null && isPlainObject(baseValue) && isPlainObject(patchValue)
        ? mergeTokenValues(baseValue as TokenValues, patchValue as TokenValues)
        : cloneThemeValues(patchValue);
  }
  return out as TokenValues;
}

/** Deep-merge theme overrides (objects recurse; arrays/scalars from patch replace base). */
export function mergeThemeOverrides(base: ThemeOverrides, patch?: ThemeOverrides): ThemeOverrides {
  if (!patch) return cloneThemeValues(base);
  const out = cloneThemeValues(base) as Record<string, unknown>;
  for (const [key, rawPatch] of Object.entries(unwrapGroupProxy(patch))) {
    const patchValue = unwrapGroupProxy(rawPatch);
    const baseValue = out[key];
    out[key] =
      isPlainObject(baseValue) && isPlainObject(patchValue)
        ? mergeTokenValues(baseValue as TokenValues, patchValue as TokenValues)
        : cloneThemeValues(patchValue);
  }
  return out as ThemeOverrides;
}

function walkExpandModeAware(
  values: TokenValues,
  colorModes: ColorModeMap,
  pathPrefix: string,
): { expanded: TokenValues; darkOnly: TokenValues | null } {
  if (typeof values === 'string' || typeof values === 'number') {
    return { expanded: values, darkOnly: null };
  }
  if (!isNestedTokenObject(values)) {
    return { expanded: values, darkOnly: null };
  }

  const expanded: Record<string, unknown> = {};
  const darkOnly: Record<string, unknown> = {};
  let hasDarkOnly = false;

  for (const [key, child] of Object.entries(values)) {
    const path = pathPrefix ? `${pathPrefix}-${key}` : key;

    if (isColorModeObject(child, colorModes)) {
      const result = expandModeAwareLeaf(child, path, colorModes);
      expanded[key] = result.merged;
      if (result.darkOnly) {
        darkOnly[key] = result.darkOnly;
        hasDarkOnly = true;
      }
      continue;
    }

    if (isNestedTokenObject(child)) {
      const nested = walkExpandModeAware(child as TokenValues, colorModes, path);
      expanded[key] = nested.expanded;
      if (nested.darkOnly) {
        darkOnly[key] = nested.darkOnly;
        hasDarkOnly = true;
      }
      continue;
    }

    expanded[key] = child;
  }

  return {
    expanded: expanded as TokenValues,
    darkOnly: hasDarkOnly ? (darkOnly as TokenValues) : null,
  };
}

/**
 * Expand `{ light, dark }` leaves in a token tree to scalar / `light-dark()` strings.
 * Incompatible pairs are returned in `darkOnly` for mode-rule emission.
 */
export function expandModeAwareTokenValues(
  values: TokenValues,
  colorModes: ColorModeMap | undefined,
): { expanded: TokenValues; darkOnly: TokenValues | null } {
  if (!colorModes) {
    if (process.env.NODE_ENV !== 'production' && isNestedTokenObject(values)) {
      for (const [key, child] of Object.entries(values)) {
        if (isColorModeObject(child, defaultModeMap)) {
          console.warn(
            `[typestyles] Mode-aware token leaf "${key}" requires \`colorModes\` on \`createTypeStyles\` / \`createTokens\`.`,
          );
        }
      }
    }
    return { expanded: coerceUnexpandedModeLeaves(values), darkOnly: null };
  }
  return walkExpandModeAware(values, colorModes, '');
}

/**
 * When `colorModes` is not configured, replace `{ light, dark }` leaves with the light
 * value so flattening does not emit bogus `-light` / `-dark` custom property suffixes.
 */
export function coerceUnexpandedModeLeaves(values: TokenValues): TokenValues {
  if (typeof values === 'string' || typeof values === 'number') {
    return values;
  }
  if (!isNestedTokenObject(values)) {
    return values;
  }

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(values)) {
    if (isModeLeaf(child)) {
      const modeLeaf = child as Record<string, string | number>;
      out[key] = modeLeaf.light ?? modeLeaf.dark!;
      continue;
    }
    if (isNestedTokenObject(child)) {
      out[key] = coerceUnexpandedModeLeaves(child as TokenValues);
      continue;
    }
    out[key] = child;
  }
  return out as TokenValues;
}

type SplitTokenValuesResult = {
  base: TokenValues | undefined;
  darkPatch: TokenValues | undefined;
};

function splitTokenValues(value: TokenValues, colorModes: ColorModeMap): SplitTokenValuesResult {
  if (typeof value === 'string' || typeof value === 'number') {
    return { base: value, darkPatch: undefined };
  }
  if (!isNestedTokenObject(value)) {
    return { base: value, darkPatch: undefined };
  }

  if (isColorModeObject(value, colorModes)) {
    validateColorModeObject('', value, colorModes);
    const lightKey = colorModes[0];
    const darkKey = colorModes[1] ?? colorModes.find((m) => m !== lightKey);
    const lightVal = value[lightKey];
    const darkVal = darkKey != null ? value[darkKey] : undefined;
    const baseScalar =
      lightVal !== undefined ? lightVal : darkVal !== undefined ? darkVal : undefined;
    if (baseScalar === undefined) {
      return { base: undefined, darkPatch: undefined };
    }
    const darkScalar =
      darkVal !== undefined && String(darkVal) !== String(lightVal ?? darkVal)
        ? darkVal
        : undefined;
    return {
      base: baseScalar,
      darkPatch: darkScalar,
    };
  }

  const baseObj: Record<string, unknown> = {};
  const darkObj: Record<string, unknown> = {};
  let hasBase = false;
  let hasDark = false;

  for (const [key, child] of Object.entries(value)) {
    const split = splitTokenValues(child as TokenValues, colorModes);
    if (split.base !== undefined) {
      baseObj[key] = split.base;
      hasBase = true;
    }
    if (split.darkPatch !== undefined) {
      darkObj[key] = split.darkPatch;
      hasDark = true;
    }
  }

  return {
    base: hasBase ? (baseObj as TokenValues) : undefined,
    darkPatch: hasDark ? (darkObj as TokenValues) : undefined,
  };
}

/**
 * Split nested `{ light, dark }` leaves into light-first base values and a dark patch tree.
 * Useful for tests / tooling; theme compile expands leaves via {@link expandThemeOverrides}.
 */
export function normalizeModeAwareOverrides(
  overrides: ThemeOverrides,
  colorModes: ColorModeMap = defaultModeMap,
): { base: ThemeOverrides; darkPatch: ThemeOverrides } {
  const base: Record<string, unknown> = {};
  const darkPatch: Record<string, unknown> = {};

  for (const [namespace, values] of Object.entries(overrides)) {
    if (values == null) continue;
    const split = splitTokenValues(values as TokenValues, colorModes);
    if (split.base !== undefined) base[namespace] = split.base;
    if (split.darkPatch !== undefined) darkPatch[namespace] = split.darkPatch;
  }

  return { base: base as ThemeOverrides, darkPatch: darkPatch as ThemeOverrides };
}

/**
 * Normalize theme config before compile.
 * Mode-aware `{ light, dark }` leaves stay on `tokens` for {@link expandThemeOverrides}.
 */
export function normalizeThemeConfig(
  config: ThemeConfig,
  colorModes: ColorModeMap | undefined,
): ThemeConfig {
  void colorModes;
  return config;
}

/** Expand mode-aware values inside each namespace of theme overrides. */
export function expandThemeOverrides(
  overrides: ThemeOverrides,
  colorModes: ColorModeMap | undefined,
): { expanded: ThemeOverrides; darkOnly: ThemeOverrides | null } {
  const expanded: Record<string, unknown> = {};
  const darkOnly: Record<string, unknown> = {};
  let hasDarkOnly = false;

  for (const [namespace, values] of Object.entries(overrides)) {
    if (values == null) continue;
    const result = expandModeAwareTokenValues(values as TokenValues, colorModes);
    expanded[namespace] = result.expanded;
    if (result.darkOnly) {
      darkOnly[namespace] = result.darkOnly;
      hasDarkOnly = true;
    }
  }

  return {
    expanded: expanded as ThemeOverrides,
    darkOnly: hasDarkOnly ? (darkOnly as ThemeOverrides) : null,
  };
}
