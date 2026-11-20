import { atRuleBlock } from './at-rule-block';
import { normalizeBareBreakpoint, toMediaAtRuleKey, type BreakpointMap } from './breakpoints';
import type { CSSProperties } from './types';

/**
 * Object key for nested viewport styles: `@media … { … }`.
 * Returned by {@link breakpoint} for typed media queries from configured breakpoints.
 */
export type MediaQueryKey = `@media ${string}`;

/** `@media` key inferred from a stored breakpoint condition (mirrors {@link toMediaAtRuleKey}). */
export type MediaKeyFromCondition<C extends string> = C extends `(${string}`
  ? `@media ${C}`
  : C extends `${string}:${string}`
    ? `@media (${C})`
    : `@media (min-width: ${C})`;

/** Viewport width/height feature for {@link breakpoint} / {@link media}. */
export type MediaBreakpointFeature = 'min' | 'max' | 'minHeight' | 'maxHeight';

/** Object form of {@link MediaBreakpointFeature} for {@link media}. */
export type MediaBreakpointOptions = {
  min?: boolean;
  max?: boolean;
  minHeight?: boolean;
  maxHeight?: boolean;
};

const FEATURE_CSS: Record<MediaBreakpointFeature, string> = {
  min: 'min-width',
  max: 'max-width',
  minHeight: 'min-height',
  maxHeight: 'max-height',
};

function normalizeFeatureArg(
  arg: MediaBreakpointFeature | MediaBreakpointOptions | undefined,
): MediaBreakpointFeature | undefined {
  if (arg == null) return undefined;
  if (typeof arg === 'string') return arg;
  if (arg.min) return 'min';
  if (arg.max) return 'max';
  if (arg.minHeight) return 'minHeight';
  if (arg.maxHeight) return 'maxHeight';
  return undefined;
}

type ParsedMediaCondition = {
  feature: string;
  value: string;
};

function parseMediaCondition(condition: string): ParsedMediaCondition | null {
  const trimmed = condition.trim();
  // Single parenthesized feature only — not compound `(a) and (b)` queries.
  const match = trimmed.match(/^\(\s*([\w-]+)\s*:\s*([^)]+)\s*\)$/);
  if (match && match[1] && match[2]) {
    return { feature: match[1], value: match[2].trim() };
  }
  if (trimmed && !trimmed.includes('(')) {
    return { feature: 'min-width', value: trimmed };
  }
  return null;
}

function buildMediaCondition(feature: MediaBreakpointFeature, value: string): string {
  return `(${FEATURE_CSS[feature]}: ${value})`;
}

function requireBreakpoints(
  breakpoints: BreakpointMap | undefined,
): asserts breakpoints is BreakpointMap {
  if (!breakpoints) {
    throw new Error(
      '[typestyles] `breakpoint()` / `media()` require `breakpoints` on `createStyles` / `createTypeStyles`.',
    );
  }
}

function resolveBreakpointCondition(
  breakpoints: BreakpointMap,
  name: string,
  featureArg?: MediaBreakpointFeature,
): string {
  const condition = breakpoints[name];
  if (!condition) {
    throw new Error(
      `[typestyles] Unknown breakpoint "${name}". ` +
        `Registered breakpoints: ${Object.keys(breakpoints).join(', ') || '(none)'}.`,
    );
  }

  if (!featureArg) {
    // Bare lengths (`80rem`) normalize to `(min-width: 80rem)` — `@media (80rem)`
    // is invalid. `resolveBreakpoints` already normalizes at registration; this
    // covers hand-built maps passed to the exported media helpers.
    return normalizeBareBreakpoint(condition);
  }

  const parsed = parseMediaCondition(condition);
  if (!parsed) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[typestyles] breakpoint("${name}", …): could not apply feature override to ${JSON.stringify(condition)}. ` +
          `Feature overrides apply to single-feature conditions like \`(min-width: 768px)\`.`,
      );
    }
    return condition;
  }

  const targetFeature = FEATURE_CSS[featureArg];
  if (parsed.feature === targetFeature) {
    return `(${parsed.feature}: ${parsed.value})`;
  }

  // Deriving `max` from a stored `min-*` breakpoint: `(max-width: 48rem)` is inclusive and would
  // overlap `(min-width: 48rem)` at exactly the breakpoint. Range syntax is exclusive, so
  // `min` and `max` of the same name partition the viewport.
  // Any conversion to a max feature is exclusive, including a height feature derived from a
  // width breakpoint (`breakpoint('md', 'maxHeight')` reuses the `md` value).
  if (featureArg === 'max') {
    return `(width < ${parsed.value})`;
  }
  if (featureArg === 'maxHeight') {
    return `(height < ${parsed.value})`;
  }

  return buildMediaCondition(featureArg, parsed.value);
}

export function resolveBreakpointMediaKey(
  breakpoints: BreakpointMap | undefined,
  name: string,
  featureArg?: MediaBreakpointFeature | MediaBreakpointOptions,
): MediaQueryKey {
  requireBreakpoints(breakpoints);
  const feature = normalizeFeatureArg(featureArg);
  const condition = resolveBreakpointCondition(breakpoints, name, feature);
  return toMediaAtRuleKey(condition);
}

export type BreakpointMediaFn<B extends BreakpointMap = BreakpointMap> = {
  <const K extends keyof B & string>(
    name: K,
  ): B[K] extends string ? MediaKeyFromCondition<B[K]> : MediaQueryKey;
  <const K extends keyof B & string>(
    name: K,
    feature: MediaBreakpointFeature | MediaBreakpointOptions,
  ): MediaQueryKey;
};

export type MediaFn<B extends BreakpointMap = BreakpointMap> = {
  <const K extends keyof B & string>(
    name: K,
    block: CSSProperties,
  ): Record<B[K] extends string ? MediaKeyFromCondition<B[K]> : MediaQueryKey, CSSProperties>;
  <const K extends keyof B & string>(
    name: K,
    feature: MediaBreakpointFeature | MediaBreakpointOptions,
    block: CSSProperties,
  ): Record<MediaQueryKey, CSSProperties>;
};

export function createBreakpointMediaFn<const B extends BreakpointMap>(
  breakpoints: B | undefined,
): BreakpointMediaFn<B> {
  return ((name: string, featureArg?: MediaBreakpointFeature | MediaBreakpointOptions) =>
    resolveBreakpointMediaKey(breakpoints, name, featureArg)) as BreakpointMediaFn<B>;
}

export function createMediaFn<const B extends BreakpointMap>(
  breakpoints: B | undefined,
): MediaFn<B> {
  const breakpoint = createBreakpointMediaFn(breakpoints);

  return ((name: string, featureOrBlock: unknown, maybeBlock?: CSSProperties) => {
    if (maybeBlock !== undefined) {
      const feature = featureOrBlock as MediaBreakpointFeature | MediaBreakpointOptions;
      return atRuleBlock(breakpoint(name, feature), maybeBlock);
    }

    return atRuleBlock(breakpoint(name), featureOrBlock as CSSProperties);
  }) as MediaFn<B>;
}
