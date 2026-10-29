import { isColorModeObject } from '../color-modes';
import type { DTCGGroup } from './types';

const MODES = ['light', 'dark'] as const;
const MAX_DEPTH = 64;
const DEFAULT_MAX_NODES = 50_000;

export type ToDTCGOptions = {
  /** Return a DTCG `$type` for the token at a dotted path (e.g. `color.brand.500`). */
  typeOf?: (path: string) => string | undefined;
  /**
   * Most groups plus tokens to write. Past it, conversion stops and the tree converted so far
   * is returned. Bounds the output when the input shares objects in many places. Default 50,000.
   */
  maxNodes?: number;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isModeLeaf(v: unknown): v is { light: string | number; dark: string | number } {
  return isPlainObject(v) && 'light' in v && 'dark' in v && isColorModeObject(v, MODES);
}

/** Run `fn`; if it throws, return `fallback`. */
function attempt<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * Convert a nested tokens object into a DTCG tree. `{ light, dark }` leaves become
 * `$value` (light) plus `$extensions["dev.typestyles"].dark`. Best-effort and never throws:
 * skips `__proto__` keys, `undefined`, functions, entries that cannot be read, objects that
 * refer back to one of their parents (cycles), and anything nested too deeply, and stops
 * after `maxNodes` groups and tokens.
 */
export function toDTCG(tokens: Record<string, unknown>, options?: ToDTCGOptions): DTCGGroup {
  const out: DTCGGroup = {};
  if (!attempt(() => isPlainObject(tokens), false)) return out;

  const opts: ToDTCGOptions = attempt(() => (isPlainObject(options) ? options : {}), {});
  const typeOf = attempt(() => opts.typeOf, undefined);
  const rawMax = attempt(() => opts.maxNodes, undefined);
  const maxNodes = typeof rawMax === 'number' && rawMax >= 0 ? rawMax : DEFAULT_MAX_NODES;

  const typeFor = (path: string): string | undefined =>
    attempt(() => {
      const t = typeOf?.call(opts, path);
      return typeof t === 'string' && t ? t : undefined;
    }, undefined);

  let nodes = 0;
  /** Objects on the current path from the root; a child already here is a cycle. */
  const onPath = new Set<object>();

  /** Returns false once the node budget is spent, so every caller stops. */
  const walk = (
    src: Record<string, unknown>,
    dest: Record<string, unknown>,
    segs: string[],
  ): boolean => {
    if (segs.length >= MAX_DEPTH) return true;
    const keys = attempt(() => Object.keys(src), [] as string[]);
    onPath.add(src);
    try {
      for (const key of keys) {
        if (key === '__proto__' || key.startsWith('$')) continue;
        const read = attempt(() => ({ value: src[key] }), undefined);
        if (!read) continue;
        const { value } = read;
        if (value === undefined || value === null || typeof value === 'function') continue;
        if (typeof value === 'symbol' || typeof value === 'bigint') continue;
        const plain = attempt(() => isPlainObject(value), undefined);
        if (plain === undefined) continue;
        if (plain && onPath.has(value)) continue;
        // A mode-leaf check that throws means "not a mode leaf": the object is walked as a group.
        const modeLeaf = plain && attempt(() => isModeLeaf(value), false);

        let token: Record<string, unknown> | undefined;
        if (!plain || modeLeaf) {
          token = modeLeaf
            ? attempt(() => {
                const leaf = value as { light: unknown; dark: unknown };
                return {
                  $value: leaf.light,
                  $extensions: { 'dev.typestyles': { dark: leaf.dark } },
                } as Record<string, unknown>;
              }, undefined)
            : { $value: value };
          if (!token) continue;
        }

        if (nodes >= maxNodes) return false;
        nodes++;
        const childSegs = [...segs, key];
        if (!token) {
          const group: Record<string, unknown> = {};
          dest[key] = group;
          if (!walk(value as Record<string, unknown>, group, childSegs)) return false;
          continue;
        }
        const type = typeFor(childSegs.join('.'));
        if (type) token.$type = type;
        dest[key] = token;
      }
      return true;
    } finally {
      onPath.delete(src);
    }
  };

  walk(tokens, out as Record<string, unknown>, []);
  return out;
}
