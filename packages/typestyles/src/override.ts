import type { ClassNamingConfig } from './class-naming';
import {
  getComponentMeta,
  type ComponentMeta,
  type ComponentVarRegistry,
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
  resolveVarSlotClass,
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
  RecipeDefinitionOf,
  RecipeHasSlots,
  RecipeOptionsFor,
  RecipeSlots,
} from './schema-recipe';
import type { VariantAxis } from './variant';
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
  InferComponentVarRefTreeDefinitions,
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

  emitVarOverrideDeclarations(classNaming, `.${hostClass}`, declarations, options, 'vars');

  for (const slot of extraVarSlots(registry, declarations)) {
    const slotClass = resolveVarSlotClass(meta, slot);
    if (!slotClass || slotClass === hostClass) {
      if (!slotClass) {
        warnDev(
          `override() vars slot "${slot}" is not a slot on this recipe — ` +
            `the override stays on the host.`,
        );
      }
      continue;
    }
    emitVarOverrideDeclarations(
      classNaming,
      `.${slotClass}`,
      declarationsForSlot(registry, declarations, slot),
      options,
      `vars-${slot}`,
    );
  }
}

function extraVarSlots(
  registry: ComponentVarRegistry,
  declarations: Record<string, string | { light: string; dark: string }>,
): string[] {
  const slots: string[] = [];
  for (const name of Object.keys(declarations)) {
    const registered = registry.vars.find((entry) => entry.name === name);
    for (const slot of registered?.slots ?? []) {
      if (slot === registry.hostSlot || slots.includes(slot)) continue;
      slots.push(slot);
    }
  }
  return slots;
}

function declarationsForSlot(
  registry: ComponentVarRegistry,
  declarations: Record<string, string | { light: string; dark: string }>,
  slot: string,
): Record<string, string | { light: string; dark: string }> {
  const subset: Record<string, string | { light: string; dark: string }> = {};
  for (const [name, value] of Object.entries(declarations)) {
    const registered = registry.vars.find((entry) => entry.name === name);
    if (registered?.slots?.includes(slot)) subset[name] = value;
  }
  return subset;
}

function emitVarOverrideDeclarations(
  classNaming: ClassNamingConfig,
  selector: string,
  declarations: Record<string, string | { light: string; dark: string }>,
  options: OverrideOptions<string> | undefined,
  keySuffix: string,
): void {
  const { expanded, darkOnly } = expandVarOverrideDeclarations(
    declarations,
    classNaming.colorModes,
  );

  emitUnconditionalRules(classNaming, selector, expanded as VariantOptionStyle, options, keySuffix);

  if (darkOnly && Object.keys(darkOnly).length > 0) {
    emitStyledSelector(
      classNaming,
      selector,
      {
        conditions: [
          conditional(when.prefersDark, darkOnly as VariantOptionStyle, `${keySuffix}-dark`),
        ],
      },
      options,
      `${keySuffix}-dark`,
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
 * Infer var definitions stamped on a component return (`config.vars` or `c.vars()`).
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
type SchemaAxes<Def extends RecipeDefinition> =
  Def['variants'] extends Record<string, VariantAxis>
    ? {
        [
          K in keyof Def['variants'] as string extends K ? never : number extends K ? never : K
        ]: Def['variants'][K];
      }
    : Record<never, VariantAxis>;

type SchemaAxisAt<Def extends RecipeDefinition, K extends keyof SchemaAxes<Def>> = Extract<
  SchemaAxes<Def>[K],
  VariantAxis
>;

type SchemaVariantStyleMap<Def extends RecipeDefinition> = {
  [K in keyof SchemaAxes<Def>]: {
    [O in RecipeOptionsFor<SchemaAxisAt<Def, K>>]: VariantOptionStyle;
  };
};

/** Axis → option → per-slot style map, for slotted schema definitions. */
type SchemaSlotVariantStyleMap<Def extends RecipeDefinition, S extends string> = {
  [K in keyof SchemaAxes<Def>]: {
    [O in RecipeOptionsFor<SchemaAxisAt<Def, K>>]: Partial<Record<S, VariantOptionStyle>>;
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
type HandleVars<C> = C extends { readonly vars: infer V }
  ? InferComponentVarRefTreeDefinitions<V>
  : never;

export type SchemaOverrideConfigFor<C> =
  RecipeDefinitionOf<C> extends infer Def extends RecipeDefinition
    ? [Def] extends [never]
      ? never
      : RecipeHasSlots<Def> extends true
        ? keyof SchemaAxes<Def> extends never
          ? MultiSlotOverrideConfig<readonly RecipeSlots<Def>[], SchemaOverrideVars<HandleVars<C>>>
          : SlotOverrideConfig<
              readonly RecipeSlots<Def>[],
              SchemaSlotVariantStyleMap<Def, RecipeSlots<Def>>,
              SchemaOverrideVars<HandleVars<C>>
            >
        : keyof SchemaAxes<Def> extends never
          ? {
              base?: StylableOverride;
              variants?: never;
              compoundVariants?: never;
              vars?: SchemaOverrideVars<HandleVars<C>> extends never
                ? never
                : Partial<ComponentVarValues<SchemaOverrideVars<HandleVars<C>>>>;
            }
          : OverrideConfig<SchemaVariantStyleMap<Def>, SchemaOverrideVars<HandleVars<C>>>
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

/**
 * Token bag passed to an override / theme style callback.
 * Every segment is both a nested bag and a `{ name, var }` ref, so
 * `tokens.color.border.default.var` typechecks without a registry generic.
 */
export interface OverrideTokenNode {
  readonly name: string;
  readonly var: string;
  /** Nested token bags. `any` keeps `tokens.color.border.default.var` reachable. */
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  readonly [key: string]: any;
}

export type OverrideStyleContext<C> = {
  readonly vars: C extends { readonly vars: infer V } ? V : Record<never, never>;
  readonly tokens: OverrideTokenNode;
};

type OverrideStyleMap<C> = Omit<OverrideConfigFor<C>, 'vars'>;

type OverrideVarAssign<C> = OverrideConfigFor<C> extends { vars?: infer V } ? V : never;

/**
 * One `override({ recipe, styles, ... })` call. `layer` and `selectorPrefix` sit on the
 * object. `styles` is partial against the recipe's slots and axes.
 */
export type OverrideFn<L extends string = string> = <C extends object>(input: {
  readonly recipe: C;
  readonly selectorPrefix?: string;
  readonly layer?: L;
  readonly vars?: OverrideVarAssign<C>;
  readonly styles?: OverrideStyleMap<C> | ((ctx: OverrideStyleContext<C>) => OverrideStyleMap<C>);
}) => void;
