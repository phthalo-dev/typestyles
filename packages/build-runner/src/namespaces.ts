/** `recipe({ name })` and `styles.component({ name })`, plus the removed positional form. */
const STYLES_COMPONENT_CALL_RE = /(?:styles\.component|(?<![\w.])recipe)\s*\(/g;
/** `style('…')` (new) and `styles.class('…')` (createStyles / legacy). */
const STYLES_CLASS_RE = /(?:styles\.class|(?<![\w.])style)\(\s*['"]([^'"]+)['"]/g;
const TOKENS_CREATE_RE = /tokens\.create\(\s*['"]([^'"]+)['"]/g;
const CREATE_THEME_CALL_RE = /(?:tokens\.)?createTheme\s*\(/g;
const KEYFRAMES_CREATE_RE = /keyframes\.create\(\s*['"]([^'"]+)['"]/g;
/** `global.rule` (new) and `global.style` (legacy). */
const GLOBAL_STYLE_RE = /global\.(?:rule|style)\(\s*['"]([^'"]+)['"]/g;
const GLOBAL_FONT_FACE_RE = /global\.fontFace\(\s*['"]([^'"]+)['"]/g;

/** Max chars to scan inside a `createTheme(…)` / `recipe({…})` call for a `name` literal. */
const CREATE_THEME_ARG_SCAN = 4000;

/**
 * `1` where `code[i]` is a comment, string, or the static text of a template
 * literal. `${…}` expressions stay `0` so a real `recipe()` inside one still counts.
 * Published bundles quote `recipe({ name: '${namespace}', … })` in error text;
 * without this, that placeholder is reported as a duplicate class namespace.
 */
function codeSpanMask(code: string): Uint8Array {
  const mask = new Uint8Array(code.length);
  let i = 0;

  const mark = (from: number, to: number) => {
    const end = Math.min(to, code.length);
    for (let j = from; j < end; j++) mask[j] = 1;
  };

  const skipString = (quote: '"' | "'") => {
    const start = i;
    i += 1;
    while (i < code.length) {
      if (code[i] === '\\') {
        i += 2;
        continue;
      }
      if (code[i] === quote) {
        i += 1;
        break;
      }
      i += 1;
    }
    mark(start, i);
  };

  const scanExpression = () => {
    let depth = 0;
    while (i < code.length) {
      const c = code[i];
      const next = code[i + 1];
      if (c === '/' && next === '/') {
        const start = i;
        i += 2;
        while (i < code.length && code[i] !== '\n') i += 1;
        mark(start, i);
        continue;
      }
      if (c === '/' && next === '*') {
        const start = i;
        i += 2;
        while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i += 1;
        if (i < code.length) i += 2;
        mark(start, i);
        continue;
      }
      if (c === '"' || c === "'") {
        skipString(c);
        continue;
      }
      if (c === '`') {
        scanTemplate();
        continue;
      }
      if (c === '{') {
        depth += 1;
        i += 1;
        continue;
      }
      if (c === '}') {
        i += 1;
        if (depth === 0) return;
        depth -= 1;
        continue;
      }
      i += 1;
    }
  };

  const scanTemplate = () => {
    const open = i;
    i += 1;
    let staticFrom = open;
    while (i < code.length) {
      if (code[i] === '\\') {
        i += 2;
        continue;
      }
      if (code[i] === '`') {
        i += 1;
        mark(staticFrom, i);
        return;
      }
      if (code[i] === '$' && code[i + 1] === '{') {
        mark(staticFrom, i);
        i += 2;
        scanExpression();
        staticFrom = i;
        continue;
      }
      i += 1;
    }
    mark(staticFrom, i);
  };

  while (i < code.length) {
    const c = code[i];
    const next = code[i + 1];
    if (c === '/' && next === '/') {
      const start = i;
      i += 2;
      while (i < code.length && code[i] !== '\n') i += 1;
      mark(start, i);
      continue;
    }
    if (c === '/' && next === '*') {
      const start = i;
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i += 1;
      if (i < code.length) i += 2;
      mark(start, i);
      continue;
    }
    if (c === '"' || c === "'") {
      skipString(c);
      continue;
    }
    if (c === '`') {
      scanTemplate();
      continue;
    }
    i += 1;
  }

  return mask;
}

/** Placeholders such as `${namespace}` are not class prefixes. */
function isStaticNamespace(name: string): boolean {
  return !name.includes('$') && !name.includes('{') && !name.includes('}');
}

/**
 * Recipe namespaces from `recipe({ name: 'x' })` / `styles.component({ name: 'x' })`
 * and the removed positional `recipe('x', …)`.
 */
function extractRecipeNames(code: string, mask: Uint8Array): string[] {
  const names: string[] = [];
  for (const match of code.matchAll(STYLES_COMPONENT_CALL_RE)) {
    const index = match.index ?? 0;
    if (mask[index]) continue;
    const start = index + match[0].length;
    const args = code.slice(start, start + CREATE_THEME_ARG_SCAN);
    const positional = args.match(/^\s*['"]([^'"]+)['"]/);
    if (positional) {
      if (isStaticNamespace(positional[1])) names.push(positional[1]);
      continue;
    }
    if (!/^\s*\{/.test(args)) continue;
    const named = args.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
    if (named && isStaticNamespace(named[1])) names.push(named[1]);
  }
  return names;
}

/**
 * Theme names from positional `createTheme('x', …)` and object
 * `createTheme({ … name: 'x' … })` (name may appear after other fields).
 */
function extractCreateThemeNames(code: string, mask: Uint8Array): string[] {
  const names: string[] = [];
  for (const match of code.matchAll(CREATE_THEME_CALL_RE)) {
    const index = match.index ?? 0;
    if (mask[index]) continue;
    const start = index + match[0].length;
    const args = code.slice(start, start + CREATE_THEME_ARG_SCAN);
    const positional = args.match(/^\s*['"]([^'"]+)['"]/);
    if (positional) {
      if (isStaticNamespace(positional[1])) names.push(positional[1]);
      continue;
    }
    if (!/^\s*\{/.test(args)) continue;
    // `name` may follow `from` / `tokens` / comments — match first prop named `name`.
    const named = args.match(/\bname\s*:\s*['"]([^'"]+)['"]/);
    if (named && isStaticNamespace(named[1])) names.push(named[1]);
  }
  return names;
}

/** Canonical sugar / API names that register `styles.override` rules. */
const OVERRIDE_HMR_EXPORT_NAMES = new Set(['createDesignTheme', 'overrideComponent']);

export const TYPESTYLES_IMPORT_RE = /(?:from\s+|import\s+|require\s*\(\s*)['"]typestyles['"]/;

/**
 * Strip block + line comments so HMR detection ignores documented examples
 * (`// createDesignTheme({…})`) without treating them as live calls.
 */
function stripCommentsForHmrScan(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Local binding names that may call override-registering APIs, including
 * `import { createDesignTheme as cdt }` renames and `import * as Core` namespaces.
 */
function collectOverrideHmrCallTargets(code: string): {
  locals: Set<string>;
  namespaces: Set<string>;
} {
  const locals = new Set<string>(OVERRIDE_HMR_EXPORT_NAMES);
  const namespaces = new Set<string>();

  for (const match of code.matchAll(/import\s*{([^}]+)}\s*from\s*['"][^'"]+['"]/g)) {
    for (const rawPart of match[1].split(',')) {
      const part = rawPart.trim();
      if (!part || part.startsWith('type ')) continue;
      const asMatch = part.match(/^(\w+)\s+as\s+(\w+)$/);
      if (asMatch) {
        if (OVERRIDE_HMR_EXPORT_NAMES.has(asMatch[1])) {
          locals.add(asMatch[2]);
        }
        continue;
      }
      const name = part.match(/^(\w+)$/)?.[1];
      if (name && OVERRIDE_HMR_EXPORT_NAMES.has(name)) {
        locals.add(name);
      }
    }
  }

  for (const match of code.matchAll(/import\s*\*\s*as\s+(\w+)\s*from\s*['"][^'"]+['"]/g)) {
    namespaces.add(match[1]);
  }

  return { locals, namespaces };
}

/**
 * True when this module may register `styles.override` rules and needs Vite HMR
 * dispose tracking — including Var UI sugar (`createDesignTheme` / `overrideComponent`)
 * that never spells `styles.override` in source.
 *
 * Detects renamed imports (`createDesignTheme as cdt`) and namespace imports
 * (`Core.createDesignTheme(`), not only the canonical identifier spelling.
 */
export function moduleNeedsOverrideHmr(code: string): boolean {
  const scan = stripCommentsForHmrScan(code);
  if (/\b(?:styles\.)?override\s*\(/.test(scan)) return true;

  const { locals, namespaces } = collectOverrideHmrCallTargets(scan);
  for (const name of locals) {
    if (new RegExp(`\\b${name}\\s*\\(`).test(scan)) return true;
  }
  for (const ns of namespaces) {
    if (new RegExp(`\\b${ns}\\.(?:createDesignTheme|overrideComponent)\\s*\\(`).test(scan)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract namespace information from source code for invalidation and duplicate checks.
 */
export function extractNamespaces(code: string): {
  keys: string[];
  prefixes: string[];
  /** Static `recipe()` / `styles.component()` names, in source order. */
  recipeNames: string[];
} {
  const keys: string[] = [];
  const prefixes: string[] = [];
  const mask = codeSpanMask(code);
  const inCode = (index: number | undefined) => index !== undefined && mask[index] === 0;
  const recipeNames = extractRecipeNames(code, mask);

  for (const name of recipeNames) {
    prefixes.push(`.${name}-`);
  }
  for (const match of code.matchAll(STYLES_CLASS_RE)) {
    if (!inCode(match.index) || !isStaticNamespace(match[1])) continue;
    prefixes.push(`.${match[1]}-`);
  }
  for (const match of code.matchAll(TOKENS_CREATE_RE)) {
    if (!inCode(match.index) || !isStaticNamespace(match[1])) continue;
    keys.push(`tokens:${match[1]}`);
  }
  for (const themeName of extractCreateThemeNames(code, mask)) {
    keys.push(`theme:${themeName}`);
  }
  for (const match of code.matchAll(KEYFRAMES_CREATE_RE)) {
    if (!inCode(match.index) || !isStaticNamespace(match[1])) continue;
    keys.push(`keyframes:${match[1]}`);
  }
  for (const match of code.matchAll(GLOBAL_STYLE_RE)) {
    if (!inCode(match.index)) continue;
    prefixes.push(match[1]);
  }
  for (const match of code.matchAll(GLOBAL_FONT_FACE_RE)) {
    if (!inCode(match.index)) continue;
    prefixes.push(`font-face:${match[1]}`);
  }

  return { keys, prefixes, recipeNames };
}

export interface DuplicateNamespaceReporter {
  error(message: string): void;
}

/**
 * Fail the build when the same style namespace appears in more than one module.
 */
export function reportDuplicateNamespaces(
  moduleNamespaces: Map<string, { keys: string[]; prefixes: string[] }>,
  id: string,
  prefixes: string[],
  reporter: DuplicateNamespaceReporter,
): void {
  for (const [otherId, other] of moduleNamespaces) {
    if (otherId === id) continue;
    for (const prefix of prefixes) {
      if (other.prefixes.includes(prefix)) {
        const ns = prefix.slice(1, -1);
        reporter.error(
          `[typestyles] Style namespace "${ns}" is also used in ${otherId}. ` +
            `Duplicate namespaces cause class name collisions. ` +
            `Use a distinct name or isolate with createStyles({ scopeId: fileScopeId(import.meta) }).`,
        );
      }
    }
  }
}
