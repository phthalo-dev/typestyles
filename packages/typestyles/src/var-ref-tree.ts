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

/**
 * Build the `.vars` tree for refs keyed by logical path (`'track-color'`), once, as frozen plain
 * objects: reads are ordinary property lookups, and `Object.keys` / spread / `JSON.stringify` see
 * the nesting (`{ track: { color } }`).
 *
 * Path segments are joined by `-`, so a dashed key can be read either way: `vars.track.color` and
 * `vars['track-color']` are the same ref (the joined spellings are non-enumerable, so iteration
 * only sees the nesting). A path that is both a var and the parent of another resolves to the
 * parent.
 *
 * `hidden` adds non-enumerable properties to the root before it is frozen.
 */
export function buildVarRefTree(
  refByPath: ReadonlyMap<string, ComponentInternalVarRef>,
  hidden?: Record<string, unknown>,
): ComponentVarRefTree<ComponentVarDefinitions> | undefined {
  if (refByPath.size === 0) return undefined;

  const root: Record<string, unknown> = {};
  const nodes = new Map<string, Record<string, unknown>>([['', root]]);
  const segmentsByPath = new Map<string, string[]>();
  for (const path of refByPath.keys()) {
    const segments = path.split('-');
    for (let end = 1; end <= segments.length; end++) {
      const prefix = segments.slice(0, end).join('-');
      if (prefix === '') continue;
      if (!segmentsByPath.has(prefix)) segmentsByPath.set(prefix, segments.slice(0, end));
      if (end < segments.length && !nodes.has(prefix)) nodes.set(prefix, {});
    }
  }

  const valueAt = (path: string): unknown => nodes.get(path) ?? refByPath.get(path);
  for (const [path, segments] of segmentsByPath) {
    const last = segments.length - 1;
    for (let start = last; start >= 0; start--) {
      const parent = nodes.get(segments.slice(0, start).join('-'))!;
      const key = segments.slice(start).join('-');
      if (Object.prototype.hasOwnProperty.call(parent, key)) continue;
      Object.defineProperty(parent, key, {
        value: valueAt(path),
        enumerable: start === last,
      });
    }
  }

  for (const [key, value] of Object.entries(hidden ?? {})) {
    Object.defineProperty(root, key, { value });
  }
  for (const node of nodes.values()) Object.freeze(node);
  return root as ComponentVarRefTree<ComponentVarDefinitions>;
}

/** Rebuild a `.vars` tree from logical path -> custom property name (see `AttrsRecipePlan.vars`). */
export function buildVarRefTreeFromNames(
  names: Record<string, string>,
): ComponentVarRefTree<ComponentVarDefinitions> | undefined {
  return buildVarRefTree(
    new Map(Object.entries(names).map(([path, name]) => [path, createRegisteredPropertyRef(name)])),
  );
}
