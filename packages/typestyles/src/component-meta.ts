import type { ClassNamingMode } from './class-naming';

const COMPONENT_META = '__tsMeta';

export type VariantSelectorMap = {
  /** dimension → option → selector fragment */
  [dimension: string]: { [option: string]: string };
};

export type SlotVariantSelectorMap = {
  [slot: string]: VariantSelectorMap;
};

export type RegisteredComponentVar = {
  /** Logical path: `border`, `padding-outer-x` */
  path: string;
  /** Full custom property name: `--var-ui-side-nav-border` */
  name: string;
  syntax?: string;
  defaultValue?: string;
};

export type ComponentVarRegistry = {
  hostSlot: string;
  vars: RegisteredComponentVar[];
  byPath: Map<string, RegisteredComponentVar>;
};

export type ComponentMetaBase = {
  namespace: string;
  /**
   * Naming mode of the creating `styles` instance. Emission branches on this
   * (class conjunction vs attribute conjunction).
   */
  namingMode: ClassNamingMode;
  /** Internal vars registered via `c.var()` / `c.vars()` during recipe definition. */
  varRegistry?: ComponentVarRegistry;
  /**
   * Schema for recipes created with the schema-first `recipe(namespace, definition, …)`
   * call shape (Issue #259). Absent for recipes using the legacy config shapes.
   */
  schema?: RecipeSchemaMeta;
};

/** One axis in a schema recipe's metadata: enum options or a boolean default. */
export type RecipeSchemaAxis =
  | { kind: 'enum'; options: readonly string[]; default: string }
  | { kind: 'boolean'; default: boolean };

/** Routing metadata for docs generators: declared slots and axes with their defaults. */
export type RecipeSchemaMeta = {
  slots?: readonly string[];
  variants: Record<string, RecipeSchemaAxis>;
};

/** Class modes: full class name without dot. Attribute: attr fragment only. */
export type DimensionedComponentMeta = ComponentMetaBase & {
  kind: 'dimensioned';
  base: string;
  variants: VariantSelectorMap;
};

export type FlatComponentMeta = ComponentMetaBase & {
  kind: 'flat';
  base: string;
  /** Flat variant key → class name (no dimensions). */
  variants: Record<string, string>;
};

export type SlotComponentMeta = ComponentMetaBase & {
  kind: 'slot';
  slots: readonly string[];
  base: Record<string, string>;
  variants: SlotVariantSelectorMap;
};

export type MultiSlotComponentMeta = ComponentMetaBase & {
  kind: 'multi-slot';
  slots: readonly string[];
  base: Record<string, string>;
  /** Multi-slot recipes have no variants. */
  variants?: undefined;
};

export type ComponentMeta =
  | DimensionedComponentMeta
  | FlatComponentMeta
  | SlotComponentMeta
  | MultiSlotComponentMeta;

type MetaCarrier = object & {
  [COMPONENT_META]?: ComponentMeta;
};

/**
 * First class token from a possibly space-separated class list (atomic mode).
 * Override v1 skips unsupported modes, but meta still records a usable token.
 */
export function firstClassToken(classNames: string): string {
  const trimmed = classNames.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] ?? '';
}

export function buildClassVariantSelectorMap(
  variants: Record<string, Record<string, unknown>>,
  classForOption: (dimension: string, option: string) => string,
): VariantSelectorMap {
  const map: VariantSelectorMap = {};
  for (const [dimension, options] of Object.entries(variants)) {
    const optionMap: { [option: string]: string } = {};
    for (const option of Object.keys(options)) {
      optionMap[option] = firstClassToken(classForOption(dimension, option));
    }
    map[dimension] = optionMap;
  }
  return map;
}

export function attachComponentMeta(target: object, meta: ComponentMeta): void {
  Object.defineProperty(target, COMPONENT_META, {
    value: meta,
    enumerable: false,
    writable: false,
    configurable: true,
  });
}

/**
 * Read the public component metadata blob attached by `recipe()`.
 * Returns `undefined` when the value is not a TypeStyles component return.
 */
export function getComponentMeta(component: object): ComponentMeta | undefined {
  return (component as MetaCarrier)[COMPONENT_META];
}

/** Attach or merge `varRegistry` onto an existing component metadata blob. */
export function attachVarRegistry(
  target: object,
  varRegistry: ComponentVarRegistry | undefined,
): void {
  if (!varRegistry) return;
  const existing = getComponentMeta(target);
  if (!existing) return;
  Object.defineProperty(target, COMPONENT_META, {
    value: { ...existing, varRegistry },
    enumerable: false,
    writable: false,
    configurable: true,
  });
}

/** Attach or merge the schema blob onto an existing component metadata (Issue #259). */
export function attachComponentSchema(target: object, schema: RecipeSchemaMeta | undefined): void {
  if (!schema) return;
  const existing = getComponentMeta(target);
  if (!existing) return;
  Object.defineProperty(target, COMPONENT_META, {
    value: { ...existing, schema },
    enumerable: false,
    writable: false,
    configurable: true,
  });
}

/** Stamp `__varDefinitions` for `OverrideConfigFor` inference (Pattern B). */
export function stampVarDefinitionsBrand(
  target: object,
  definitions: Record<string, unknown> | undefined,
): void {
  if (!definitions) return;
  Object.defineProperty(target, '__varDefinitions', {
    value: definitions,
    enumerable: false,
    writable: false,
    configurable: true,
  });
}

/** Expose registered var refs on the component return (`sideNav.vars.border.var`). */
export function attachComponentVars(target: object, vars: object | undefined): void {
  if (!vars) return;
  Object.defineProperty(target, 'vars', {
    value: vars,
    enumerable: true,
    writable: false,
    configurable: true,
  });
}
