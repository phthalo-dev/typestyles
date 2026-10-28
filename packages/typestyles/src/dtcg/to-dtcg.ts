import { isColorModeObject } from '../color-modes';
import type { DTCGGroup } from './types';

const MODES = ['light', 'dark'] as const;
const MAX_DEPTH = 64;

export type ToDTCGOptions = {
  /** Return a DTCG `$type` for the token at a dotted path (e.g. `color.brand.500`). */
  typeOf?: (path: string) => string | undefined;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isModeLeaf(v: unknown): v is { light: string | number; dark: string | number } {
  return isPlainObject(v) && 'light' in v && 'dark' in v && isColorModeObject(v, MODES);
}

/**
 * Convert a nested tokens object into a DTCG tree. `{ light, dark }` leaves become
 * `$value` (light) plus `$extensions["dev.typestyles"].dark`. Best-effort: never throws,
 * skips `__proto__` keys, `undefined`, functions and anything nested too deeply.
 */
export function toDTCG(tokens: Record<string, unknown>, options: ToDTCGOptions = {}): DTCGGroup {
  const out: DTCGGroup = {};
  if (!isPlainObject(tokens)) return out;

  const typeFor = (path: string): string | undefined => {
    try {
      const t = options.typeOf?.(path);
      return typeof t === 'string' && t ? t : undefined;
    } catch {
      return undefined;
    }
  };

  const walk = (src: Record<string, unknown>, dest: Record<string, unknown>, segs: string[]) => {
    if (segs.length >= MAX_DEPTH) return;
    for (const key of Object.keys(src)) {
      if (key === '__proto__' || key.startsWith('$')) continue;
      const value = src[key];
      if (value === undefined || value === null || typeof value === 'function') continue;
      if (typeof value === 'symbol' || typeof value === 'bigint') continue;
      const childSegs = [...segs, key];
      if (isPlainObject(value) && !isModeLeaf(value)) {
        const group: Record<string, unknown> = {};
        walk(value, group, childSegs);
        dest[key] = group;
        continue;
      }
      const type = typeFor(childSegs.join('.'));
      const token: Record<string, unknown> = isModeLeaf(value)
        ? { $value: value.light, $extensions: { 'dev.typestyles': { dark: value.dark } } }
        : { $value: value };
      if (type) token.$type = type;
      dest[key] = token;
    }
  };

  walk(tokens, out as Record<string, unknown>, []);
  return out;
}
