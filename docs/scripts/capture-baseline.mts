/**
 * Docs output parity against `specs/baseline/`. Reads an existing `docs/dist` build (does not
 * build; fails if `docs/dist` is missing). The comparison itself lives in `src/lib/parity.ts`.
 *
 * The baseline records sorted output URLs, `llms.txt`, heading ids per HTML page, and sha256
 * hashes of the machine-readable outputs (markdown views, llms-full.txt, docs/search indexes,
 * sitemaps, `.well-known/mcp.json`). Changelog views (`/docs/changelog/**`, generated from every
 * CHANGELOG.md) and `/mcp-content.json` (which embeds the changelogs) are never hashed, so
 * release PRs never break a check. HTML bodies are not hashed either.
 *
 * Modes (after `vp run -F "docs..." build`):
 *   node docs/scripts/capture-baseline.mts --check --ci   CI mode (`parity:ci`, run by `vp run ci`):
 *                                                         fails only when a baselined URL is missing
 *                                                         from the build (broken inbound links). New
 *                                                         URLs and content changes pass; lost heading
 *                                                         ids are printed as warnings.
 *   node docs/scripts/capture-baseline.mts --check        strict mode (`parity`), for migrations: URL
 *                                                         lists equal, no heading id lost, llms.txt and
 *                                                         hashes unchanged. Semantic, so formatting of
 *                                                         the committed JSON does not matter.
 *   node docs/scripts/capture-baseline.mts                write specs/baseline/ (`parity:update`)
 *
 * Exit 1 on failure. After removing or renaming a page on purpose (with redirects in place), or
 * after an intended output change during a migration, run `parity:update` and commit
 * `specs/baseline/`.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareParity, isHashed, type ParitySnapshot } from '../src/lib/parity.ts';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');
const baselineDir = resolve(here, '../../specs/baseline');
const check = process.argv.includes('--check');
const mode = process.argv.includes('--ci') ? 'ci' : 'strict';
const EXTENSIONS = new Set(['.html', '.md', '.txt', '.json']);

if (!existsSync(join(dist, 'llms.txt'))) {
  console.error(`parity: no docs build at ${dist}. Run \`vp run -F "docs..." build\` first.`);
  process.exit(1);
}

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

const urls = allFiles.filter((path) => EXTENSIONS.has(path.slice(path.lastIndexOf('.'))));

const headings: Record<string, string[]> = {};
for (const path of urls) {
  if (!path.endsWith('.html')) continue;
  const html = readFileSync(join(dist, path), 'utf8');
  headings[path] = [...html.matchAll(/<h[1-6]\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
}

const hashes: Record<string, string> = {};
for (const path of allFiles) {
  if (!isHashed(path)) continue;
  hashes[path] = createHash('sha256')
    .update(readFileSync(join(dist, path)))
    .digest('hex');
}

const current: ParitySnapshot = {
  urls,
  headings,
  hashes,
  llms: readFileSync(join(dist, 'llms.txt'), 'utf8'),
};

if (check) {
  const read = (name: string) => readFileSync(join(baselineDir, name), 'utf8');
  const baseline: ParitySnapshot = {
    urls: JSON.parse(read('urls.json')),
    headings: JSON.parse(read('headings.json')),
    hashes: JSON.parse(read('hashes.json')),
    llms: read('llms.txt'),
  };
  const { errors, warnings } = compareParity(baseline, current, mode);
  for (const warning of warnings) console.warn(`parity warning: ${warning}`);
  if (errors.length) {
    console.error(`parity (${mode}): ${errors.length} problem(s)\n` + errors.join('\n'));
    if (mode === 'ci') {
      console.error(
        'A baselined URL disappeared, which breaks inbound links. Restore the page, or add a ' +
          'redirect and run `vp run -F docs parity:update` and commit specs/baseline/.',
      );
    }
    process.exit(1);
  }
  const added = urls.filter((u) => !baseline.urls.includes(u)).length;
  console.log(
    `parity ok (${mode}): ${urls.length} urls (${added} not in baseline), ` +
      `${Object.keys(headings).length} html pages, ${Object.keys(hashes).length} hashed outputs` +
      (warnings.length ? `, ${warnings.length} warning(s)` : ''),
  );
  process.exit(0);
}

mkdirSync(baselineDir, { recursive: true });
writeFileSync(join(baselineDir, 'urls.json'), JSON.stringify(urls, null, 2) + '\n');
writeFileSync(join(baselineDir, 'headings.json'), JSON.stringify(headings, null, 2) + '\n');
writeFileSync(join(baselineDir, 'hashes.json'), JSON.stringify(hashes, null, 2) + '\n');
writeFileSync(join(baselineDir, 'llms.txt'), current.llms);
console.log(
  `baseline: ${urls.length} urls, ${Object.keys(headings).length} html pages, ${Object.keys(hashes).length} hashed outputs`,
);
