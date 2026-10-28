import type { DTCGError, DTCGGroup, DTCGResult, FromDTCGOptions } from './types';

type FlatToken = {
  /** Display path (shared by a token and its dark counterpart). */
  path: string;
  segments: string[];
  value: unknown;
  type?: string;
};

/** Key suffix for the dark value node; NUL cannot be confused with a real path segment. */
const DARK = '\u0000dark';
const EXTENSION_KEY = 'dev.typestyles';

const ALIAS = /^\{([^{}]+)\}$/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseAlias(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = ALIAS.exec(value.trim());
  return m ? m[1] : undefined;
}

/**
 * Flatten a DTCG tree into a nested plain object and resolve `{a.b}` aliases.
 * Never throws; all problems are collected and returned together.
 */
export function fromDTCG(
  tree: DTCGGroup,
  options: FromDTCGOptions = {},
): DTCGResult<Record<string, unknown>> {
  const errors: DTCGError[] = [];
  const tokens = new Map<string, FlatToken>();

  if (!isPlainObject(tree)) {
    return {
      ok: false,
      errors: [{ code: 'invalid-token', path: '', message: 'DTCG tree must be an object' }],
    };
  }

  const walk = (group: Record<string, unknown>, segments: string[], inherited?: string) => {
    const groupType = typeof group.$type === 'string' ? group.$type : inherited;
    for (const key of Object.keys(group)) {
      if (key.startsWith('$')) continue;
      if (key === '__proto__') {
        const path = [...segments, key].join('.');
        errors.push({
          code: 'invalid-token',
          path,
          message: `Reserved name "__proto__" is not allowed at "${path}"`,
        });
        continue;
      }
      const child = group[key];
      const childSegments = [...segments, key];
      const path = childSegments.join('.');
      if (!isPlainObject(child)) {
        errors.push({
          code: 'invalid-token',
          path,
          message: `Expected a token or group object at "${path}"`,
        });
      } else if ('$value' in child) {
        const type = typeof child.$type === 'string' ? child.$type : groupType;
        tokens.set(path, { path, segments: childSegments, value: child.$value, type });
        const ext = isPlainObject(child.$extensions) ? child.$extensions[EXTENSION_KEY] : undefined;
        if (isPlainObject(ext) && ext.dark === null) {
          errors.push({
            code: 'invalid-token',
            path,
            message: `"dark" must not be null at "${path}"`,
          });
        } else if (isPlainObject(ext) && 'dark' in ext && ext.dark !== undefined) {
          tokens.set(path + DARK, { path, segments: childSegments, value: ext.dark, type });
        }
      } else {
        walk(child, childSegments, groupType);
      }
    }
  };
  try {
    walk(tree as Record<string, unknown>, []);
  } catch {
    return {
      ok: false,
      errors: [{ code: 'invalid-token', path: '', message: 'DTCG tree is nested too deeply' }],
    };
  }

  type Mode = 'light' | 'dark';
  type Result = { value: unknown; hadDark: boolean };
  // Cache keys are `${mode}:${path}`; a light-only token resolves separately per mode.
  const resolved = new Map<string, Result>();
  const failed = new Set<string>();
  const seenErrors = new Set<string>();
  const report = (error: DTCGError) => {
    const id = `${error.code}\u0001${error.path}`;
    if (seenErrors.has(id)) return;
    seenErrors.add(id);
    errors.push(error);
  };

  // In dark mode prefer a token's dark node and fall back to its light node.
  const nodeFor = (path: string, mode: Mode): { node: FlatToken; dark: boolean } | undefined => {
    if (mode === 'dark') {
      const d = tokens.get(path + DARK);
      if (d) return { node: d, dark: true };
    }
    const l = tokens.get(path);
    return l ? { node: l, dark: false } : undefined;
  };

  // Iterative (no recursion) so arbitrarily long alias chains cannot overflow the stack.
  const resolve = (startPath: string, mode: Mode): void => {
    const chain: { state: string; dark: boolean }[] = [];
    const labels = new Map<string, string>();
    let cur = startPath;
    let ok = false;
    let value: unknown;
    let tailDark = false;

    for (;;) {
      const state = `${mode}:${cur}`;
      if (resolved.has(state)) {
        ok = true;
        value = resolved.get(state)!.value;
        tailDark = resolved.get(state)!.hadDark;
        break;
      }
      if (failed.has(state)) break;

      const { node: token, dark } = nodeFor(cur, mode)!;
      const label = token.path + (dark ? ' (dark)' : '');
      const target = parseAlias(token.value);
      if (target === undefined) {
        ok = true;
        value = token.value;
        tailDark = dark;
        chain.push({ state, dark });
        break;
      }

      chain.push({ state, dark });
      labels.set(state, label);

      const targetState = `${mode}:${target}`;
      if (labels.has(targetState)) {
        const names = chain.map((c) => labels.get(c.state)!);
        const cycle = [
          ...names.slice(names.indexOf(labels.get(targetState)!)),
          labels.get(targetState)!,
        ].join(' -> ');
        report({
          code: 'alias-cycle',
          path: token.path,
          message: `Alias cycle detected: ${cycle}`,
        });
        break;
      }

      const targetNode = nodeFor(target, mode);
      if (!targetNode) {
        let external: string | undefined;
        try {
          external = options.resolveExternal?.(target);
        } catch {
          external = undefined;
        }
        if (external === undefined) {
          report({
            code: 'alias-missing',
            path: token.path,
            message: `Alias "{${target}}" does not resolve to any token`,
          });
        } else {
          ok = true;
          value = external;
          tailDark = false;
        }
        break;
      }

      if (token.type && targetNode.node.type && token.type !== targetNode.node.type) {
        report({
          code: 'type-mismatch',
          path: token.path,
          message: `Alias "{${target}}" has type "${targetNode.node.type}" but "${token.path}" has type "${token.type}"`,
        });
        break;
      }

      cur = target;
    }

    // Walk back from the end of the chain so each member knows whether a dark node was used at or after it.
    let hadDark = ok && tailDark;
    for (let i = chain.length - 1; i >= 0; i--) {
      const m = chain[i];
      if (resolved.has(m.state)) continue;
      if (ok) {
        // The terminal literal's own node is already accounted for in tailDark.
        if (i !== chain.length - 1 || parseAlias(tokenValueOf(m.state)) !== undefined) {
          hadDark = hadDark || m.dark;
        }
        resolved.set(m.state, { value, hadDark });
      } else failed.add(m.state);
    }
  };

  const tokenValueOf = (state: string): unknown => {
    const i = state.indexOf(':');
    const mode = state.slice(0, i) as Mode;
    return nodeFor(state.slice(i + 1), mode)!.node.value;
  };

  for (const [key, token] of tokens) {
    if (key.endsWith(DARK)) continue;
    resolve(token.path, 'light');
    resolve(token.path, 'dark');
  }

  if (errors.length > 0) return { ok: false, errors };

  const out: Record<string, unknown> = {};
  for (const [key, token] of tokens) {
    if (key.endsWith(DARK)) continue;
    let cursor = out;
    for (let i = 0; i < token.segments.length - 1; i++) {
      const seg = token.segments[i];
      if (!isPlainObject(cursor[seg])) cursor[seg] = {};
      cursor = cursor[seg] as Record<string, unknown>;
    }
    const light = resolved.get(`light:${key}`)!.value;
    const dark = resolved.get(`dark:${key}`)!;
    const leaf = dark.hadDark ? { light, dark: dark.value } : light;
    cursor[token.segments[token.segments.length - 1]] = leaf;
  }
  return { ok: true, value: out, warnings: [] };
}
