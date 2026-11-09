/**
 * Component var ref trees (`recipe.vars`), with no CSS pipeline imports so the
 * `typestyles/lite` entry can rebuild `.vars` from a recorded plan.
 */
import type {
  ComponentInternalVarRef,
  ComponentVarDefinitions,
  ComponentVarRefTree,
  CSSVarRef,
  RegisteredPropertyRef,
} from './types';

export function createRegisteredPropertyRef(name: string): RegisteredPropertyRef {
  const varRef = `var(${name})` as CSSVarRef;
  return {
    name,
    var: varRef,
    toString() {
      return varRef;
    },
    valueOf() {
      return varRef;
    },
  };
}

export function pathPrefixes(path: string): string[] {
  const parts = path.split('-');
  const prefixes: string[] = [];
  for (let i = 1; i <= parts.length; i++) {
    prefixes.push(parts.slice(0, i).join('-'));
  }
  return prefixes;
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

/** Rebuild a `.vars` tree from logical path -> custom property name (see `AttrsRecipePlan.vars`). */
export function buildVarRefTreeFromNames(
  names: Record<string, string>,
): ComponentVarRefTree<ComponentVarDefinitions> | undefined {
  return buildVarRefTreeFromRegistry(
    new Map(Object.entries(names).map(([path, name]) => [path, createRegisteredPropertyRef(name)])),
  );
}
