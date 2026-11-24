/**
 * Reads an existing `docs/dist` build (does not build) and records parity baselines
 * under `specs/baseline/`: sorted output URLs, llms.txt, heading ids per HTML page, and
 * sha256 content hashes of the machine-readable outputs (markdown views, llms-full.txt,
 * docs/search indexes, sitemaps, MCP content). HTML bodies are not hashed: shell changes
 * may alter them, but must not alter any of the hashed outputs.
 *
 * Doc content edits change the hashed outputs: after any intended change, run
 * `vp run -F docs build && vp run -F docs parity:update` and commit `specs/baseline/`
 * (`vp run ci` runs `vp run -F docs parity` and fails on drift).
 *
 * Usage (after `vp run -F "docs..." build`):
 *   node docs/scripts/capture-baseline.mts            write specs/baseline/
 *   node docs/scripts/capture-baseline.mts --check    compare dist against specs/baseline/
 *                                                     (semantic, so formatting of the
 *                                                     committed JSON does not matter); exit 1 on drift
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');
const baselineDir = resolve(here, '../../specs/baseline');
const check = process.argv.includes('--check');
const EXTENSIONS = new Set(['.html', '.md', '.txt', '.json']);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const allFiles = walk(dist)
  .map((file) => '/' + relative(dist, file).split('\\').join('/'))
  // Build-hash assets and the playground vendor tree are not part of the public URL contract.
  .filter((path) => !path.startsWith('/_astro/') && !path.startsWith('/playground/vendor/'))
  .sort();

const files = allFiles.filter((path) => EXTENSIONS.has(path.slice(path.lastIndexOf('.'))));

const headings: Record<string, string[]> = {};
for (const path of files) {
  if (!path.endsWith('.html')) continue;
  const html = readFileSync(join(dist, path), 'utf8');
  const ids = [...html.matchAll(/<h[1-6]\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
  headings[path] = ids;
}

/** Outputs consumed by AI tooling, search and crawlers; must not change with the shell. */
function isHashed(path: string): boolean {
  return (
    path === '/llms.txt' ||
    path === '/llms-full.txt' ||
    path === '/docs-index.json' ||
    path === '/search-index.json' ||
    path === '/mcp-content.json' ||
    path === '/.well-known/mcp.json' ||
    /^\/sitemap[^/]*\.xml$/.test(path) ||
    (path.startsWith('/docs/') && path.endsWith('.md'))
  );
}

const hashes: Record<string, string> = {};
for (const path of allFiles) {
  if (!isHashed(path)) continue;
  hashes[path] = createHash('sha256')
    .update(readFileSync(join(dist, path)))
    .digest('hex');
}

const llms = readFileSync(join(dist, 'llms.txt'), 'utf8');

if (check) {
  const read = (name: string) => readFileSync(join(baselineDir, name), 'utf8');
  const problems: string[] = [];
  const baseUrls: string[] = JSON.parse(read('urls.json'));
  for (const u of baseUrls) if (!files.includes(u)) problems.push(`missing url: ${u}`);
  for (const u of files) if (!baseUrls.includes(u)) problems.push(`new url: ${u}`);
  const baseHeadings: Record<string, string[]> = JSON.parse(read('headings.json'));
  for (const [page, ids] of Object.entries(baseHeadings)) {
    const now = headings[page] ?? [];
    const lost = ids.filter((id) => !now.includes(id));
    if (lost.length) problems.push(`heading ids lost on ${page}: ${lost.join(', ')}`);
  }
  const baseHashes: Record<string, string> = JSON.parse(read('hashes.json'));
  for (const [path, hash] of Object.entries(baseHashes)) {
    if (hashes[path] !== hash) problems.push(`content changed: ${path}`);
  }
  for (const path of Object.keys(hashes)) {
    if (!(path in baseHashes)) problems.push(`new hashed output: ${path}`);
  }
  if (read('llms.txt') !== llms) problems.push('llms.txt changed');
  if (problems.length) {
    console.error(`parity: ${problems.length} problem(s)\n` + problems.join('\n'));
    process.exit(1);
  }
  console.log(
    `parity ok: ${files.length} urls, ${Object.keys(headings).length} html pages, ${Object.keys(hashes).length} hashed outputs`,
  );
  process.exit(0);
}

mkdirSync(baselineDir, { recursive: true });
writeFileSync(join(baselineDir, 'urls.json'), JSON.stringify(files, null, 2) + '\n');
writeFileSync(join(baselineDir, 'headings.json'), JSON.stringify(headings, null, 2) + '\n');
writeFileSync(join(baselineDir, 'hashes.json'), JSON.stringify(hashes, null, 2) + '\n');
writeFileSync(join(baselineDir, 'llms.txt'), llms);
console.log(
  `baseline: ${files.length} urls, ${Object.keys(headings).length} html pages, ${Object.keys(hashes).length} hashed outputs`,
);
