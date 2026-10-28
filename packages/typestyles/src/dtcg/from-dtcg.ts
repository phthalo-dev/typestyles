import type { DTCGError, DTCGGroup, DTCGResult, FromDTCGOptions } from './types';

type FlatToken = { path: string; segments: string[]; value: unknown; type?: string };

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
      } else {
        walk(child, childSegments, groupType);
      }
    }
  };
  walk(tree as Record<string, unknown>, []);

  const resolved = new Map<string, unknown>();
  const failed = new Set<string>();

  const resolve = (path: string, visiting: string[]): { ok: boolean; value?: unknown } => {
    if (resolved.has(path)) return { ok: true, value: resolved.get(path) };
    if (failed.has(path)) return { ok: false };
    const token = tokens.get(path)!;
    const target = parseAlias(token.value);
    if (target === undefined) {
      resolved.set(path, token.value);
      return { ok: true, value: token.value };
    }

    const fail = (error: DTCGError) => {
      errors.push(error);
      failed.add(path);
      return { ok: false };
    };

    if (visiting.includes(target)) {
      const cycle = [...visiting.slice(visiting.indexOf(target)), target].join(' -> ');
      return fail({
        code: 'alias-cycle',
        path,
        message: `Alias cycle detected: ${cycle}`,
      });
    }

    const targetToken = tokens.get(target);
    if (!targetToken) {
      let external: string | undefined;
      try {
        external = options.resolveExternal?.(target);
      } catch {
        external = undefined;
      }
      if (external === undefined) {
        return fail({
          code: 'alias-missing',
          path,
          message: `Alias "{${target}}" does not resolve to any token`,
        });
      }
      resolved.set(path, external);
      return { ok: true, value: external };
    }

    if (token.type && targetToken.type && token.type !== targetToken.type) {
      return fail({
        code: 'type-mismatch',
        path,
        message: `Alias "{${target}}" has type "${targetToken.type}" but "${path}" has type "${token.type}"`,
      });
    }

    const r = resolve(target, [...visiting, path]);
    if (!r.ok) {
      failed.add(path);
      return r;
    }
    resolved.set(path, r.value);
    return r;
  };

  for (const path of tokens.keys()) resolve(path, []);

  if (errors.length > 0) return { ok: false, errors };

  const out: Record<string, unknown> = {};
  for (const token of tokens.values()) {
    let cursor = out;
    for (let i = 0; i < token.segments.length - 1; i++) {
      const seg = token.segments[i];
      if (!isPlainObject(cursor[seg])) cursor[seg] = {};
      cursor = cursor[seg] as Record<string, unknown>;
    }
    cursor[token.segments[token.segments.length - 1]] = resolved.get(token.path);
  }
  return { ok: true, value: out, warnings: [] };
}
