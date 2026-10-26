import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { traceReachableFiles } from './trace-imports';

/** A local module Vite loaded that calls `recipe()` or `styles.component()`. */
export interface RecipeModuleRecord {
  /** Bundler module id. Absolute paths may include a query string. */
  id: string;
  /** Static recipe names in source order. */
  names: string[];
}

export interface UnextractedRecipe {
  /** Path relative to `root` when the file lives inside it. */
  modulePath: string;
  names: string[];
}

function stripModuleQuery(id: string): string {
  const query = id.indexOf('?');
  const hash = id.indexOf('#');
  let end = id.length;
  if (query >= 0) end = Math.min(end, query);
  if (hash >= 0) end = Math.min(end, hash);
  let clean = id.slice(0, end);
  // Vite ids for files outside the project root: `/@fs/<absolute>`.
  if (clean.startsWith('/@fs/')) {
    const rest = clean.slice('/@fs/'.length);
    clean = isAbsolute(rest) ? rest : `/${rest}`;
  }
  return clean;
}

/** Absolute real path, or null when the id is virtual, missing, or inside node_modules. */
function canonicalModulePath(filePath: string): string | null {
  const clean = stripModuleQuery(filePath);
  if (!clean || clean.includes('\0') || clean.includes('node_modules')) return null;
  if (!isAbsolute(clean)) return null;
  const abs = resolve(clean);
  if (!existsSync(abs)) return null;
  try {
    return realpathSync(abs);
  } catch {
    return abs;
  }
}

function displayPath(root: string, absPath: string): string {
  const rel = relative(root, absPath);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    return absPath.split(sep).join('/');
  }
  return rel.split(sep).join('/');
}

function mergeNames(existing: string[], names: string[]): void {
  for (const name of names) {
    if (name && !existing.includes(name)) existing.push(name);
  }
}

/**
 * Local `recipe()` modules that Vite reached from the app and CSS extraction
 * will not run, because they are missing from the extract entry graph.
 *
 * The extract graph follows the same side-effect rules as {@link runTypestylesBuild}.
 */
export async function findUnextractedRecipes(options: {
  root: string;
  extractEntries: string[];
  recipeModules: RecipeModuleRecord[];
}): Promise<UnextractedRecipe[]> {
  const resolvedRoot = resolve(options.root);
  const root = existsSync(resolvedRoot) ? realpathSync(resolvedRoot) : resolvedRoot;
  const pending = new Map<string, string[]>();

  for (const record of options.recipeModules) {
    const abs = canonicalModulePath(record.id);
    if (!abs) continue;
    const names = record.names.filter((name) => name.length > 0);
    if (names.length === 0) continue;
    const existing = pending.get(abs);
    if (existing) {
      mergeNames(existing, names);
    } else {
      pending.set(abs, [...names]);
    }
  }

  if (pending.size === 0 || options.extractEntries.length === 0) return [];

  const inputs = await traceReachableFiles(root, options.extractEntries);
  const reachable = new Set<string>();
  for (const input of inputs) {
    const abs = canonicalModulePath(resolve(root, input));
    if (abs) reachable.add(abs);
  }

  const missing: UnextractedRecipe[] = [];
  for (const [abs, names] of pending) {
    if (reachable.has(abs)) continue;
    missing.push({ modulePath: displayPath(root, abs), names });
  }
  missing.sort((a, b) => a.modulePath.localeCompare(b.modulePath));
  return missing;
}
