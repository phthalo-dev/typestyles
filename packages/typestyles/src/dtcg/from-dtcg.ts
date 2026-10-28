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

  const resolved = new Map<string, unknown>();
  const failed = new Set<string>();

  // Iterative (no recursion) so arbitrarily long alias chains cannot overflow the stack.
  const resolve = (start: string): void => {
    const chain: string[] = [];
    const inChain = new Set<string>();
    let cur = start;
    let ok = false;
    let value: unknown;

    for (;;) {
      if (resolved.has(cur)) {
        ok = true;
        value = resolved.get(cur);
        break;
      }
      if (failed.has(cur)) break;

      const token = tokens.get(cur)!;
      const target = parseAlias(token.value);
      if (target === undefined) {
        ok = true;
        value = token.value;
        resolved.set(cur, value);
        break;
      }

      const fail = (error: DTCGError) => {
        errors.push(error);
        failed.add(cur);
      };

      chain.push(cur);
      inChain.add(cur);

      if (inChain.has(target)) {
        const cycle = [...chain.slice(chain.indexOf(target)), target].join(' -> ');
        fail({ code: 'alias-cycle', path: cur, message: `Alias cycle detected: ${cycle}` });
        break;
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
          fail({
            code: 'alias-missing',
            path: cur,
            message: `Alias "{${target}}" does not resolve to any token`,
          });
        } else {
          ok = true;
          value = external;
        }
        break;
      }

      if (token.type && targetToken.type && token.type !== targetToken.type) {
        fail({
          code: 'type-mismatch',
          path: cur,
          message: `Alias "{${target}}" has type "${targetToken.type}" but "${cur}" has type "${token.type}"`,
        });
        break;
      }

      cur = target;
    }

    for (const member of chain) {
      if (ok) resolved.set(member, value);
      else failed.add(member);
    }
  };

  for (const path of tokens.keys()) resolve(path);

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
