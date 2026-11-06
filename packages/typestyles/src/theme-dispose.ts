import { sanitizeClassSegment } from './class-naming';
import { invalidateKeys, removeCssomRulesForExactThemeClass } from '#sheet';
import { getSheetState } from './sheet-context';

export function resolveThemeSegment(scopeId: string | undefined, name: string): string {
  const n = sanitizeClassSegment(name);
  if (!scopeId) return n;
  return `${sanitizeClassSegment(scopeId)}-${n}`;
}

export function resolveThemeClassName(scopeId: string | undefined, name: string): string {
  return `theme-${resolveThemeSegment(scopeId, name)}`;
}

/**
 * Stable dedupe-key prefixes for theme CSS (documented for HMR / disposeTheme).
 * Pass `tokenLayer` when the tokens instance uses cascade layers.
 */
export function themeInvalidationKeyPrefixes(
  scopeId: string | undefined,
  name: string,
  tokenLayer?: string,
): readonly string[] {
  const segment = resolveThemeSegment(scopeId, name);
  const prefixes: string[] = [`theme:${segment}:`];
  if (tokenLayer) {
    prefixes.push(`layer:${tokenLayer}:theme:${segment}:`);
  }
  return prefixes;
}

function collectThemeOverrideKeys(className: string): string[] {
  const needle = `override:.${className}:`;
  const keys: string[] = [];
  for (const key of getSheetState().insertedRules) {
    if (key.includes(needle)) keys.push(key);
  }
  return keys;
}

export type DisposeThemeOptions = {
  /** Remove matching rules from the live CSSOM (default `true`). */
  removeLiveCss?: boolean;
  tokenLayer?: string;
};

export function disposeThemeByName(
  scopeId: string | undefined,
  name: string,
  options?: DisposeThemeOptions,
): void {
  const className = resolveThemeClassName(scopeId, name);
  const prefixes = themeInvalidationKeyPrefixes(scopeId, name, options?.tokenLayer);
  const overrideKeys = collectThemeOverrideKeys(className);
  invalidateKeys(overrideKeys, [...prefixes]);
  if (options?.removeLiveCss !== false) {
    removeCssomRulesForExactThemeClass(className);
  }
}
