import type {
  ThemeCondition,
  ThemeConditionMedia,
  ThemeConditionAttr,
  ThemeConditionClass,
  ThemeConditionSelector,
  ThemeConditionAnd,
  ThemeConditionOr,
  ThemeCompileConfig,
  ThemeConfig,
  ThemeModeDefinition,
  ThemeOverrides,
  ThemeSource,
  Theme,
  ThemeOverrideInput,
  TokenValues,
} from './types';
import { flattenTokenEntries, flattenTokenPaths } from './types';
import { sanitizeClassSegment, scopedTokenNamespace } from './class-naming';
import type { ThemeTokenNaming } from './token-naming';
import { insertRule, insertRules } from './sheet';
import type { ResolvedCascadeLayers } from './layers';
import { applyLayerToRules } from './layers';
import {
  compileThemeCondition,
  buildSelectorForContext,
  type CompiledCondition,
} from './condition-compile';
import type { ColorModeMap } from './color-modes';
import { expandThemeOverrides, normalizeThemeConfig } from './token-color-modes';
import { bindThemeOverride } from './theme-source-merge';
import { themeTokensToCompileConfig } from './theme-extend';
import { themeConfigToSource } from './theme-types';

/** When present, theme rules are wrapped in `@layer` alongside token `:root` CSS. */
export type ThemeEmitLayerContext = {
  readonly stack: ResolvedCascadeLayers;
  readonly layer: string;
};

export type CreateThemeOptions = {
  colorModes?: ColorModeMap;
  /**
   * Condition for dark-only token fallback rules (non-`light-dark()` leaves).
   * Defaults to `data-color-mode="dark"` on the theme element or a descendant,
   * or system dark when the theme element is not pinned to light.
   */
  resolvedDarkWhen?: ThemeCondition;
  /**
   * When `true` (default), unregister any existing theme with the same name before emitting CSS.
   * Set `false` to stack duplicate names (legacy behavior).
   */
  replace?: boolean;
};

/** Internal hooks so `tokens.createTheme` can share one override implementation. */
type CreateThemeInternalOptions = CreateThemeOptions & {
  /** Snapshot for `Theme.source` / `override` (defaults to config-derived preset). */
  source?: ThemeSource;
  /** Child-theme applicator; defaults to recursive `createTheme`. */
  createChildTheme?: (
    name: string,
    config: ThemeConfig,
    callOptions?: { replace?: boolean },
  ) => Theme;
};

// ---------------------------------------------------------------------------
// Condition builders — tokens.when.*
// ---------------------------------------------------------------------------

function condMedia(query: string): ThemeConditionMedia {
  return { type: 'media', query };
}

function condAttr(
  name: string,
  value: string,
  opts: { scope: 'self' | 'ancestor' | 'descendant' },
): ThemeConditionAttr {
  return { type: 'attr', name, value, scope: opts.scope };
}

function condClassName(
  name: string,
  opts: { scope: 'self' | 'ancestor' | 'descendant' },
): ThemeConditionClass {
  return { type: 'class', name, scope: opts.scope };
}

function condSelector(selector: string): ThemeConditionSelector {
  if (process.env.NODE_ENV !== 'production') {
    validateSelector(selector);
  }
  return { type: 'selector', selector };
}

function condAnd(...conditions: ThemeCondition[]): ThemeConditionAnd {
  return { type: 'and', conditions };
}

function condOr(...conditions: ThemeCondition[]): ThemeConditionOr {
  return { type: 'or', conditions };
}

/**
 * Negate a condition. Double negation is folded (`not(not(x))` → `x`).
 *
 * Supported inner shapes (single CSS branch after compile):
 * - `when.media` / `when.prefersDark` / `when.prefersLight` → `@media not (…)`
 * - `when.attr` / `when.className` with `scope: 'self'` → `:not(…)` on the theme class
 * - `when.attr` / `when.className` with `scope: 'ancestor'` → `:root:not(…) .theme-*` (intended when state lives on `html` / `:root`)
 *
 * Not supported: `when.selector`, `when.or`, `scope: 'descendant'` conditions (a descendant relationship can't collapse into a single `:not()` compound selector), combined `@media` + selector, or both ancestor and self selector parts on the same branch. Those log a dev warning and emit no rule.
 */
function condNot(condition: ThemeCondition): ThemeCondition {
  if (condition.type === 'not') {
    return condition.condition;
  }
  return { type: 'not', condition };
}

/**
 * Condition builders for theme mode layers.
 *
 * @example
 * ```ts
 * tokens.when.prefersDark
 * tokens.when.media('(prefers-color-scheme: dark)')
 * tokens.when.attr('data-color-mode', 'dark', { scope: 'ancestor' })
 * tokens.when.attr('data-surface', 'dark', { scope: 'descendant' })
 * tokens.when.or(tokens.when.prefersDark, tokens.when.attr('data-mode', 'dark', { scope: 'self' }))
 * ```
 */
export const when = {
  media: condMedia,
  attr: condAttr,
  className: condClassName,
  selector: condSelector,
  and: condAnd,
  or: condOr,
  not: condNot,
  /** Shorthand for `when.media('(prefers-color-scheme: dark)')`. */
  prefersDark: { type: 'media', query: '(prefers-color-scheme: dark)' } as ThemeConditionMedia,
  /** Shorthand for `when.media('(prefers-color-scheme: light)')`. */
  prefersLight: { type: 'media', query: '(prefers-color-scheme: light)' } as ThemeConditionMedia,
} as const;

/** HTML attribute used by automatic dark fallbacks when `colorModeAttribute` is omitted. */
export const DEFAULT_COLOR_MODE_ATTRIBUTE = 'data-color-mode';

/** Explicit attribute dark or system dark when not pinned to light (common app color-mode contract). */
export function resolvedDarkWhen(
  attribute = DEFAULT_COLOR_MODE_ATTRIBUTE,
  scope: 'self' | 'ancestor' = 'ancestor',
): ThemeCondition {
  return condOr(
    condAttr(attribute, 'dark', { scope }),
    condAnd(condNot(condAttr(attribute, 'light', { scope })), when.prefersDark),
  );
}

/** Dark-mode condition for `:root` token overrides (`:root[data-color-mode="dark"]`). */
export function resolvedDarkWhenOnRoot(attribute = DEFAULT_COLOR_MODE_ATTRIBUTE): ThemeCondition {
  return resolvedDarkWhen(attribute, 'self');
}

/**
 * Automatic dark fallback for values that cannot compile to `light-dark()`.
 * Matches the attribute on the anchor (`:root` or the theme class) or on a
 * descendant, and system dark when the anchor is not pinned to light.
 */
export function resolvedColorModeDarkWhen(
  attribute = DEFAULT_COLOR_MODE_ATTRIBUTE,
): ThemeCondition {
  return condOr(
    resolvedDarkWhen(attribute, 'self'),
    condAttr(attribute, 'dark', { scope: 'descendant' }),
  );
}

// ---------------------------------------------------------------------------
// Dev-only selector validation (lightweight heuristics)
// ---------------------------------------------------------------------------

function validateSelector(selector: string): void {
  if (!selector || !selector.trim()) {
    console.warn(
      '[typestyles] when.selector() received an empty string. This will produce an invalid CSS rule.',
    );
    return;
  }

  if (selector.includes('!important')) {
    console.warn(
      '[typestyles] when.selector() contains "!important" — this belongs in declarations, not selectors.',
    );
  }

  // Check for unmatched brackets/parens
  let parens = 0;
  let brackets = 0;
  for (const ch of selector) {
    if (ch === '(') parens++;
    else if (ch === ')') parens--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
    if (parens < 0 || brackets < 0) break;
  }
  if (parens !== 0 || brackets !== 0) {
    console.warn(
      `[typestyles] when.selector() has unmatched brackets or parentheses: "${selector}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// CSS declaration building
// ---------------------------------------------------------------------------

function buildDeclarations(
  scopeId: string | undefined,
  overrides: ThemeOverrides,
  naming?: ThemeTokenNaming,
  colorModes?: ColorModeMap,
): { decls: string; darkOnly: ThemeOverrides | null } {
  const { expanded, darkOnly } = expandThemeOverrides(overrides, colorModes);
  const parts: string[] = [];
  for (const [namespace, values] of Object.entries(expanded)) {
    if (values === null || values === undefined) continue;

    if (naming) {
      for (const { path, segments, value } of flattenTokenPaths(values as TokenValues)) {
        parts.push(`${naming.resolveName(namespace, path, segments)}: ${value}`);
      }
      continue;
    }

    const cssNs = scopedTokenNamespace(scopeId, namespace);
    for (const [key, value] of flattenTokenEntries(values as TokenValues)) {
      parts.push(`--${cssNs}-${key}: ${value}`);
    }
  }
  return { decls: parts.join('; '), darkOnly };
}

function themeSegment(scopeId: string | undefined, name: string): string {
  const n = sanitizeClassSegment(name);
  if (!scopeId) return n;
  return `${sanitizeClassSegment(scopeId)}-${n}`;
}

function buildSelector(themeClass: string, compiled: CompiledCondition): string {
  return buildSelectorForContext({ anchor: `.${themeClass}` }, compiled);
}

function buildRule(selector: string, declarations: string, media?: string): string {
  if (media) {
    return `@media ${media} { ${selector} { ${declarations}; } }`;
  }
  return `${selector} { ${declarations}; }`;
}

// ---------------------------------------------------------------------------
// Color mode presets — tokens.colorMode.*
// ---------------------------------------------------------------------------

type ColorModeMediaOnlyOptions = {
  dark: ThemeOverrides;
};

type ColorModeAttributeOnlyOptions = {
  attribute: string;
  values: { dark: string; light?: string };
  scope: 'self' | 'ancestor';
  dark: ThemeOverrides;
  light?: ThemeOverrides;
};

type ColorModeMediaOrAttributeOptions = {
  attribute: string;
  values: { dark: string; light?: string; system?: string };
  scope: 'self' | 'ancestor';
  dark: ThemeOverrides;
};

type ColorModeSystemWithOverrideOptions = {
  attribute: string;
  values: { light: string; dark: string; system?: string };
  scope: 'self' | 'ancestor';
  light: ThemeOverrides;
  dark: ThemeOverrides;
};

function presetMediaOnly(opts: ColorModeMediaOnlyOptions): ThemeModeDefinition[] {
  return [
    {
      id: 'dark',
      overrides: opts.dark,
      when: when.prefersDark,
    },
  ];
}

function presetAttributeOnly(opts: ColorModeAttributeOnlyOptions): ThemeModeDefinition[] {
  const modes: ThemeModeDefinition[] = [
    {
      id: 'dark',
      overrides: opts.dark,
      when: when.attr(opts.attribute, opts.values.dark, { scope: opts.scope }),
    },
  ];

  if (opts.light && opts.values.light) {
    modes.push({
      id: 'light',
      overrides: opts.light,
      when: when.attr(opts.attribute, opts.values.light, { scope: opts.scope }),
    });
  }

  return modes;
}

/**
 * Dark when the OS prefers dark **or** the attribute matches `values.dark`.
 *
 * **`values.system`** — Optional app-facing token only. No extra CSS rule is emitted for it:
 * with `data-*` set to `system`, neither branch of the `or` matches from the attribute side;
 * appearance follows the media branch (and your `base` tokens) like OS “system” mode.
 */
function presetMediaOrAttribute(opts: ColorModeMediaOrAttributeOptions): ThemeModeDefinition[] {
  return [
    {
      id: 'dark',
      overrides: opts.dark,
      when: when.or(
        when.prefersDark,
        when.attr(opts.attribute, opts.values.dark, { scope: opts.scope }),
      ),
    },
  ];
}

function presetSystemWithLightDarkOverride(
  opts: ColorModeSystemWithOverrideOptions,
): ThemeModeDefinition[] {
  // Four-rule pattern:
  // 1. (base is handled by createTheme, not here)
  // 2. Dark under @media (prefers-color-scheme: dark)
  // 3. Dark under attribute=dark (forced dark)
  // 4. Light under @media dark + attribute=light (forced light overriding system dark)
  return [
    {
      id: 'dark-media',
      overrides: opts.dark,
      when: when.prefersDark,
    },
    {
      id: 'dark-attr',
      overrides: opts.dark,
      when: when.attr(opts.attribute, opts.values.dark, { scope: opts.scope }),
    },
    {
      id: 'light-override',
      overrides: opts.light,
      when: when.and(
        when.prefersDark,
        when.attr(opts.attribute, opts.values.light, { scope: opts.scope }),
      ),
    },
  ];
}

/**
 * Color mode presets that expand into `ThemeModeDefinition[]` arrays.
 * Use via the `modes` property on `tokens.createTheme()`, or spread into `modes`:
 * `modes: tokens.colorMode.mediaOnly({ dark: … })`.
 *
 * @example
 * ```ts
 * tokens.createTheme({
 *   name: 'acme',
 *   base: lightTokens,
 *   colorMode: tokens.colorMode.systemWithLightDarkOverride({
 *     attribute: 'data-color-mode',
 *     values: { light: 'light', dark: 'dark' },
 *     scope: 'ancestor',
 *     light: lightTokens,
 *     dark: darkTokens,
 *   }),
 * });
 * ```
 */
export const colorMode = {
  mediaOnly: presetMediaOnly,
  attributeOnly: presetAttributeOnly,
  mediaOrAttribute: presetMediaOrAttribute,
  systemWithLightDarkOverride: presetSystemWithLightDarkOverride,
} as const;

// ---------------------------------------------------------------------------
// Theme factory
// ---------------------------------------------------------------------------

function createThemeObject(
  name: string,
  className: string,
  source: ThemeSource,
  overrideFn: (input: ThemeOverrideInput) => Theme,
): Theme {
  return {
    className,
    name,
    source,
    override: overrideFn,
    toString() {
      return className;
    },
    [Symbol.toPrimitive]() {
      return className;
    },
  };
}

/** Snapshot mergeable token config from a createTheme input (before compile fold). */
function themeSourceFromConfig(config: ThemeConfig | ThemeCompileConfig): ThemeSource {
  if (isThemeCompileConfig(config)) {
    return themeConfigToSource({
      tokens: config.base as ThemeConfig['tokens'],
      modes: config.modes,
    });
  }
  return themeConfigToSource({
    tokens: config.tokens,
    modes: config.modes,
  });
}

// ---------------------------------------------------------------------------
// createTheme
// ---------------------------------------------------------------------------

/**
 * Create a themed surface with base token overrides and optional mode layers.
 *
 * Returns a `Theme` object whose `className` (and string coercion)
 * is a stable, human-readable class name like `"theme-acme"`.
 * Light/dark values use mode-aware leaves that compile to CSS `light-dark()`.
 *
 * @example
 * ```ts
 * const acme = tokens.createTheme({
 *   name: 'acme',
 *   tokens: {
 *     color: {
 *       text: { primary: { light: '#111827', dark: '#f9fafb' } },
 *     },
 *   },
 * });
 *
 * // acme.className === 'theme-acme'
 * // `${acme}` === 'theme-acme'
 * ```
 */
function isThemeCompileConfig(
  config: ThemeConfig | ThemeCompileConfig,
): config is ThemeCompileConfig {
  const compile = config as ThemeCompileConfig;
  const input = config as ThemeConfig;
  return compile.base !== undefined && input.tokens === undefined;
}

export function createTheme(
  name: string,
  config: ThemeConfig | ThemeCompileConfig,
  scopeId?: string,
  layerContext?: ThemeEmitLayerContext,
  naming?: ThemeTokenNaming,
  options?: CreateThemeInternalOptions,
): Theme {
  const colorModes = options?.colorModes;
  const darkWhen = options?.resolvedDarkWhen ?? resolvedColorModeDarkWhen();

  const segment = themeSegment(scopeId, name);
  const className = `theme-${segment}`;
  const source = options?.source ?? themeSourceFromConfig(config);

  const prepared = isThemeCompileConfig(config)
    ? config
    : themeTokensToCompileConfig(normalizeThemeConfig(config, colorModes));

  const emitRule = (key: string, css: string): void => {
    if (layerContext) {
      insertRules(applyLayerToRules([{ key, css }], layerContext.layer, layerContext.stack));
    } else {
      insertRule(key, css);
    }
  };

  const expanded = expandThemeOverrides(prepared.base ?? {}, colorModes);
  const resolvedBase = expanded.expanded;
  const darkOnlyFallback: ThemeOverrides | null = expanded.darkOnly;

  const baseDecls = buildDeclarations(scopeId, resolvedBase, naming, colorModes).decls;
  const colorSchemeDecl = colorModes ? 'color-scheme: light dark' : '';
  const allBaseDecls = [colorSchemeDecl, baseDecls].filter(Boolean).join('; ');

  if (allBaseDecls) {
    emitRule(`theme:${segment}:base`, `.${className} { ${allBaseDecls}; }`);
  } else {
    emitRule(`theme:${segment}:base`, `.${className} { }`);
  }

  const modes: ThemeModeDefinition[] = [...(prepared.modes ?? [])];
  if (darkOnlyFallback && Object.keys(darkOnlyFallback).length > 0) {
    modes.push({
      id: 'token-dark-fallback',
      overrides: darkOnlyFallback,
      when: darkWhen,
    });
  }

  const rules: Array<{ key: string; css: string }> = [];

  for (const mode of modes) {
    const { decls, darkOnly: modeDarkOnly } = buildDeclarations(
      scopeId,
      mode.overrides,
      naming,
      colorModes,
    );
    if (!decls) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[typestyles] createTheme('${name}'): mode "${mode.id}" has empty overrides — no CSS was emitted for this mode. Remove the mode or add token overrides.`,
        );
      }
      continue;
    }

    const compiledBranches = compileThemeCondition(mode.when);

    for (let i = 0; i < compiledBranches.length; i++) {
      const branch = compiledBranches[i];
      const selector = buildSelector(className, branch);
      const key = `theme:${segment}:mode:${mode.id}:branch:${i}`;
      rules.push({ key, css: buildRule(selector, decls, branch.media) });
    }

    if (modeDarkOnly && Object.keys(modeDarkOnly).length > 0) {
      const darkDecls = buildDeclarations(scopeId, modeDarkOnly, naming, colorModes).decls;
      if (darkDecls) {
        for (let i = 0; i < compiledBranches.length; i++) {
          const branch = compiledBranches[i];
          const selector = buildSelector(className, branch);
          const key = `theme:${segment}:mode:${mode.id}:dark-only:${i}`;
          rules.push({ key, css: buildRule(selector, darkDecls, branch.media) });
        }
      }
    }
  }

  if (rules.length > 0) {
    if (layerContext) {
      insertRules(applyLayerToRules(rules, layerContext.layer, layerContext.stack));
    } else {
      insertRules(rules);
    }
  }

  const createChildTheme =
    options?.createChildTheme ??
    ((childName, merged, callOptions) =>
      createTheme(childName, merged, scopeId, layerContext, naming, {
        ...options,
        source: undefined,
        replace: callOptions?.replace ?? options?.replace,
      }));

  return createThemeObject(name, className, source, bindThemeOverride(source, createChildTheme));
}

// ---------------------------------------------------------------------------
// createDarkMode shorthand
// ---------------------------------------------------------------------------

/**
 * Shorthand: create a theme surface that applies `darkOverrides` under
 * `@media (prefers-color-scheme: dark)`.
 *
 * Equivalent to:
 * ```ts
 * tokens.createTheme(name, {
 *   modes: [{ id: 'dark', overrides: darkOverrides, when: tokens.when.prefersDark }],
 * });
 * ```
 */
export function createDarkMode(
  name: string,
  darkOverrides: ThemeOverrides,
  scopeId?: string,
  layerContext?: ThemeEmitLayerContext,
  naming?: ThemeTokenNaming,
  options?: CreateThemeOptions,
): Theme {
  return createTheme(
    name,
    {
      modes: [{ id: 'dark', overrides: darkOverrides, when: when.prefersDark }],
    },
    scopeId,
    layerContext,
    naming,
    options,
  );
}
