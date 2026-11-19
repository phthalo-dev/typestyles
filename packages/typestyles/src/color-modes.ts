import { isRegisteredPropertyRef } from './var-ref-tree';
import type { CSSProperties } from './types';
import { lightDark } from './color';
import { isPlainObject, looksLikeResponsiveObject } from './breakpoints';

const BASE_KEYS = new Set(['base', '_']);

export type ColorModeMap = readonly string[];

/**
 * Default color mode keys for `{ light, dark }` property shorthand.
 * Pass to `createStyles({ colorModes })` or `createTypeStyles({ colorModes })`.
 *
 * **Order matters:** index `0` is the `light-dark()` light-scheme argument; index `1`
 * is the dark-scheme argument — not inferred from key names alone.
 */
export const colorModes = ['light', 'dark'] as const;

export type LightDarkColorModes = typeof colorModes;

const COLOR_PROPERTIES = new Set([
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderBlockColor',
  'borderBlockStartColor',
  'borderBlockEndColor',
  'borderInlineColor',
  'borderInlineStartColor',
  'borderInlineEndColor',
  'outlineColor',
  'textDecorationColor',
  'textEmphasisColor',
  'caretColor',
  'columnRuleColor',
  'fill',
  'stroke',
  'floodColor',
  'lightingColor',
  'stopColor',
  'accentColor',
]);

const IMAGE_PROPERTIES = new Set([
  'backgroundImage',
  'listStyleImage',
  'borderImageSource',
  'maskImage',
  'webkitMaskImage',
]);

function isScalar(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

export function acceptsLightDark(prop: string): boolean {
  if (COLOR_PROPERTIES.has(prop) || IMAGE_PROPERTIES.has(prop)) return true;
  if (prop.endsWith('Color')) return true;
  return false;
}

export function resolveColorModes(config: ColorModeMap | undefined): ColorModeMap | undefined {
  if (config == null || config.length === 0) return undefined;

  if (process.env.NODE_ENV !== 'production') {
    if (config.length > 2) {
      console.warn(
        '[typestyles] `colorModes` supports at most two entries in v1 (light- and dark-scheme values for `light-dark()`). Extra modes are ignored during expansion.',
      );
    }
    const hasLight = config.includes('light');
    const hasDark = config.includes('dark');
    if (hasLight && hasDark && config[0] !== 'light') {
      console.warn(
        '[typestyles] `colorModes` array order defines `light-dark()` arguments: index 0 is the light color-scheme value, index 1 is dark. ' +
          "Use `colorModes` from `typestyles` (`['light', 'dark']`) or register `light` before `dark`.",
      );
    }
  }

  return config;
}

function colorModeObjectKeys(value: Record<string, unknown>, colorModes: ColorModeMap): string[] {
  const modeSet = new Set(colorModes);
  return Object.keys(value).filter((key) => modeSet.has(key));
}

export function isColorModeObject(
  value: unknown,
  colorModes: ColorModeMap | undefined,
): value is Record<string, string | number> {
  if (!colorModes || !isPlainObject(value)) return false;

  const keys = Object.keys(value);
  if (keys.length === 0) return false;

  for (const entry of Object.values(value)) {
    if (!isScalar(entry)) return false;
  }

  const modeKeys = colorModeObjectKeys(value, colorModes);
  if (modeKeys.length === 0) return false;

  for (const key of keys) {
    if (colorModes.includes(key)) continue;
    if (key.startsWith('&') || key.startsWith('[') || key.startsWith('@')) return false;
    return false;
  }

  return modeKeys.length > 0;
}

export function looksLikeUnconfiguredModeObject(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  for (const entry of Object.values(value)) {
    if (!isScalar(entry)) return false;
  }
  return keys.includes('light') || keys.includes('dark');
}

function looksLikeColorModeObject(value: unknown, colorModes: ColorModeMap | undefined): boolean {
  if (!colorModes || !isPlainObject(value)) return false;

  const keys = Object.keys(value);
  if (keys.length === 0) return false;

  for (const entry of Object.values(value)) {
    if (!isScalar(entry)) return false;
  }

  return keys.some((key) => colorModes.includes(key));
}

export function validateColorModeObject(
  prop: string,
  value: Record<string, unknown>,
  colorModes: ColorModeMap | undefined,
  breakpoints?: Record<string, string>,
): void {
  if (process.env.NODE_ENV === 'production') return;

  for (const [key, entry] of Object.entries(value)) {
    if (!isScalar(entry)) {
      console.warn(
        `[typestyles] Mode-aware value for "${prop}" has non-scalar entry at key "${key}". ` +
          `Use \`conditions\` for multi-property mode blocks.`,
      );
    }
  }

  if (!colorModes) {
    if (looksLikeUnconfiguredModeObject(value)) {
      console.warn(
        `[typestyles] Mode-aware object on "${prop}" requires \`colorModes\` on \`createStyles\` / \`createTypeStyles\`. ` +
          `Register once, e.g. \`createTypeStyles({ colorModes: colorModes })\` with \`colorModes\` from \`typestyles\`.`,
      );
    }
    return;
  }

  const modeKeys = colorModeObjectKeys(value, colorModes);
  const breakpointNames = breakpoints ? new Set(Object.keys(breakpoints)) : null;

  for (const key of Object.keys(value)) {
    if (colorModes.includes(key)) continue;
    if (BASE_KEYS.has(key)) continue;
    if (breakpointNames?.has(key)) {
      console.warn(
        `[typestyles] Property "${prop}" mixes mode keys (${modeKeys.join(', ')}) with breakpoint keys — ` +
          `use one adaptive shape per property in v1.`,
      );
      continue;
    }
    console.warn(
      `[typestyles] Unknown mode key "${key}" in mode-aware value for "${prop}". ` +
        `Registered color modes: ${colorModes.join(', ')}.`,
    );
  }

  for (const mode of colorModes) {
    if (!(mode in value)) {
      console.warn(
        `[typestyles] Mode-aware value for "${prop}" is missing required mode "${mode}".`,
      );
    }
  }
}

export function expandColorModeProperty(
  prop: string,
  value: Record<string, string | number>,
  colorModes: ColorModeMap,
): string | number | undefined {
  validateColorModeObject(prop, value, colorModes);

  const lightKey = colorModes[0];
  const darkKey = colorModes[1] ?? colorModes.find((m) => m !== lightKey);

  const lightVal = value[lightKey];
  const darkVal = darkKey != null ? value[darkKey] : undefined;

  if (lightVal === undefined && darkVal === undefined) return undefined;

  if (!acceptsLightDark(prop)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[typestyles] Property "${prop}" cannot use \`light-dark()\` — use \`conditions\` for structural mode differences.`,
      );
    }
    return lightVal ?? darkVal;
  }

  if (lightVal === undefined || darkVal === undefined) {
    return lightVal ?? darkVal;
  }

  return lightDark(String(lightVal), String(darkVal));
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
 * Expand `{ light, dark }` mode objects on CSS properties before serialization.
 * Color/image properties compile to `light-dark()`; structural properties dev-warn.
 */
export function expandColorModesInProperties(
  properties: CSSProperties,
  colorModes: ColorModeMap | undefined,
  breakpoints?: Record<string, string>,
): CSSProperties {
  const result: CSSProperties = {};

  for (const [prop, value] of Object.entries(properties)) {
    if (value == null) continue;

    if (prop === 'conditions') {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[typestyles] "conditions" is reserved for `override()` style blocks — omit it from component recipes and plain style objects.',
        );
      }
      continue;
    }

    if (isNestedPropertyKey(prop) || prop.startsWith('@')) {
      const expandedChild = expandColorModesInProperties(
        value as CSSProperties,
        colorModes,
        breakpoints,
      );
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

    // Token refs used directly as values (`{ color: tokens.text.primary }`) are `var(--…)`.
    if (isRegisteredPropertyRef(value)) {
      (result as Record<string, unknown>)[prop] = String(value);
      continue;
    }

    if (isPlainObject(value)) {
      const hasModeShape = looksLikeColorModeObject(value, colorModes);
      const hasResponsiveShape = looksLikeResponsiveObject(value);

      if (
        hasModeShape &&
        hasResponsiveShape &&
        colorModes &&
        !isColorModeObject(value, colorModes)
      ) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[typestyles] Property "${prop}" mixes mode and breakpoint keys — use one adaptive shape per property in v1.`,
          );
        }
      }

      if (colorModes && isColorModeObject(value, colorModes)) {
        const expanded = expandColorModeProperty(prop, value, colorModes);
        if (expanded !== undefined) {
          (result as Record<string, unknown>)[prop] = expanded;
        }
        continue;
      }

      if (hasModeShape && !colorModes) {
        validateColorModeObject(prop, value, colorModes, breakpoints);
      }
    }

    (result as Record<string, unknown>)[prop] = value;
  }

  return result;
}

export type ModeAwareValue<T extends string | number | undefined, M extends ColorModeMap> =
  | T
  | { [K in M[number]]: T };
