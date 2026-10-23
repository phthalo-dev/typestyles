import type * as CSS from 'csstype';
import type { ColorModeMap, LightDarkColorModes } from './color-modes';
import type { CreateValueForSyntax, CssSyntax, CSSPropertyValue, SyntaxRef } from './types-syntax';
import type { ThemeTokenContext } from './theme-token-context';
import type { ThemeComponentPatch } from './theme-types';

export type {
  CompatibleSourceSyntax,
  CreateValueForSyntax,
  CssSyntax,
  CSSPropertyValue,
  ModeAwareCreateValue,
  SyntaxAwareLonghands,
  SyntaxPropertyValue,
  SyntaxRef,
  SyntaxRefAccepts,
} from './types-syntax';

/**
 * A CSS value that can be a standard value or a token reference (var() string).
 *
 * Values are emitted verbatim. TypeScript does **not** validate CSS syntax, so a typo in
 * `calc()`, `clamp()`, `min()`, `max()`, `url()`, etc. (for example a missing `)`) can produce
 * invalid CSS that breaks parsing for following rules. Use **`calc`** (tagged template) and
 * **`clamp`** from `typestyles` to keep function parentheses balanced, or small named helpers;
 * see the docs “TypeScript Tips” page.
 */
export type CSSValue = string | number;

/**
 * CSS properties with support for nested selectors and at-rules.
 *
 * Mapped csstype properties keep **CSS key IntelliSense** (`borderRadius`, `display`, …). Values also accept
 * {@link CSSValue} so unconstrained inference that widens keywords to `string` stays assignable. An open string
 * index accepts **`[v.name]: value`** from {@link ComponentInternalVarRef}, literal custom properties (`--foo`),
 * and nested selectors / at-rules (`&:hover`, `@media`, …) — including when computed var keys would otherwise
 * widen a nested block and break assignability (Issue #167). Template-literal selector indexes were removed in
 * favor of this open index (same approach as {@link VariantOptionStyle}) because they conflicted with computed
 * custom-property keys inside nested blocks.
 *
 * For `@…` keys, **`container()`** / **`styles.container()`** infer a **literal** `@container …` template so
 * `[container({ minWidth: 400 })]` mixes with longhands without casting. **`supports()`** / **`styles.supports()`**
 * do the same for `@supports` feature queries. For **dynamic** `@…` strings, spread
 * **`atRuleBlock` / `styles.atRuleBlock`**. Same idea for **`has` / `is` / `where`**: variadic literals narrow
 * to `&:…` keys; if the key is only known as `string`, spread a one-key object or use `atRuleBlock`.
 */
type CSSPropertiesBase = {
  [K in keyof CSS.Properties<CSSValue>]?: CSSPropertyValue<K>;
} & {
  [key: string]:
    | CSS.Properties<CSSValue>[keyof CSS.Properties<CSSValue>]
    | CSSPropertiesBase
    | CSSValue
    | RegisteredPropertyRef
    | SyntaxRef<string>
    | { readonly [mode: string]: CSSValue }
    | undefined;
};

// Empty interface (not type alias) so consumers can augment via `declare module 'typestyles'`.
// oxlint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation
export interface CSSProperties extends CSSPropertiesBase {}

/**
 * Utility function map used by `createStyles({ utils })` and `styles.withUtils()`.
 * Each key becomes an extra style property that expands into CSSProperties.
 */
type BivariantCallback<Arg, Ret> = {
  bivarianceHack(value: Arg): Ret;
}['bivarianceHack'];

export type StyleUtils = Record<string, BivariantCallback<unknown, CSSProperties>>;

type UtilityValue<U extends StyleUtils, K extends keyof U> = U[K] extends (
  value: infer V,
) => CSSProperties
  ? V
  : never;

/**
 * CSS properties augmented with user-defined utility keys.
 *
 * Extends {@link CSSProperties} with mapped utility keys; same open string index as
 * `CSSProperties` so `[v.name]: value` works in nested selectors (Issue #167).
 */
export type CSSPropertiesWithUtils<U extends StyleUtils> = CSSPropertiesBase & {
  [K in keyof U]?: UtilityValue<U, K>;
};

/**
 * A map of style names to utility-aware CSS property definitions.
 */
export type StyleDefinitionsWithUtils<U extends StyleUtils> = Record<
  string,
  CSSPropertiesWithUtils<U>
>;

/**
 * A map of variant names to their CSS property definitions.
 */
export type StyleDefinitions = Record<string, CSSProperties>;

/**
 * Opt-in leaf shape for `tokens.create` — registers `@property` when `syntax` is set
 * and returns a `{ name, var, toString }` ref instead of a plain `var(...)` string.
 */
export type TokenDescriptor = {
  value: string | number;
  syntax?: string;
  inherits?: boolean;
  /**
   * Explicit `@property` placeholder `initial-value`, used when `value` is
   * `var()`/`env()`-dependent (skips the built-in syntax-keyed placeholder
   * table). Ignored for computationally independent `value`s, which use
   * `value` itself as `initial-value`.
   */
  initial?: string | number;
};

export type TokenSchemaLeaf =
  | true
  | { syntax: string; inherits?: boolean; initial?: string | number };

export type TokenSchema = TokenSchemaLeaf | { [key: string]: TokenSchema };

/**
 * Mode-aware token leaf: `{ light, dark }` (or custom keys from `colorModes`).
 * Compiles to `light-dark()` on `:root` when `colorModes` is configured on `createTokens()`.
 */
export type ModeAwareTokenObject<M extends ColorModeMap = LightDarkColorModes> = {
  readonly [K in M[number]]: string | number;
};

/**
 * Scalar or mode-aware leaf nested under a token path (not a root namespace key).
 * Equivalent to `string | number | { light: string | number; dark: string | number }` with default modes.
 */
export type ModeAwareTokenLeaf<M extends ColorModeMap = LightDarkColorModes> =
  | string
  | number
  | ModeAwareTokenObject<M>;

/** A single node in a `tokens.create()` value tree — scalar, mode-aware leaf, or nested group. */
export type CreateTokenNode<M extends ColorModeMap = LightDarkColorModes> =
  | ModeAwareTokenLeaf<M>
  | CreateTokenValues<M>;

/**
 * Plain token values accepted by `tokens.create()` (no inline descriptors).
 * Root-level keys are always separate token paths — `{ light, dark }` at the namespace root
 * registers `--ns-light` and `--ns-dark`, not a single mode-aware leaf.
 */
export type CreateTokenValues<M extends ColorModeMap = LightDarkColorModes> = {
  readonly [key: string]: CreateTokenNode<M>;
};

export type InferFromSchema<S> = S extends { syntax: infer Syn extends string }
  ? Syn extends CssSyntax
    ? SyntaxRef<Syn>
    : SyntaxRef<string>
  : S extends true
    ? string
    : S extends Record<string, unknown>
      ? { readonly [K in keyof S]: InferFromSchema<S[K]> }
      : never;

export type InferValuesFromSchema<S, M extends ColorModeMap = LightDarkColorModes> = S extends true
  ? string | number
  : S extends { syntax: infer Syn extends string }
    ? Syn extends CssSyntax
      ? CreateValueForSyntax<Syn, M>
      : string | number
    : S extends Record<string, unknown>
      ? { [K in keyof S]?: InferValuesFromSchema<S[K], M> }
      : never;

declare const DeclaredBrand: unique symbol;

export type DeclaredTokenRef<TSchema, N extends string> = InferFromSchema<TSchema> & {
  readonly [DeclaredBrand]: { namespace: N; schema: TSchema };
};

/**
 * A token value can be a string/number, a typed descriptor leaf, or a nested object.
 * Supports arbitrarily deep nesting for hierarchical token structures.
 */
export type TokenValues =
  | string
  | number
  | TokenDescriptor
  | {
      [key: string]: TokenValues;
    };

/**
 * A flattened key-value pair for CSS custom property generation.
 */
export type FlatTokenEntry = [key: string, value: string];

/**
 * A flattened token path with segment preservation for custom name templates.
 */
export type FlatTokenPathEntry = {
  path: string;
  segments: readonly string[];
  value: string;
};

/**
 * Flattens a nested TokenValues object into an array of [key, value] pairs.
 * Deeply nested objects are flattened with keys joined by hyphens.
 *
 * @example
 * flattenTokens({ text: { primary: '#000' } })
 * // => [['text-primary', '#000']]
 */
export function isTokenDescriptor(value: unknown): value is TokenDescriptor {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    (typeof (value as TokenDescriptor).value === 'string' ||
      typeof (value as TokenDescriptor).value === 'number') &&
    !Array.isArray(value)
  );
}

export function flattenTokenEntries(obj: TokenValues, prefix = ''): FlatTokenEntry[] {
  const entries: FlatTokenEntry[] = [];

  if (obj === null || obj === undefined) {
    return entries;
  }

  if (typeof obj === 'string' || typeof obj === 'number') {
    if (prefix) {
      entries.push([prefix, String(obj)]);
    }
    return entries;
  }

  if (isTokenDescriptor(obj)) {
    if (prefix) {
      entries.push([prefix, String(obj.value)]);
    }
    return entries;
  }

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'string' || typeof value === 'number') {
      entries.push([newKey, String(value)]);
    } else if (isTokenDescriptor(value)) {
      entries.push([newKey, String(value.value)]);
    } else if (value !== null && typeof value === 'object') {
      entries.push(...flattenTokenEntries(value as TokenValues, newKey));
    }
  }

  return entries;
}

export function flattenTokenPaths(
  obj: TokenValues,
  prefix = '',
  segments: readonly string[] = [],
): FlatTokenPathEntry[] {
  const entries: FlatTokenPathEntry[] = [];

  if (obj === null || obj === undefined) {
    return entries;
  }

  if (typeof obj === 'string' || typeof obj === 'number') {
    if (prefix) {
      entries.push({ path: prefix, segments, value: String(obj) });
    }
    return entries;
  }

  if (isTokenDescriptor(obj)) {
    if (prefix) {
      entries.push({ path: prefix, segments, value: String(obj.value) });
    }
    return entries;
  }

  for (const [key, value] of Object.entries(obj)) {
    const nextSegments = prefix ? [...segments, key] : [key];
    const newKey = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'string' || typeof value === 'number') {
      entries.push({ path: newKey, segments: nextSegments, value: String(value) });
    } else if (isTokenDescriptor(value)) {
      entries.push({ path: newKey, segments: nextSegments, value: String(value.value) });
    } else if (value !== null && typeof value === 'object') {
      entries.push(...flattenTokenPaths(value as TokenValues, newKey, nextSegments));
    }
  }

  return entries;
}

/**
 * Reference to a registered CSS custom property with `.name`, `.var`, and string coercion.
 * Syntax-unknown refs use `SyntaxRef<string>`; declared schema leaves use `SyntaxRef<'<color>'>` etc.
 */
export type RegisteredPropertyRef = SyntaxRef<string>;

/** `@property` registration metadata — never includes a runtime value. */
export type PropertyRegistration = {
  syntax: string;
  inherits?: boolean;
  initial?: string | number;
};

/** Reference to a registered CSS custom property. */
export type PropertyRef = RegisteredPropertyRef;

/** Shorthand options for bundled declare + optional set. */
export type PropertyOptions = PropertyRegistration & {
  value?: string | number;
};

/** Callable `styles.property` with `declare` / `set` namespace methods. */
export type StylesPropertyFn = {
  (id: string, options?: PropertyOptions): PropertyRef;
  declare(id: string, registration: PropertyRegistration): PropertyRef;
  set(ref: PropertyRef, value: string | number): void;
};

/** @deprecated Use {@link PropertyOptions} */
export type RegisteredPropertyOptions = PropertyOptions;

type TokenRefTreeLeaf<V, M extends ColorModeMap = LightDarkColorModes> = V extends TokenDescriptor
  ? RegisteredPropertyRef
  : V extends string | number
    ? string
    : V extends ModeAwareTokenObject<M>
      ? string
      : V extends TokenValues | CreateTokenNode<M>
        ? TokenRefTree<V, M>
        : string;

/**
 * Maps a `tokens.create()` value tree to nested `var(--…)` refs (mode-aware leaves become a single ref).
 */
export type TokenRefTree<T, M extends ColorModeMap = LightDarkColorModes> = T extends
  | string
  | number
  ? string
  : T extends TokenDescriptor
    ? RegisteredPropertyRef
    : T extends Record<string, unknown>
      ? { readonly [K in keyof T]: TokenRefTreeLeaf<T[K], M> }
      : string;

/**
 * A typed token reference object. Property access returns var(--namespace-key) strings
 * or {@link RegisteredPropertyRef} for descriptor leaves.
 * Supports nested access: token.text.primary => var(--namespace-text-primary)
 */
export type TokenRef<T extends TokenValues | CreateTokenValues> = TokenRefTree<T>;

declare const CreatedTokenBrand: unique symbol;

/**
 * Return type of `tokens.create()` — a `TokenRef` branded with its value shape and namespace
 * so `tokens.use(created)` can infer types across packages.
 */
export type CreatedTokenRef<
  T extends CreateTokenValues | TokenValues = CreateTokenValues,
  N extends string = string,
> = TokenRefTree<T> & {
  readonly [CreatedTokenBrand]: { readonly values: T; readonly namespace: N };
};

/** Extract token value shape from a `tokens.create()` return value. */
export type InferTokenValues<R> =
  R extends CreatedTokenRef<infer T, string>
    ? T extends CreateTokenValues | TokenValues
      ? T
      : CreateTokenValues
    : CreateTokenValues;

/** Extract namespace literal from a `tokens.create()` return value. */
export type InferTokenNamespace<R> =
  R extends CreatedTokenRef<TokenValues, infer N> ? (N extends string ? N : string) : string;

/** Registry of token namespaces to value shapes for `createTokens<Registry>()`. */
export type TokenRegistry = Record<string, TokenValues>;

/**
 * Nested token values where any object level may omit keys (for mode layers that
 * only tweak a subtree of `base`).
 */
export type DeepPartialTokenValues<M extends ColorModeMap = LightDarkColorModes> =
  | ModeAwareTokenLeaf<M>
  | {
      [key: string]: DeepPartialTokenValues<M> | undefined;
    };

/**
 * Theme overrides: namespaces map to full or deeply partial token trees.
 * Aligns with `tokens.create` namespaces; mode `overrides` often only set a subset of keys.
 */
export type ThemeOverrides = {
  [namespace: string]: DeepPartialTokenValues | undefined;
};

/**
 * Keyframe stops: 'from', 'to', or percentage strings mapped to CSS properties.
 */
export type KeyframeStops = Record<string, CSSProperties>;

// ---------------------------------------------------------------------------
// Theme condition types (discriminated union)
// ---------------------------------------------------------------------------

/** Match a media query (e.g. `(prefers-color-scheme: dark)`). */
export type ThemeConditionMedia = {
  readonly type: 'media';
  readonly query: string;
};

/** Match an attribute on the themed element (`self`), an ancestor (`ancestor`), or a descendant of the theme root (`descendant`). */
export type ThemeConditionAttr = {
  readonly type: 'attr';
  readonly name: string;
  readonly value: string;
  readonly scope: 'self' | 'ancestor' | 'descendant';
};

/** Match a class on the themed element (`self`), an ancestor (`ancestor`), or a descendant of the theme root (`descendant`). */
export type ThemeConditionClass = {
  readonly type: 'class';
  readonly name: string;
  readonly scope: 'self' | 'ancestor' | 'descendant';
};

/** Raw selector escape hatch — the selector is used as an ancestor context for the theme class. */
export type ThemeConditionSelector = {
  readonly type: 'selector';
  readonly selector: string;
};

/** All child conditions must hold. */
export type ThemeConditionAnd = {
  readonly type: 'and';
  readonly conditions: readonly ThemeCondition[];
};

/** Any child condition must hold (emits separate rules per branch). */
export type ThemeConditionOr = {
  readonly type: 'or';
  readonly conditions: readonly ThemeCondition[];
};

/** Negate a single-branch condition (see `tokens.when.not` JSDoc for limits). */
export type ThemeConditionNot = {
  readonly type: 'not';
  readonly condition: ThemeCondition;
};

/**
 * A condition that determines **when** a set of token overrides applies.
 * Conditions compile to media queries, selector prefixes/suffixes, or combinations.
 */
export type ThemeCondition =
  | ThemeConditionMedia
  | ThemeConditionAttr
  | ThemeConditionClass
  | ThemeConditionSelector
  | ThemeConditionAnd
  | ThemeConditionOr
  | ThemeConditionNot;

// ---------------------------------------------------------------------------
// Theme mode / config / surface
// ---------------------------------------------------------------------------

/**
 * A single mode layer within a theme surface.
 * Applies `overrides` when `when` is satisfied.
 */
export type ThemeModeDefinition = {
  readonly id: string;
  readonly overrides: ThemeOverrides;
  readonly when: ThemeCondition;
};

/** Passed to theme `components` factory functions (#216). */
export type ThemeOverrideContext<
  E extends Record<string, CreateTokenValues> = Record<string, never>,
> = {
  readonly tokens: ThemeTokenContext<E>;
  readonly theme: Theme<E>;
};

/** Mergeable token config snapshot stored on {@link Theme.source}. */
export type ThemeSource = {
  /** Per-namespace token values (same shape as `tokens.create` trees). */
  tokens?: Record<string, CreateTokenValues>;
  modes?: ThemeModeDefinition[];
};

/**
 * Configuration for `tokens.createTheme()`.
 * Light/dark values belong on mode-aware token leaves (`{ light, dark }` → CSS `light-dark()`).
 * `modes` adds conditional override layers (presets, shadow fallbacks, etc.).
 */
export type ThemeConfig = {
  /**
   * Per-namespace token overrides for `.theme-{name}` — registers each namespace via
   * `tokens.create` (when using `tokens.createTheme`) and emits `--*` variables.
   * Mode-aware `{ light, dark }` leaves compile to CSS `light-dark()` when `colorModes` is set.
   */
  tokens?: Record<string, CreateTokenValues>;
  /** Conditional mode layers with explicit `when` conditions. */
  modes?: ThemeModeDefinition[];
  /** `{ vars?, styles? }` per recipe. `styles` may be `({ vars, tokens }) => partial`. A bare function is not a patch. */
  components?: Record<string, ThemeComponentPatch>;
};

/** Theme config after `tokens` namespaces are folded for the CSS compiler. */
export type ThemeCompileConfig = Omit<ThemeConfig, 'tokens'> & {
  base?: ThemeOverrides;
};

/**
 * Closed deep-partial of a token map for {@link Theme.override}.
 * When `E` is empty (unknown registry), falls back to open theme overrides.
 * Leaf positions accept scalars or mode-aware `{ light, dark }` objects.
 */
export type DeepPartialThemeTokens<T, M extends ColorModeMap = LightDarkColorModes> = [
  keyof T,
] extends [never]
  ? { [key: string]: DeepPartialTokenValues<M> | undefined }
  : {
      [K in keyof T]?: T[K] extends ModeAwareTokenLeaf<M>
        ? ModeAwareTokenLeaf<M>
        : T[K] extends Record<string, unknown>
          ? DeepPartialThemeTokens<T[K], M>
          : ModeAwareTokenLeaf<M>;
    };

/**
 * Input to {@link Theme.override} — child theme patches typed against the parent token tree.
 */
export type ThemeOverrideInput<
  E extends Record<string, CreateTokenValues> = Record<string, never>,
> = {
  name: string;
  replace?: boolean;
  tokens?: DeepPartialThemeTokens<E>;
  modes?: ReadonlyArray<{
    readonly id: string;
    readonly overrides: DeepPartialThemeTokens<E>;
    readonly when: ThemeCondition;
  }>;
  /** `{ vars?, styles? }` per recipe. `styles` may be `({ vars, tokens }) => partial`. A bare function is not a patch. */
  components?: Record<string, ThemeComponentPatch>;
};

/**
 * The object returned by `tokens.createTheme()`.
 *
 * - `theme.className` — the generated class name (e.g. `"theme-acme"`)
 * - `theme.name` — the theme name (e.g. `"acme"`)
 * - `theme.source` — mergeable token config snapshot for {@link Theme.override}
 * - `String(theme)` / template interpolation — coerces to `className`
 */
export interface Theme<E extends Record<string, CreateTokenValues> = Record<string, never>> {
  readonly className: string;
  readonly name: string;
  /**
   * Resolved token / modes snapshot used when deriving child themes via {@link override}.
   */
  readonly source: ThemeSource;
  /**
   * Token refs for override factories — `tokens.use` plus namespace shortcuts (`tokens.color`, …).
   * Present on themes from `tokens.createTheme()` / `createTypeStyles`.
   */
  readonly tokens?: ThemeTokenContext<E>;
  /**
   * Create a child theme by deep-merging typed patches onto this theme's {@link source}.
   * Patches are closed against the root token tree — new namespaces/paths belong on the root
   * `createTheme` (or `tokens.create`), not in `override`.
   */
  override(input: ThemeOverrideInput<E>): Theme<E>;
  toString(): string;
  [Symbol.toPrimitive](hint: string): string;
}

/**
 * The object returned by calling a `recipe()` instance created with
 * `mode: 'attribute'`.
 *
 * - `className` — the single base class (no per-option classes exist in attribute mode).
 * - `attrs` — resolved `data-{dimension}` attribute pairs for the current selections. Boolean
 *   dimensions (`{ true: {...}, false: {...} }`) are presence-based: `true` → empty-string value,
 *   `false` → key omitted.
 * - `props` — `attrs` merged with `className`, ready to spread onto an element.
 * - `String(result)` / template-literal coercion returns `className`, same as `Theme`.
 */
export interface ComponentAttrsResult {
  readonly className: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly props: Readonly<Record<string, string>>;
  toString(): string;
  [Symbol.toPrimitive](hint: string): string;
}

// ---------------------------------------------------------------------------
// Component API types
// ---------------------------------------------------------------------------

/**
 * Styles for a single variant option (or slot / override style block).
 *
 * Mapped csstype properties keep **CSS key IntelliSense** (`borderRadius`, `display`, …). Values
 * also accept {@link CSSValue} so unconstrained inference that widens keywords to `string` (e.g.
 * `{ flexWrap: 'wrap', columnGap: tokenString }`) stays assignable — otherwise sibling token
 * `string`s widen `'wrap'` → `string`, which is not assignable to csstype unions like `FlexWrap`
 * and can make `recipe` fall through to the wrong overload (Issue #149). An open string
 * index still accepts **`[v.name]: value`** from {@link ComponentInternalVarRef}, literal custom
 * properties (`--foo`), and nested selectors / at-rules (`&:hover`, `@media`, …) — without a
 * `CSSProperties | Record<string, unknown>` union that weakens key completions when the type is
 * reconstructed in downstream theme helpers. Unknown string keys remain intentionally permissive
 * (typos included).
 */
export type VariantOptionStyle = {
  [K in keyof CSS.Properties<CSSValue>]?: CSSPropertyValue<K>;
} & {
  [key: string]:
    | CSS.Properties<CSSValue>[keyof CSS.Properties<CSSValue>]
    | VariantOptionStyle
    | CSSValue
    | SyntaxRef<string>
    | { readonly [mode: string]: CSSValue }
    | undefined;
};

/** A single conditional patch on a component override selector. */
export type ConditionalOverride = {
  /** Optional label for devtools / HMR / snapshot tests. */
  id?: string;
  when: ThemeCondition;
  style: VariantOptionStyle;
};

/**
 * Style block for overrides: normal CSS properties + nested selectors/at-rules,
 * plus an optional `conditions` array.
 *
 * `conditions` is a reserved key — not emitted as CSS.
 */
export type StylableOverride = {
  [K in keyof CSS.Properties<CSSValue>]?: CSSPropertyValue<K>;
} & {
  conditions?: readonly ConditionalOverride[];
  [key: string]:
    | CSS.Properties<CSSValue>[keyof CSS.Properties<CSSValue>]
    | VariantOptionStyle
    | readonly ConditionalOverride[]
    | CSSValue
    | SyntaxRef<string>
    | { readonly [mode: string]: CSSValue }
    | undefined;
};

/**
 * A map of variant dimensions to their options (each option is {@link VariantOptionStyle}).
 */
export type VariantDefinitions = Record<string, Record<string, VariantOptionStyle>>;
export type SlotStyles<S extends string> = Partial<Record<S, VariantOptionStyle>>;
export type SlotVariantDefinitions<S extends string> = Record<
  string,
  Record<string, SlotStyles<S>>
>;

type VariantDimensions = Record<string, Record<string, unknown>>;

/** Option name union for a single variant dimension (string keys only). */
export type VariantOptionKey<V extends VariantDimensions, K extends keyof V> = Extract<
  keyof V[K],
  string
>;

type VariantSelectionValue<OptionKey extends string> =
  | OptionKey
  | (Extract<OptionKey, 'true'> extends never ? never : true)
  | (Extract<OptionKey, 'false'> extends never ? never : false);

/**
 * Compound / override selection for one dimension: a single option, a boolean
 * when the dimension is `true`/`false`, or a readonly OR-list of those.
 */
export type CompoundSelectionValue<OptionKey extends string> =
  | VariantSelectionValue<OptionKey>
  | readonly VariantSelectionValue<OptionKey>[];

export type ComponentSelections<V extends VariantDimensions> = {
  [K in keyof V]?: VariantSelectionValue<VariantOptionKey<V, K>> | null | undefined;
};

/**
 * A CSS custom property reference as a `var(--…)` value (tokens, `createVar()`, component internal vars).
 */
export type CSSVarRef = `var(--${string})` | `var(--${string}, ${string})`;

// ---------------------------------------------------------------------------
// Dimensioned variant config (has `variants: { ... }`)
// ---------------------------------------------------------------------------

/** @deprecated Use {@link PropertyOptions} */
export type ComponentVarDescriptor = PropertyOptions;

/**
 * Nested map of component internal vars (same nesting as `tokens.create` / theme token trees).
 */
export type ComponentVarNode =
  | string
  | number
  | ComponentVarDescriptor
  | { [key: string]: ComponentVarNode };

export type ComponentVarDefinitions = {
  [key: string]: ComponentVarNode;
};

/**
 * Options for `ctx.var(id, options?)`. Set `value` to merge a default into `base` and as `@property` initial-value when `syntax` is set.
 */
export type ComponentVarOptions = {
  value?: string | number;
  syntax?: string;
  inherits?: boolean;
  /** @see {@link TokenDescriptor.initial} */
  initial?: string | number;
};

/**
 * Reference to a component-scoped custom property: `.name` for declaration keys and transitions, `.var` for values.
 */
export type ComponentInternalVarRef = RegisteredPropertyRef;

/** Runtime key stamped on `ctx.vars()` ref trees (also used for override typing). */
export const componentVarDefinitionsKey = '__typestylesVarDefinitions' as const;

/** Input accepted on recipe `vars` — plain definitions or a `ctx.vars()` ref tree. */
export type ComponentVarConfigInput =
  | ComponentVarDefinitions
  | ComponentVarRefTree<ComponentVarDefinitions>;

/** Extract definition tree from a `ctx.vars()` ref tree brand. */
export type InferComponentVarRefTreeDefinitions<T> = T extends {
  readonly [componentVarDefinitionsKey]: infer D extends ComponentVarDefinitions;
}
  ? D
  : never;

/**
 * Context the recipe runtime uses while resolving `styles`. Internal vars are declared
 * on the recipe object (`vars`), not by calling `ctx.vars()` from user code.
 */
/** Proxy tree returned by `ctx.vars({ … })` — leaves are `{ name, var }`, nested objects are sub-trees. */
export type ComponentVarRefTree<T> = (T extends ComponentVarDefinitions
  ? { readonly [componentVarDefinitionsKey]: T }
  : Record<never, never>) & {
  [K in keyof T]: T[K] extends ComponentVarDescriptor | string | number
    ? ComponentInternalVarRef
    : ComponentVarRefTree<T[K]>;
};

/** Infer override var definitions from a component config or callback return shape. */
export type InferComponentVarDefinitionsFromConfig<C> = C extends (
  ctx: ComponentConfigContext,
) => infer R
  ? InferComponentVarDefinitionsFromRecipe<R>
  : C extends { vars: infer Vars }
    ? InferComponentVarDefinitionsFromRecipe<{ vars: Vars }>
    : never;

type InferComponentVarDefinitionsFromRecipe<R> = R extends { vars: infer Vars }
  ? Vars extends { readonly [componentVarDefinitionsKey]: infer D }
    ? D extends ComponentVarDefinitions
      ? D
      : never
    : Vars extends ComponentVarDefinitions
      ? Vars
      : never
  : never;

/** Schema for `ctx.vars.declare` — same shape as token declare schemas. */
export type ComponentVarSchema = TokenSchema;

export type ComponentConfigContext = {
  var: {
    (id: string, options?: PropertyOptions): PropertyRef;
    declare(id: string, registration: PropertyRegistration): PropertyRef;
  };
  vars: {
    <const T extends ComponentVarDefinitions>(definitions: T): ComponentVarRefTree<T>;
    declare<const T extends ComponentVarSchema>(schema: T): ComponentVarRefTree<InferFromSchema<T>>;
  };
};

/**
 * The full config object passed to recipe() with dimensioned variants. How `variants`
 * compiles (discrete classes, `&[data-x="y"]` attributes, or BEM modifier classes) is selected by
 * `createStyles({ mode })`, not by anything in this config — see {@link ComponentAttrsReturn} and
 * `specs/semantic-and-attribute-mode.md` / `specs/classname-template-mode.md`.
 */
export type ComponentConfig<V extends VariantDefinitions> = {
  base?: CSSProperties;
  /** Component-internal custom properties — registered on the var host slot; exposed on the return as `.vars`. */
  vars?: ComponentVarConfigInput;
  variants?: V;
  compoundVariants?: Array<{
    variants: { [K in keyof V]?: CompoundSelectionValue<VariantOptionKey<V, K>> };
    style: VariantOptionStyle;
  }>;
  defaultVariants?: ComponentSelections<V>;
  /**
   * Forbidden — use {@link SlotComponentConfig} when a recipe declares `slots`.
   * Without this, callback configs `(ctx) => ({ slots, base, variants })` structurally
   * match dimensioned configs (excess-property checks do not apply to function return types).
   */
  slots?: never;
};

// ---------------------------------------------------------------------------
// Flat variant config (no `variants` key — each key besides `base` is a variant)
// ---------------------------------------------------------------------------

/**
 * Config for flat variants: `{ base: {...}, elevated: {...}, compact: {...} }`.
 * Each key besides `base` is a boolean-style variant.
 *
 * **`variants`**, **`defaultVariants`**, **`compoundVariants`**, and **`slots`** are forbidden
 * on this shape so TypeScript does not pick the flat overload for CVA-style or slot configs.
 * Nested variant maps can otherwise satisfy {@link CSSProperties} too loosely (index signatures),
 * which produced wrong callable types for `recipe(ns, (ctx) => ({ variants: … }), { layer })`
 * when cascade layers are enabled.
 */
export type FlatComponentConfig<K extends string> = {
  base?: CSSProperties;
  /** Component-internal custom properties — registered on the var host slot; exposed on the return as `.vars`. */
  vars?: ComponentVarConfigInput;
  variants?: never;
  defaultVariants?: never;
  compoundVariants?: never;
  slots?: never;
} & Record<K, CSSProperties>;

/**
 * Selection object for flat variants: `{ elevated: true, compact: true }`.
 */
export type FlatComponentSelections<K extends string> = {
  [P in K]?: boolean | null | undefined;
};

// ---------------------------------------------------------------------------
// CVA-style return: callable AND destructurable
// ---------------------------------------------------------------------------

/**
 * All possible variant class string keys that can be destructured from a
 * dimensioned component. Includes 'base' plus all `{dimension}-{option}` keys
 * flattened from the variants config.
 */
type DimensionedVariantKeys<V extends VariantDefinitions> = {
  [D in keyof V]: keyof V[D] extends string ? `${D & string}-${keyof V[D] & string}` : never;
}[keyof V];

/**
 * The CVA-style return for dimensioned variants.
 * Callable as a function, destructurable as an object.
 */
export type ComponentReturn<V extends VariantDefinitions> = {
  /** Call with variant selections to get composed class string (base always included). */
  (selections?: ComponentSelections<V>): string;
} & {
  /** The base class string. */
  readonly base: string;
} & {
  /** Individual variant class strings, keyed as `{dimension}-{option}`. */
  readonly [K in DimensionedVariantKeys<V>]: string;
} & {
  /** Ref tree for internal vars declared on this recipe (`vars` config or `c.vars()`). */
  readonly vars?: ComponentVarRefTree<ComponentVarDefinitions>;
};

/**
 * The return for dimensioned variants compiled with `mode: 'attribute'`.
 * Callable, returning a {@link ComponentAttrsResult}. No per-option destructurable keys — there
 * are no discrete option classes in attribute mode, only the single `base` class.
 */
export type ComponentAttrsReturn<V extends VariantDefinitions> = {
  /** Call with variant selections to get the resolved `{ className, attrs, props }` result. */
  (selections?: ComponentSelections<V>): ComponentAttrsResult;
} & {
  /** The base class string. */
  readonly base: string;
} & {
  readonly vars?: ComponentVarRefTree<ComponentVarDefinitions>;
};

/** Attribute-mode return for slot recipes, with attrs repeated on each declared slot. */
export type SlotAttrsReturn<
  Slots extends readonly string[],
  V extends SlotVariantDefinitions<Slots[number]>,
> = (selections?: ComponentSelections<V>) => Record<Slots[number], ComponentAttrsResult>;

/**
 * The CVA-style return for flat variants.
 * Callable as a function, destructurable as an object.
 */
export type FlatComponentReturn<K extends string> = {
  /** Call with variant selections to get composed class string (base always included). */
  (selections?: FlatComponentSelections<Exclude<K, 'base'>>): string;
} & {
  /** The base class string. */
  readonly base: string;
} & {
  /** Individual variant class strings. */
  readonly [P in Exclude<K, 'base'>]: string;
} & {
  readonly vars?: ComponentVarRefTree<ComponentVarDefinitions>;
};

// ---------------------------------------------------------------------------
// Multi-slot components (no variants, just multiple independent slot styles)
// ---------------------------------------------------------------------------

export type MultiSlotConfig<Slots extends readonly string[]> = {
  slots: Slots;
  /** Component-internal custom properties — registered on the var host slot; exposed on the return as `.vars`. */
  vars?: ComponentVarConfigInput;
  /**
   * Forbidden recipe keys — same idea as {@link FlatComponentConfig}. Without these, a
   * slot-with-variants config that fails {@link VariantOptionStyle} assignability (e.g. widened
   * CSS keywords) can fall through to this overload on non-fresh objects and type as multi-slot
   * while silently dropping `variants` (Issue #149).
   */
  base?: never;
  variants?: never;
  defaultVariants?: never;
  compoundVariants?: never;
} & Partial<Record<Slots[number], CSSProperties>>;

/**
 * Multi-slot recipe return. The `__tsMultiSlot` brand keeps `OverrideFn` from
 * matching these against the slot-with-variants overload (which would infer a
 * wide `V` and accept bogus `variants` keys).
 */
export type MultiSlotReturn<Slots extends readonly string[]> = {
  (): Record<Slots[number], string>;
  readonly __tsMultiSlot: true;
} & {
  readonly [K in Slots[number]]: string;
} & {
  readonly vars?: ComponentVarRefTree<ComponentVarDefinitions>;
};

// ---------------------------------------------------------------------------
// Slot component types
// ---------------------------------------------------------------------------

export type SlotComponentConfig<
  Slots extends readonly string[],
  V extends SlotVariantDefinitions<Slots[number]>,
> = {
  slots: Slots;
  /** Component-internal custom properties — registered on the var host slot; exposed on the return as `.vars`. */
  vars?: ComponentVarConfigInput;
  base?: SlotStyles<Slots[number]>;
  variants?: V;
  compoundVariants?: Array<{
    variants: { [K in keyof V]?: CompoundSelectionValue<VariantOptionKey<V, K>> };
    style: SlotStyles<Slots[number]>;
  }>;
  defaultVariants?: ComponentSelections<V>;
};

export type SlotComponentFunction<
  Slots extends readonly string[],
  V extends SlotVariantDefinitions<Slots[number]>,
> = ((selections?: ComponentSelections<V>) => Record<Slots[number], string>) & {
  readonly vars?: ComponentVarRefTree<ComponentVarDefinitions>;
};

/**
 * Config for `recipe` may be a plain object or a function that receives {@link ComponentConfigContext}.
 */
export type ComponentConfigInput<V extends VariantDefinitions> =
  | ComponentConfig<V>
  | ((ctx: ComponentConfigContext) => ComponentConfig<V>);

export type FlatComponentConfigInput<K extends string> =
  | FlatComponentConfig<K>
  | ((ctx: ComponentConfigContext) => FlatComponentConfig<K>);

export type SlotComponentConfigInput<
  Slots extends readonly string[],
  V extends SlotVariantDefinitions<Slots[number]>,
> =
  | SlotComponentConfig<Slots, V>
  | ((ctx: ComponentConfigContext) => SlotComponentConfig<Slots, V>);

export type MultiSlotConfigInput<Slots extends readonly string[]> =
  | MultiSlotConfig<Slots>
  | ((ctx: ComponentConfigContext) => MultiSlotConfig<Slots>);

/**
 * Extract the variant prop types from a ComponentReturn or ComponentFunction.
 *
 * @example
 * ```ts
 * const button = recipe({
 *   name: 'button',
 *   variants: {
 *     intent: variant.enum(['primary', 'ghost'], { default: 'primary' }),
 *     size: variant.enum(['sm', 'lg'], { default: 'sm' }),
 *   },
 *   styles: { variants: { intent: { primary: {}, ghost: {} }, size: { sm: {}, lg: {} } } },
 * });
 *
 * type ButtonProps = ComponentVariants<typeof button>;
 * // { intent?: 'primary' | 'ghost'; size?: 'sm' | 'lg' }
 * ```
 */
export type ComponentVariants<T> = T extends (selections?: ComponentSelections<infer V>) => unknown
  ? { [K in keyof V]?: keyof V[K] }
  : never;

// ---------------------------------------------------------------------------
// compose — merged variant inference
// ---------------------------------------------------------------------------

/** Input accepted by {@link compose}: component fn, class string, or falsy skip. */
export type ComposeSelectorInput =
  | string
  | false
  | null
  | undefined
  | ((selections?: Record<string, unknown>) => string);

type ComposeSelectorSelections<T> = T extends (selections?: infer S) => string
  ? S extends undefined
    ? Record<string, never>
    : NonNullable<S>
  : Record<string, never>;

/** Union of variant selection objects accepted by all composed component functions. */
export type MergeComposeSelections<Selectors extends readonly unknown[]> =
  Selectors extends readonly [infer Head, ...infer Tail]
    ? ComposeSelectorSelections<Head> & MergeComposeSelections<Tail>
    : Record<string, never>;

type AnyComposeFn<Selectors extends readonly ComposeSelectorInput[]> = Selectors[number] extends (
  ...args: unknown[]
) => string
  ? true
  : false;

/** Return type of {@link compose}: callable with merged variant selections when any input is a function. */
export type ComposeFn<Selectors extends readonly ComposeSelectorInput[]> =
  AnyComposeFn<Selectors> extends true
    ? (selections?: MergeComposeSelections<Selectors>) => string
    : () => string;

/**
 * `src` value for {@link FontFaceProps}: a single CSS `src` fragment or multiple
 * fragments joined with commas (same as authoring `url(...), local(...)` by hand).
 */
export type FontFaceSrc = string | readonly string[];

/**
 * Font face property declarations.
 *
 * Maps to standard `@font-face` descriptors. Values are emitted verbatim in CSS.
 */
export type FontFaceProps = {
  src: FontFaceSrc;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique' | string;
  fontDisplay?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  fontStretch?: string;
  unicodeRange?: string;
  /** `size-adjust` — fallback tuning and font-size-adjust related metrics. */
  sizeAdjust?: string;
  /** `ascent-override` */
  ascentOverride?: string;
  /** `descent-override` */
  descentOverride?: string;
  /** `line-gap-override` */
  lineGapOverride?: string;
};
