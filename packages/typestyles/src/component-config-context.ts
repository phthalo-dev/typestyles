import { sanitizeClassSegment, scopedTokenNamespace, type ClassNamingConfig } from './class-naming';
import type { ComponentVarRegistry, RegisteredComponentVar } from './component-meta';
import { finalizeVarRegistry, resolveVarHostSlot } from './component-var-overrides';
import {
  createRegisteredPropertyRef,
  registerAtPropertyRule,
  registerAtPropertySchema,
} from './registered-property';
import { flattenTokenSchema } from './token-schema';
import type {
  ComponentConfigContext,
  ComponentInternalVarRef,
  ComponentVarDefinitions,
  ComponentVarDescriptor,
  ComponentVarNode,
  ComponentVarOptions,
  ComponentVarRefTree,
  ComponentVarSchema,
  InferFromSchema,
  PropertyRegistration,
} from './types';
import { componentVarDefinitionsKey } from './types';

function isVarDescriptor(o: unknown): o is ComponentVarDescriptor {
  return (
    typeof o === 'object' &&
    o !== null &&
    'value' in o &&
    (typeof (o as { value: unknown }).value === 'string' ||
      typeof (o as { value: unknown }).value === 'number')
  );
}

export type FlatComponentVarEntry = {
  path: string;
  value: string;
  syntax?: string;
  inherits?: boolean;
  initial?: string | number;
  /** Extra slots that receive this default, in addition to the host. */
  slots?: readonly string[];
};

function readVarSlots(value: { slots?: unknown }): readonly string[] | undefined {
  if (!Array.isArray(value.slots)) return undefined;
  const slots: string[] = [];
  for (const slot of value.slots) {
    if (typeof slot === 'string' && slot !== '' && !slots.includes(slot)) slots.push(slot);
  }
  return slots.length > 0 ? slots : undefined;
}

/**
 * Flatten nested var definitions (same nesting rules as tokens) into dashed paths.
 */
export function flattenComponentVars(
  obj: Record<string, ComponentVarNode>,
  prefix = '',
): FlatComponentVarEntry[] {
  const out: FlatComponentVarEntry[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'string' || typeof value === 'number') {
      out.push({ path, value: String(value) });
    } else if (isVarDescriptor(value)) {
      out.push({
        path,
        value: String(value.value),
        syntax: value.syntax,
        inherits: value.inherits,
        initial: value.initial,
        slots: readVarSlots(value),
      });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      out.push(...flattenComponentVars(value as Record<string, ComponentVarNode>, path));
    }
  }

  return out;
}

function pathPrefixes(path: string): string[] {
  const parts = path.split('-');
  const prefixes: string[] = [];
  for (let i = 1; i <= parts.length; i++) {
    prefixes.push(parts.slice(0, i).join('-'));
  }
  return prefixes;
}

function collectPathKeys(entries: FlatComponentVarEntry[]): Set<string> {
  const keys = new Set<string>();
  for (const e of entries) {
    for (const p of pathPrefixes(e.path)) {
      keys.add(p);
    }
  }
  return keys;
}

function createVarRefsProxy(
  refByPath: Map<string, ComponentInternalVarRef>,
  allPathKeys: Set<string>,
  prefix: string,
): object {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string | symbol): unknown {
      if (typeof prop === 'symbol') {
        return undefined;
      }
      if (prop === 'constructor') return Object;
      if (prop === '__esModule') return false;

      const newPrefix = prefix ? `${prefix}-${prop}` : prop;

      if (refByPath.has(newPrefix)) {
        const hasChildren = [...refByPath.keys()].some(
          (k) => k !== newPrefix && k.startsWith(`${newPrefix}-`),
        );
        if (hasChildren) {
          return createVarRefsProxy(refByPath, allPathKeys, newPrefix);
        }
        return refByPath.get(newPrefix);
      }

      if ([...refByPath.keys()].some((k) => k.startsWith(`${newPrefix}-`))) {
        return createVarRefsProxy(refByPath, allPathKeys, newPrefix);
      }

      if (prefix !== '' && allPathKeys.has(newPrefix)) {
        return createVarRefsProxy(refByPath, allPathKeys, newPrefix);
      }

      return undefined;
    },
    has(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return false;
      const newPrefix = prefix ? `${prefix}-${prop}` : prop;
      if (refByPath.has(newPrefix)) return true;
      return [...refByPath.keys()].some((k) => k.startsWith(`${newPrefix}-`));
    },
    set(_target, _prop, _value) {
      return false;
    },
  };

  return new Proxy({}, handler);
}

/** Build the ref tree for all vars registered on this component context so far. */
export function buildVarRefTreeFromRegistry(
  refByPath: Map<string, ComponentInternalVarRef>,
  pathKeys?: Set<string>,
): ComponentVarRefTree<ComponentVarDefinitions> | undefined {
  if (refByPath.size === 0) return undefined;
  const allPathKeys = pathKeys ?? new Set<string>();
  if (!pathKeys) {
    for (const path of refByPath.keys()) {
      for (const p of pathPrefixes(path)) {
        allPathKeys.add(p);
      }
    }
  }
  return createVarRefsProxy(
    refByPath,
    allPathKeys,
    '',
  ) as ComponentVarRefTree<ComponentVarDefinitions>;
}

function mergeComponentVarDefinitions(
  a: ComponentVarDefinitions,
  b: ComponentVarDefinitions,
): ComponentVarDefinitions {
  const result: ComponentVarDefinitions = { ...a };

  for (const [key, value] of Object.entries(b)) {
    const existing = result[key];
    if (
      existing != null &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      !isVarDescriptor(existing) &&
      typeof value === 'object' &&
      value != null &&
      !Array.isArray(value) &&
      !isVarDescriptor(value)
    ) {
      result[key] = mergeComponentVarDefinitions(
        existing as ComponentVarDefinitions,
        value as ComponentVarDefinitions,
      );
    } else {
      result[key] = value as ComponentVarNode;
    }
  }

  return result;
}

function attachVarDefinitionsBrand<T extends ComponentVarDefinitions>(
  tree: ComponentVarRefTree<T>,
  definitions: T,
): ComponentVarRefTree<T> {
  Object.defineProperty(tree, componentVarDefinitionsKey, {
    value: definitions,
    enumerable: false,
    writable: false,
    configurable: true,
  });
  return tree;
}

/** Read definitions stamped on a `ctx.vars()` ref tree. */
export function getComponentVarDefinitionsFromInput(
  input: unknown,
): ComponentVarDefinitions | undefined {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const branded = (input as Record<string, unknown>)[componentVarDefinitionsKey];
  if (branded == null || typeof branded !== 'object' || Array.isArray(branded)) return undefined;
  return branded as ComponentVarDefinitions;
}

/**
 * Register a top-level `vars` block from a component config and return the recipe without `vars`.
 */
export function stripAndRegisterConfigVars(
  config: Record<string, unknown>,
  registerVars: ComponentConfigContext['vars'],
): {
  config: Record<string, unknown>;
  varRefTree?: ComponentVarRefTree<ComponentVarDefinitions>;
  varDefinitions?: ComponentVarDefinitions;
} {
  const varsInput = config.vars;
  if (varsInput == null || typeof varsInput !== 'object' || Array.isArray(varsInput)) {
    return { config };
  }

  const defsFromRefTree = getComponentVarDefinitionsFromInput(varsInput);
  if (defsFromRefTree) {
    const { vars: _vars, ...rest } = config;
    return { config: rest, varDefinitions: defsFromRefTree };
  }

  const varDefinitions = varsInput as ComponentVarDefinitions;
  const varRefTree = registerVars(varDefinitions);
  const { vars: _vars, ...rest } = config;
  return { config: rest, varRefTree, varDefinitions };
}

function declareVarSchema(
  schema: ComponentVarSchema,
  registerRef: (logicalPath: string) => ComponentInternalVarRef,
): void {
  for (const { path, leaf } of flattenTokenSchema(schema)) {
    const ref = registerRef(path);
    if (leaf !== true) {
      registerAtPropertySchema(ref.name, {
        syntax: leaf.syntax,
        inherits: leaf.inherits ?? true,
        initial: leaf.initial,
      });
    }
  }
}

export type ComponentVarDefaultDecl = {
  name: string;
  value: string;
  /** Extra slots that receive this default, in addition to the host. */
  slots?: readonly string[];
};

/** Slot+variant recipes keep slot style blocks under `base`. Multi-slot recipes keep them on the config. */
function usesBaseSlotContainer(config: Record<string, unknown>): boolean {
  const s = config.slots;
  return (
    Array.isArray(s) &&
    s.length > 0 &&
    ('variants' in config || 'compoundVariants' in config || 'defaultVariants' in config)
  );
}

function mergeDeclarationsIntoBlock(
  existing: unknown,
  declarations: Record<string, string>,
): Record<string, unknown> {
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return { ...declarations, ...(existing as Record<string, unknown>) };
  }
  return { ...declarations };
}

function writeSlotDeclarations(
  config: Record<string, unknown>,
  key: string,
  declarations: Record<string, string>,
): Record<string, unknown> {
  if (Object.keys(declarations).length === 0) return config;
  if (usesBaseSlotContainer(config)) {
    const base = (config.base ?? {}) as Record<string, unknown>;
    return {
      ...config,
      base: { ...base, [key]: mergeDeclarationsIntoBlock(base[key], declarations) },
    };
  }
  return { ...config, [key]: mergeDeclarationsIntoBlock(config[key], declarations) };
}

export function mergeComponentVarDefaultsInto(
  config: Record<string, unknown>,
  defaults: readonly ComponentVarDefaultDecl[],
): Record<string, unknown> {
  if (defaults.length === 0) return config;

  const hostDeclarations: Record<string, string> = {};
  const bySlot = new Map<string, Record<string, string>>();
  for (const decl of defaults) {
    hostDeclarations[decl.name] = decl.value;
    for (const slot of decl.slots ?? []) {
      const bucket = bySlot.get(slot) ?? {};
      bucket[decl.name] = decl.value;
      bySlot.set(slot, bucket);
    }
  }

  const hostKey = resolveVarHostSlot(config);
  let next = writeSlotDeclarations(config, hostKey, hostDeclarations);

  const recipeSlots = Array.isArray(config.slots) ? config.slots.map(String) : [];
  for (const [slot, declarations] of bySlot) {
    if (slot === hostKey) continue;
    if (!recipeSlots.includes(slot)) continue;
    next = writeSlotDeclarations(next, slot, declarations);
  }
  return next;
}

export function createComponentConfigContextPair(
  classNaming: ClassNamingConfig,
  namespace: string,
): {
  ctx: ComponentConfigContext;
  mergeVarDefaultsInto: (config: Record<string, unknown>) => Record<string, unknown>;
  buildVarRegistry: (config: Record<string, unknown>) => ComponentVarRegistry | undefined;
  buildVarRefTree: () => ComponentVarRefTree<ComponentVarDefinitions> | undefined;
  buildCapturedVarDefinitions: () => ComponentVarDefinitions | undefined;
} {
  const seen = new Set<string>();
  const ns = scopedTokenNamespace(
    classNaming.scopeId?.trim() || undefined,
    sanitizeClassSegment(namespace),
  );

  const varBaseDefaults = new Map<string, { value: string; slots?: readonly string[] }>();
  const registeredVars: RegisteredComponentVar[] = [];
  const byPath = new Map<string, RegisteredComponentVar>();
  const varRefByPath = new Map<string, ComponentInternalVarRef>();
  let capturedVarDefinitions: ComponentVarDefinitions | undefined;

  function captureVarDefinitions<const T extends ComponentVarDefinitions>(definitions: T): T {
    capturedVarDefinitions = capturedVarDefinitions
      ? mergeComponentVarDefinitions(capturedVarDefinitions, definitions)
      : definitions;
    return definitions;
  }

  function trackVarRef(logicalPath: string, ref: ComponentInternalVarRef): void {
    varRefByPath.set(logicalPath, ref);
  }

  function trackRegisteredVar(
    logicalPath: string,
    name: string,
    entry?: { syntax?: string; defaultValue?: string; slots?: readonly string[] },
  ): void {
    const reg: RegisteredComponentVar = {
      path: logicalPath,
      name,
      syntax: entry?.syntax,
      defaultValue: entry?.defaultValue,
      slots: entry?.slots,
    };
    if (!byPath.has(logicalPath)) {
      registeredVars.push(reg);
    }
    byPath.set(logicalPath, reg);
  }

  function trackSeen(safeId: string, label: string): void {
    if (seen.has(safeId)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[typestyles] Duplicate ${label} for component "${namespace}". ` +
            `Declare each path once and reuse the returned ref.`,
        );
      }
    } else {
      seen.add(safeId);
    }
  }

  function mergeVarValueOntoExisting(
    logicalPath: string,
    name: string,
    entry: {
      value: string;
      syntax?: string;
      inherits?: boolean;
      initial?: string | number;
      slots?: readonly string[];
    },
  ): void {
    varBaseDefaults.set(name, { value: entry.value, slots: entry.slots });
    const reg = byPath.get(logicalPath);
    if (reg) {
      reg.defaultValue = entry.value;
      reg.slots = entry.slots;
      if (entry.syntax != null) reg.syntax = entry.syntax;
    }
    if (entry.syntax != null) {
      registerAtPropertyRule(name, {
        value: entry.value,
        syntax: entry.syntax,
        inherits: entry.inherits ?? true,
        initial: entry.initial,
      });
    }
  }

  function registerVarValue(
    logicalPath: string,
    entry: {
      value: string;
      syntax?: string;
      inherits?: boolean;
      initial?: string | number;
      slots?: readonly string[];
    },
  ): ComponentInternalVarRef {
    const safeId = sanitizeClassSegment(logicalPath);
    const name = `--${ns}-${safeId}`;

    const existing = varRefByPath.get(logicalPath);
    if (existing) {
      mergeVarValueOntoExisting(logicalPath, name, entry);
      return existing;
    }

    trackSeen(safeId, `internal var path "${logicalPath}"`);

    varBaseDefaults.set(name, { value: entry.value, slots: entry.slots });
    trackRegisteredVar(logicalPath, name, {
      syntax: entry.syntax,
      defaultValue: entry.value,
      slots: entry.slots,
    });

    if (entry.syntax != null) {
      registerAtPropertyRule(name, {
        value: entry.value,
        syntax: entry.syntax,
        inherits: entry.inherits ?? true,
        initial: entry.initial,
      });
    }

    const ref = createRegisteredPropertyRef(name);
    trackVarRef(logicalPath, ref);
    return ref;
  }

  function declareVarFn(id: string, registration: PropertyRegistration): ComponentInternalVarRef {
    const safePath = sanitizeClassSegment(id);
    trackSeen(safePath, `internal var "${id}"`);
    const name = `--${ns}-${safePath}`;
    registerAtPropertySchema(name, {
      ...registration,
      inherits: registration.inherits ?? true,
    });
    trackRegisteredVar(id, name);
    const ref = createRegisteredPropertyRef(name);
    trackVarRef(id, ref);
    return ref;
  }

  function varFn(id: string, options?: ComponentVarOptions): ComponentInternalVarRef {
    const safePath = sanitizeClassSegment(id);
    const valueStr =
      options?.value !== undefined && options?.value !== null ? String(options.value) : undefined;

    if (valueStr !== undefined) {
      return registerVarValue(id, {
        value: valueStr,
        syntax: options?.syntax,
        inherits: options?.inherits,
        initial: options?.initial,
      });
    }

    trackSeen(safePath, `internal var "${id}"`);
    const name = `--${ns}-${safePath}`;
    trackRegisteredVar(id, name);
    const ref = createRegisteredPropertyRef(name);
    trackVarRef(id, ref);
    return ref;
  }

  function varsFn<const T extends ComponentVarDefinitions>(definitions: T): ComponentVarRefTree<T> {
    const entries = flattenComponentVars(definitions);
    const allPathKeys = collectPathKeys(entries);

    for (const e of entries) {
      registerVarValue(e.path, e);
    }

    const tree = buildVarRefTreeFromRegistry(varRefByPath, allPathKeys)! as ComponentVarRefTree<T>;
    return attachVarDefinitionsBrand(tree, captureVarDefinitions(definitions));
  }

  function varsDeclareFn<const T extends ComponentVarSchema>(
    schema: T,
  ): ComponentVarRefTree<InferFromSchema<T>> {
    const refByPath = new Map<string, ComponentInternalVarRef>();
    const allPathKeys = new Set<string>();

    for (const { path } of flattenTokenSchema(schema)) {
      for (const p of pathPrefixes(path)) allPathKeys.add(p);
      const safeId = sanitizeClassSegment(path);
      trackSeen(safeId, `internal var path "${path}"`);
      const name = `--${ns}-${safeId}`;
      trackRegisteredVar(path, name);
      const ref = createRegisteredPropertyRef(name);
      trackVarRef(path, ref);
      refByPath.set(path, ref);
    }

    declareVarSchema(schema, (logicalPath) => {
      const ref = refByPath.get(logicalPath);
      if (!ref) throw new Error(`[typestyles] internal error: missing ref for "${logicalPath}"`);
      return ref;
    });

    return buildVarRefTreeFromRegistry(refByPath, allPathKeys)! as unknown as ComponentVarRefTree<
      InferFromSchema<T>
    >;
  }

  const varCallable = Object.assign(varFn, { declare: declareVarFn });
  const varsCallable = Object.assign(varsFn, { declare: varsDeclareFn });
  const ctx: ComponentConfigContext = { var: varCallable, vars: varsCallable };

  function retainKnownVarSlots(
    config: Record<string, unknown>,
    slots: readonly string[] | undefined,
    report: boolean,
  ): readonly string[] | undefined {
    if (!slots?.length) return undefined;
    const recipeSlots = Array.isArray(config.slots) ? config.slots.map(String) : [];
    const host = resolveVarHostSlot(config);
    const accepted: string[] = [];
    for (const slot of slots) {
      if (slot === host) continue;
      if (!recipeSlots.includes(slot)) {
        if (report && process.env.NODE_ENV !== 'production') {
          const known =
            recipeSlots.length > 0
              ? `expected one of: ${recipeSlots.map((name) => `"${name}"`).join(', ')}`
              : 'this recipe has no slots';
          console.warn(
            `[typestyles] Component var slot "${slot}" is not a slot on "${namespace}" (${known}). ` +
              `The var stays on the host.`,
          );
        }
        continue;
      }
      if (!accepted.includes(slot)) accepted.push(slot);
    }
    return accepted.length > 0 ? accepted : undefined;
  }

  return {
    ctx,
    mergeVarDefaultsInto: (config: Record<string, unknown>) => {
      for (const reg of registeredVars) {
        reg.slots = retainKnownVarSlots(config, reg.slots, false);
      }
      return mergeComponentVarDefaultsInto(
        config,
        [...varBaseDefaults.entries()].map(([name, entry]) => ({
          name,
          value: entry.value,
          slots: retainKnownVarSlots(config, entry.slots, true),
        })),
      );
    },
    buildVarRegistry: (config: Record<string, unknown>) =>
      finalizeVarRegistry(registeredVars, byPath, config),
    buildVarRefTree: () => buildVarRefTreeFromRegistry(varRefByPath),
    buildCapturedVarDefinitions: () => capturedVarDefinitions,
  };
}
