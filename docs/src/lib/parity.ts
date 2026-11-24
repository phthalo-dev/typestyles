/**
 * Pure comparison logic for the docs output parity check (`docs/scripts/capture-baseline.mts`).
 * No file system access, so it can be unit tested.
 *
 * Two modes:
 * - `ci`: what `vp run ci` (and so `pnpm verify`, the pre-push hook and the Verify job) runs.
 *   Fails only when a URL from the baseline is missing from the build (a deleted or renamed page
 *   breaks inbound links). Added URLs are fine, content hashes are ignored, and lost heading ids
 *   are warnings. Release PRs (changesets edit every CHANGELOG.md), doc content edits and new
 *   pages therefore pass without touching `specs/baseline/`.
 * - `strict`: for migrations (shell or pipeline rewrites that must not change any output). URL
 *   lists must match exactly, no heading id may disappear, `llms.txt` and every hashed output must
 *   be unchanged.
 */

export type ParityMode = 'ci' | 'strict';

export interface ParitySnapshot {
  /** Sorted output URLs (`.html`, `.md`, `.txt`, `.json`). */
  urls: string[];
  /** Heading ids per HTML page. */
  headings: Record<string, string[]>;
  /** sha256 per hashed output (see `isHashed`). */
  hashes: Record<string, string>;
  /** Contents of `llms.txt`. */
  llms: string;
}

export interface ParityResult {
  errors: string[];
  warnings: string[];
}

/**
 * Generated from `packages/*\/CHANGELOG.md` and `examples/*\/CHANGELOG.md`; every release PR
 * rewrites them, so they are never hashed.
 */
export function isChangelogOutput(path: string): boolean {
  return path.startsWith('/docs/changelog/');
}

/**
 * Outputs consumed by AI tooling, search and crawlers, hashed in strict mode. Changelog views and
 * `/mcp-content.json` (which embeds every changelog) are excluded so release PRs do not break a
 * strict run either.
 */
export function isHashed(path: string): boolean {
  if (isChangelogOutput(path)) return false;
  return (
    path === '/llms.txt' ||
    path === '/llms-full.txt' ||
    path === '/docs-index.json' ||
    path === '/search-index.json' ||
    path === '/.well-known/mcp.json' ||
    /^\/sitemap[^/]*\.xml$/.test(path) ||
    (path.startsWith('/docs/') && path.endsWith('.md'))
  );
}

export function compareParity(
  baseline: ParitySnapshot,
  current: ParitySnapshot,
  mode: ParityMode,
): ParityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const strict = mode === 'strict';
  const currentUrls = new Set(current.urls);
  const baseUrls = new Set(baseline.urls);

  for (const url of baseline.urls) if (!currentUrls.has(url)) errors.push(`missing url: ${url}`);
  if (strict) {
    for (const url of current.urls) if (!baseUrls.has(url)) errors.push(`new url: ${url}`);
  }

  for (const [page, ids] of Object.entries(baseline.headings)) {
    // A missing page is already reported as a missing url.
    if (!currentUrls.has(page)) continue;
    const now = new Set(current.headings[page] ?? []);
    const lost = ids.filter((id) => !now.has(id));
    if (lost.length)
      (strict ? errors : warnings).push(`heading ids lost on ${page}: ${lost.join(', ')}`);
  }

  if (strict) {
    for (const [path, hash] of Object.entries(baseline.hashes)) {
      if (!isHashed(path)) continue;
      if (current.hashes[path] !== hash) errors.push(`content changed: ${path}`);
    }
    for (const path of Object.keys(current.hashes)) {
      if (isHashed(path) && !(path in baseline.hashes)) errors.push(`new hashed output: ${path}`);
    }
    if (baseline.llms !== current.llms) errors.push('llms.txt changed');
  }

  return { errors, warnings };
}
