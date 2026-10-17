import type {
  CSSProperties,
  CSSPropertiesWithUtils,
  StyleUtils,
  VariantDefinitions,
  ComponentAttrsReturn,
  ComponentAttrsResult,
  SlotAttrsReturn,
  ComponentConfig,
  ComponentConfigContext,
  ComponentConfigInput,
  ComponentReturn,
  FlatComponentConfigInput,
  FlatComponentConfig,
  FlatComponentReturn,
  SlotVariantDefinitions,
  SlotComponentConfig,
  SlotComponentConfigInput,
  SlotComponentFunction,
  MultiSlotConfigInput,
  MultiSlotConfig,
  MultiSlotReturn,
  ComponentVarDefinitions,
  ComponentVarRefTree,
  componentVarDefinitionsKey,
  StylesPropertyFn,
} from './types';
import { serializeStyle } from './serialize-style';
import { insertRules, invalidateClassNamespaceForDev } from './sheet';
import type { CascadeLayersInput, CascadeLayersObjectInput } from './layers';
import { applyLayerToRules, assertOwnLayer, resolveCascadeLayers } from './layers';
import { registeredNamespaces, trackEmittedClassName, warnUnscopedCollision } from './registry';
import {
  defaultClassNamingConfig,
  emittedClassName,
  hashString,
  mergeClassNaming,
  sanitizeClassSegment,
  stableSerialize,
  type ClassNamingConfig,
} from './class-naming';
import { decomposeAtomicStyle, classNamesAndRulesForProperties } from './atomic-decompose';
import { createComponent, createSchemaComponent, isSchemaRecipeDefinition } from './component';
import type {
  ExactRecipeStyles,
  RecipeDefinition,
  RecipeHandle,
  RecipeStyles,
  RecipeVarsOf,
  SchemaRecipeOptions,
} from './schema-recipe';
import { createScope, type ScopeOptions } from './scope';
import { createOverride, type OverrideFn, type OverrideOptions } from './override';
import { getComponentMeta } from './component-meta';
import {
  attachComponentRegistryMethods,
  createComponentRegistry,
  type ComponentRegistry,
  type ComponentRegistryApi,
} from './component-registry';

export type { ComponentRegistryApi };
import { createStylesPropertyFn } from './registered-property';
import {
  container as containerQuery,
  createContainerRef,
  type ContainerNameRef,
} from './container';
import { supports as supportsQuery } from './supports';
import { atRuleBlock as atRuleBlockFn } from './at-rule-block';
import { whenStyle as whenStyleFn } from './when-style';
import {
  createBreakpointMediaFn,
  createMediaFn,
  type BreakpointMediaFn,
  type MediaFn,
} from './media';
import { has as hasNested, is as isNested, where as whereNested } from './relational-pseudo';
import { resolveBreakpoints, type BreakpointsConfig } from './breakpoints';
import { resolveColorModes, type ColorModeMap } from './color-modes';

/**
 * Create a single class with the given styles. Returns the class name string.
 * Use this when you don't need variants — just a class with typed CSS properties.
 *
 * @example
 * ```ts
 * const card = style('card', {
 *   padding: '1rem',
 *   borderRadius: '0.5rem',
 *   backgroundColor: 'white',
 *   '&:hover': { boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)' },
 * });
 *
 * <div className={card} />  // class="card"
 * ```
 */
function registryKeyForClass(classNaming: ClassNamingConfig, name: string): string {
  const scope = classNaming.scopeId || 'default';
  // Distinct from `scope:component:…` so `style('button')` and
  // `recipe('button')` do not trigger each other's HMR invalidation.
  return `${scope}:class:${name}`;
}

/**
 * Reserves the logical class name before rules are computed so nested calls cannot bypass
 * duplicate detection.
 *
 * In **development**, a second registration for the same scope + name clears the prior rule(s)
 * for that class (same as `typestyles/hmr` invalidation, and the same trade-off
 * `recipe` already makes — see `claimComponentNamespace` in `component.ts`). Some
 * bundlers/frameworks re-run a module before `import.meta.hot.dispose` fires — or, for
 * multi-environment SSR (the Vite Environment API, or RSC frameworks like Waku), re-run the same
 * module once per environment within a single process — so this keeps re-execution from throwing.
 * In **production**, duplicate registration does not throw (rule insertion dedupes by key).
 */
function claimClassNamespace(classNaming: ClassNamingConfig, name: string): void {
  const regKey = registryKeyForClass(classNaming, name);
  if (process.env.NODE_ENV !== 'production' && registeredNamespaces.has(regKey)) {
    if (!classNaming.scopeId) {
      warnUnscopedCollision(name, 'style');
    }
    invalidateClassNamespaceForDev(emittedClassName(classNaming, name) ?? undefined);
  }
  registeredNamespaces.add(regKey);
}

function resolveStyleEmitLayer(
  classNaming: ClassNamingConfig,
  layer: string | undefined,
  context: string,
): string | undefined {
  if (!classNaming.cascadeLayers) {
    return undefined;
  }
  const resolved = layer != null && layer !== '' ? layer : classNaming.styleLayer;
  if (resolved == null || resolved === '') {
    throw new Error(
      `[typestyles] \`layer\` is required for ${context} when using cascade layers without a factory \`layers.style\` / \`styleLayer\` default.`,
    );
  }
  assertOwnLayer(classNaming.cascadeLayers, resolved, context);
  return resolved;
}

export function createClass(
  classNaming: ClassNamingConfig,
  name: string,
  properties: CSSProperties,
  layer?: string,
): string {
  claimClassNamespace(classNaming, name);

  const { classNames, rules } = classNamesAndRulesForProperties(
    classNaming,
    properties,
    name,
    '',
    'class',
  );
  if (classNaming.cascadeLayers) {
    const resolved = resolveStyleEmitLayer(classNaming, layer, `style('${name}', …)`);
    insertRules(applyLayerToRules(rules, resolved!, classNaming.cascadeLayers));
  } else {
    insertRules(rules);
  }

  return classNames;
}

/**
 * Create a deterministic hashed class from a style object.
 * The same style object shape+values always returns the same class name.
 *
 * Optional `label` is appended as a readable prefix for debugging.
 *
 * @example
 * ```ts
 * const button = hash({
 *   padding: '8px 12px',
 *   borderRadius: '8px',
 * });
 *
 * const danger = hash(
 *   { backgroundColor: 'red', color: 'white' },
 *   { label: 'danger' },
 * );
 * ```
 */
export function createHashClass(
  classNaming: ClassNamingConfig,
  properties: CSSProperties,
  label?: string,
  layer?: string,
): string {
  const cfg = classNaming;
  if (cfg.mode === 'atomic') {
    const { classNames, rules } = decomposeAtomicStyle(cfg, properties);
    if (classNaming.cascadeLayers) {
      const resolved = resolveStyleEmitLayer(classNaming, layer, 'hash(…)');
      insertRules(applyLayerToRules(rules, resolved!, classNaming.cascadeLayers));
    } else {
      insertRules(rules);
    }
    return classNames;
  }

  const serialized =
    cfg.scopeId !== ''
      ? stableSerialize({ scope: cfg.scopeId, properties })
      : stableSerialize(properties);
  const hash = hashString(serialized);
  const className = label
    ? `${cfg.prefix}-${sanitizeClassSegment(label)}-${hash}`
    : `${cfg.prefix}-${hash}`;
  // Same payload → same class is intentional dedup; different payloads
  // colliding on one class string is a real hash collision.
  trackEmittedClassName(className, `hashClass:${serialized}`);
  const selector = `.${className}`;
  const rules = serializeStyle(selector, properties, {
    breakpoints: classNaming.breakpoints,
    colorModes: classNaming.colorModes,
  });
  if (classNaming.cascadeLayers) {
    const resolved = resolveStyleEmitLayer(classNaming, layer, 'hash(…)');
    insertRules(applyLayerToRules(rules, resolved!, classNaming.cascadeLayers));
  } else {
    insertRules(rules);
  }
  return className;
}

import type { ComposeFn, ComposeSelectorInput } from './types';
import {
  collectComposeAllowedKeys,
  devWarnComposeUnknownKeys,
  type ComposeAwareFn,
} from './compose-meta';

/**
 * Compose multiple component functions or class strings into one.
 * Returns a new function that calls all inputs and joins results.
 *
 * Variant selections are inferred as the intersection of all composed component
 * functions' accepted selection objects.
 *
 * @example
 * ```ts
 * const base = recipe('base', { base: { padding: '8px' } });
 * const primary = recipe('primary', { base: { color: 'blue' } });
 * const button = compose(base, primary);
 *
 * button(); // "base primary"
 * ```
 */
export function compose<const S extends readonly ComposeSelectorInput[]>(
  ...selectors: S
): ComposeFn<S> {
  const validSelectors = selectors.filter(Boolean) as Array<ComposeAwareFn | string>;
  const allowedKeys = collectComposeAllowedKeys(validSelectors);

  const fn = (selections?: Record<string, unknown>): string => {
    devWarnComposeUnknownKeys(selections, allowedKeys);

    const classNames: string[] = [];

    for (const selector of validSelectors) {
      if (typeof selector === 'string') {
        classNames.push(selector);
      } else {
        const result = selector(selections);
        if (result) classNames.push(result);
      }
    }

    return classNames.join(' ');
  };

  return fn as ComposeFn<S>;
}

// ---------------------------------------------------------------------------
// withUtils
// ---------------------------------------------------------------------------

type ComponentWithVarDefinitions<R, Vars extends ComponentVarDefinitions> = R & {
  readonly __varDefinitions: Vars;
};

export type StylesApi = ComponentRegistryApi & {
  /** Resolved naming config for this instance (useful for debugging). */
  readonly classNaming: Readonly<ClassNamingConfig>;
  /**
   * Typed `@container` object keys for nested styles (size features, named containers, or raw conditions).
   * Same function as the named export `container` from `typestyles`.
   */
  readonly container: typeof containerQuery;
  /**
   * Readable `container-name` for `containerName`: `{scopeId}-{label}` or `{prefix}-{label}` when `scopeId` is empty.
   * Same as `createContainerRef(label, { scopeId, prefix })` from this instance’s naming config.
   */
  readonly containerRef: (label: string) => ContainerNameRef;
  /**
   * Typed `@supports` object keys for nested styles (declaration features or raw conditions).
   * Same function as the named export `supports` from `typestyles`.
   */
  readonly supports: typeof supportsQuery;
  /**
   * Build a spreadable `{ [ @key ]: nested }` so computed `@…` keys stay typed (see `atRuleBlock` export).
   */
  readonly atRuleBlock: typeof atRuleBlockFn;
  /**
   * Expand a `ThemeCondition` into nested `&` / `@media` keys for recipe slots (see `whenStyle` export).
   * Prefer this inside `recipe`; use `conditional()` + `conditions[]` on `override`.
   */
  readonly when: typeof whenStyleFn;
  /**
   * Typed `@media` object keys from configured viewport breakpoints (see `breakpoint` / `media`).
   */
  readonly breakpoint: BreakpointMediaFn;
  /**
   * Spreadable viewport breakpoint blocks — `media(name, block)` or `media(name, feature, block)`.
   */
  readonly media: MediaFn;
  /**
   * Nested `&:has(…)` object keys (same helpers as the `has` export).
   */
  readonly has: typeof hasNested;
  /**
   * Nested `&:is(…)` object keys for grouped states (same as the `is` export).
   */
  readonly is: typeof isNested;
  /**
   * Nested `&:where(…)` keys — zero-specificity defaults (same as the `where` export).
   */
  readonly where: typeof whereNested;
  /**
   * Register a standalone CSS custom property (optionally with `@property` when `syntax` is set).
   * Returns `{ name, var, toString }` for use in style values and variant overrides.
   */
  property: StylesPropertyFn;
  class: (name: string, properties: CSSProperties) => string;
  hashClass: (properties: CSSProperties, label?: string) => string;
  component: {
    <const Def extends RecipeDefinition, const R extends RecipeStyles<Def>>(
      namespace: string,
      definition: Def,
      config: (ctx: ComponentConfigContext) => ExactRecipeStyles<Def, R>,
    ): RecipeHandle<Def, string, RecipeVarsOf<R>>;
    <
      const Slots extends readonly string[],
      V extends SlotVariantDefinitions<Slots[number]>,
      const Vars extends ComponentVarDefinitions,
    >(
      namespace: string,
      config: SlotComponentConfig<Slots, V> & { vars: Vars },
    ): ComponentWithVarDefinitions<SlotComponentFunction<Slots, V>, Vars>;
    <
      const Slots extends readonly string[],
      V extends SlotVariantDefinitions<Slots[number]>,
      const Vars extends ComponentVarDefinitions,
    >(
      namespace: string,
      config: SlotComponentConfigInput<Slots, V>,
      options: ComponentCreateOptions & { readonly varDefinitions: Vars },
    ): ComponentWithVarDefinitions<SlotComponentFunction<Slots, V>, Vars>;
    <
      const Slots extends readonly string[],
      V extends SlotVariantDefinitions<Slots[number]>,
      const Vars extends ComponentVarDefinitions,
    >(
      namespace: string,
      config: (ctx: ComponentConfigContext) => Omit<SlotComponentConfig<Slots, V>, 'vars'> & {
        vars: ComponentVarRefTree<Vars> & { readonly [componentVarDefinitionsKey]: Vars };
      },
    ): ComponentWithVarDefinitions<SlotComponentFunction<Slots, V>, Vars>;
    <const Slots extends readonly string[], V extends SlotVariantDefinitions<Slots[number]>>(
      namespace: string,
      config: SlotComponentConfigInput<Slots, V>,
    ): SlotComponentFunction<Slots, V>;
    <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: MultiSlotConfig<Slots> & { vars: Vars },
    ): ComponentWithVarDefinitions<MultiSlotReturn<Slots>, Vars>;
    <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: MultiSlotConfigInput<Slots>,
      options: ComponentCreateOptions & { readonly varDefinitions: Vars },
    ): ComponentWithVarDefinitions<MultiSlotReturn<Slots>, Vars>;
    <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: (ctx: ComponentConfigContext) => Omit<MultiSlotConfig<Slots>, 'vars'> & {
        vars: ComponentVarRefTree<Vars> & { readonly [componentVarDefinitionsKey]: Vars };
      },
    ): ComponentWithVarDefinitions<MultiSlotReturn<Slots>, Vars>;
    <const Slots extends readonly string[]>(
      namespace: string,
      config: MultiSlotConfigInput<Slots>,
    ): MultiSlotReturn<Slots>;
    <const V extends VariantDefinitions, const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: ComponentConfig<V> & { vars: Vars },
    ): ComponentWithVarDefinitions<ComponentReturn<V>, Vars>;
    <const V extends VariantDefinitions, const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: ComponentConfigInput<V>,
      options: ComponentCreateOptions & { readonly varDefinitions: Vars },
    ): ComponentWithVarDefinitions<ComponentReturn<V>, Vars>;
    <const V extends VariantDefinitions, const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: (ctx: ComponentConfigContext) => Omit<ComponentConfig<V>, 'vars'> & {
        vars: ComponentVarRefTree<Vars> & { readonly [componentVarDefinitionsKey]: Vars };
      },
    ): ComponentWithVarDefinitions<ComponentReturn<V>, Vars>;
    <const V extends VariantDefinitions>(
      namespace: string,
      config: ComponentConfigInput<V>,
    ): ComponentReturn<V>;
    <const K extends string, const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: FlatComponentConfig<K> & { vars: Vars },
    ): ComponentWithVarDefinitions<FlatComponentReturn<K>, Vars>;
    <const K extends string, const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: FlatComponentConfigInput<K>,
      options: ComponentCreateOptions & { readonly varDefinitions: Vars },
    ): ComponentWithVarDefinitions<FlatComponentReturn<K>, Vars>;
    <const K extends string, const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: (ctx: ComponentConfigContext) => Omit<FlatComponentConfig<K>, 'vars'> & {
        vars: ComponentVarRefTree<Vars> & { readonly [componentVarDefinitionsKey]: Vars };
      },
    ): ComponentWithVarDefinitions<FlatComponentReturn<K>, Vars>;
    <const K extends string>(
      namespace: string,
      config: FlatComponentConfigInput<K>,
    ): FlatComponentReturn<K>;
  };
  withUtils: <U extends StyleUtils>(utils: U) => StylesWithUtilsApi<U>;
  compose: typeof compose;
  /**
   * Proximity-correct theme overrides via CSS `@scope` for nested theme regions.
   * Prefer component-scoped CSS custom properties (Tier 1) when possible; see theming docs.
   */
  scope: (opts: ScopeOptions, className: string, overrides: CSSProperties) => void;
  /**
   * Recipe-shaped component restyling from `__tsMeta`. Call on the **same** `styles`
   * instance that created the component — cross-instance calls are unsupported and
   * may emit into the wrong sheet. Prefer `{ layer: 'overrides' }` when layers are
   * configured; if omitted and an `"overrides"` layer exists, that name is used.
   */
  override: OverrideFn;
};

/** Options argument for `recipe()` — `layer` required when `createStyles({ layers })` is used. */
export type ComponentCreateOptions<L extends string = string> = {
  readonly layer?: L;
  readonly varDefinitions?: ComponentVarDefinitions;
  /**
   * When `false`, the component is omitted from {@link ComponentRegistryApi.getThemeableComponents}
   * and cannot be targeted by theme `components` overrides (see theming docs).
   * @default true
   */
  readonly themeable?: boolean;
};

/** @deprecated Use {@link ComponentCreateOptions} — kept as alias for `layer`-only call sites. */
export type LayerOption<L extends string = string> = { readonly layer: L };

export type CreateStylesInput = Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & {
  layers?: CascadeLayersInput;
  /**
   * Breakpoint names mapped to media query conditions (without `@media` wrapper).
   * Enables responsive object values like `{ base: '8px', md: '16px' }` on CSS properties.
   */
  breakpoints?: BreakpointsConfig;
  /**
   * Color mode keys for `{ light, dark }` shorthand on CSS property values.
   * Compiles color/image properties to `light-dark()` via used `color-scheme`.
   */
  colorModes?: ColorModeMap;
  /**
   * Only applies when using `createTokens` / `createTypeStyles` for `:root` and theme CSS.
   * Ignored by `createStyles` alone (passing it here avoids repeating the key at the factory).
   */
  tokenLayer?: string;
  /**
   * Default `@layer` for `class` / `hashClass` / `component` when the call omits `{ layer }`.
   * Prefer setting this via `createTypeStyles({ layers: { style } })`.
   */
  styleLayer?: string;
  /**
   * When set, prefer the overloads that return `StylesWithUtilsApi` — this field exists so combined
   * option objects type-check; do not rely on `createStyles(options?: CreateStylesInput)` alone for utils.
   */
  utils?: StyleUtils;
};

export type LayeredComponentFn<L extends string> = {
  <const Def extends RecipeDefinition, const R extends RecipeStyles<Def>>(
    namespace: string,
    definition: Def,
    config: (ctx: ComponentConfigContext) => ExactRecipeStyles<Def, R>,
    options: SchemaRecipeOptions<L>,
  ): RecipeHandle<Def, string, RecipeVarsOf<R>>;
  <
    const Slots extends readonly string[],
    V extends SlotVariantDefinitions<Slots[number]>,
    const Vars extends ComponentVarDefinitions,
  >(
    namespace: string,
    config: SlotComponentConfig<Slots, V> & { vars: Vars },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<SlotComponentFunction<Slots, V>, Vars>;
  <const Slots extends readonly string[], V extends SlotVariantDefinitions<Slots[number]>>(
    namespace: string,
    config: SlotComponentConfigInput<Slots, V>,
    options: LayerOption<L>,
  ): SlotComponentFunction<Slots, V>;
  <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: MultiSlotConfig<Slots> & { vars: Vars },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<MultiSlotReturn<Slots>, Vars>;
  <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: (ctx: ComponentConfigContext) => Omit<MultiSlotConfig<Slots>, 'vars'> & {
      vars: ComponentVarRefTree<Vars> & { readonly [componentVarDefinitionsKey]: Vars };
    },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<MultiSlotReturn<Slots>, Vars>;
  <const Slots extends readonly string[]>(
    namespace: string,
    config: MultiSlotConfigInput<Slots>,
    options: LayerOption<L>,
  ): MultiSlotReturn<Slots>;
  <const V extends VariantDefinitions, const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: ComponentConfig<V> & { vars: Vars },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<ComponentReturn<V>, Vars>;
  <const V extends VariantDefinitions>(
    namespace: string,
    config: ComponentConfigInput<V>,
    options: LayerOption<L>,
  ): ComponentReturn<V>;
  <const K extends string, const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: FlatComponentConfig<K> & { vars: Vars },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<FlatComponentReturn<K>, Vars>;
  <const K extends string>(
    namespace: string,
    config: FlatComponentConfigInput<K>,
    options: LayerOption<L>,
  ): FlatComponentReturn<K>;
};

export type LayeredComponentFnWithUtils<L extends string> = {
  <const Def extends RecipeDefinition, const R extends RecipeStyles<Def>>(
    namespace: string,
    definition: Def,
    config: (ctx: ComponentConfigContext) => ExactRecipeStyles<Def, R>,
    options: SchemaRecipeOptions<L>,
  ): RecipeHandle<Def, string, RecipeVarsOf<R>>;
  <
    const Slots extends readonly string[],
    V extends SlotVariantDefinitions<Slots[number]>,
    const Vars extends ComponentVarDefinitions,
  >(
    namespace: string,
    config: SlotComponentConfig<Slots, V> & { vars: Vars },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<SlotComponentFunction<Slots, V>, Vars>;
  <const Slots extends readonly string[], V extends SlotVariantDefinitions<Slots[number]>>(
    namespace: string,
    config: SlotComponentConfigInput<Slots, V>,
    options: LayerOption<L>,
  ): SlotComponentFunction<Slots, V>;
  <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: MultiSlotConfig<Slots> & { vars: Vars },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<MultiSlotReturn<Slots>, Vars>;
  <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: (ctx: ComponentConfigContext) => Omit<MultiSlotConfig<Slots>, 'vars'> & {
      vars: ComponentVarRefTree<Vars> & { readonly [componentVarDefinitionsKey]: Vars };
    },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<MultiSlotReturn<Slots>, Vars>;
  <const Slots extends readonly string[]>(
    namespace: string,
    config: MultiSlotConfigInput<Slots>,
    options: LayerOption<L>,
  ): MultiSlotReturn<Slots>;
  <const V extends VariantDefinitions, const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: ComponentConfig<V> & { vars: Vars },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<ComponentReturn<V>, Vars>;
  <const V extends VariantDefinitions>(
    namespace: string,
    config: ComponentConfigInput<V>,
    options: LayerOption<L>,
  ): ComponentReturn<V>;
  <const K extends string, const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: FlatComponentConfig<K> & { vars: Vars },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<FlatComponentReturn<K>, Vars>;
  <const K extends string>(
    namespace: string,
    config: FlatComponentConfigInput<K>,
    options: LayerOption<L>,
  ): FlatComponentReturn<K>;
};

export type StylesWithUtilsApiLayered<U extends StyleUtils, L extends string> = Omit<
  StylesWithUtilsApi<U>,
  'class' | 'hashClass' | 'component' | 'scope' | 'override'
> & {
  scope: (
    opts: ScopeOptions & { layer?: L },
    className: string,
    overrides: CSSPropertiesWithUtils<U>,
  ) => void;
  override: OverrideFn<L>;
  class: (name: string, properties: CSSPropertiesWithUtils<U>, options?: LayerOption<L>) => string;
  hashClass: (
    properties: CSSPropertiesWithUtils<U>,
    options?: LayerOption<L> & { label?: string },
  ) => string;
  component: LayeredComponentFnWithUtils<L>;
  compose: typeof compose;
};

export type StylesApiWithLayers<L extends string> = Omit<
  StylesApi,
  'class' | 'hashClass' | 'component' | 'withUtils' | 'scope' | 'override'
> & {
  scope: (opts: ScopeOptions & { layer?: L }, className: string, overrides: CSSProperties) => void;
  override: OverrideFn<L>;
  class: (name: string, properties: CSSProperties, options: LayerOption<L>) => string;
  hashClass: (properties: CSSProperties, options: LayerOption<L> & { label?: string }) => string;
  component: LayeredComponentFn<L>;
  withUtils: <U extends StyleUtils>(utils: U) => StylesWithUtilsApiLayered<U, L>;
};

export function createStyles<const L extends readonly string[], U extends StyleUtils>(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & {
    mode: 'attribute';
    layers: L;
    tokenLayer?: L[number];
    utils: U;
  },
): AttributeStylesWithUtilsApiLayered<U, L[number]>;

export function createStyles<U extends StyleUtils>(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & {
    mode: 'attribute';
    layers: CascadeLayersObjectInput;
    tokenLayer?: string;
    utils: U;
  },
): AttributeStylesWithUtilsApiLayered<U, string>;

export function createStyles<U extends StyleUtils>(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & { mode: 'attribute'; utils: U },
): AttributeStylesWithUtilsApi<U>;

export function createStyles<const L extends readonly string[]>(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & {
    mode: 'attribute';
    layers: L;
    tokenLayer?: L[number];
  },
): AttributeStylesApiWithLayers<L[number]>;

export function createStyles(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & {
    mode: 'attribute';
    layers: CascadeLayersObjectInput;
    tokenLayer?: string;
  },
): AttributeStylesApiWithLayers<string>;

export function createStyles(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & { mode: 'attribute' },
): AttributeStylesApi;

/**
 * Create a styles API with its own class naming config (scope, mode, prefix).
 * Use one instance per package or micro-frontend so hashed names stay isolated without global mutation.
 * Pass **`scopeId`** (or `fileScopeId(import.meta)` per module) so duplicate logical namespaces across
 * files do not collide; in development, registering the same name twice under one scope throws.
 *
 * Pass **`layers`** to enable CSS cascade layers: a tuple (or `{ order, prependFrameworkLayers? }`)
 * defines a single `@layer a, b, c;` preamble, and every `class` / `hashClass` / `component` call
 * must pass `{ layer: … }` with a name from that stack.
 *
 * Pass **`utils`** to register shorthand expanders on this instance (same behavior as
 * `styles.withUtils(utils)` on the default export, without a second parallel API object).
 */
export function createStyles<const L extends readonly string[], U extends StyleUtils>(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & {
    layers: L;
    tokenLayer?: L[number];
    utils: U;
  },
): StylesWithUtilsApiLayered<U, L[number]>;

export function createStyles<U extends StyleUtils>(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & {
    layers: CascadeLayersObjectInput;
    tokenLayer?: string;
    utils: U;
  },
): StylesWithUtilsApiLayered<U, string>;

export function createStyles<U extends StyleUtils>(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & { utils: U },
): StylesWithUtilsApi<U>;

export function createStyles<const L extends readonly string[]>(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & {
    layers: L;
    tokenLayer?: L[number];
  },
): StylesApiWithLayers<L[number]>;

export function createStyles(
  options: Partial<Omit<ClassNamingConfig, 'cascadeLayers'>> & {
    layers: CascadeLayersObjectInput;
    tokenLayer?: string;
  },
): StylesApiWithLayers<string>;

export function createStyles(options?: CreateStylesInput): StylesApi;

export function createStyles(
  options?: CreateStylesInput,
):
  | StylesApi
  | StylesApiWithLayers<string>
  | StylesWithUtilsApi<StyleUtils>
  | StylesWithUtilsApiLayered<StyleUtils, string>
  | AttributeStylesApi
  | AttributeStylesApiWithLayers<string>
  | AttributeStylesWithUtilsApi<StyleUtils>
  | AttributeStylesWithUtilsApiLayered<StyleUtils, string> {
  const partial = (options ?? {}) as CreateStylesInput;
  const {
    layers,
    tokenLayer: tokenLayerHint,
    styleLayer,
    utils,
    breakpoints: breakpointsConfig,
    colorModes: colorModesConfig,
    ...namingPartial
  } = partial;

  if (process.env.NODE_ENV !== 'production' && tokenLayerHint !== undefined && !layers) {
    console.warn(
      '[typestyles] `tokenLayer` on `createStyles` is ignored without `layers`. Use `createTokens` or `createTypeStyles` to emit token CSS into a layer.',
    );
  }

  if (process.env.NODE_ENV !== 'production' && styleLayer !== undefined && !layers) {
    console.warn('[typestyles] `styleLayer` on `createStyles` is ignored without `layers`.');
  }

  const cascadeLayers = layers ? resolveCascadeLayers(layers, namingPartial.scopeId) : undefined;
  if (cascadeLayers && styleLayer != null && styleLayer !== '') {
    assertOwnLayer(cascadeLayers, styleLayer, 'createStyles({ styleLayer })');
  }
  const breakpoints = resolveBreakpoints(breakpointsConfig);
  const colorModes = resolveColorModes(colorModesConfig);
  const classNaming = mergeClassNaming({
    ...namingPartial,
    cascadeLayers,
    styleLayer: cascadeLayers ? styleLayer : undefined,
    breakpoints,
    colorModes,
  });

  if (classNaming.mode === 'template' && !classNaming.classNameTemplate) {
    throw new Error(
      "[typestyles] `classNameTemplate` is required when `mode: 'template'` — " +
        "e.g. createStyles({ mode: 'template', classNameTemplate: (ctx) => `${ctx.namespace}...` }). " +
        'See specs/classname-template-mode.md.',
    );
  }

  const registry = createComponentRegistry();

  if (utils !== undefined) {
    if (classNaming.cascadeLayers) {
      return attachComponentRegistryMethods(
        createStylesWithUtilsLayered(utils, classNaming, registry),
        registry,
      ) as unknown as StylesWithUtilsApiLayered<StyleUtils, string>;
    }
    return attachComponentRegistryMethods(
      createStylesWithUtils(utils, classNaming, registry),
      registry,
    ) as unknown as StylesWithUtilsApi<StyleUtils>;
  }

  return buildStylesRuntimeApi(classNaming, registry);
}

function registerComponentFromOptions(
  registry: ComponentRegistry,
  namespace: string,
  handle: unknown,
  options?: ComponentCreateOptions<string>,
): void {
  registry.register(namespace, handle as object, options?.themeable !== false);
}

function createMediaHelpers(classNaming: ClassNamingConfig) {
  const breakpoint = createBreakpointMediaFn(classNaming.breakpoints);
  const media = createMediaFn(classNaming.breakpoints);
  return { breakpoint, media };
}

function buildStylesRuntimeApi(
  classNaming: ClassNamingConfig,
  registry: ComponentRegistry,
): StylesApi | StylesApiWithLayers<string> {
  const layered = Boolean(classNaming.cascadeLayers);

  const componentImpl = (
    namespace: string,
    configOrDefinition: unknown,
    callbackOrOptions?: unknown,
    maybeOptions?: ComponentCreateOptions<string>,
  ) => {
    if (isSchemaRecipeDefinition(configOrDefinition)) {
      const handle = createSchemaComponent(
        classNaming,
        namespace,
        configOrDefinition,
        callbackOrOptions as (ctx: ComponentConfigContext) => RecipeStyles<RecipeDefinition>,
        maybeOptions,
      );
      registerComponentFromOptions(registry, namespace, handle, maybeOptions);
      return handle;
    }
    const config = configOrDefinition as
      | Record<string, unknown>
      | ((ctx: ComponentConfigContext) => Record<string, unknown>);
    const options = callbackOrOptions as ComponentCreateOptions<string> | undefined;
    const handle = createComponent(classNaming, namespace, config, options);
    registerComponentFromOptions(registry, namespace, handle, options);
    return handle;
  };

  const containerRef = (label: string): ContainerNameRef =>
    createContainerRef(label, {
      scopeId: classNaming.scopeId,
      prefix: classNaming.prefix,
    });
  const { breakpoint, media } = createMediaHelpers(classNaming);

  const property = createStylesPropertyFn(classNaming);
  const scope = (opts: ScopeOptions, className: string, overrides: CSSProperties) =>
    createScope(classNaming, opts, className, overrides);
  const override = ((component: object, config: unknown, options?: OverrideOptions<string>) =>
    createOverride(
      classNaming,
      component,
      config as Record<string, unknown>,
      options,
    )) as OverrideFn;

  if (layered) {
    return attachComponentRegistryMethods(
      {
        classNaming,
        container: containerQuery,
        containerRef,
        supports: supportsQuery,
        atRuleBlock: atRuleBlockFn,
        when: whenStyleFn,
        breakpoint,
        media,
        has: hasNested,
        is: isNested,
        where: whereNested,
        property,
        class: (name: string, properties: CSSProperties, options?: { layer?: string }) => {
          return createClass(classNaming, name, properties, options?.layer);
        },
        hashClass: (properties: CSSProperties, options?: { layer?: string; label?: string }) => {
          return createHashClass(classNaming, properties, options?.label, options?.layer);
        },
        component: componentImpl as unknown as LayeredComponentFn<string>,
        withUtils: <U extends StyleUtils>(utils: U) =>
          attachComponentRegistryMethods(
            createStylesWithUtilsLayered(utils, classNaming, registry),
            registry,
          ) as unknown as StylesWithUtilsApiLayered<U, string>,
        compose,
        scope,
        override,
        // `as` (not `satisfies`): checking `typeof container` overloads with conditional literal returns hits TS2589.
      },
      registry,
    ) as unknown as StylesApiWithLayers<string>;
  }

  return attachComponentRegistryMethods(
    {
      classNaming,
      container: containerQuery,
      containerRef,
      supports: supportsQuery,
      atRuleBlock: atRuleBlockFn,
      when: whenStyleFn,
      breakpoint,
      media,
      has: hasNested,
      is: isNested,
      where: whereNested,
      property,
      class: (name: string, properties: CSSProperties) =>
        createClass(classNaming, name, properties),
      hashClass: (properties: CSSProperties, label?: string) =>
        createHashClass(classNaming, properties, label),
      component: componentImpl as StylesApi['component'],
      withUtils: <U extends StyleUtils>(utils: U) =>
        attachComponentRegistryMethods(
          createStylesWithUtils(utils, classNaming, registry),
          registry,
        ) as unknown as StylesWithUtilsApi<U>,
      compose,
      scope,
      override,
      // `as` (not `satisfies`): checking `typeof container` overloads with conditional literal returns hits TS2589.
    },
    registry,
  ) as unknown as StylesApi;
}

export type StylesWithUtilsApi<U extends StyleUtils> = ComponentRegistryApi & {
  readonly classNaming: Readonly<ClassNamingConfig>;
  readonly container: typeof containerQuery;
  readonly containerRef: (label: string) => ContainerNameRef;
  readonly supports: typeof supportsQuery;
  readonly atRuleBlock: typeof atRuleBlockFn;
  readonly when: typeof whenStyleFn;
  readonly breakpoint: BreakpointMediaFn;
  readonly media: MediaFn;
  readonly has: typeof hasNested;
  readonly is: typeof isNested;
  readonly where: typeof whereNested;
  class: (name: string, properties: CSSPropertiesWithUtils<U>) => string;
  hashClass: (properties: CSSPropertiesWithUtils<U>, label?: string) => string;
  component: {
    <const Def extends RecipeDefinition, const R extends RecipeStyles<Def>>(
      namespace: string,
      definition: Def,
      config: (ctx: ComponentConfigContext) => ExactRecipeStyles<Def, R>,
    ): RecipeHandle<Def, string, RecipeVarsOf<R>>;
    <
      const Slots extends readonly string[],
      V extends SlotVariantDefinitions<Slots[number]>,
      const Vars extends ComponentVarDefinitions,
    >(
      namespace: string,
      config: SlotComponentConfig<Slots, V> & { vars: Vars },
    ): ComponentWithVarDefinitions<SlotComponentFunction<Slots, V>, Vars>;
    <const Slots extends readonly string[], V extends SlotVariantDefinitions<Slots[number]>>(
      namespace: string,
      config: SlotComponentConfigInput<Slots, V>,
    ): SlotComponentFunction<Slots, V>;
    <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: MultiSlotConfig<Slots> & { vars: Vars },
    ): ComponentWithVarDefinitions<MultiSlotReturn<Slots>, Vars>;
    <const Slots extends readonly string[]>(
      namespace: string,
      config: MultiSlotConfigInput<Slots>,
    ): MultiSlotReturn<Slots>;
    <const V extends VariantDefinitions, const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: ComponentConfig<V> & { vars: Vars },
    ): ComponentWithVarDefinitions<ComponentReturn<V>, Vars>;
    <const V extends VariantDefinitions>(
      namespace: string,
      config: ComponentConfigInput<V>,
    ): ComponentReturn<V>;
    <const K extends string, const Vars extends ComponentVarDefinitions>(
      namespace: string,
      config: FlatComponentConfig<K> & { vars: Vars },
    ): ComponentWithVarDefinitions<FlatComponentReturn<K>, Vars>;
    <const K extends string>(
      namespace: string,
      config: FlatComponentConfigInput<K>,
    ): FlatComponentReturn<K>;
  };
  compose: typeof compose;
  scope: (opts: ScopeOptions, className: string, overrides: CSSPropertiesWithUtils<U>) => void;
  override: OverrideFn;
};

// ---------------------------------------------------------------------------
// mode: 'attribute' — dimensioned components return { className, attrs, props }; slot recipes
// return that result for every declared slot. See specs/semantic-and-attribute-mode.md.
// ---------------------------------------------------------------------------

export type AttributeComponentFn = {
  <const Def extends RecipeDefinition, const R extends RecipeStyles<Def>>(
    namespace: string,
    definition: Def,
    config: (ctx: ComponentConfigContext) => ExactRecipeStyles<Def, R>,
  ): RecipeHandle<Def, ComponentAttrsResult, RecipeVarsOf<R>>;
  <const Slots extends readonly string[], V extends SlotVariantDefinitions<Slots[number]>>(
    namespace: string,
    config: SlotComponentConfigInput<Slots, V>,
  ): SlotAttrsReturn<Slots, V>;
  <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: (ctx: ComponentConfigContext) => Omit<MultiSlotConfig<Slots>, 'vars'> & {
      vars: ComponentVarRefTree<Vars> & { readonly [componentVarDefinitionsKey]: Vars };
    },
  ): ComponentWithVarDefinitions<MultiSlotReturn<Slots>, Vars>;
  <const Slots extends readonly string[]>(
    namespace: string,
    config: MultiSlotConfigInput<Slots>,
  ): MultiSlotReturn<Slots>;
  <const V extends VariantDefinitions>(
    namespace: string,
    config: ComponentConfigInput<V>,
  ): ComponentAttrsReturn<V>;
  <const K extends string>(
    namespace: string,
    config: FlatComponentConfigInput<K>,
  ): FlatComponentReturn<K>;
};

export type LayeredAttributeComponentFn<L extends string> = {
  <const Def extends RecipeDefinition, const R extends RecipeStyles<Def>>(
    namespace: string,
    definition: Def,
    config: (ctx: ComponentConfigContext) => ExactRecipeStyles<Def, R>,
    options: SchemaRecipeOptions<L>,
  ): RecipeHandle<Def, ComponentAttrsResult, RecipeVarsOf<R>>;
  <const Slots extends readonly string[], V extends SlotVariantDefinitions<Slots[number]>>(
    namespace: string,
    config: SlotComponentConfigInput<Slots, V>,
    options: LayerOption<L>,
  ): SlotAttrsReturn<Slots, V>;
  <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: (ctx: ComponentConfigContext) => Omit<MultiSlotConfig<Slots>, 'vars'> & {
      vars: ComponentVarRefTree<Vars> & { readonly [componentVarDefinitionsKey]: Vars };
    },
    options: LayerOption<L>,
  ): ComponentWithVarDefinitions<MultiSlotReturn<Slots>, Vars>;
  <const Slots extends readonly string[]>(
    namespace: string,
    config: MultiSlotConfigInput<Slots>,
    options: LayerOption<L>,
  ): MultiSlotReturn<Slots>;
  <const V extends VariantDefinitions>(
    namespace: string,
    config: ComponentConfigInput<V>,
    options: LayerOption<L>,
  ): ComponentAttrsReturn<V>;
  <const K extends string>(
    namespace: string,
    config: FlatComponentConfigInput<K>,
    options: LayerOption<L>,
  ): FlatComponentReturn<K>;
};

export type AttributeStylesApi = Omit<StylesApi, 'component' | 'withUtils'> & {
  component: AttributeComponentFn;
  withUtils: <U extends StyleUtils>(utils: U) => AttributeStylesWithUtilsApi<U>;
};

export type AttributeStylesApiWithLayers<L extends string> = Omit<
  StylesApiWithLayers<L>,
  'component' | 'withUtils'
> & {
  component: LayeredAttributeComponentFn<L>;
  withUtils: <U extends StyleUtils>(utils: U) => AttributeStylesWithUtilsApiLayered<U, L>;
};

export type AttributeStylesWithUtilsApi<U extends StyleUtils> = Omit<
  StylesWithUtilsApi<U>,
  'component'
> & {
  component: AttributeComponentFn;
};

export type AttributeStylesWithUtilsApiLayered<U extends StyleUtils, L extends string> = Omit<
  StylesWithUtilsApiLayered<U, L>,
  'component'
> & {
  component: LayeredAttributeComponentFn<L>;
};

/**
 * Create a utility-aware styles API, similar to Stitches' `utils`.
 *
 * @example
 * ```ts
 * const u = styles.withUtils({
 *   marginX: (value: string | number) => ({ marginLeft: value, marginRight: value }),
 *   size: (value: string | number) => ({ width: value, height: value }),
 * });
 *
 * const card = u.component('card', {
 *   base: { size: 40, marginX: 16 },
 * });
 * ```
 */
export function createStylesWithUtils<U extends StyleUtils>(
  utils: U,
  classNaming: ClassNamingConfig = defaultClassNamingConfig,
  registry: ComponentRegistry = createComponentRegistry(),
): StylesWithUtilsApi<U> {
  const containerRef = (label: string): ContainerNameRef =>
    createContainerRef(label, {
      scopeId: classNaming.scopeId,
      prefix: classNaming.prefix,
    });
  const { breakpoint, media } = createMediaHelpers(classNaming);

  const apply = (properties: CSSPropertiesWithUtils<U>): CSSProperties =>
    expandStyleWithUtils(properties, utils);

  const transformComponentConfigWithUtils = makeTransformComponentConfigWithUtils(apply);

  function component(
    namespace: string,
    configOrDefinition: unknown,
    callbackOrOptions?: unknown,
    maybeOptions?: ComponentCreateOptions<string>,
  ): unknown {
    let handle: unknown;
    if (isSchemaRecipeDefinition(configOrDefinition)) {
      const definition = configOrDefinition;
      const userConfig = callbackOrOptions as (
        ctx: ComponentConfigContext,
      ) => Record<string, unknown>;
      handle = createSchemaComponent(
        classNaming,
        namespace,
        definition,
        (ctx) =>
          transformComponentConfigWithUtils({
            ...userConfig(ctx),
            ...(definition.slots ? { slots: definition.slots } : {}),
          }) as unknown as RecipeStyles<RecipeDefinition>,
        maybeOptions,
      );
      registerComponentFromOptions(registry, namespace, handle, maybeOptions);
      return handle;
    }
    const config = configOrDefinition as
      | Record<string, unknown>
      | ((ctx: ComponentConfigContext) => Record<string, unknown>);
    const options = callbackOrOptions as ComponentCreateOptions<string> | undefined;
    if (typeof config === 'function') {
      handle = createComponent(
        classNaming,
        namespace,
        (ctx) => transformComponentConfigWithUtils(config(ctx) as Record<string, unknown>),
        options,
      );
    } else {
      handle = createComponent(
        classNaming,
        namespace,
        transformComponentConfigWithUtils(config) as ComponentConfig<VariantDefinitions>,
        options,
      );
    }
    registerComponentFromOptions(registry, namespace, handle, options);
    return handle;
  }

  return attachComponentRegistryMethods(
    {
      classNaming,
      container: containerQuery,
      containerRef,
      supports: supportsQuery,
      atRuleBlock: atRuleBlockFn,
      when: whenStyleFn,
      breakpoint,
      media,
      has: hasNested,
      is: isNested,
      where: whereNested,
      class: (name: string, properties: CSSPropertiesWithUtils<U>) =>
        createClass(classNaming, name, apply(properties)),
      hashClass: (properties: CSSPropertiesWithUtils<U>, label?: string) =>
        createHashClass(classNaming, apply(properties), label),
      component: component as StylesWithUtilsApi<U>['component'],
      compose,
      scope: (opts: ScopeOptions, className: string, overrides: CSSPropertiesWithUtils<U>) =>
        createScope(classNaming, opts, className, apply(overrides)),
      override: ((component: object, config: unknown, options?: OverrideOptions<string>) => {
        const meta = getComponentMeta(component);
        const hasSlots = meta?.kind === 'slot' || meta?.kind === 'multi-slot';
        return createOverride(
          classNaming,
          component,
          transformOverrideConfigWithUtils(config as Record<string, unknown>, apply, hasSlots),
          options,
        );
      }) as OverrideFn,
    },
    registry,
  ) as unknown as StylesWithUtilsApi<U>;
}

function createStylesWithUtilsLayered<U extends StyleUtils>(
  utils: U,
  classNaming: ClassNamingConfig,
  registry: ComponentRegistry = createComponentRegistry(),
): StylesWithUtilsApiLayered<U, string> {
  const containerRef = (label: string): ContainerNameRef =>
    createContainerRef(label, {
      scopeId: classNaming.scopeId,
      prefix: classNaming.prefix,
    });
  const { breakpoint, media } = createMediaHelpers(classNaming);

  const apply = (properties: CSSPropertiesWithUtils<U>): CSSProperties =>
    expandStyleWithUtils(properties, utils);

  const transformComponentConfigWithUtils = makeTransformComponentConfigWithUtils(apply);

  function component(
    namespace: string,
    configOrDefinition: unknown,
    callbackOrOptions?: unknown,
    maybeOptions?: ComponentCreateOptions<string>,
  ): unknown {
    let handle: unknown;
    if (isSchemaRecipeDefinition(configOrDefinition)) {
      const definition = configOrDefinition;
      const userConfig = callbackOrOptions as (
        ctx: ComponentConfigContext,
      ) => Record<string, unknown>;
      handle = createSchemaComponent(
        classNaming,
        namespace,
        definition,
        (ctx) =>
          transformComponentConfigWithUtils({
            ...userConfig(ctx),
            ...(definition.slots ? { slots: definition.slots } : {}),
          }) as unknown as RecipeStyles<RecipeDefinition>,
        maybeOptions,
      );
      registerComponentFromOptions(registry, namespace, handle, maybeOptions);
      return handle;
    }
    const config = configOrDefinition as
      | Record<string, unknown>
      | ((ctx: ComponentConfigContext) => Record<string, unknown>);
    const options = callbackOrOptions as ComponentCreateOptions<string> | undefined;
    if (typeof config === 'function') {
      handle = createComponent(
        classNaming,
        namespace,
        (ctx) => transformComponentConfigWithUtils(config(ctx) as Record<string, unknown>),
        options,
      );
    } else {
      handle = createComponent(
        classNaming,
        namespace,
        transformComponentConfigWithUtils(config) as ComponentConfig<VariantDefinitions>,
        options,
      );
    }
    registerComponentFromOptions(registry, namespace, handle, options);
    return handle;
  }

  return attachComponentRegistryMethods(
    {
      classNaming,
      container: containerQuery,
      containerRef,
      supports: supportsQuery,
      atRuleBlock: atRuleBlockFn,
      when: whenStyleFn,
      breakpoint,
      media,
      has: hasNested,
      is: isNested,
      where: whereNested,
      class: (name: string, properties: CSSPropertiesWithUtils<U>, options?: LayerOption<string>) =>
        createClass(classNaming, name, apply(properties), options?.layer),
      hashClass: (
        properties: CSSPropertiesWithUtils<U>,
        options?: LayerOption<string> & { label?: string },
      ) => createHashClass(classNaming, apply(properties), options?.label, options?.layer),
      component: component as unknown as LayeredComponentFnWithUtils<string>,
      compose,
      scope: (
        opts: ScopeOptions & { layer?: string },
        className: string,
        overrides: CSSPropertiesWithUtils<U>,
      ) => createScope(classNaming, opts, className, apply(overrides)),
      override: ((componentObj: object, config: unknown, options?: OverrideOptions<string>) => {
        const meta = getComponentMeta(componentObj);
        const hasSlots = meta?.kind === 'slot' || meta?.kind === 'multi-slot';
        return createOverride(
          classNaming,
          componentObj,
          transformOverrideConfigWithUtils(config as Record<string, unknown>, apply, hasSlots),
          options,
        );
      }) as OverrideFn,
    },
    registry,
  ) as unknown as StylesWithUtilsApiLayered<U, string>;
}

function makeTransformComponentConfigWithUtils<U extends StyleUtils>(
  apply: (properties: CSSPropertiesWithUtils<U>) => CSSProperties,
): (raw: Record<string, unknown>) => Record<string, unknown> {
  return function transformComponentConfigWithUtils(
    raw: Record<string, unknown>,
  ): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};
    const hasSlots = Array.isArray(raw.slots);
    const transformSlotStyles = (
      slotStyles: Record<string, unknown>,
    ): Record<string, CSSProperties> =>
      Object.fromEntries(
        Object.entries(slotStyles).map(([slot, properties]) => [
          slot,
          apply(properties as CSSPropertiesWithUtils<U>),
        ]),
      );

    for (const [key, value] of Object.entries(raw)) {
      if (key === 'base' && value && typeof value === 'object') {
        transformed[key] = hasSlots
          ? transformSlotStyles(value as Record<string, unknown>)
          : apply(value as CSSPropertiesWithUtils<U>);
      } else if (key === 'variants' && value && typeof value === 'object') {
        const variants: Record<
          string,
          Record<string, CSSProperties | Record<string, CSSProperties>>
        > = {};
        for (const [dim, options] of Object.entries(value as Record<string, unknown>)) {
          variants[dim] = {};
          for (const [opt, props] of Object.entries(options as Record<string, unknown>)) {
            variants[dim][opt] = hasSlots
              ? transformSlotStyles(props as Record<string, unknown>)
              : apply(props as CSSPropertiesWithUtils<U>);
          }
        }
        transformed[key] = variants;
      } else if (key === 'compoundVariants' && Array.isArray(value)) {
        transformed[key] = value.map(
          (cv: { variants: Record<string, unknown>; style: CSSPropertiesWithUtils<U> }) => ({
            ...cv,
            style: hasSlots
              ? transformSlotStyles(cv.style as Record<string, unknown>)
              : apply(cv.style),
          }),
        );
      } else if (
        key !== 'defaultVariants' &&
        key !== 'slots' &&
        key !== 'vars' &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        transformed[key] = apply(value as CSSPropertiesWithUtils<U>);
      } else {
        transformed[key] = value;
      }
    }

    return transformed;
  };
}

function transformOverrideConfigWithUtils<U extends StyleUtils>(
  raw: Record<string, unknown>,
  apply: (properties: CSSPropertiesWithUtils<U>) => CSSProperties,
  hasSlots: boolean,
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};
  // Mirror `makeTransformComponentConfigWithUtils`: slot recipes are Partial<Record<slot, styles>>,
  // so utils must expand per slot. Use component meta (`hasSlots`) — do not guess from CSS keys.
  const transformSlotStyles = (
    slotStyles: Record<string, unknown>,
  ): Record<string, CSSProperties> =>
    Object.fromEntries(
      Object.entries(slotStyles).map(([slot, properties]) => [
        slot,
        apply(properties as CSSPropertiesWithUtils<U>),
      ]),
    );

  const applyLeafOrSlotMap = (value: unknown): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const record = value as Record<string, unknown>;
    return hasSlots ? transformSlotStyles(record) : apply(record as CSSPropertiesWithUtils<U>);
  };

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'base' && value && typeof value === 'object') {
      transformed[key] = applyLeafOrSlotMap(value);
    } else if (key === 'variants' && value && typeof value === 'object') {
      const variants: Record<string, Record<string, unknown>> = {};
      for (const [dim, options] of Object.entries(value as Record<string, unknown>)) {
        if (!options || typeof options !== 'object') continue;
        variants[dim] = {};
        for (const [opt, props] of Object.entries(options as Record<string, unknown>)) {
          variants[dim][opt] = applyLeafOrSlotMap(props);
        }
      }
      transformed[key] = variants;
    } else if (key === 'compoundVariants' && Array.isArray(value)) {
      transformed[key] = value.map((cv: { variants: unknown; style: unknown }) => ({
        ...cv,
        style: applyLeafOrSlotMap(cv.style),
      }));
    } else if (key !== 'vars' && value && typeof value === 'object' && !Array.isArray(value)) {
      // Flat override keys (elevated, compact, …)
      transformed[key] = apply(value as CSSPropertiesWithUtils<U>);
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
}

function expandStyleWithUtils<U extends StyleUtils>(
  properties: CSSPropertiesWithUtils<U>,
  utils: U,
): CSSProperties {
  const expanded: CSSProperties = {};

  for (const [key, value] of Object.entries(properties as Record<string, unknown>)) {
    if (value == null) continue;

    if (key.startsWith('&') || key.startsWith('[') || key.startsWith('@')) {
      if (isObject(value)) {
        assignStyleEntry(
          expanded,
          key,
          expandStyleWithUtils(value as CSSPropertiesWithUtils<U>, utils),
        );
      }
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(utils, key)) {
      const utilFn = utils[key as keyof U] as unknown as (arg: unknown) => CSSProperties;
      const utilResult = utilFn(value);
      const normalized = expandStyleWithUtils(utilResult as CSSPropertiesWithUtils<U>, utils);
      for (const [utilKey, utilValue] of Object.entries(normalized as Record<string, unknown>)) {
        assignStyleEntry(expanded, utilKey, utilValue);
      }
      continue;
    }

    assignStyleEntry(expanded, key, value);
  }

  return expanded;
}

function assignStyleEntry(target: CSSProperties, key: string, value: unknown): void {
  const targetRecord = target as Record<string, unknown>;

  if (isObject(value)) {
    const existing = targetRecord[key];
    if (isObject(existing)) {
      targetRecord[key] = mergeStyleObjects(existing as CSSProperties, value as CSSProperties);
      return;
    }
    targetRecord[key] = value;
    return;
  }

  targetRecord[key] = value;
}

function mergeStyleObjects(base: CSSProperties, next: CSSProperties): CSSProperties {
  const merged: CSSProperties = { ...base };

  for (const [key, value] of Object.entries(next as Record<string, unknown>)) {
    assignStyleEntry(merged, key, value);
  }

  return merged;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
