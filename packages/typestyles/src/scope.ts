import type { CSSProperties } from './types';
import { serializeStyle } from './serialize-style';
import { insertRules } from '#sheet';
import { applyLayerToRules, assertOwnLayer, type ResolvedCascadeLayers } from './layers';
import type { ClassNamingConfig } from './class-naming';

export type ScopeOptions = {
  /** Scoping root selector, e.g. `.theme-acme` */
  root: string;
  /** Optional upper bound for `@scope`, e.g. `.theme-acme` */
  to?: string;
  /** When `createStyles({ layers })` is used, wrap scoped rules in this layer */
  layer?: string;
};

function wrapRuleInScope(opts: ScopeOptions, css: string): string {
  const toClause = opts.to ? ` to (${opts.to})` : '';
  return `@scope (${opts.root})${toClause} {\n${css}\n}`;
}

function scopeRuleKey(
  opts: ScopeOptions,
  className: string,
  ruleKey: string,
  layer?: string,
): string {
  const layerSegment = opts.layer ?? layer ?? '';
  return `scope:${opts.root}:${opts.to ?? ''}:${layerSegment}:${className}:${ruleKey}`;
}

/**
 * Emit proximity-correct component overrides via CSS `@scope`.
 * Serializes `overrides` with the same `serializeStyle` path as `style` /
 * `recipe`, registers rules through `insertRules`, and optionally wraps
 * them in a cascade layer when `opts.layer` is set on a layered styles instance.
 */
export function createScope(
  classNaming: ClassNamingConfig,
  opts: ScopeOptions,
  className: string,
  overrides: CSSProperties,
): void {
  const selector = `.${className}`;
  const serialized = serializeStyle(selector, overrides, { breakpoints: classNaming.breakpoints });
  const scopedRules = serialized.map((rule) => ({
    key: scopeRuleKey(opts, className, rule.key, opts.layer),
    css: wrapRuleInScope(opts, rule.css),
  }));

  if (opts.layer != null && opts.layer !== '') {
    const stack = classNaming.cascadeLayers;
    if (!stack) {
      throw new Error(
        '[typestyles] `layer` in `scope(…)` requires `createStyles({ layers: … })` on this styles instance.',
      );
    }
    assertOwnLayer(stack, opts.layer, 'scope(…)');
    insertRules(applyLayerToRules(scopedRules, opts.layer, stack));
    return;
  }

  insertRules(scopedRules);
}

/** @internal Test hook for layer wrapping order */
export function scopeRulesForTest(
  opts: ScopeOptions,
  className: string,
  overrides: CSSProperties,
  stack?: ResolvedCascadeLayers,
  layer?: string,
  breakpoints?: ClassNamingConfig['breakpoints'],
): string[] {
  const selector = `.${className}`;
  const serialized = serializeStyle(selector, overrides, { breakpoints });
  let rules = serialized.map((rule) => ({
    key: scopeRuleKey(opts, className, rule.key, layer),
    css: wrapRuleInScope(opts, rule.css),
  }));
  if (layer && stack) {
    rules = applyLayerToRules(rules, layer, stack);
  }
  return rules.map((r) => r.css);
}
