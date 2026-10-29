import type { DTCGError, DTCGGroup, DTCGResult, FromDTCGOptions } from './types';

/**
 * One entry per group or token. Entries are addressed by numeric id (their index), store
 * only their own name plus a parent pointer, and never hold a joined path: full paths are
 * built lazily (and truncated) for messages, so memory does not grow with path length.
 */
type Entry = {
  parent: number;
  name: string;
  /** Child ids by name; groups only. */
  children?: Map<string, number>;
  /** Tokens only. */
  token?: TokenData;
};

type TokenData = {
  value: unknown;
  type?: string;
  /** Dark value from `$extensions["dev.typestyles"].dark`; kept apart from user keys. */
  hasDark: boolean;
  dark?: unknown;
};

const EXTENSION_KEY = 'dev.typestyles';
const ROOT = 0;

const DEFAULT_MAX_DEPTH = 32;
const DEFAULT_MAX_NAME_LENGTH = 128;
const DEFAULT_MAX_TOKENS = 50_000;
const DEFAULT_MAX_ERRORS = 100;
const DEFAULT_MAX_WARNINGS = 100;
const MAX_PATH_IN_MESSAGE = 200;
const MAX_TARGET_IN_MESSAGE = 120;
const MAX_MESSAGE = 600;

const ALIAS = /^\{([^{}]+)\}$/;
/**
 * A name segment may only contain letters, digits, `-` and `_`. `tokens.create` joins names
 * into a custom-property name (`--color-brand-500`) without escaping, and these are all CSS
 * name code points (non-ASCII letters and digits included), so the result is always valid.
 * It also keeps out the DTCG-forbidden `.`, `{` and `}`.
 */
const NAME = /^[\p{L}\p{N}_-]+$/u;
/**
 * Characters a string value may not contain: they end a declaration, rule or `<style>`.
 * `valueProblem` also rejects CSS comment delimiters (slash-star, star-slash) and unbalanced
 * quotes, which would swallow the rest of the stylesheet.
 */
const BAD_VALUE = /[;{}<>\\\p{Cc}]/u;

/** Whether `s` has an odd number of `quote` characters (an unterminated CSS string). */
function oddCount(s: string, quote: string): boolean {
  let odd = false;
  for (let i = s.indexOf(quote); i !== -1; i = s.indexOf(quote, i + 1)) odd = !odd;
  return odd;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseAlias(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = ALIAS.exec(value.trim());
  return m ? m[1] : undefined;
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}

function limit(value: unknown, fallback: number): number {
  return typeof value === 'number' && value >= 0 ? value : fallback;
}

/**
 * Flatten a DTCG tree into a nested plain object and resolve `{a.b}` aliases.
 * Never throws; problems are collected and returned together (up to `maxErrors`).
 */
export function fromDTCG(
  tree: DTCGGroup,
  options?: FromDTCGOptions,
): DTCGResult<Record<string, unknown>> {
  if (!isPlainObject(tree)) {
    return {
      ok: false,
      errors: [{ code: 'invalid-token', path: '', message: 'DTCG tree must be an object' }],
    };
  }

  // Options are read once, up front; null, non-objects and throwing getters mean defaults.
  let opts: FromDTCGOptions = {};
  let maxDepth = DEFAULT_MAX_DEPTH;
  let maxNameLength = DEFAULT_MAX_NAME_LENGTH;
  let maxTokens = DEFAULT_MAX_TOKENS;
  let maxErrors = DEFAULT_MAX_ERRORS;
  let maxWarnings = DEFAULT_MAX_WARNINGS;
  let resolveExternal: FromDTCGOptions['resolveExternal'];
  try {
    if (isPlainObject(options)) {
      const o = options as FromDTCGOptions;
      const external = o.resolveExternal;
      const limits = {
        maxDepth: limit(o.maxDepth, DEFAULT_MAX_DEPTH),
        maxNameLength: limit(o.maxNameLength, DEFAULT_MAX_NAME_LENGTH),
        maxTokens: limit(o.maxTokens, DEFAULT_MAX_TOKENS),
        maxErrors: limit(o.maxErrors, DEFAULT_MAX_ERRORS),
        maxWarnings: limit(o.maxWarnings, DEFAULT_MAX_WARNINGS),
      };
      opts = o;
      ({ maxDepth, maxNameLength, maxTokens, maxErrors, maxWarnings } = limits);
      resolveExternal = typeof external === 'function' ? external : undefined;
    }
  } catch {
    // Keep the defaults.
  }

  const errors: DTCGError[] = [];
  const warnings: string[] = [];
  const entries: Entry[] = [{ parent: -1, name: '' }];
  const tokenIds: number[] = [];

  /** Dotted path of an entry (optionally plus one more name), truncated for messages. */
  const pathOf = (id: number, extra?: string): string => {
    const names: string[] = extra === undefined ? [] : [extra];
    for (let i = id; i > ROOT; i = entries[i].parent) names.push(entries[i].name);
    let out = '';
    for (let i = names.length - 1; i >= 0; i--) {
      out += (i === names.length - 1 ? '' : '.') + names[i];
      if (out.length > MAX_PATH_IN_MESSAGE) break;
    }
    return clip(out, MAX_PATH_IN_MESSAGE);
  };
  // Errors and warnings past maxErrors / maxWarnings are only counted.
  let omittedErrors = 0;
  let omittedWarnings = 0;
  /** Set when the walk stopped because of maxErrors, so the omitted count is a lower bound. */
  let stoppedAtMaxErrors = false;
  const addError = (error: DTCGError) => {
    if (errors.length < maxErrors) errors.push(error);
    else omittedErrors++;
  };
  const fail = (path: string, message: string) =>
    addError({ code: 'invalid-token', path, message: clip(message, MAX_MESSAGE) });
  const warn = (path: string, message: string) => {
    if (warnings.length < maxWarnings) warnings.push(`${path}: ${message}`);
    else omittedWarnings++;
  };
  /** The errors to return, plus one closing entry if any were omitted. */
  const failure = (): { ok: false; errors: DTCGError[] } => {
    if (omittedErrors > 0) {
      errors.push({
        code: 'invalid-token',
        path: '',
        message: stoppedAtMaxErrors
          ? `More than ${maxErrors} errors (maxErrors); stopped checking the tree`
          : `${omittedErrors} more ${omittedErrors === 1 ? 'error' : 'errors'} omitted (maxErrors ${maxErrors})`,
      });
    }
    return { ok: false, errors };
  };

  /** Why a name is not allowed, or undefined. */
  const nameProblem = (name: string): string | undefined => {
    if (name === '__proto__') return 'Reserved name "__proto__" is not allowed';
    if (name.length > maxNameLength) return `Name is longer than maxNameLength (${maxNameLength})`;
    if (name === '') return 'Name must not be empty';
    if (!NAME.test(name)) {
      return 'Name contains a character that is not allowed (only letters, digits, - and _ are allowed)';
    }
    return undefined;
  };

  /** Why a (non-alias) value cannot be used, or undefined. Walks structured values iteratively. */
  const valueProblem = (value: unknown): string | undefined => {
    const stack: { v: unknown; depth: number }[] = [{ v: value, depth: 0 }];
    const seen = new Set<object>();
    for (let item = stack.pop(); item; item = stack.pop()) {
      const { v, depth } = item;
      if (typeof v === 'string') {
        if (BAD_VALUE.test(v)) {
          return /\{[^{}]*\}/.test(v)
            ? 'Value contains an embedded alias, which is not resolved (DTCG only allows whole-value aliases such as "{group.token}"); braces are not allowed in values'
            : 'Value contains a character that is not allowed (; { } < > \\ or a control character)';
        }
        if (v.includes('/*') || v.includes('*/')) {
          return 'Value contains a CSS comment delimiter (/* or */)';
        }
        if (oddCount(v, '"') || oddCount(v, "'")) {
          return 'Value contains an unbalanced quote (an odd number of " or \')';
        }
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        // fine
      } else if (v === null || v === undefined) {
        // Nested nulls are left to tokens.create; keep checking the rest.
        if (depth === 0) return 'Value must not be null or undefined';
      } else if (typeof v === 'object') {
        if (seen.has(v)) return 'Value is circular or shares an object (not JSON)';
        seen.add(v);
        if (depth >= maxDepth) return `Value is nested deeper than maxDepth (${maxDepth})`;
        const isArray = Array.isArray(v);
        for (const key of Object.keys(v)) {
          if (!isArray) {
            const problem = nameProblem(key);
            if (problem) return `Structured value key: ${problem}`;
          }
          stack.push({ v: (v as Record<string, unknown>)[key], depth: depth + 1 });
        }
      } else {
        return `Unsupported value type "${typeof v}"`;
      }
    }
    return undefined;
  };

  /** Validate a `$value` or dark value; aliases are checked once resolved. */
  const checkValue = (id: number, value: unknown, label: string): void => {
    if (parseAlias(value) !== undefined) return;
    const problem = valueProblem(value);
    if (problem) {
      fail(pathOf(id), `${problem} (${label} at "${pathOf(id)}")`);
      return;
    }
    if (typeof value === 'object' && value !== null) {
      warn(
        pathOf(id),
        `structured ${label} passed through; tokens.create will flatten it into multiple custom properties`,
      );
    }
  };

  // Iterative depth-first walk (pre-order, same key order as the input).
  type Frame = {
    id: number;
    obj: Record<string, unknown>;
    keys: string[];
    i: number;
    children: Map<string, number>;
    type?: string;
    depth: number;
  };
  const onPath = new Set<object>();
  const open = (
    id: number,
    obj: Record<string, unknown>,
    inherited: string | undefined,
    depth: number,
  ): Frame => {
    onPath.add(obj);
    const children = new Map<string, number>();
    entries[id].children = children;
    const ext = isPlainObject(obj.$extensions) ? obj.$extensions[EXTENSION_KEY] : undefined;
    if (ext !== undefined && !isPlainObject(ext)) {
      warn(pathOf(id), `$extensions["${EXTENSION_KEY}"] is not an object and is ignored`);
    } else if (isPlainObject(ext) && 'dark' in ext) {
      warn(pathOf(id), `"dark" on a group is ignored; put it on each token`);
    }
    return {
      id,
      obj,
      keys: Object.keys(obj),
      i: 0,
      children,
      type: typeof obj.$type === 'string' ? obj.$type : inherited,
      depth,
    };
  };

  /** Walk the tree; returns false if it stopped early (maxTokens). */
  const walk = (): boolean => {
    const stack: Frame[] = [open(ROOT, tree as Record<string, unknown>, undefined, 0)];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame.i >= frame.keys.length) {
        onPath.delete(frame.obj);
        stack.pop();
        continue;
      }
      if (omittedErrors > 0) {
        stoppedAtMaxErrors = true;
        return false;
      }
      const key = frame.keys[frame.i++];
      if (key.startsWith('$')) continue;
      const depth = frame.depth + 1;
      const problem = nameProblem(key);
      if (problem) {
        fail(pathOf(frame.id, key), `${problem} at "${pathOf(frame.id, key)}"`);
        continue;
      }
      if (depth > maxDepth) {
        fail(
          pathOf(frame.id, key),
          `Nested deeper than maxDepth (${maxDepth}) at "${pathOf(frame.id, key)}"`,
        );
        continue;
      }
      const child = frame.obj[key];
      if (!isPlainObject(child)) {
        fail(
          pathOf(frame.id, key),
          `Expected a token or group object at "${pathOf(frame.id, key)}"`,
        );
        continue;
      }
      if (onPath.has(child)) {
        fail(pathOf(frame.id, key), `Circular reference at "${pathOf(frame.id, key)}"`);
        continue;
      }

      const isToken = '$value' in child;
      if (isToken && tokenIds.length >= maxTokens) {
        fail(
          pathOf(frame.id, key),
          `Tree has more than maxTokens (${maxTokens}) tokens; stopped at "${pathOf(frame.id, key)}"`,
        );
        return false;
      }
      const id = entries.length;
      entries.push({ parent: frame.id, name: key });
      frame.children.set(key, id);

      if (!isToken) {
        stack.push(open(id, child, frame.type, depth));
        continue;
      }

      const token: TokenData = {
        value: child.$value,
        type: typeof child.$type === 'string' ? child.$type : frame.type,
        hasDark: false,
      };
      entries[id].token = token;
      tokenIds.push(id);
      checkValue(id, token.value, 'value');

      for (const k of Object.keys(child)) {
        if (!k.startsWith('$')) {
          warn(pathOf(id), 'token has child keys alongside $value; they are ignored');
          break;
        }
      }

      const extensions = child.$extensions;
      const ext = isPlainObject(extensions) ? extensions[EXTENSION_KEY] : undefined;
      if (ext !== undefined && !isPlainObject(ext)) {
        warn(pathOf(id), `$extensions["${EXTENSION_KEY}"] is not an object and is ignored`);
      } else if (isPlainObject(ext) && ext.dark === null) {
        fail(pathOf(id), `"dark" must not be null at "${pathOf(id)}"`);
      } else if (isPlainObject(ext) && 'dark' in ext && ext.dark !== undefined) {
        token.hasDark = true;
        token.dark = ext.dark;
        checkValue(id, token.dark, 'dark value');
      }
    }
    return true;
  };

  try {
    // A partial tree would only add misleading alias-missing errors, so skip resolution.
    if (!walk()) return failure();
  } catch {
    // Only exotic (non-JSON) input gets here, e.g. a throwing getter or proxy.
    fail('', 'DTCG tree: could not read tree (reading a value threw)');
    return failure();
  }

  /** Token id for a dotted alias target, or undefined. */
  const lookup = (target: string): number | undefined => {
    let id = ROOT;
    let start = 0;
    for (;;) {
      const dot = target.indexOf('.', start);
      const name = dot === -1 ? target.slice(start) : target.slice(start, dot);
      const next = entries[id].children?.get(name);
      if (next === undefined) return undefined;
      id = next;
      if (dot === -1) break;
      start = dot + 1;
    }
    return entries[id].token ? id : undefined;
  };

  type Mode = 'light' | 'dark';
  type Result = { value: unknown; hadDark: boolean };
  // Caches are keyed by token id, one per mode; a light-only token resolves separately per mode.
  const resolved: Record<Mode, Map<number, Result>> = { light: new Map(), dark: new Map() };
  const failed: Record<Mode, Set<number>> = { light: new Set(), dark: new Set() };
  // De-dupe resolution errors per (code, token id).
  const reported = new Map<string, Set<number>>();
  const report = (code: DTCGError['code'], id: number, message: string) => {
    let ids = reported.get(code);
    if (!ids) reported.set(code, (ids = new Set()));
    if (ids.has(id)) return;
    ids.add(id);
    addError({ code, path: pathOf(id), message: clip(message, MAX_MESSAGE) });
  };

  // In dark mode a token's dark value wins; otherwise (and in light mode) its light value.
  const nodeValue = (token: TokenData, mode: Mode): { value: unknown; dark: boolean } =>
    mode === 'dark' && token.hasDark
      ? { value: token.dark, dark: true }
      : { value: token.value, dark: false };

  // Iterative (no recursion) so arbitrarily long alias chains cannot overflow the stack.
  const resolve = (startId: number, mode: Mode): void => {
    const cache = resolved[mode];
    const bad = failed[mode];
    const chain: { id: number; dark: boolean }[] = [];
    const position = new Map<number, number>();
    let cur = startId;
    let ok = false;
    let value: unknown;
    let tailDark = false;

    for (;;) {
      const hit = cache.get(cur);
      if (hit) {
        ok = true;
        value = hit.value;
        tailDark = hit.hadDark;
        break;
      }
      if (bad.has(cur)) break;

      const token = entries[cur].token;
      if (!token) break; // unreachable: only token ids are resolved
      const node = nodeValue(token, mode);
      position.set(cur, chain.length);
      chain.push({ id: cur, dark: node.dark });

      const target = parseAlias(node.value);
      if (target === undefined) {
        ok = true;
        value = node.value;
        tailDark = node.dark;
        break;
      }
      const shownTarget = `{${clip(target, MAX_TARGET_IN_MESSAGE)}}`;

      const targetId = lookup(target);
      const cycleStart = targetId === undefined ? undefined : position.get(targetId);
      if (cycleStart !== undefined) {
        const label = (m: { id: number; dark: boolean }) =>
          pathOf(m.id) + (m.dark ? ' (dark)' : '');
        const loop = chain.slice(cycleStart).map(label);
        loop.push(loop[0]);
        const shown = loop.length > 10 ? [...loop.slice(0, 5), '...', ...loop.slice(-4)] : loop;
        report('alias-cycle', cur, `Alias cycle detected: ${shown.join(' -> ')}`);
        break;
      }

      if (targetId === undefined) {
        let external: unknown;
        try {
          external = resolveExternal?.call(opts, target);
        } catch {
          external = undefined;
        }
        if (typeof external !== 'string') {
          report('alias-missing', cur, `Alias "${shownTarget}" does not resolve to any token`);
        } else {
          const problem = valueProblem(external);
          if (problem) {
            report(
              'invalid-token',
              cur,
              `resolveExternal returned an unusable value for "${shownTarget}": ${problem}`,
            );
          } else {
            ok = true;
            value = external;
            tailDark = false;
          }
        }
        break;
      }

      const targetType = entries[targetId].token?.type;
      if (token.type && targetType && token.type !== targetType) {
        report(
          'type-mismatch',
          cur,
          `Alias "${shownTarget}" has type "${clip(targetType, 60)}" but "${pathOf(cur)}" has type "${clip(token.type, 60)}"`,
        );
        break;
      }

      cur = targetId;
    }

    // Walk back from the end of the chain so each member knows whether a dark node was used at or after it.
    let hadDark = ok && tailDark;
    for (let i = chain.length - 1; i >= 0; i--) {
      const m = chain[i];
      hadDark ||= m.dark;
      if (ok) cache.set(m.id, { value, hadDark });
      else bad.add(m.id);
    }
  };

  for (const id of tokenIds) {
    resolve(id, 'light');
    resolve(id, 'dark');
  }

  if (errors.length > 0 || omittedErrors > 0) return failure();

  // Build the nested output; group objects are created lazily so empty groups are omitted.
  const out: Record<string, unknown> = {};
  const objects = new Map<number, Record<string, unknown>>([[ROOT, out]]);
  const objectFor = (groupId: number): Record<string, unknown> => {
    const missing: number[] = [];
    let id = groupId;
    let obj = objects.get(id);
    while (obj === undefined) {
      missing.push(id);
      id = entries[id].parent;
      obj = objects.get(id);
    }
    for (let i = missing.length - 1; i >= 0; i--) {
      const child: Record<string, unknown> = {};
      obj[entries[missing[i]].name] = child;
      objects.set(missing[i], child);
      obj = child;
    }
    return obj;
  };
  for (const id of tokenIds) {
    const light = resolved.light.get(id);
    const dark = resolved.dark.get(id);
    if (!light || !dark) continue; // unreachable: every token resolved or errors were returned
    objectFor(entries[id].parent)[entries[id].name] = dark.hadDark
      ? { light: light.value, dark: dark.value }
      : light.value;
  }
  if (omittedWarnings > 0) {
    warnings.push(
      `${omittedWarnings} more ${omittedWarnings === 1 ? 'warning' : 'warnings'} omitted (maxWarnings ${maxWarnings})`,
    );
  }
  return { ok: true, value: out, warnings };
}
