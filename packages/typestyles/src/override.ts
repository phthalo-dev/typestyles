import type { ClassNamingConfig } from './class-naming';
import {
  getComponentMeta,
  type ComponentMeta,
  type DimensionedComponentMeta,
  type FlatComponentMeta,
  type MultiSlotComponentMeta,
  type SlotComponentMeta,
  type VariantSelectorMap,
} from './component-meta';
import {
  expandVarOverrideDeclarations,
  resolveVarHostClass,
  resolveVarOverrides,
} from './component-var-overrides';
import { serializeStyle } from './serialize-style';
import { applyLayerToRules, assertOwnLayer } from './layers';
import { insertRules } from './sheet';
import { joinSelectorAlternatives } from './compound-selector';
import { when } from './theme';
import {
  compileThemeCondition,
  buildSelectorForContext,
  wrapRuleCss,
  type ConditionCompileContext,
} from './condition-compile';
import type {
  RecipeDefinition,
  RecipeHandle,
  RecipeHasSlots,
  RecipeOptionsFor,
  RecipeSlots,
} from './schema-recipe';
import type {
  ComponentAttrsReturn,
  ComponentReturn,
  ComponentVarDefinitions,
  ComponentVarDescriptor,
  ComponentVarNode,
  CompoundSelectionValue,
  ConditionalOverride,
  CSSProperties,
  CSSVarRef,
  FlatComponentReturn,
  MultiSlotReturn,
  SlotAttrsReturn,
  SlotComponentFunction,
  SlotVariantDefinitions,
  StylableOverride,
  ThemeCondition,
  VariantDefinitions,
  VariantOptionKey,
  VariantOptionStyle,
} from './types';

const SUPPORTED_OVERRIDE_MODES = new Set(['semantic', 'bem', 'template', 'attribute']);

export type OverrideOptions<L extends string = string> = {
  /**
   * Selector prefix inserted before the component selector, e.g. `.theme-acme`.
   * Emits `.theme-acme .button--intent-primary { … }` (descendant combinator).
   * This is **not** CSS `@scope` — see `scope()` for proximity.
   */
  selectorPrefix?: string;
  /** Cascade layer name; must be on the instance's `layers` stack when set. */
  layer?: L;
};

/** Leaf values assignable to a component internal var in `override({ vars })`. */
export type ComponentVarAssignValue = string | number | CSSVarRef | { light: string; dark: string };

/** Map logical definition tree → partial assignment tree for override `vars`. */
export type ComponentVarValues<T extends ComponentVarDefinitions> = {
  [K in keyof T]?: T[K] extends ComponentVarDescriptor | string | number
    ? ComponentVarAssignValue
    : T[K] extends { [key: string]: ComponentVarNode }
      ? ComponentVarValues<{ [P in keyof T[K]]: T[K][P] }>
      : never;
};

export type OverrideConfig<
  V extends VariantDefinitions,
  Vars extends ComponentVarDefinitions = never,
> = {
  base?: StylableOverride;
  variants?: { [K in keyof V]?: { [O in keyof V[K]]?: StylableOverride } };
  compoundVariants?: Array<{
    variants: { [K in keyof V]?: CompoundSelectionValue<VariantOptionKey<V, K>> };
    style: StylableOverride;
  }>;
  vars?: Vars extends never ? never : Partial<ComponentVarValues<Vars>>;
};

export type SlotOverrideConfig<
  Slots extends readonly string[],
  V extends SlotVariantDefinitions<Slots[number]>,
  Vars extends ComponentVarDefinitions = never,
> = {
  base?: Partial<Record<Slots[number], StylableOverride>>;
  variants?: {
    [K in keyof V]?: {
      [O in keyof V[K]]?: Partial<Record<Slots[number], StylableOverride>>;
    };
  };
  compoundVariants?: Array<{
    variants: { [K in keyof V]?: CompoundSelectionValue<VariantOptionKey<V, K>> };
    style: Partial<Record<Slots[number], StylableOverride>>;
  }>;
  vars?: Vars extends never ? never : Partial<ComponentVarValues<Vars>>;
};

export type MultiSlotOverrideConfig<
  Slots extends readonly string[],
  Vars extends ComponentVarDefinitions = never,
> = {
  base?: Partial<Record<Slots[number], StylableOverride>>;
  /** Multi-slot recipes have no variants — forbidden so excess keys type-error. */
  variants?: never;
  compoundVariants?: never;
  vars?: Vars extends never ? never : Partial<ComponentVarValues<Vars>>;
};

export type FlatOverrideConfig<K extends string, Vars extends ComponentVarDefinitions = never> = {
  base?: StylableOverride;
  vars?: Vars extends never ? never : Partial<ComponentVarValues<Vars>>;
} & Partial<Record<Exclude<K, 'base'>, StylableOverride>>;

type AnyOverrideConfig =
  | OverrideConfig<VariantDefinitions>
  | SlotOverrideConfig<readonly string[], SlotVariantDefinitions<string>>
  | MultiSlotOverrideConfig<readonly string[]>
  | FlatOverrideConfig<string>
  | Record<string, unknown>;

function normalizeOptionKey(value: unknown): string | null {
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (typeof value === 'string') return value;
  return null;
}

function prefixSelector(selector: string, selectorPrefix?: string): string {
  if (!selectorPrefix) return selector;
  return `${selectorPrefix} ${selector}`;
}

function overrideRuleKey(
  options: OverrideOptions<string> | undefined,
  selector: string,
  ruleKey: string,
): string {
  const layerSegment = options?.layer ?? '';
  const prefixSegment = options?.selectorPrefix ?? '';
  return `override:${prefixSegment}:${layerSegment}:${selector}:${ruleKey}`;
}

function serializeOptions(classNaming: ClassNamingConfig) {
  return {
    breakpoints: classNaming.breakpoints,
    colorModes: classNaming.colorModes,
  };
}

function splitStylableOverride(styles: StylableOverride): {
  unconditional: VariantOptionStyle;
  conditions: readonly ConditionalOverride[];
} {
  const { conditions, ...rest } = styles;
  // `rest`'s inferred type still carries StylableOverride's widened index signature (it
  // permits `readonly ConditionalOverride[]` to accommodate the now-stripped `conditions`
  // key) — safe to narrow back to VariantOptionStyle since `conditions` is destructured out.
  return { unconditional: rest as VariantOptionStyle, conditions: conditions ?? [] };
}

const CONDITIONAL_OVERRIDE_KEYS = new Set(['id', 'when', 'style']);

function validateConditionalOverride(entry: ConditionalOverride, index: number): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  let ok = true;

  for (const key of Object.keys(entry)) {
    if (!CONDITIONAL_OVERRIDE_KEYS.has(key)) {
      console.warn(
        `[typestyles] Unknown key "${key}" in override() conditions[${index}] — allowed: id, when, style.`,
      );
      ok = false;
    }
  }

  if (!entry.when) {
    console.warn(`[typestyles] override() conditions[${index}] is missing "when".`);
    ok = false;
  }

  if (entry.style == null) {
    console.warn(`[typestyles] override() conditions[${index}] is missing "style".`);
    ok = false;
  }

  return ok;
}

function insertOverrideRules(
  classNaming: ClassNamingConfig,
  keyed: Array<{ key: string; css: string }>,
  options: OverrideOptions<string> | undefined,
): void {
  if (options?.layer != null && options.layer !== '') {
    const stack = classNaming.cascadeLayers;
    if (!stack) {
      throw new Error(
        '[typestyles] `layer` in `override(…)` requires `createStyles({ layers: … })` on this styles instance.',
      );
    }
    assertOwnLayer(stack, options.layer, 'override(…)');
    insertRules(applyLayerToRules(keyed, options.layer, stack));
    return;
  }

  insertRules(keyed);
}

function emitUnconditionalRules(
  classNaming: ClassNamingConfig,
  selector: string,
  styles: VariantOptionStyle,
  options: OverrideOptions<string> | undefined,
  keySuffix: string,
): void {
  if (!styles || Object.keys(styles).length === 0) return;

  const prefixed = prefixSelector(selector, options?.selectorPrefix);
  const serialized = serializeStyle(
    prefixed,
    styles as CSSProperties,
    serializeOptions(classNaming),
  );
  const keyed = serialized.map((rule) => ({
    key: `${overrideRuleKey(options, prefixed, rule.key)}:${keySuffix}`,
    css: rule.css,
  }));
  insertOverrideRules(classNaming, keyed, options);
}

function emitConditionalRules(
  classNaming: ClassNamingConfig,
  selector: string,
  entry: ConditionalOverride,
  options: OverrideOptions<string> | undefined,
  branchKey: string,
): void {
  if (!entry.when || entry.style == null) return;
  if (Object.keys(entry.style).length === 0) return;

  const branches = compileThemeCondition(entry.when);
  if (branches.length === 0) return;

  const ctx: ConditionCompileContext = {
    anchor: selector,
    scopePrefix: options?.selectorPrefix,
  };

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    const conditionalSelector = buildSelectorForContext(ctx, branch);
    const serialized = serializeStyle(
      conditionalSelector,
      entry.style as CSSProperties,
      serializeOptions(classNaming),
    );
    const idSegment = entry.id ? `:${entry.id}` : '';
    const keyed = serialized.map((rule) => ({
      key: `${overrideRuleKey(options, conditionalSelector, rule.key)}:${branchKey}:cond${idSegment}:${i}`,
      css: wrapRuleCss(rule.css, branch.media),
    }));
    insertOverrideRules(classNaming, keyed, options);
  }
}

function emitStyledSelector(
  classNaming: ClassNamingConfig,
  selector: string,
  styles: StylableOverride,
  options: OverrideOptions<string> | undefined,
  keySuffix = 'base',
): void {
  const { unconditional, conditions } = splitStylableOverride(styles);

  emitUnconditionalRules(classNaming, selector, unconditional, options, keySuffix);

  conditions.forEach((entry, index) => {
    if (!validateConditionalOverride(entry, index)) return;
    emitConditionalRules(classNaming, selector, entry, options, `${keySuffix}:c${index}`);
  });
}

/** Build a {@link ConditionalOverride} — sugar over `{ when, style }`. */
export function conditional(
  when: ThemeCondition,
  style: VariantOptionStyle,
  id?: string,
): ConditionalOverride {
  return id != null ? { when, style, id } : { when, style };
}

function classFragmentsForDimension(
  optionMap: { [option: string]: string },
  expected: unknown,
): string[] {
  const values = Array.isArray(expected) ? expected : [expected];
  return values
    .map(normalizeOptionKey)
    .filter((selected): selected is string => selected != null && optionMap[selected] != null)
    .map((selected) => {
      const frag = optionMap[selected];
      return frag != null ? `.${frag}` : '';
    })
    .filter(Boolean);
}

function attributeFragmentsForDimension(
  optionMap: { [option: string]: string },
  expected: unknown,
): string[] {
  const values = Array.isArray(expected) ? expected : [expected];
  return values
    .map(normalizeOptionKey)
    .filter((selected): selected is string => selected != null && optionMap[selected] != null)
    .map((selected) => optionMap[selected] ?? '')
    .filter(Boolean);
}

/**
 * Validate every compound selection against `__tsMeta` before emission.
 * Returns false (and warns) when any dimension/option is unknown so we never
 * emit a silently narrower selector (e.g. intent-only instead of intent+size).
 */
function validateCompoundSelections(
  variants: VariantSelectorMap,
  selections: Record<string, unknown>,
): boolean {
  let ok = true;
  for (const [dimension, expected] of Object.entries(selections)) {
    const optionMap = variants[dimension];
    if (!optionMap) {
      warnDev(`Unknown variant dimension "${dimension}" in override() compoundVariants.`);
      ok = false;
      continue;
    }
    const values = Array.isArray(expected) ? expected : [expected];
    for (const value of values) {
      const key = normalizeOptionKey(value);
      if (key == null || optionMap[key] == null) {
        warnDev(
          `Unknown variant option "${dimension}.${String(value)}" in override() compoundVariants.`,
        );
        ok = false;
      }
    }
  }
  return ok;
}

function classCompoundSelector(
  variants: VariantSelectorMap,
  selections: Record<string, unknown>,
): string {
  const entries = Object.entries(selections);
  // Empty compound → no selector (do not emit a bare/base rule).
  if (entries.length === 0) return '';
  return entries
    .map(([dimension, expected]) => {
      const optionMap = variants[dimension];
      if (!optionMap) return '';
      return joinSelectorAlternatives(classFragmentsForDimension(optionMap, expected));
    })
    .join('');
}

function attributeCompoundSelector(
  baseClass: string,
  variants: VariantSelectorMap,
  selections: Record<string, unknown>,
): string {
  if (!baseClass) return '';
  const entries = Object.entries(selections);
  // Empty compound must not collapse to `.base` (unlike class mode which yields '').
  if (entries.length === 0) return '';
  const suffix = entries
    .map(([dimension, expected]) => {
      const optionMap = variants[dimension];
      if (!optionMap) return '';
      return joinSelectorAlternatives(attributeFragmentsForDimension(optionMap, expected));
    })
    .join('');
  if (!suffix) return '';
  return `.${baseClass}${suffix}`;
}

function isAttributeMode(meta: ComponentMeta): boolean {
  return meta.namingMode === 'attribute';
}

function warnDev(message: string): void {
  if (process.env.NODE_ENV === 'production') return;
  console.warn(`[typestyles] ${message}`);
}

function emitVarOverrides(
  classNaming: ClassNamingConfig,
  meta: ComponentMeta,
  config: Record<string, unknown>,
  options: OverrideOptions<string> | undefined,
): void {
  const varsInput = config.vars;
  if (varsInput == null || typeof varsInput !== 'object' || Array.isArray(varsInput)) return;
  if (Object.keys(varsInput).length === 0) return;

  const registry = meta.varRegistry;
  if (!registry) {
    warnDev(
      'override() `vars` was set but the component has no registered internal vars ' +
        '(declare them with top-level config `vars` or `c.vars()` in the recipe).',
    );
    return;
  }

  const hostClass = resolveVarHostClass(meta, registry);
  if (!hostClass) {
    warnDev('override() `vars` requires a resolvable var host class on the component.');
    return;
  }

  const declarations = resolveVarOverrides(registry, varsInput as Record<string, unknown>);
  if (Object.keys(declarations).length === 0) return;

  const { expanded, darkOnly } = expandVarOverrideDeclarations(
    declarations,
    classNaming.colorModes,
  );

  emitUnconditionalRules(
    classNaming,
    `.${hostClass}`,
    expanded as VariantOptionStyle,
    options,
    'vars',
  );

  if (darkOnly && Object.keys(darkOnly).length > 0) {
    emitStyledSelector(
      classNaming,
      `.${hostClass}`,
      {
        conditions: [conditional(when.prefersDark, darkOnly as VariantOptionStyle, 'vars-dark')],
      },
      options,
      'vars-dark',
    );
  }
}

/**
 * Resolve the cascade layer for an override emission.
 * When the instance has layers and callers omit `layer`, default to `"overrides"`
 * if that name exists — avoiding unlayered CSS that beats the entire stack
 * (including `utilities`). Custom layer stacks without `"overrides"` must pass
 * `{ layer }` explicitly.
 */
function resolveOverrideLayer(
  classNaming: ClassNamingConfig,
  options: OverrideOptions<string> | undefined,
): string | undefined {
  if (options?.layer != null && options.layer !== '') {
    return options.layer;
  }
  const stack = classNaming.cascadeLayers;
  if (!stack) return undefined;
  if (stack.ownOrder.includes('overrides')) {
    return 'overrides';
  }
  throw new Error(
    '[typestyles] `override(…)` on a layered styles instance requires `{ layer: … }` ' +
      '(or include an `"overrides"` layer in `createStyles({ layers })` to default). ' +
      `Expected one of: ${stack.ownOrder.map((l) => `"${l}"`).join(', ')}.`,
  );
}

function resolveVariantSelector(
  meta: DimensionedComponentMeta,
  dimension: string,
  option: string,
): string | null {
  const frag = meta.variants[dimension]?.[option];
  if (frag == null) return null;
  if (isAttributeMode(meta)) {
    if (!meta.base) return null;
    return `.${meta.base}${frag}`;
  }
  return `.${frag}`;
}

function resolveSlotVariantSelector(
  meta: SlotComponentMeta,
  slot: string,
  dimension: string,
  option: string,
): string | null {
  const frag = meta.variants[slot]?.[dimension]?.[option];
  if (frag == null) return null;
  const base = meta.base[slot];
  if (base == null) return null;
  if (isAttributeMode(meta)) return `.${base}${frag}`;
  return `.${frag}`;
}

function emitDimensionedOverride(
  classNaming: ClassNamingConfig,
  meta: DimensionedComponentMeta,
  config: OverrideConfig<VariantDefinitions>,
  options: OverrideOptions<string> | undefined,
): void {
  if (config.base) {
    if (!meta.base) {
      warnDev('override() `base` requires a component with a base class (meta.base is empty).');
    } else {
      emitStyledSelector(classNaming, `.${meta.base}`, config.base, options);
    }
  }

  if (config.variants) {
    for (const [dimension, optionsMap] of Object.entries(config.variants)) {
      if (!optionsMap) continue;
      if (!meta.variants[dimension]) {
        warnDev(`Unknown variant dimension "${dimension}" in override().`);
        continue;
      }
      for (const [option, style] of Object.entries(optionsMap)) {
        if (!style) continue;
        if (meta.variants[dimension]?.[option] == null) {
          warnDev(`Unknown variant option "${dimension}.${option}" in override().`);
          continue;
        }
        const selector = resolveVariantSelector(meta, dimension, option);
        if (selector) emitStyledSelector(classNaming, selector, style, options);
      }
    }
  }

  if (config.compoundVariants) {
    for (const cv of config.compoundVariants) {
      const selections = cv.variants as Record<string, unknown>;
      if (!validateCompoundSelections(meta.variants, selections)) continue;
      const selector = isAttributeMode(meta)
        ? attributeCompoundSelector(meta.base, meta.variants, selections)
        : classCompoundSelector(meta.variants, selections);
      if (!selector) continue;
      emitStyledSelector(classNaming, selector, cv.style, options);
    }
  }
}

function emitFlatOverride(
  classNaming: ClassNamingConfig,
  meta: FlatComponentMeta,
  config: FlatOverrideConfig<string>,
  options: OverrideOptions<string> | undefined,
): void {
  if (config.base) {
    if (!meta.base) {
      warnDev('override() `base` requires a component with a base class (meta.base is empty).');
    } else {
      emitStyledSelector(classNaming, `.${meta.base}`, config.base, options);
    }
  }

  for (const [key, style] of Object.entries(config)) {
    if (key === 'base' || key === 'vars' || style == null || typeof style !== 'object') continue;
    if (!meta.variants[key]) {
      warnDev(`Unknown flat variant "${key}" in override().`);
      continue;
    }
    emitStyledSelector(classNaming, `.${meta.variants[key]}`, style as VariantOptionStyle, options);
  }
}

function emitMultiSlotOverride(
  classNaming: ClassNamingConfig,
  meta: MultiSlotComponentMeta,
  config: MultiSlotOverrideConfig<readonly string[]>,
  options: OverrideOptions<string> | undefined,
): void {
  if (!config.base) return;
  for (const [slot, style] of Object.entries(config.base)) {
    if (!style) continue;
    if (!meta.base[slot] && !meta.slots.includes(slot)) {
      warnDev(`Unknown slot "${slot}" in override().`);
      continue;
    }
    const baseClass = meta.base[slot];
    if (!baseClass) {
      warnDev(`Unknown slot "${slot}" in override().`);
      continue;
    }
    emitStyledSelector(classNaming, `.${baseClass}`, style, options);
  }
}

function emitSlotOverride(
  classNaming: ClassNamingConfig,
  meta: SlotComponentMeta,
  config: SlotOverrideConfig<readonly string[], SlotVariantDefinitions<string>>,
  options: OverrideOptions<string> | undefined,
): void {
  if (config.base) {
    for (const [slot, style] of Object.entries(config.base)) {
      if (!style) continue;
      const baseClass = meta.base[slot];
      if (!baseClass) {
        warnDev(`Unknown slot "${slot}" in override().`);
        continue;
      }
      emitStyledSelector(classNaming, `.${baseClass}`, style, options);
    }
  }

  if (config.variants) {
    for (const [dimension, optionsMap] of Object.entries(config.variants)) {
      if (!optionsMap) continue;
      for (const [option, slotStyles] of Object.entries(optionsMap)) {
        if (!slotStyles) continue;
        for (const [slot, style] of Object.entries(slotStyles)) {
          if (!style) continue;
          if (!meta.variants[slot]?.[dimension]?.[option]) {
            warnDev(`Unknown slot variant "${slot}.${dimension}.${option}" in override().`);
            continue;
          }
          const selector = resolveSlotVariantSelector(meta, slot, dimension, option);
          if (selector) emitStyledSelector(classNaming, selector, style, options);
        }
      }
    }
  }

  if (config.compoundVariants) {
    for (const cv of config.compoundVariants) {
      const selections = cv.variants as Record<string, unknown>;
      for (const [slot, style] of Object.entries(cv.style ?? {})) {
        if (!style) continue;
        const slotVariants = meta.variants[slot];
        const baseClass = meta.base[slot];
        if (!slotVariants || !baseClass) {
          warnDev(`Unknown slot "${slot}" in override() compoundVariants.`);
          continue;
        }
        if (!validateCompoundSelections(slotVariants, selections)) continue;
        const selector = isAttributeMode(meta)
          ? attributeCompoundSelector(baseClass, slotVariants, selections)
          : classCompoundSelector(slotVariants, selections);
        if (!selector) continue;
        emitStyledSelector(classNaming, selector, style, options);
      }
    }
  }
}

/**
 * Emit recipe-shaped component overrides from `__tsMeta`.
 * Call on the same `styles` instance that created the component — cross-instance
 * calls (component from `stylesA`, `stylesB.override(…)`) are unsupported.
 */
export function createOverride(
  classNaming: ClassNamingConfig,
  component: object,
  config: AnyOverrideConfig,
  options?: OverrideOptions<string>,
): void {
  const meta = getComponentMeta(component);
  if (!meta) {
    warnDev('override() requires a recipe() return with metadata.');
    return;
  }

  if (!SUPPORTED_OVERRIDE_MODES.has(meta.namingMode)) {
    warnDev(
      `override() does not support naming mode "${meta.namingMode}" in v1 (supported: semantic, bem, template, attribute).`,
    );
    return;
  }

  const layer = resolveOverrideLayer(classNaming, options);
  const resolvedOptions: OverrideOptions<string> | undefined =
    layer != null ? { ...options, layer } : options;

  const configRecord = config as Record<string, unknown>;
  emitVarOverrides(classNaming, meta, configRecord, resolvedOptions);

  switch (meta.kind) {
    case 'dimensioned':
      emitDimensionedOverride(
        classNaming,
        meta,
        config as OverrideConfig<VariantDefinitions>,
        resolvedOptions,
      );
      break;
    case 'flat':
      emitFlatOverride(classNaming, meta, config as FlatOverrideConfig<string>, resolvedOptions);
      break;
    case 'multi-slot':
      emitMultiSlotOverride(
        classNaming,
        meta,
        config as MultiSlotOverrideConfig<readonly string[]>,
        resolvedOptions,
      );
      break;
    case 'slot':
      emitSlotOverride(
        classNaming,
        meta,
        config as SlotOverrideConfig<readonly string[], SlotVariantDefinitions<string>>,
        resolvedOptions,
      );
      break;
  }
}

/**
 * Infer var definitions stamped on a component return (`varDefinitions` option or Pattern A export).
 */
export type InferVarDefinitions<C> = C extends {
  readonly __varDefinitions: infer D extends ComponentVarDefinitions;
}
  ? D
  : never;

/**
 * Axis → option → style map, derived from a schema definition.
 * Option keys are the style-map keys (`'true' | 'false'` for boolean axes).
 */
type SchemaVariantStyleMap<Def extends RecipeDefinition> = {
  [K in keyof Def['variants']]: {
    [O in RecipeOptionsFor<Def['variants'][K]>]: VariantOptionStyle;
  };
};

/** Axis → option → per-slot style map, for slotted schema definitions. */
type SchemaSlotVariantStyleMap<Def extends RecipeDefinition, S extends string> = {
  [K in keyof Def['variants']]: {
    [O in RecipeOptionsFor<Def['variants'][K]>]: Partial<Record<S, VariantOptionStyle>>;
  };
};

/**
 * Vars to thread into an override config.
 *
 * Schema handles always carry a `Vars` type parameter. Recipes that never called
 * `c.vars()` use the unconstrained `ComponentVarDefinitions` fallback (`string` index).
 * Collapse that to `never` so `vars` is forbidden, matching legacy recipes with no
 * var schema. A declared `c.vars()` object has specific keys, so it passes through.
 */
type SchemaOverrideVars<Vars extends ComponentVarDefinitions> = string extends keyof Vars
  ? never
  : Vars;

/**
 * `override()` config for a schema-first recipe handle.
 *
 * Discriminated by {@link RecipeHandle}'s definition brand, so axis and option keys
 * stay narrow. The `Vars` parameter of {@link OverrideConfigFor} is ignored here —
 * schema vars are read off the handle.
 */
export type SchemaOverrideConfigFor<C> =
  C extends RecipeHandle<infer Def, infer _Element, infer Vars>
    ? RecipeHasSlots<Def> extends true
      ? SlotOverrideConfig<
          readonly RecipeSlots<Def>[],
          SchemaSlotVariantStyleMap<Def, RecipeSlots<Def>>,
          SchemaOverrideVars<Vars>
        >
      : OverrideConfig<SchemaVariantStyleMap<Def>, SchemaOverrideVars<Vars>>
    : never;

/**
 * Infer the `override()` config shape from a component return type.
 * Branches mirror {@link OverrideFn}.
 *
 * Schema handles are tested first via `defaults` — every {@link RecipeHandle} has it, and
 * no legacy return shape does. Axis unions come from the definition brand inside
 * {@link SchemaOverrideConfigFor}.
 */
export type OverrideConfigFor<
  C,
  Vars extends ComponentVarDefinitions = InferVarDefinitions<C>,
> = C extends { readonly defaults: Record<string, unknown> }
  ? SchemaOverrideConfigFor<C>
  : C extends ComponentReturn<infer V> | ComponentAttrsReturn<infer V>
    ? OverrideConfig<V, Vars>
    : C extends FlatComponentReturn<infer K>
      ? FlatOverrideConfig<K, Vars>
      : C extends MultiSlotReturn<infer Slots>
        ? MultiSlotOverrideConfig<Slots, Vars>
        : C extends
              | SlotComponentFunction<infer Slots, infer V>
              | SlotAttrsReturn<infer Slots, infer V>
          ? SlotOverrideConfig<Slots, V, Vars>
          : never;

/** Overload surface mirrored on `override`. */
export type OverrideFn<L extends string = string> = {
  /**
   * Schema-first recipes. First so a handle (a function with `defaults`) is not matched
   * structurally by a later slot overload. `defaults` is the discriminator — every schema
   * handle has it, no legacy return does.
   */
  <C extends { readonly defaults: Record<string, unknown> }>(
    component: C,
    config: SchemaOverrideConfigFor<C>,
    options?: OverrideOptions<L>,
  ): void;
  /** Recipes with stamped `__varDefinitions` (config `vars` or `{ varDefinitions }` option). */
  <C extends { readonly __varDefinitions: ComponentVarDefinitions }>(
    component: C,
    config: OverrideConfigFor<C>,
    options?: OverrideOptions<L>,
  ): void;
  <const V extends VariantDefinitions>(
    component: ComponentReturn<V> | ComponentAttrsReturn<V>,
    config: OverrideConfig<NoInfer<V>>,
    options?: OverrideOptions<L>,
  ): void;
  <const K extends string>(
    component: FlatComponentReturn<K>,
    config: FlatOverrideConfig<NoInfer<K>>,
    options?: OverrideOptions<L>,
  ): void;
  /** Multi-slot before slot-with-variants so branded multi returns do not widen `V`. */
  <const Slots extends readonly string[]>(
    component: MultiSlotReturn<Slots>,
    config: MultiSlotOverrideConfig<Slots>,
    options?: OverrideOptions<L>,
  ): void;
  <const Slots extends readonly string[], V extends SlotVariantDefinitions<Slots[number]>>(
    component: (SlotComponentFunction<Slots, V> | SlotAttrsReturn<Slots, V>) & {
      /** Reject branded multi-slot returns so invalid configs do not fall through here. */
      __tsMultiSlot?: never;
    },
    config: SlotOverrideConfig<NoInfer<Slots>, NoInfer<V>>,
    options?: OverrideOptions<L>,
  ): void;
};
