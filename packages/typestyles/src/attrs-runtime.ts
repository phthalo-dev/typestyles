/**
 * Minimal runtime for attribute-mode recipes: everything a recipe *call* needs
 * (selection -> `className` + `data-*` attrs) and nothing that generates CSS.
 *
 * Shared by `component.ts` (full runtime) and the `typestyles/lite` entry used
 * by compile-time-transformed zero-runtime builds. Keep this module free of
 * imports from the CSS pipeline so the lite entry stays tiny.
 */
import type { ComponentAttrsResult } from './types';

export function isBooleanOptionKeys(optionKeys: readonly string[]): boolean {
  return optionKeys.length === 2 && optionKeys.includes('true') && optionKeys.includes('false');
}

export function toDataAttributeName(dimension: string): string {
  const kebab = dimension
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
  return `data-${kebab}`;
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

export function normalizeSelection(
  value: unknown,
  options: Record<string, unknown>,
): string | undefined {
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
export function makeCallableObject(
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

/** Serializable description of a recipe's call behavior (see `typestyles/lite`). */
export type AttrsRecipePlan =
  | {
      kind: 'attrs';
      namespace: string;
      /** Base class emitted on every call. */
      base: string;
      /** dimension -> declared option keys (in declaration order). */
      dimensions: Record<string, string[]>;
      /** dimension -> default option (same shape as `defaultVariants`). */
      defaults: Record<string, unknown>;
    }
  | {
      /** Class-name modes (semantic/bem/template/hashed/...): classes joined from selections. */
      kind: 'classes';
      namespace: string;
      /** Class emitted first on every call, when the recipe has a base style. */
      base?: string;
      /** `base` and each `dimension-option` key -> class (also exposed as handle props). */
      classMap: Record<string, string>;
      dimensions: Record<string, string[]>;
      defaults: Record<string, unknown>;
      /** `dimension-option` -> class. */
      variantClasses: Record<string, string>;
      /** Compound variants that add a class when every `when` axis matches. */
      compounds: Array<{ when: Record<string, unknown>; className: string }>;
    }
  | {
      /** Slot recipes in class-name modes: per-slot class lists. */
      kind: 'class-slots';
      namespace: string;
      /** slot -> base class. */
      slots: Record<string, string>;
      dimensions: Record<string, string[]>;
      defaults: Record<string, unknown>;
      /** `slot-dimension-option` -> class. */
      variantClasses: Record<string, string>;
    }
  | {
      /** Flat recipe: `base` plus modifier classes switched on by truthy selections. */
      kind: 'flat';
      namespace: string;
      /** `base` and each modifier key -> class. */
      classMap: Record<string, string>;
      /** Modifier keys, in declaration order. */
      variantKeys: string[];
    }
  | {
      /** Slots without variants: a call returns the slot -> class map. */
      kind: 'multi-slot';
      namespace: string;
      slots: Record<string, string>;
    }
  | {
      kind: 'attrs-slots';
      namespace: string;
      /** slot -> base class emitted for that slot on every call. */
      slots: Record<string, string>;
      dimensions: Record<string, string[]>;
      defaults: Record<string, unknown>;
    };

function resolvePlanAttrs(
  dimensions: Record<string, string[]>,
  defaults: Record<string, unknown>,
  selections: Record<string, unknown>,
): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const dimension of Object.keys(dimensions)) {
    const optionKeys = dimensions[dimension]!;
    const optionMap: Record<string, unknown> = {};
    for (const key of optionKeys) optionMap[key] = true;
    const selected = normalizeSelection(selections[dimension] ?? defaults[dimension], optionMap);
    if (selected == null) continue;
    if (isBooleanOptionKeys(optionKeys)) {
      if (selected === 'true') attrs[toDataAttributeName(dimension)] = '';
    } else {
      attrs[toDataAttributeName(dimension)] = selected;
    }
  }
  return attrs;
}

function withDefaults(handle: object, defaults: Record<string, unknown>): object {
  Object.defineProperty(handle, 'defaults', {
    value: { ...defaults },
    enumerable: true,
    writable: false,
    configurable: false,
  });
  return handle;
}

/**
 * Rebuild a recipe handle from its plan: same call shape and results as the
 * full runtime (dev-only warnings aside), without any CSS machinery.
 */
export function createAttrsRecipeFromPlan(plan: AttrsRecipePlan): unknown {
  if (plan.kind === 'classes') return createClassesRecipe(plan);
  if (plan.kind === 'class-slots') return createClassSlotsRecipe(plan);
  if (plan.kind === 'flat') {
    const { classMap, variantKeys } = plan;
    // `recipe()` presents flat results as attrs results (see `presentRecipeHandle`).
    return withDefaults(
      makeCallableObject((...args: unknown[]) => {
        const selections = (args[0] ?? {}) as Record<string, unknown>;
        const classes: string[] = [];
        if (classMap['base']) classes.push(classMap['base']);
        for (const key of variantKeys) {
          if (selections[key] && classMap[key]) classes.push(classMap[key]!);
        }
        return createComponentAttrsResult(classes.join(' '));
      }, classMap) as object,
      {},
    );
  }
  if (plan.kind === 'multi-slot') {
    const { slots } = plan;
    // Presented as per-slot attrs results (see `presentRecipeHandle`).
    return withDefaults(
      makeMultiSlotObject(() => {
        const result: Record<string, ComponentAttrsResult> = {};
        for (const slot of Object.keys(slots)) {
          result[slot] = createComponentAttrsResult(slots[slot] || '');
        }
        return result as never;
      }, slots) as object,
      {},
    );
  }
  const { dimensions, defaults } = plan;
  if (plan.kind === 'attrs-slots') {
    const slotNames = Object.keys(plan.slots);
    const handle = (selections: Record<string, unknown> = {}) => {
      const attrs = resolvePlanAttrs(dimensions, defaults, selections);
      return Object.fromEntries(
        slotNames.map((slot) => [slot, createComponentAttrsResult(plan.slots[slot]!, attrs)]),
      );
    };
    return withDefaults(handle, defaults);
  }
  const { base } = plan;
  const handle = makeCallableObject(
    (...args: unknown[]) =>
      createComponentAttrsResult(
        base,
        resolvePlanAttrs(dimensions, defaults, (args[0] ?? {}) as Record<string, unknown>),
      ),
    { base },
  ) as object;
  return withDefaults(handle, defaults);
}

export function makeMultiSlotObject(
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

/** Selected option per dimension, after defaults (mirrors the full runtime's resolution). */
function resolveSelected(
  dimensions: Record<string, string[]>,
  defaults: Record<string, unknown>,
  selections: Record<string, unknown>,
): Record<string, string | undefined> {
  const selected: Record<string, string | undefined> = {};
  for (const dimension of Object.keys(dimensions)) {
    const optionMap: Record<string, unknown> = {};
    for (const key of dimensions[dimension]!) optionMap[key] = true;
    selected[dimension] = normalizeSelection(
      selections[dimension] ?? defaults[dimension],
      optionMap,
    );
  }
  return selected;
}

function createClassesRecipe(plan: Extract<AttrsRecipePlan, { kind: 'classes' }>): unknown {
  const { base, classMap, dimensions, defaults, variantClasses, compounds } = plan;
  const handle = makeCallableObject((...args: unknown[]) => {
    const selected = resolveSelected(
      dimensions,
      defaults,
      (args[0] ?? {}) as Record<string, unknown>,
    );
    const classes: string[] = [];
    if (base) classes.push(base);
    for (const dimension of Object.keys(dimensions)) {
      const option = selected[dimension];
      if (option != null) {
        const className = variantClasses[`${dimension}-${option}`];
        if (className) classes.push(className);
      }
    }
    for (const { when, className } of compounds) {
      const matches = Object.keys(when).every((dimension) => {
        const optionKeys = dimensions[dimension];
        const current = selected[dimension];
        if (!optionKeys || current == null) return false;
        const optionMap: Record<string, unknown> = {};
        for (const key of optionKeys) optionMap[key] = true;
        const expected = when[dimension];
        return Array.isArray(expected)
          ? expected.some((value) => normalizeSelection(value, optionMap) === current)
          : normalizeSelection(expected, optionMap) === current;
      });
      if (matches) classes.push(className);
    }
    return createComponentAttrsResult(classes.join(' '));
  }, classMap) as object;
  return withDefaults(handle, defaults);
}

function createClassSlotsRecipe(plan: Extract<AttrsRecipePlan, { kind: 'class-slots' }>): unknown {
  const { slots, dimensions, defaults, variantClasses } = plan;
  const slotNames = Object.keys(slots);
  const handle = (selections: Record<string, unknown> = {}) => {
    const selected = resolveSelected(dimensions, defaults, selections);
    const classes: Record<string, string[]> = {};
    for (const slot of slotNames) classes[slot] = [slots[slot]!];
    for (const dimension of Object.keys(dimensions)) {
      const option = selected[dimension];
      if (option == null) continue;
      for (const slot of slotNames) {
        const className = variantClasses[`${slot}-${dimension}-${option}`];
        if (className) classes[slot]!.push(className);
      }
    }
    return Object.fromEntries(
      slotNames.map((slot) => [slot, createComponentAttrsResult(classes[slot]!.join(' '))]),
    );
  };
  return withDefaults(handle, defaults);
}
