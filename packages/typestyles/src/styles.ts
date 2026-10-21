import type {
  CSSProperties,
  CSSPropertiesWithUtils,
  ComposeFn,
  ComposeSelectorInput,
  ComponentConfigContext,
  StyleUtils,
  StylesPropertyFn,
} from './types';
import { serializeStyle } from './serialize-style';
import { insertRules, invalidateClassNamespaceForDev } from './sheet';
import type { CascadeLayersInput } from './layers';
import { applyLayerToRules, assertOwnLayer, resolveCascadeLayers } from './layers';
import { registeredNamespaces, trackEmittedClassName, warnUnscopedCollision } from './registry';
import {
  emittedClassName,
  hashString,
  mergeClassNaming,
  sanitizeClassSegment,
  stableSerialize,
  type ClassNamingConfig,
} from './class-naming';
import { decomposeAtomicStyle, classNamesAndRulesForProperties } from './atomic-decompose';
import { createComponent, createSchemaComponent, isSchemaRecipeDefinition } from './component';
import type { RecipeDefinition, RecipeStyles } from './schema-recipe';
import type { StylesApi } from './styles-api';
import {
  collectComposeAllowedKeys,
  devWarnComposeUnknownKeys,
  type ComposeAwareFn,
} from './compose-meta';
import { createScope, type ScopeOptions } from './scope';
import { createOverride, type OverrideOptions } from './override';
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

export type { StylesApi };
export type { ComponentCreateOptions, RecipeFn } from './recipe-fn';

/** Runtime options bag. Unlayered calls may pass `{ themeable }` with no `layer`. */
type RecipeRuntimeOptions = {
  readonly layer?: string;
  readonly themeable?: boolean;
};

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
  /** Shorthand expanders. Same result as calling `withUtils` on the returned API. */
  utils?: StyleUtils;
};

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
export function createStyles<const O extends CreateStylesInput>(options?: O): StylesApi<O> {
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
  return buildStylesApi(classNaming, registry, utils) as unknown as StylesApi<O>;
}

function registerComponentFromOptions(
  registry: ComponentRegistry,
  namespace: string,
  handle: unknown,
  options?: RecipeRuntimeOptions,
): void {
  registry.register(namespace, handle as object, options?.themeable !== false);
}

function createMediaHelpers(classNaming: ClassNamingConfig) {
  const breakpoint = createBreakpointMediaFn(classNaming.breakpoints);
  const media = createMediaFn(classNaming.breakpoints);
  return { breakpoint, media };
}

type StylesHashClass =
  | ((properties: CSSProperties, label?: string) => string)
  | ((
      properties: CSSProperties,
      options?: { readonly layer?: string; readonly label?: string },
    ) => string);

/** Fields shared by every `createStyles` result. `satisfies` on the builder keeps this list honest. */
type StylesCore = {
  classNaming: ClassNamingConfig;
  container: typeof containerQuery;
  containerRef: (label: string) => ContainerNameRef;
  supports: typeof supportsQuery;
  atRuleBlock: typeof atRuleBlockFn;
  when: typeof whenStyleFn;
  breakpoint: BreakpointMediaFn;
  media: MediaFn;
  has: typeof hasNested;
  is: typeof isNested;
  where: typeof whereNested;
  class: (name: string, properties: CSSProperties, options?: { readonly layer?: string }) => string;
  hashClass: StylesHashClass;
  component: (
    namespace: string,
    configOrDefinition: unknown,
    callbackOrOptions?: unknown,
    maybeOptions?: RecipeRuntimeOptions,
  ) => unknown;
  compose: typeof compose;
  scope: (opts: ScopeOptions, className: string, overrides: CSSProperties) => void;
  override: (componentHandle: object, config: unknown, options?: OverrideOptions<string>) => void;
};

type StylesBuilderResult = StylesCore &
  ComponentRegistryApi & {
    property?: StylesPropertyFn;
    withUtils?: (utils: StyleUtils) => StylesBuilderResult;
  };

function buildStylesApi(
  classNaming: ClassNamingConfig,
  registry: ComponentRegistry,
  utils?: StyleUtils,
): StylesBuilderResult {
  const layered = Boolean(classNaming.cascadeLayers);
  const apply = utils
    ? (properties: CSSPropertiesWithUtils<StyleUtils>): CSSProperties =>
        expandStyleWithUtils(properties, utils)
    : undefined;
  const transform = apply ? makeTransformComponentConfigWithUtils(apply) : undefined;

  const component = (
    namespace: string,
    configOrDefinition: unknown,
    callbackOrOptions?: unknown,
    maybeOptions?: RecipeRuntimeOptions,
  ) => {
    if (isSchemaRecipeDefinition(configOrDefinition)) {
      const definition = configOrDefinition;
      const userConfig = callbackOrOptions as (
        ctx: ComponentConfigContext,
      ) => Record<string, unknown>;
      const handle = createSchemaComponent(
        classNaming,
        namespace,
        definition,
        transform
          ? (ctx) =>
              transform({
                ...userConfig(ctx),
                ...(definition.slots ? { slots: definition.slots } : {}),
              }) as unknown as RecipeStyles<RecipeDefinition>
          : (userConfig as (ctx: ComponentConfigContext) => RecipeStyles<RecipeDefinition>),
        maybeOptions,
      );
      registerComponentFromOptions(registry, namespace, handle, maybeOptions);
      return handle;
    }

    const config = configOrDefinition as
      | Record<string, unknown>
      | ((ctx: ComponentConfigContext) => Record<string, unknown>);
    const options = callbackOrOptions as RecipeRuntimeOptions | undefined;
    let resolved: typeof config;
    if (!transform) {
      resolved = config;
    } else if (typeof config === 'function') {
      const configFn = config;
      resolved = (ctx) => transform(configFn(ctx));
    } else {
      resolved = transform(config);
    }
    const handle = createComponent(classNaming, namespace, resolved as never, options);
    registerComponentFromOptions(registry, namespace, handle, options);
    return handle;
  };

  const containerRef = (label: string): ContainerNameRef =>
    createContainerRef(label, {
      scopeId: classNaming.scopeId,
      prefix: classNaming.prefix,
    });
  const { breakpoint, media } = createMediaHelpers(classNaming);
  const normalize = (properties: CSSProperties): CSSProperties =>
    apply ? apply(properties as CSSPropertiesWithUtils<StyleUtils>) : properties;

  const scope = (opts: ScopeOptions, className: string, overrides: CSSProperties) =>
    createScope(classNaming, opts, className, normalize(overrides));

  const override = (
    componentHandle: object,
    config: unknown,
    options?: OverrideOptions<string>,
  ) => {
    if (!apply) {
      return createOverride(
        classNaming,
        componentHandle,
        config as Record<string, unknown>,
        options,
      );
    }
    const meta = getComponentMeta(componentHandle);
    const hasSlots = meta?.kind === 'slot' || meta?.kind === 'multi-slot';
    return createOverride(
      classNaming,
      componentHandle,
      transformOverrideConfigWithUtils(config as Record<string, unknown>, apply, hasSlots),
      options,
    );
  };

  const hashClass: StylesHashClass = layered
    ? (properties: CSSProperties, options?: { layer?: string; label?: string }) =>
        createHashClass(classNaming, normalize(properties), options?.label, options?.layer)
    : (properties: CSSProperties, label?: string) =>
        createHashClass(classNaming, normalize(properties), label);

  const api = {
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
    class: (name: string, properties: CSSProperties, options?: { layer?: string }) =>
      createClass(classNaming, name, normalize(properties), layered ? options?.layer : undefined),
    hashClass,
    component,
    compose,
    scope,
    override,
  };

  if (utils) {
    return attachComponentRegistryMethods(api, registry);
  }

  return attachComponentRegistryMethods(
    {
      ...api,
      property: createStylesPropertyFn(classNaming),
      withUtils: (next: StyleUtils) => buildStylesApi(classNaming, registry, next),
    },
    registry,
  );
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
