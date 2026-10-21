import type {
  CSSProperties,
  VariantDefinitions,
  ComponentAttrsResult,
  ComponentAttrsReturn,
  ComponentConfig,
  ComponentConfigContext,
  ComponentConfigInput,
  ComponentReturn,
  ComponentVarDefinitions,
  FlatComponentConfig,
  FlatComponentConfigInput,
  FlatComponentReturn,
  SlotComponentConfig,
  SlotComponentConfigInput,
  SlotComponentFunction,
  SlotVariantDefinitions,
  MultiSlotConfig,
  MultiSlotConfigInput,
  MultiSlotReturn,
  SlotAttrsReturn,
} from './types';
import { insertRules, invalidateComponentNamespaceForDev } from './sheet';
import { applyLayerToRules, assertOwnLayer } from './layers';
import { joinSelectorAlternatives } from './compound-selector';
import { registeredNamespaces, warnUnscopedCollision } from './registry';
import {
  emittedComponentClassPrefix,
  buildSemanticTemplateClassName,
  buildTemplateClassName,
  type ClassNamingConfig,
} from './class-naming';
import { classNamesAndRulesForProperties } from './atomic-decompose';
import { serializeStyle } from './serialize-style';
import {
  createComponentConfigContextPair,
  stripAndRegisterConfigVars,
} from './component-config-context';
import { attachComposeMeta } from './compose-meta';
import {
  attachComponentMeta,
  attachComponentSchema,
  attachComponentVars,
  attachVarRegistry,
  buildClassVariantSelectorMap,
  firstClassToken,
  stampVarDefinitionsBrand,
  type ComponentVarRegistry,
  type RecipeSchemaAxis,
  type RecipeSchemaMeta,
  type SlotVariantSelectorMap,
  type VariantSelectorMap,
} from './component-meta';
import { recipeAxisBrand, type VariantAxis } from './variant';
import type { RecipeDefinition, RecipeStyles } from './schema-recipe';

// ---------------------------------------------------------------------------
// Reserved keys that signal a dimensioned config (not flat variant keys)
// ---------------------------------------------------------------------------
const RESERVED_KEYS = new Set([
  'base',
  'variants',
  'compoundVariants',
  'defaultVariants',
  'slots',
  'vars',
]);

function devWarnUnknownVariantDimensions(
  namespace: string,
  selections: Record<string, unknown>,
  variants: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === 'production') return;
  for (const key of Object.keys(selections)) {
    if (!Object.prototype.hasOwnProperty.call(variants, key)) {
      console.error(
        `[typestyles] Unknown variant dimension "${key}" for namespace "${namespace}".`,
      );
    }
  }
}

/** When `effective` resolves to no valid option class, warn in dev (typos, bad defaults). */
function devWarnInvalidDimensionOption(
  namespace: string,
  dimension: string,
  effective: unknown,
  selected: string | undefined,
  optionMap: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === 'production') return;
  if (effective == null || effective === false) return;
  if (selected != null && Object.prototype.hasOwnProperty.call(optionMap, selected)) return;
  console.error(
    `[typestyles] Unknown variant "${String(effective)}" for dimension "${dimension}" in namespace "${namespace}".`,
  );
}

/**
 * `mode: 'bem'`/`mode: 'template'` have no dimension namespace in their modifier classes by
 * default, so two different dimensions producing the same option string can collide on the
 * identical class name — warn rather than let one silently override the other. `seenBy` is
 * scoped per component (or per slot, for slot components). Shared by both modes — not
 * BEM-specific despite the historical name.
 */
function devWarnTemplateClassCollision(
  scopeLabel: string,
  className: string,
  dimension: string,
  seenBy: Map<string, string>,
): void {
  if (process.env.NODE_ENV === 'production') return;
  const owner = seenBy.get(className);
  if (owner && owner !== dimension) {
    console.error(
      `[typestyles] Class "${className}" is produced by both dimension "${owner}" ` +
        `and dimension "${dimension}" in "${scopeLabel}" — one will silently override the ` +
        `other's styles in the cascade. Choose non-colliding option names, or use \`dimension\` ` +
        `in your classNameTemplate to disambiguate.`,
    );
    return;
  }
  seenBy.set(className, dimension);
}

function devWarnUnknownFlatVariantKeys(
  namespace: string,
  selections: Record<string, unknown>,
  variantKeys: readonly string[],
): void {
  if (process.env.NODE_ENV === 'production') return;
  const allowed = new Set(variantKeys);
  for (const key of Object.keys(selections)) {
    if (key === 'base') continue;
    if (!allowed.has(key)) {
      console.error(`[typestyles] Unknown variant "${key}" for namespace "${namespace}".`);
    }
  }
}

/**
 * Detect whether a config uses dimensioned variants (has `variants` key)
 * or flat variants (every non-`base` key is a variant).
 */
function isDimensionedConfig(
  config: Record<string, unknown>,
): config is ComponentConfig<VariantDefinitions> {
  return 'variants' in config || 'compoundVariants' in config || 'defaultVariants' in config;
}

function isSlotWithVariantsConfig(
  config: Record<string, unknown>,
): config is SlotComponentConfig<readonly string[], SlotVariantDefinitions<string>> {
  return (
    'slots' in config &&
    ('variants' in config || 'compoundVariants' in config || 'defaultVariants' in config)
  );
}

function isMultiSlotConfig(
  config: Record<string, unknown>,
): config is MultiSlotConfig<readonly string[]> {
  return (
    'slots' in config &&
    !('variants' in config || 'compoundVariants' in config || 'defaultVariants' in config)
  );
}

function resolveComponentConfig(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: Record<string, unknown> | ((ctx: ComponentConfigContext) => Record<string, unknown>),
): {
  config: Record<string, unknown>;
  varRegistry?: ComponentVarRegistry;
  varRefTree?: object;
  varDefinitions?: ComponentVarDefinitions;
} {
  const {
    ctx,
    mergeVarDefaultsInto,
    buildVarRegistry,
    buildVarRefTree,
    buildCapturedVarDefinitions,
  } = createComponentConfigContextPair(classNaming, namespace);

  if (typeof config === 'function') {
    const raw = config(ctx) as Record<string, unknown>;
    const { config: withoutVars, varDefinitions: defsFromConfig } = stripAndRegisterConfigVars(
      raw,
      ctx.vars,
    );
    const resolved = mergeVarDefaultsInto(withoutVars);
    return {
      config: resolved,
      varRegistry: buildVarRegistry(resolved),
      varRefTree: buildVarRefTree(),
      varDefinitions: defsFromConfig ?? buildCapturedVarDefinitions(),
    };
  }

  const { config: withoutVars, varDefinitions: defsFromConfig } = stripAndRegisterConfigVars(
    config,
    ctx.vars,
  );
  if (defsFromConfig) {
    const resolved = mergeVarDefaultsInto(withoutVars);
    return {
      config: resolved,
      varRegistry: buildVarRegistry(resolved),
      varRefTree: buildVarRefTree(),
      varDefinitions: defsFromConfig,
    };
  }

  return { config };
}

function finishComponentResult<T extends object>(
  result: T,
  varRegistry?: ComponentVarRegistry,
  varDefinitions?: ComponentVarDefinitions,
  varRefTree?: object,
): T {
  attachVarRegistry(result, varRegistry);
  attachComponentVars(result, varRefTree);
  stampVarDefinitionsBrand(result, varDefinitions);
  return result;
}

// ---------------------------------------------------------------------------
// Public API — overloads
// ---------------------------------------------------------------------------

/**
 * Create a multi-variant component style.
 *
 * Returns an object that is **both callable and destructurable**:
 * - Call it as a function with variant selections → class string (base always included)
 * - Destructure it to access individual class strings
 *
 * Supports two config styles:
 *
 * **Dimensioned variants** (recommended for multi-axis variants):
 * ```ts
 * const button = recipe('button', {
 *   base: { padding: '8px 16px' },
 *   variants: {
 *     intent: {
 *       primary: { backgroundColor: '#0066ff', color: '#fff' },
 *       ghost: { backgroundColor: 'transparent' },
 *     },
 *     size: {
 *       sm: { fontSize: '14px' },
 *       lg: { fontSize: '18px', padding: '12px 24px' },
 *     },
 *   },
 *   compoundVariants: [
 *     { variants: { intent: 'primary', size: 'lg' }, style: { fontWeight: 700 } },
 *   ],
 *   defaultVariants: { intent: 'primary', size: 'sm' },
 * });
 *
 * // Function call — base always included, defaults applied
 * button()                                    // "button button--intent-primary button--size-sm"
 * button({ intent: 'ghost' })                 // "button button--intent-ghost button--size-sm"
 * button({ intent: 'primary', size: 'lg' })   // includes compound class
 *
 * // Destructure individual class strings
 * const { base, 'intent-primary': primary } = button;
 * ```
 *
 * **Flat variants** (simple boolean-style toggles):
 * ```ts
 * const card = recipe('card', {
 *   base: { padding: '16px', borderRadius: '8px' },
 *   elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
 *   compact: { padding: '8px' },
 * });
 *
 * // Function call
 * card()                        // "card-base"
 * card({ elevated: true })      // "card-base card-elevated"
 *
 * // Destructure
 * const { base, elevated } = card;
 * ```
 *
 * **Function config** — declare internal custom properties for variant-driven styling:
 * ```ts
 * const badge = recipe('badge', (c) => {
 *   const v = c.vars({
 *     textColor: '#333',
 *     borderColor: { value: '#ccc', syntax: '<color>' },
 *   });
 *   return {
 *     base: { color: v.textColor.var, borderColor: v.borderColor.var, borderWidth: '1px' },
 *     variants: {
 *       tone: {
 *         neutral: {},
 *         danger: { [v.textColor.name]: '#900', [v.borderColor.name]: '#f00' },
 *       },
 *     },
 *     defaultVariants: { tone: 'neutral' },
 *   };
 * });
 * ```
 */
/**
 * Attribute-driven variants — `createStyles({ mode: 'attribute' })` compiles each `variants`
 * option to a kebab-cased `&[data-{dimension}="{option}"]` selector scoped under the
 * single semantic base class instead of a discrete class. Boolean dimensions
 * (`{ true, false }` option keys) are presence-based: `true` → `&[data-{dimension}]`,
 * `false` → `&:not([data-{dimension}])`.
 *
 * ```ts
 * const styles = createStyles({ mode: 'attribute' });
 * const button = recipe('button', {
 *   base: { padding: '8px 16px' },
 *   variants: {
 *     variant: {
 *       primary: { backgroundColor: '#0066ff', color: '#fff' },
 *       secondary: { backgroundColor: '#6b7280', color: '#fff' },
 *     },
 *   },
 *   defaultVariants: { variant: 'primary' },
 * });
 *
 * const b = button({ variant: 'primary' });
 * b.className   // "button"
 * b.attrs       // { 'data-variant': 'primary' }
 * b.props       // { className: 'button', 'data-variant': 'primary' }
 * String(b)     // "button"
 * ```
 *
 * Slot recipes return an attrs result for every declared slot; flat configs continue to return
 * plain class strings. See `specs/semantic-and-attribute-mode.md`.
 */
export type ComponentBuildOptions = {
  layer?: string;
};

export function createComponent<
  const Slots extends readonly string[],
  V extends SlotVariantDefinitions<Slots[number]>,
>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: SlotComponentConfigInput<Slots, V>,
  buildOptions?: ComponentBuildOptions | string,
): SlotComponentFunction<Slots, V>;

export function createComponent<const Slots extends readonly string[]>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: MultiSlotConfigInput<Slots>,
  buildOptions?: ComponentBuildOptions | string,
): MultiSlotReturn<Slots>;

export function createComponent<const V extends VariantDefinitions>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: ComponentConfigInput<V>,
  buildOptions?: ComponentBuildOptions | string,
): ComponentReturn<V>;

export function createComponent<const K extends string>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: FlatComponentConfigInput<K>,
  buildOptions?: ComponentBuildOptions | string,
): FlatComponentReturn<K>;

export function createComponent(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: Record<string, unknown> | ((ctx: ComponentConfigContext) => Record<string, unknown>),
  buildOptions?: ComponentBuildOptions | string,
): unknown {
  const options: ComponentBuildOptions =
    typeof buildOptions === 'string' ? { layer: buildOptions } : (buildOptions ?? {});
  const { layer } = options;

  let emitLayer = layer;
  if (classNaming.cascadeLayers) {
    emitLayer =
      layer != null && layer !== ''
        ? layer
        : classNaming.styleLayer != null && classNaming.styleLayer !== ''
          ? classNaming.styleLayer
          : undefined;
    if (emitLayer == null || emitLayer === '') {
      throw new Error(
        `[typestyles] \`layer\` is required for recipe({ name: '${namespace}', … }) when using cascade layers without a factory \`layers.style\` / \`styleLayer\` default.`,
      );
    }
    assertOwnLayer(classNaming.cascadeLayers, emitLayer, `recipe('${namespace}', …)`);
  }

  const {
    config: resolved,
    varRegistry,
    varRefTree,
    varDefinitions: configVarDefinitions,
  } = resolveComponentConfig(classNaming, namespace, config);
  const recipeVarDefinitions = configVarDefinitions;
  const finish = <T extends object>(result: T) =>
    finishComponentResult(result, varRegistry, recipeVarDefinitions, varRefTree);
  if (isMultiSlotConfig(resolved)) {
    claimComponentNamespace(classNaming, namespace);
    if (
      classNaming.mode === 'bem' ||
      classNaming.mode === 'semantic' ||
      classNaming.mode === 'attribute' ||
      classNaming.mode === 'template'
    ) {
      return finish(
        createTemplateMultiSlotComponent(
          classNaming,
          namespace,
          resolved as MultiSlotConfig<readonly string[]>,
          emitLayer,
        ),
      );
    }
    return finish(
      createMultiSlotComponent(
        classNaming,
        namespace,
        resolved as MultiSlotConfig<readonly string[]>,
        emitLayer,
      ),
    );
  }
  if (isSlotWithVariantsConfig(resolved)) {
    claimComponentNamespace(classNaming, namespace);
    if (classNaming.mode === 'attribute') {
      return finish(
        createAttributeSlotComponent(
          classNaming,
          namespace,
          resolved as SlotComponentConfig<readonly string[], SlotVariantDefinitions<string>>,
          emitLayer,
        ),
      );
    }
    if (
      classNaming.mode === 'bem' ||
      classNaming.mode === 'semantic' ||
      classNaming.mode === 'template'
    ) {
      return finish(
        createTemplateSlotComponent(
          classNaming,
          namespace,
          resolved as SlotComponentConfig<readonly string[], SlotVariantDefinitions<string>>,
          emitLayer,
        ),
      );
    }
    return finish(
      createSlotComponent(
        classNaming,
        namespace,
        resolved as SlotComponentConfig<readonly string[], SlotVariantDefinitions<string>>,
        emitLayer,
      ),
    );
  }
  if (isDimensionedConfig(resolved)) {
    claimComponentNamespace(classNaming, namespace);
    const dimensionedConfig = resolved as ComponentConfig<VariantDefinitions>;
    if (classNaming.mode === 'attribute') {
      return finish(
        createAttributeDimensionedComponent(classNaming, namespace, dimensionedConfig, emitLayer),
      );
    }
    if (
      classNaming.mode === 'bem' ||
      classNaming.mode === 'semantic' ||
      classNaming.mode === 'template'
    ) {
      return finish(
        createTemplateDimensionedComponent(classNaming, namespace, dimensionedConfig, emitLayer),
      );
    }
    return finish(createDimensionedComponent(classNaming, namespace, dimensionedConfig, emitLayer));
  }
  claimComponentNamespace(classNaming, namespace);
  if (classNaming.mode === 'semantic' || classNaming.mode === 'attribute') {
    return finish(
      createSemanticFlatComponent(
        classNaming,
        namespace,
        resolved as FlatComponentConfig<string>,
        emitLayer,
      ),
    );
  }
  return finish(
    createFlatComponent(classNaming, namespace, resolved as FlatComponentConfig<string>, emitLayer),
  );
}

// ---------------------------------------------------------------------------
// Schema-first recipe (Issue #259)
// ---------------------------------------------------------------------------

/**
 * Determine whether a recipe second argument is a schema definition (branded axes)
 * rather than a legacy style config. Detection is by the runtime brand so a legacy
 * config is never mistaken for a definition.
 */
export function isSchemaRecipeDefinition(value: unknown): value is RecipeDefinition {
  if (typeof value !== 'object' || value === null) return false;
  const variants = (value as { variants?: unknown }).variants;
  if (typeof variants !== 'object' || variants === null) return false;
  const axes = Object.values(variants);
  // Every axis must be branded — a mixed object is neither a valid definition nor a
  // legacy config, so do not guess. An empty `variants` is not a definition either.
  return (
    axes.length > 0 &&
    axes.every(
      (axis) =>
        axis != null &&
        typeof axis === 'object' &&
        (axis as Record<PropertyKey, unknown>)[recipeAxisBrand] === true,
    )
  );
}

/** Build docs metadata (slots, axis kind, options, defaults) from a schema definition. */
export function buildRecipeSchemaMeta(definition: RecipeDefinition): RecipeSchemaMeta {
  const variants: Record<string, RecipeSchemaAxis> = {};
  for (const [name, axis] of Object.entries(definition.variants ?? {})) {
    const typed = axis as VariantAxis;
    variants[name] =
      typed.kind === 'boolean'
        ? { kind: 'boolean', default: typed.default }
        : { kind: 'enum', options: [...typed.options], default: typed.default };
  }
  return {
    ...(definition.slots ? { slots: [...definition.slots] } : {}),
    variants,
  };
}

/**
 * Create a recipe from a schema definition. Converts the axes into the
 * `variants` / `defaultVariants` configuration the legacy runtime already understands,
 * then stamps `.defaults` and `meta.schema` on the result.
 */
export function createSchemaComponent(
  classNaming: ClassNamingConfig,
  namespace: string,
  definition: RecipeDefinition,
  config: (ctx: ComponentConfigContext) => RecipeStyles<RecipeDefinition>,
  buildOptions?: ComponentBuildOptions | string,
): object {
  const defaultVariants: Record<string, unknown> = {};
  for (const [axis, value] of Object.entries(definition.variants ?? {})) {
    defaultVariants[axis] = (value as VariantAxis).default;
  }

  const schemaCallback = (ctx: ComponentConfigContext): Record<string, unknown> => {
    const styles = config(ctx) as Record<string, unknown>;
    const resolved: Record<string, unknown> = { ...styles, defaultVariants };
    if (definition.slots) resolved.slots = definition.slots;
    else delete resolved.slots;
    return resolved;
  };

  const handle = createComponent(classNaming, namespace, schemaCallback, buildOptions) as object;

  Object.defineProperty(handle, 'defaults', {
    value: { ...defaultVariants },
    enumerable: true,
    writable: false,
    configurable: false,
  });

  attachComponentSchema(handle, buildRecipeSchemaMeta(definition));
  return handle;
}

// ---------------------------------------------------------------------------
// Dimensioned variant component (the primary path)
// ---------------------------------------------------------------------------

function registryKeyForComponent(classNaming: ClassNamingConfig, namespace: string): string {
  const scope = classNaming.scopeId || 'default';
  // Distinct from `scope:class:…` so `style('button')` and
  // `recipe('button')` do not trigger each other's HMR invalidation.
  return `${scope}:component:${namespace}`;
}

/**
 * Reserves the logical namespace so nested `recipe` calls cannot bypass duplicate
 * detection.
 *
 * Called once per dispatch branch in `createComponent`, after `resolveComponentConfig()` has
 * resolved the config shape. Rejected calls (invalid config) never reach this helper.
 *
 * In **development**, a second registration for the same scope + namespace clears prior sheet
 * keys and registry state (same as `typestyles/hmr` invalidation). Some bundlers (notably Astro)
 * can re-run the module before `import.meta.hot.dispose` fires, so this keeps HMR from throwing.
 * In **production**, duplicate registration does not throw (rule insertion dedupes by key).
 */
function claimComponentNamespace(classNaming: ClassNamingConfig, namespace: string): void {
  const key = registryKeyForComponent(classNaming, namespace);
  if (process.env.NODE_ENV !== 'production' && registeredNamespaces.has(key)) {
    if (!classNaming.scopeId) {
      warnUnscopedCollision(namespace, 'recipe');
    }
    invalidateComponentNamespaceForDev(
      namespace,
      emittedComponentClassPrefix(classNaming, namespace) ?? undefined,
    );
  }
  registeredNamespaces.add(key);
}

function finalizeComponentRules(
  classNaming: ClassNamingConfig,
  layer: string | undefined,
  rules: Array<{ key: string; css: string }>,
): Array<{ key: string; css: string }> {
  if (classNaming.cascadeLayers && layer) {
    return applyLayerToRules(rules, layer, classNaming.cascadeLayers);
  }
  return rules;
}

function createDimensionedComponent<V extends VariantDefinitions>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: ComponentConfig<V>,
  layer?: string,
): ComponentReturn<V> {
  const { base, variants = {} as V, compoundVariants = [], defaultVariants = {} } = config;

  const rules: Array<{ key: string; css: string }> = [];

  // Track all class names for the destructurable properties
  const classMap: Record<string, string> = {};

  // 1. Base
  let baseClassName: string | undefined;
  if (base) {
    const emitted = classNamesAndRulesForProperties(
      classNaming,
      base,
      namespace,
      'base',
      'component',
    );
    baseClassName = emitted.classNames;
    classMap['base'] = baseClassName;
    rules.push(...emitted.rules);
  }

  // 2. Variant options
  const variantClassByKey: Record<string, string> = {};
  for (const [dimension, options] of Object.entries(variants)) {
    for (const [option, properties] of Object.entries(options as Record<string, CSSProperties>)) {
      const segment = `${dimension}-${option}`;
      const emitted = classNamesAndRulesForProperties(
        classNaming,
        properties,
        namespace,
        segment,
        'component',
      );
      variantClassByKey[segment] = emitted.classNames;
      classMap[segment] = emitted.classNames;
      rules.push(...emitted.rules);
    }
  }

  // 3. Compound variants
  const compoundClassByIndex: string[] = [];
  (compoundVariants as Array<{ variants: Record<string, unknown>; style: CSSProperties }>).forEach(
    (cv, index) => {
      const emitted = classNamesAndRulesForProperties(
        classNaming,
        cv.style,
        namespace,
        `compound-${index}`,
        'component',
      );
      compoundClassByIndex[index] = emitted.classNames;
      rules.push(...emitted.rules);
    },
  );

  insertRules(finalizeComponentRules(classNaming, layer, rules));

  // 4. Build the callable + destructurable return
  const selectorFn = (selections: Record<string, unknown> = {}): string => {
    const classes: string[] = [];

    if (base && baseClassName) classes.push(baseClassName);

    devWarnUnknownVariantDimensions(namespace, selections, variants as Record<string, unknown>);

    // Resolve selections with defaults
    const resolved: Record<string, unknown> = {};
    for (const [dimension, options] of Object.entries(variants)) {
      const optionMap = options as Record<string, CSSProperties>;
      const explicit = selections[dimension];
      const fallback = (defaultVariants as Record<string, unknown>)[dimension];
      const effective = explicit ?? fallback;
      const selected = normalizeSelection(effective, optionMap);
      resolved[dimension] = selected;

      devWarnInvalidDimensionOption(
        namespace,
        dimension,
        effective,
        selected,
        optionMap as Record<string, unknown>,
      );
    }

    // Apply variant classes
    for (const [dimension, options] of Object.entries(variants)) {
      const optionMap = options as Record<string, CSSProperties>;
      const selected = normalizeSelection(resolved[dimension], optionMap);
      if (selected != null) {
        const key = `${dimension}-${selected}`;
        const cn = variantClassByKey[key];
        if (cn) classes.push(cn);
      }
    }

    // Apply compound variant classes
    (
      compoundVariants as Array<{ variants: Record<string, unknown>; style: CSSProperties }>
    ).forEach((cv, index) => {
      const matches = Object.entries(cv.variants).every(([k, expected]) => {
        const options = (variants as Record<string, Record<string, CSSProperties>>)[k];
        if (!options) return false;

        const selected = normalizeSelection(resolved[k], options);
        if (selected == null) return false;

        if (Array.isArray(expected)) {
          return expected.some((value) => normalizeSelection(value, options) === selected);
        }

        return normalizeSelection(expected, options) === selected;
      });
      if (matches) {
        const cn = compoundClassByIndex[index];
        if (cn) classes.push(cn);
      }
    });

    return classes.join(' ');
  };

  const result = makeCallableObject(
    (...args: unknown[]) => selectorFn(args[0] as Record<string, unknown> | undefined),
    classMap,
  ) as ComponentReturn<V>;

  attachComposeMeta(result, Object.keys(variants));
  attachComponentMeta(result, {
    namespace,
    kind: 'dimensioned',
    namingMode: classNaming.mode,
    base: firstClassToken(baseClassName ?? ''),
    variants: buildClassVariantSelectorMap(
      variants as Record<string, Record<string, unknown>>,
      (dimension, option) => variantClassByKey[`${dimension}-${option}`] ?? '',
    ),
  });

  return result;
}
function createTemplateDimensionedComponent<V extends VariantDefinitions>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: ComponentConfig<V>,
  layer?: string,
): ComponentReturn<V> {
  const { base, variants = {} as V, compoundVariants = [], defaultVariants = {} } = config;

  const rules: Array<{ key: string; css: string }> = [];
  const classMap: Record<string, string> = {};

  const blockClassName = buildTemplateClassName(classNaming, {
    namespace,
    element: undefined,
    dimension: undefined,
    modifier: undefined,
  });
  const hasBase = base != null;
  if (hasBase) {
    classMap['base'] = blockClassName;
    rules.push(
      ...serializeStyle(`.${blockClassName}`, base as CSSProperties, {
        breakpoints: classNaming.breakpoints,
        colorModes: classNaming.colorModes,
      }),
    );
  }

  const variantClassByKey: Record<string, string> = {};
  const seenModifierClassNames = new Map<string, string>();
  const propertiesByModifierClassName: Record<string, unknown> = {};
  for (const [dimension, options] of Object.entries(variants)) {
    for (const [option, properties] of Object.entries(options as Record<string, CSSProperties>)) {
      const key = `${dimension}-${option}`;
      const modifierClassName = buildTemplateClassName(classNaming, {
        namespace,
        element: undefined,
        dimension,
        modifier: option,
      });
      devWarnTemplateClassCollision(
        namespace,
        modifierClassName,
        dimension,
        seenModifierClassNames,
      );
      variantClassByKey[key] = modifierClassName;
      classMap[key] = modifierClassName;
      mergeIntoSelectorKey(propertiesByModifierClassName, modifierClassName, properties);
    }
  }
  for (const [modifierClassName, properties] of Object.entries(propertiesByModifierClassName)) {
    rules.push(
      ...serializeStyle(`.${modifierClassName}`, properties as CSSProperties, {
        breakpoints: classNaming.breakpoints,
        colorModes: classNaming.colorModes,
      }),
    );
  }

  (compoundVariants as Array<{ variants: Record<string, unknown>; style: CSSProperties }>).forEach(
    (cv) => {
      const selectorSuffix = Object.entries(cv.variants)
        .map(([dimension, expected]) => {
          const optionMap = (variants as Record<string, Record<string, CSSProperties>>)[dimension];
          if (!optionMap) return '';
          const values = Array.isArray(expected) ? expected : [expected];
          const classSelectors = values
            .map((value) => normalizeSelection(value, optionMap))
            .filter((selected): selected is string => selected != null)
            .map((selected) => `.${variantClassByKey[`${dimension}-${selected}`]}`);
          if (classSelectors.length === 0) return '';
          return classSelectors.length === 1
            ? classSelectors[0]
            : `:is(${classSelectors.join(', ')})`;
        })
        .join('');

      if (!selectorSuffix) return;
      rules.push(
        ...serializeStyle(selectorSuffix, cv.style, {
          breakpoints: classNaming.breakpoints,
          colorModes: classNaming.colorModes,
        }),
      );
    },
  );

  insertRules(finalizeComponentRules(classNaming, layer, rules));

  const selectorFn = (selections: Record<string, unknown> = {}): string => {
    const classes: string[] = [];
    if (hasBase) classes.push(blockClassName);

    devWarnUnknownVariantDimensions(namespace, selections, variants as Record<string, unknown>);

    const resolved: Record<string, unknown> = {};
    for (const [dimension, options] of Object.entries(variants)) {
      const optionMap = options as Record<string, CSSProperties>;
      const explicit = selections[dimension];
      const fallback = (defaultVariants as Record<string, unknown>)[dimension];
      const effective = explicit ?? fallback;
      const selected = normalizeSelection(effective, optionMap);
      resolved[dimension] = selected;

      devWarnInvalidDimensionOption(
        namespace,
        dimension,
        effective,
        selected,
        optionMap as Record<string, unknown>,
      );
    }

    for (const [dimension, options] of Object.entries(variants)) {
      const optionMap = options as Record<string, CSSProperties>;
      const selected = normalizeSelection(resolved[dimension], optionMap);
      if (selected != null) {
        const cn = variantClassByKey[`${dimension}-${selected}`];
        if (cn) classes.push(cn);
      }
    }

    return classes.join(' ');
  };

  const result = makeCallableObject(
    (...args: unknown[]) => selectorFn(args[0] as Record<string, unknown> | undefined),
    classMap,
  ) as ComponentReturn<V>;

  attachComposeMeta(result, Object.keys(variants));
  attachComponentMeta(result, {
    namespace,
    kind: 'dimensioned',
    namingMode: classNaming.mode,
    base: blockClassName,
    variants: buildClassVariantSelectorMap(
      variants as Record<string, Record<string, unknown>>,
      (dimension, option) => variantClassByKey[`${dimension}-${option}`] ?? '',
    ),
  });

  return result;
}

// ---------------------------------------------------------------------------
// Dimensioned variant component — attribute mode
// (mode: 'attribute'; see specs/semantic-and-attribute-mode.md)
// ---------------------------------------------------------------------------

/**
 * Whether a dimension's option keys are exactly `{ true, false }` — the boolean-variant
 * convention already used by `normalizeSelection` / the docs. Boolean dimensions compile to a
 * presence selector (`&[data-x]` / `&:not([data-x])`) instead of a value match.
 */
function isBooleanOptionKeys(optionKeys: readonly string[]): boolean {
  return optionKeys.length === 2 && optionKeys.includes('true') && optionKeys.includes('false');
}

function toDataAttributeName(dimension: string): string {
  const kebab = dimension
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
  return `data-${kebab}`;
}

function warnKebabAttributeCollisions(namespace: string, dimensions: string[]): void {
  if (process.env.NODE_ENV === 'production') return;
  const seen = new Map<string, string>();
  for (const dimension of dimensions) {
    const attributeName = toDataAttributeName(dimension);
    const previousDimension = seen.get(attributeName);
    if (previousDimension && previousDimension !== dimension) {
      console.error(
        `[typestyles] Dimensions "${previousDimension}" and "${dimension}" both map to "${attributeName}" in "${namespace}".`,
      );
    }
    seen.set(attributeName, dimension);
  }
}

/** `&[data-{dimension}="{option}"]`, or the boolean presence-selector form. */
function attributeSelectorFor(
  dimension: string,
  option: string,
  optionKeys: readonly string[],
): string {
  const attrName = toDataAttributeName(dimension);
  if (isBooleanOptionKeys(optionKeys)) {
    return option === 'true' ? `[${attrName}]` : `:not([${attrName}])`;
  }
  return `[${attrName}="${option}"]`;
}

function buildAttributeVariantSelectorMap(
  variants: Record<string, Record<string, unknown>>,
): VariantSelectorMap {
  const map: VariantSelectorMap = {};
  for (const [dimension, options] of Object.entries(variants)) {
    const optionKeys = Object.keys(options);
    const optionMap: { [option: string]: string } = {};
    for (const option of optionKeys) {
      optionMap[option] = attributeSelectorFor(dimension, option, optionKeys);
    }
    map[dimension] = optionMap;
  }
  return map;
}

function buildSlotAttributeVariantSelectorMap(
  slots: readonly string[],
  variants: Record<string, Record<string, unknown>>,
): SlotVariantSelectorMap {
  const map: SlotVariantSelectorMap = {};
  const shared = buildAttributeVariantSelectorMap(variants);
  for (const slot of slots) {
    map[slot] = shared;
  }
  return map;
}

function buildSlotClassVariantSelectorMap(
  slots: readonly string[],
  variants: Record<string, Record<string, unknown>>,
  classForOption: (slot: string, dimension: string, option: string) => string,
): SlotVariantSelectorMap {
  const map: SlotVariantSelectorMap = {};
  for (const slot of slots) {
    map[slot] = buildClassVariantSelectorMap(variants, (dimension, option) =>
      classForOption(slot, dimension, option),
    );
  }
  return map;
}

/** Merge `properties` into `target[key]`, combining with any prior properties at that selector. */
function mergeIntoSelectorKey(
  target: Record<string, unknown>,
  key: string,
  properties: CSSProperties,
): void {
  const existing = target[key] as CSSProperties | undefined;
  target[key] = existing ? { ...existing, ...properties } : { ...properties };
}

function attributeCompoundSelectorSuffix(
  variants: Record<string, Record<string, CSSProperties>>,
  selections: Record<string, unknown>,
): string {
  return Object.entries(selections)
    .map(([dimension, expected]) => {
      const optionMap = variants[dimension];
      if (!optionMap) return '';
      const optionKeys = Object.keys(optionMap);
      const values = Array.isArray(expected) ? expected : [expected];
      const selectors = values
        .map((value) => normalizeSelection(value, optionMap))
        .filter((selected): selected is string => selected != null)
        .map((selected) => attributeSelectorFor(dimension, selected, optionKeys));
      return joinSelectorAlternatives(selectors);
    })
    .join('');
}

function resolveAttributeAttrs(
  namespace: string,
  variants: Record<string, Record<string, CSSProperties>>,
  defaultVariants: Record<string, unknown>,
  selections: Record<string, unknown>,
): Record<string, string> {
  devWarnUnknownVariantDimensions(namespace, selections, variants);

  const attrs: Record<string, string> = {};
  for (const [dimension, optionMap] of Object.entries(variants)) {
    const optionKeys = Object.keys(optionMap);
    const effective = selections[dimension] ?? defaultVariants[dimension];
    const selected = normalizeSelection(effective, optionMap);

    devWarnInvalidDimensionOption(namespace, dimension, effective, selected, optionMap);
    if (selected == null) continue;
    if (isBooleanOptionKeys(optionKeys)) {
      if (selected === 'true') attrs[toDataAttributeName(dimension)] = '';
    } else {
      attrs[toDataAttributeName(dimension)] = selected;
    }
  }

  return attrs;
}

function createAttributeDimensionedComponent<V extends VariantDefinitions>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: ComponentConfig<V>,
  layer?: string,
): ComponentAttrsReturn<V> {
  const { base, variants = {} as V, compoundVariants = [], defaultVariants = {} } = config;
  warnKebabAttributeCollisions(namespace, Object.keys(variants));

  // Fold each variant option's style into `base` as a synthetic `&[data-x="y"]` nested-selector
  // key, then run it through the same base-emission path every other component shape uses — this
  // reuses the existing nested-selector CSS pipeline (atomic-decompose.ts / css.ts) as-is, so
  // semantic/hashed/compact/atomic naming modes all work with no mode-specific branching here.
  const mergedBase: Record<string, unknown> = { ...(base ?? {}) };

  for (const [dimension, options] of Object.entries(variants)) {
    const optionMap = options as Record<string, CSSProperties>;
    const optionKeys = Object.keys(optionMap);
    for (const [option, properties] of Object.entries(optionMap)) {
      if (properties == null || Object.keys(properties).length === 0) continue;
      const selectorKey = `&${attributeSelectorFor(dimension, option, optionKeys)}`;
      mergeIntoSelectorKey(mergedBase, selectorKey, properties);
    }
  }

  (compoundVariants as Array<{ variants: Record<string, unknown>; style: CSSProperties }>).forEach(
    (cv) => {
      const selectorSuffix = attributeCompoundSelectorSuffix(
        variants as Record<string, Record<string, CSSProperties>>,
        cv.variants,
      );

      if (!selectorSuffix) return;
      mergeIntoSelectorKey(mergedBase, `&${selectorSuffix}`, cv.style);
    },
  );

  const rules: Array<{ key: string; css: string }> = [];
  const baseClassName = buildSemanticTemplateClassName(classNaming, {
    namespace,
    element: undefined,
    dimension: undefined,
    modifier: undefined,
  });
  rules.push(
    ...serializeStyle(`.${baseClassName}`, mergedBase as CSSProperties, {
      breakpoints: classNaming.breakpoints,
    }),
  );

  insertRules(finalizeComponentRules(classNaming, layer, rules));

  const selectorFn = (selections: Record<string, unknown> = {}): ComponentAttrsResult => {
    return createComponentAttrsResult(
      baseClassName,
      resolveAttributeAttrs(
        namespace,
        variants as Record<string, Record<string, CSSProperties>>,
        defaultVariants as Record<string, unknown>,
        selections,
      ),
    );
  };

  const result = makeCallableObject(
    (...args: unknown[]) => selectorFn(args[0] as Record<string, unknown> | undefined),
    { base: baseClassName },
  ) as ComponentAttrsReturn<V>;

  attachComponentMeta(result, {
    namespace,
    kind: 'dimensioned',
    namingMode: classNaming.mode,
    base: baseClassName,
    variants: buildAttributeVariantSelectorMap(variants as Record<string, Record<string, unknown>>),
  });

  return result;
}

export function createComponentAttrsResult(
  className: string,
  attrs: Record<string, string> = {},
): ComponentAttrsResult {
  const props = { className, ...attrs };
  return {
    className,
    attrs,
    props,
    toString() {
      return className;
    },
    [Symbol.toPrimitive]() {
      return className;
    },
  };
}

function createAttributeSlotComponent<
  Slots extends readonly string[],
  V extends SlotVariantDefinitions<Slots[number]>,
>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: SlotComponentConfig<Slots, V>,
  layer?: string,
): SlotAttrsReturn<Slots, V> {
  const {
    slots,
    base = {},
    variants = {} as V,
    compoundVariants = [],
    defaultVariants = {},
  } = config;
  warnKebabAttributeCollisions(namespace, Object.keys(variants));

  const baseClassBySlot: Record<string, string> = {};
  const mergedStylesBySlot: Record<string, Record<string, unknown>> = {};
  for (const slot of slots as readonly string[]) {
    baseClassBySlot[slot] = buildSemanticTemplateClassName(classNaming, {
      namespace,
      element: slot === 'root' ? undefined : slot,
      dimension: undefined,
      modifier: undefined,
    });
    mergedStylesBySlot[slot] = {
      ...((base as Record<string, CSSProperties>)[slot] ?? {}),
    };
  }

  for (const [dimension, options] of Object.entries(variants)) {
    const optionMap = options as Record<string, Record<string, CSSProperties>>;
    const optionKeys = Object.keys(optionMap);
    for (const [option, slotStyles] of Object.entries(optionMap)) {
      const selectorKey = `&${attributeSelectorFor(dimension, option, optionKeys)}`;
      for (const [slot, properties] of Object.entries(slotStyles)) {
        if (mergedStylesBySlot[slot] && properties && Object.keys(properties).length > 0) {
          mergeIntoSelectorKey(mergedStylesBySlot[slot], selectorKey, properties);
        }
      }
    }
  }

  (
    compoundVariants as Array<{
      variants: Record<string, unknown>;
      style: Record<string, CSSProperties>;
    }>
  ).forEach((cv) => {
    const selectorSuffix = attributeCompoundSelectorSuffix(
      variants as Record<string, Record<string, CSSProperties>>,
      cv.variants,
    );

    if (!selectorSuffix) return;
    for (const [slot, properties] of Object.entries(cv.style)) {
      if (mergedStylesBySlot[slot]) {
        mergeIntoSelectorKey(mergedStylesBySlot[slot], `&${selectorSuffix}`, properties);
      }
    }
  });

  const rules: Array<{ key: string; css: string }> = [];
  for (const slot of slots as readonly string[]) {
    rules.push(
      ...serializeStyle(`.${baseClassBySlot[slot]}`, mergedStylesBySlot[slot] as CSSProperties, {
        breakpoints: classNaming.breakpoints,
        colorModes: classNaming.colorModes,
      }),
    );
  }
  insertRules(finalizeComponentRules(classNaming, layer, rules));

  const result = ((selections: Record<string, unknown> = {}) => {
    const attrs = resolveAttributeAttrs(
      namespace,
      variants as Record<string, Record<string, CSSProperties>>,
      defaultVariants as Record<string, unknown>,
      selections,
    );

    return Object.fromEntries(
      (slots as readonly string[]).map((slot) => [
        slot,
        createComponentAttrsResult(baseClassBySlot[slot], attrs),
      ]),
    ) as Record<Slots[number], ComponentAttrsResult>;
  }) as SlotAttrsReturn<Slots, V>;

  attachComponentMeta(result, {
    namespace,
    kind: 'slot',
    namingMode: classNaming.mode,
    slots: slots as readonly string[],
    base: { ...baseClassBySlot },
    variants: buildSlotAttributeVariantSelectorMap(
      slots as readonly string[],
      variants as Record<string, Record<string, unknown>>,
    ),
  });

  return result;
}

// ---------------------------------------------------------------------------
// Flat variant component
// ---------------------------------------------------------------------------

function createSemanticFlatComponent<K extends string>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: FlatComponentConfig<K>,
  layer?: string,
): FlatComponentReturn<K> {
  const rules: Array<{ key: string; css: string }> = [];
  const classMap: Record<string, string> = {};
  const variantKeys: string[] = [];

  const blockClassName = buildSemanticTemplateClassName(classNaming, {
    namespace,
    element: undefined,
    dimension: undefined,
    modifier: undefined,
  });

  for (const [key, properties] of Object.entries(config)) {
    if (RESERVED_KEYS.has(key) && key !== 'base') continue;
    const props = properties as CSSProperties;

    if (key === 'base') {
      classMap['base'] = blockClassName;
      rules.push(
        ...serializeStyle(`.${blockClassName}`, props, {
          breakpoints: classNaming.breakpoints,
          colorModes: classNaming.colorModes,
        }),
      );
    } else {
      const modifierClassName = buildSemanticTemplateClassName(classNaming, {
        namespace,
        element: undefined,
        dimension: undefined,
        modifier: key,
      });
      classMap[key] = modifierClassName;
      rules.push(
        ...serializeStyle(`.${modifierClassName}`, props, {
          breakpoints: classNaming.breakpoints,
          colorModes: classNaming.colorModes,
        }),
      );
      variantKeys.push(key);
    }
  }

  insertRules(finalizeComponentRules(classNaming, layer, rules));

  const baseClassName = classMap['base'];

  const selectorFn = (selections: Record<string, unknown> = {}): string => {
    const classes: string[] = [];

    devWarnUnknownFlatVariantKeys(namespace, selections, variantKeys);

    if (baseClassName) classes.push(baseClassName);

    for (const key of variantKeys) {
      if (selections[key]) {
        const cn = classMap[key];
        if (cn) classes.push(cn);
      }
    }

    return classes.join(' ');
  };

  const result = makeCallableObject(
    (...args: unknown[]) => selectorFn(args[0] as Record<string, unknown> | undefined),
    classMap,
  ) as FlatComponentReturn<K>;

  attachComposeMeta(result, variantKeys);
  attachComponentMeta(result, {
    namespace,
    kind: 'flat',
    namingMode: classNaming.mode,
    base: firstClassToken(classMap['base'] ?? ''),
    variants: Object.fromEntries(
      variantKeys.map((key) => [key, firstClassToken(classMap[key] ?? '')]),
    ),
  });

  return result;
}

function createFlatComponent<K extends string>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: FlatComponentConfig<K>,
  layer?: string,
): FlatComponentReturn<K> {
  const rules: Array<{ key: string; css: string }> = [];
  const classMap: Record<string, string> = {};
  const variantKeys: string[] = [];

  for (const [key, properties] of Object.entries(config)) {
    if (RESERVED_KEYS.has(key) && key !== 'base') continue;
    const props = properties as CSSProperties;
    const segment = key;
    const emitted = classNamesAndRulesForProperties(
      classNaming,
      props,
      namespace,
      segment,
      'component',
    );
    classMap[segment] = emitted.classNames;
    rules.push(...emitted.rules);
    if (key !== 'base') {
      variantKeys.push(key);
    }
  }

  insertRules(finalizeComponentRules(classNaming, layer, rules));

  const baseClassName = classMap['base'];

  const selectorFn = (selections: Record<string, unknown> = {}): string => {
    const classes: string[] = [];

    devWarnUnknownFlatVariantKeys(namespace, selections, variantKeys);

    if (baseClassName) classes.push(baseClassName);

    for (const key of variantKeys) {
      if (selections[key]) {
        const cn = classMap[key];
        if (cn) classes.push(cn);
      }
    }

    return classes.join(' ');
  };

  const result = makeCallableObject(
    (...args: unknown[]) => selectorFn(args[0] as Record<string, unknown> | undefined),
    classMap,
  ) as FlatComponentReturn<K>;

  attachComposeMeta(result, variantKeys);
  attachComponentMeta(result, {
    namespace,
    kind: 'flat',
    namingMode: classNaming.mode,
    base: firstClassToken(classMap['base'] ?? ''),
    variants: Object.fromEntries(
      variantKeys.map((key) => [key, firstClassToken(classMap[key] ?? '')]),
    ),
  });

  return result;
}

// ---------------------------------------------------------------------------
// Multi-slot component (no variants, just multiple independent slot styles)
// ---------------------------------------------------------------------------

function createMultiSlotComponent<Slots extends readonly string[]>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: MultiSlotConfig<Slots>,
  layer?: string,
): MultiSlotReturn<Slots> {
  const { slots } = config;

  const rules: Array<{ key: string; css: string }> = [];
  const slotClassMap: Record<string, string> = {};

  for (const slot of slots) {
    const properties = (config as Record<string, CSSProperties | undefined>)[slot];
    if (properties) {
      const emitted = classNamesAndRulesForProperties(
        classNaming,
        properties,
        namespace,
        slot,
        'component',
      );
      slotClassMap[slot] = emitted.classNames;
      rules.push(...emitted.rules);
    } else {
      slotClassMap[slot] = '';
    }
  }

  insertRules(finalizeComponentRules(classNaming, layer, rules));

  const selectorFn = (): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const slot of slots) {
      result[slot] = slotClassMap[slot] || '';
    }
    return result;
  };

  const result = makeMultiSlotObject(selectorFn, slotClassMap) as MultiSlotReturn<Slots>;
  attachComponentMeta(result, {
    namespace,
    kind: 'multi-slot',
    namingMode: classNaming.mode,
    slots: slots as readonly string[],
    base: Object.fromEntries(
      (slots as readonly string[]).map((slot) => [slot, firstClassToken(slotClassMap[slot] ?? '')]),
    ),
  });
  return result;
}

// ---------------------------------------------------------------------------
// Multi-slot component — template engine (mode: 'bem' | 'template'; see specs/classname-template-mode.md)
// ---------------------------------------------------------------------------

function templateSlotClassName(
  classNaming: ClassNamingConfig,
  namespace: string,
  slot: string,
): string {
  const input = {
    namespace,
    element: slot === 'root' ? undefined : slot,
    dimension: undefined,
    modifier: undefined,
  };
  return classNaming.mode === 'attribute'
    ? buildSemanticTemplateClassName(classNaming, input)
    : buildTemplateClassName(classNaming, input);
}

function createTemplateMultiSlotComponent<Slots extends readonly string[]>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: MultiSlotConfig<Slots>,
  layer?: string,
): MultiSlotReturn<Slots> {
  const { slots } = config;

  const rules: Array<{ key: string; css: string }> = [];
  const slotClassMap: Record<string, string> = {};

  for (const slot of slots as readonly string[]) {
    const className = templateSlotClassName(classNaming, namespace, slot);
    slotClassMap[slot] = className;
    const properties = (config as Record<string, CSSProperties | undefined>)[slot];
    if (properties) {
      rules.push(
        ...serializeStyle(`.${className}`, properties, {
          breakpoints: classNaming.breakpoints,
          colorModes: classNaming.colorModes,
        }),
      );
    }
  }

  insertRules(finalizeComponentRules(classNaming, layer, rules));

  const selectorFn = (): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const slot of slots as readonly string[]) {
      result[slot] = slotClassMap[slot] || '';
    }
    return result;
  };

  const result = makeMultiSlotObject(selectorFn, slotClassMap) as MultiSlotReturn<Slots>;
  attachComponentMeta(result, {
    namespace,
    kind: 'multi-slot',
    namingMode: classNaming.mode,
    slots: slots as readonly string[],
    base: Object.fromEntries(
      (slots as readonly string[]).map((slot) => [slot, firstClassToken(slotClassMap[slot] ?? '')]),
    ),
  });
  return result;
}

// ---------------------------------------------------------------------------
// Slot component — template engine (mode: 'bem' | 'template'; see specs/classname-template-mode.md)
// ---------------------------------------------------------------------------

function createTemplateSlotComponent<
  Slots extends readonly string[],
  V extends SlotVariantDefinitions<Slots[number]>,
>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: SlotComponentConfig<Slots, V>,
  layer?: string,
): SlotComponentFunction<Slots, V> {
  const {
    slots,
    base = {},
    variants = {} as V,
    compoundVariants = [],
    defaultVariants = {},
  } = config;

  const rules: Array<{ key: string; css: string }> = [];
  const baseClassBySlot: Record<string, string> = {};
  for (const slot of slots as readonly string[]) {
    const className = templateSlotClassName(classNaming, namespace, slot);
    baseClassBySlot[slot] = className;
    const properties = (base as Record<string, CSSProperties>)[slot];
    if (properties) {
      rules.push(
        ...serializeStyle(`.${className}`, properties, {
          breakpoints: classNaming.breakpoints,
          colorModes: classNaming.colorModes,
        }),
      );
    }
  }

  const variantClassByKey: Record<string, string> = {};
  const seenModifierClassNamesBySlot = new Map<string, Map<string, string>>();
  const propertiesByModifierClassName: Record<string, CSSProperties> = {};
  for (const [dimension, options] of Object.entries(variants)) {
    for (const [option, slotStyles] of Object.entries(
      options as Record<string, Record<string, CSSProperties>>,
    )) {
      for (const [slot, properties] of Object.entries(slotStyles)) {
        const slotClassName = baseClassBySlot[slot];
        if (!slotClassName) continue;
        const modifierClassName = buildTemplateClassName(classNaming, {
          namespace,
          element: slot === 'root' ? undefined : slot,
          dimension,
          modifier: option,
        });
        let seenForSlot = seenModifierClassNamesBySlot.get(slot);
        if (!seenForSlot) {
          seenForSlot = new Map<string, string>();
          seenModifierClassNamesBySlot.set(slot, seenForSlot);
        }
        devWarnTemplateClassCollision(
          `${namespace}__${slot}`,
          modifierClassName,
          dimension,
          seenForSlot,
        );
        variantClassByKey[`${slot}-${dimension}-${option}`] = modifierClassName;
        mergeIntoSelectorKey(propertiesByModifierClassName, modifierClassName, properties);
      }
    }
  }
  for (const [modifierClassName, properties] of Object.entries(propertiesByModifierClassName)) {
    rules.push(
      ...serializeStyle(`.${modifierClassName}`, properties, {
        breakpoints: classNaming.breakpoints,
        colorModes: classNaming.colorModes,
      }),
    );
  }

  (
    compoundVariants as Array<{
      variants: Record<string, unknown>;
      style: Record<string, CSSProperties>;
    }>
  ).forEach((cv) => {
    for (const [slot, properties] of Object.entries(cv.style)) {
      const selectorSuffix = Object.entries(cv.variants)
        .map(([dimension, expected]) => {
          const options = (variants as Record<string, Record<string, unknown>>)[dimension];
          if (!options) return '';
          const values = Array.isArray(expected) ? expected : [expected];
          const classSelectors = values
            .map((value) => normalizeSelection(value, options))
            .filter((selected): selected is string => selected != null)
            .map((selected) => variantClassByKey[`${slot}-${dimension}-${selected}`])
            .filter((cn): cn is string => cn != null)
            .map((cn) => `.${cn}`);
          if (classSelectors.length === 0) return '';
          return classSelectors.length === 1
            ? classSelectors[0]
            : `:is(${classSelectors.join(', ')})`;
        })
        .join('');

      if (!selectorSuffix) continue;
      rules.push(
        ...serializeStyle(selectorSuffix, properties, {
          breakpoints: classNaming.breakpoints,
          colorModes: classNaming.colorModes,
        }),
      );
    }
  });

  insertRules(finalizeComponentRules(classNaming, layer, rules));

  const result = ((selections: Record<string, unknown> = {}) => {
    const classes = Object.fromEntries(
      (slots as readonly string[]).map((slot) => [slot, [baseClassBySlot[slot]] as string[]]),
    ) as Record<string, string[]>;

    devWarnUnknownVariantDimensions(namespace, selections, variants as Record<string, unknown>);

    const resolvedSelections: Record<string, unknown> = {};
    for (const [dimension, options] of Object.entries(variants)) {
      const optionMap = options as Record<string, unknown>;
      const explicit = selections[dimension];
      const fallback = (defaultVariants as Record<string, unknown>)[dimension];
      const effective = explicit ?? fallback;
      const selected = normalizeSelection(effective, optionMap);
      resolvedSelections[dimension] = selected;

      devWarnInvalidDimensionOption(namespace, dimension, effective, selected, optionMap);
    }

    for (const [dimension, options] of Object.entries(variants)) {
      const optionMap = options as Record<string, Record<string, CSSProperties>>;
      const selected = normalizeSelection(resolvedSelections[dimension], optionMap);
      if (selected == null) continue;
      const slotStyles = optionMap[selected];
      if (!slotStyles) continue;

      for (const slot of Object.keys(slotStyles)) {
        const cn = variantClassByKey[`${slot}-${dimension}-${selected}`];
        if (cn && classes[slot]) classes[slot].push(cn);
      }
    }

    return Object.fromEntries(
      (slots as readonly string[]).map((slot) => [slot, classes[slot].join(' ')]),
    ) as Record<Slots[number], string>;
  }) as SlotComponentFunction<Slots, V>;

  attachComponentMeta(result, {
    namespace,
    kind: 'slot',
    namingMode: classNaming.mode,
    slots: slots as readonly string[],
    base: Object.fromEntries(
      (slots as readonly string[]).map((slot) => [
        slot,
        firstClassToken(baseClassBySlot[slot] ?? ''),
      ]),
    ),
    variants: buildSlotClassVariantSelectorMap(
      slots as readonly string[],
      variants as Record<string, Record<string, unknown>>,
      (slot, dimension, option) => variantClassByKey[`${slot}-${dimension}-${option}`] ?? '',
    ),
  });

  return result;
}

function makeMultiSlotObject(
  selectorFn: () => Record<string, string>,
  slotClassMap: Record<string, string>,
): unknown {
  const fn = function (this: unknown) {
    return selectorFn();
  };

  Object.defineProperties(
    fn,
    Object.fromEntries(
      Object.entries(slotClassMap).map(([key, value]) => [
        key,
        { value, enumerable: true, writable: false, configurable: false },
      ]),
    ),
  );

  // Non-enumerable brand for OverrideFn overload discrimination (see MultiSlotReturn).
  Object.defineProperty(fn, '__tsMultiSlot', {
    value: true,
    enumerable: false,
    writable: false,
    configurable: true,
  });

  return fn;
}

// ---------------------------------------------------------------------------
// Slot component (unchanged behavior, kept for complex multi-element components)
// ---------------------------------------------------------------------------

function createSlotComponent<
  Slots extends readonly string[],
  V extends SlotVariantDefinitions<Slots[number]>,
>(
  classNaming: ClassNamingConfig,
  namespace: string,
  config: SlotComponentConfig<Slots, V>,
  layer?: string,
): SlotComponentFunction<Slots, V> {
  const {
    slots,
    base = {},
    variants = {} as V,
    compoundVariants = [],
    defaultVariants = {},
  } = config;

  const rules: Array<{ key: string; css: string }> = [];

  const baseClassBySlot: Record<string, string> = {};
  for (const [slot, properties] of Object.entries(base as Record<string, CSSProperties>)) {
    const emitted = classNamesAndRulesForProperties(
      classNaming,
      properties,
      namespace,
      slot,
      'component',
    );
    baseClassBySlot[slot] = emitted.classNames;
    rules.push(...emitted.rules);
  }

  const variantClassByKey: Record<string, string> = {};
  for (const [dimension, options] of Object.entries(variants)) {
    for (const [option, slotStyles] of Object.entries(
      options as Record<string, Record<string, CSSProperties>>,
    )) {
      for (const [slot, properties] of Object.entries(slotStyles)) {
        const segment = `${slot}-${dimension}-${option}`;
        const emitted = classNamesAndRulesForProperties(
          classNaming,
          properties,
          namespace,
          segment,
          'component',
        );
        variantClassByKey[segment] = emitted.classNames;
        rules.push(...emitted.rules);
      }
    }
  }

  const slotCompoundClassByKey: Record<string, string> = {};
  (
    compoundVariants as Array<{
      variants: Record<string, unknown>;
      style: Record<string, CSSProperties>;
    }>
  ).forEach((cv, index) => {
    for (const [slot, properties] of Object.entries(cv.style)) {
      const segment = `${slot}-compound-${index}`;
      const emitted = classNamesAndRulesForProperties(
        classNaming,
        properties,
        namespace,
        segment,
        'component',
      );
      slotCompoundClassByKey[`${slot}::${index}`] = emitted.classNames;
      rules.push(...emitted.rules);
    }
  });

  insertRules(finalizeComponentRules(classNaming, layer, rules));

  const result = ((selections: Record<string, unknown> = {}) => {
    const classes = Object.fromEntries(
      (slots as readonly string[]).map((slot) => [slot, [] as string[]]),
    ) as Record<string, string[]>;

    devWarnUnknownVariantDimensions(namespace, selections, variants as Record<string, unknown>);

    const resolvedSelections: Record<string, unknown> = {};
    for (const [dimension, options] of Object.entries(variants)) {
      const optionMap = options as Record<string, unknown>;
      const explicit = selections[dimension];
      const fallback = (defaultVariants as Record<string, unknown>)[dimension];
      const effective = explicit ?? fallback;
      const selected = normalizeSelection(effective, optionMap);
      resolvedSelections[dimension] = selected;

      devWarnInvalidDimensionOption(namespace, dimension, effective, selected, optionMap);
    }

    for (const [slot, properties] of Object.entries(base as Record<string, CSSProperties>)) {
      const cn = baseClassBySlot[slot];
      if (cn && classes[slot]) classes[slot].push(cn);
      void properties; // used only for iteration
    }

    for (const [dimension, options] of Object.entries(variants)) {
      const optionMap = options as Record<string, Record<string, CSSProperties>>;
      const selected = normalizeSelection(resolvedSelections[dimension], optionMap);
      if (selected == null) continue;
      const slotStyles = optionMap[selected];
      if (!slotStyles) continue;

      for (const slot of Object.keys(slotStyles)) {
        const segment = `${slot}-${dimension}-${selected}`;
        const cn = variantClassByKey[segment];
        if (cn && classes[slot]) classes[slot].push(cn);
      }
    }

    (
      compoundVariants as Array<{
        variants: Record<string, unknown>;
        style: Record<string, CSSProperties>;
      }>
    ).forEach((cv, index) => {
      const matches = Object.entries(cv.variants).every(([k, expected]) => {
        const options = (variants as Record<string, Record<string, unknown>>)[k];
        if (!options) return false;

        const selected = normalizeSelection(resolvedSelections[k], options);
        if (selected == null) return false;

        if (Array.isArray(expected)) {
          return expected.some((value) => normalizeSelection(value, options) === selected);
        }

        return normalizeSelection(expected, options) === selected;
      });

      if (!matches) return;

      for (const slot of Object.keys(cv.style)) {
        const cn = slotCompoundClassByKey[`${slot}::${index}`];
        if (cn && classes[slot]) classes[slot].push(cn);
      }
    });

    return Object.fromEntries(
      (slots as readonly string[]).map((slot) => [slot, classes[slot].join(' ')]),
    ) as Record<Slots[number], string>;
  }) as SlotComponentFunction<Slots, V>;

  attachComponentMeta(result, {
    namespace,
    kind: 'slot',
    namingMode: classNaming.mode,
    slots: slots as readonly string[],
    base: Object.fromEntries(
      (slots as readonly string[]).map((slot) => [
        slot,
        firstClassToken(baseClassBySlot[slot] ?? ''),
      ]),
    ),
    variants: buildSlotClassVariantSelectorMap(
      slots as readonly string[],
      variants as Record<string, Record<string, unknown>>,
      (slot, dimension, option) => variantClassByKey[`${slot}-${dimension}-${option}`] ?? '',
    ),
  });

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeSelection(value: unknown, options: Record<string, unknown>): string | undefined {
  if (value == null) return undefined;

  if (typeof value === 'boolean') {
    const boolKey = String(value);
    if (Object.prototype.hasOwnProperty.call(options, boolKey)) return boolKey;
    if (value === false) return undefined;
    return boolKey;
  }

  return String(value);
}

/**
 * Create an object that is both callable as a function and has properties
 * for each class in the classMap. This is the CVA-style return.
 *
 * Uses a Proxy so that:
 * - Calling it invokes selectorFn
 * - Property access returns the class string from classMap
 * - Destructuring works via standard property enumeration
 */
function makeCallableObject(
  selectorFn: (...args: unknown[]) => unknown,
  classMap: Record<string, string>,
): unknown {
  // Create the function as the base (makes it callable)
  const fn = function (this: unknown, ...args: unknown[]) {
    return selectorFn(...args);
  };

  // Copy class map properties onto the function
  Object.defineProperties(
    fn,
    Object.fromEntries(
      Object.entries(classMap).map(([key, value]) => [
        key,
        { value, enumerable: true, writable: false, configurable: false },
      ]),
    ),
  );

  return fn;
}
