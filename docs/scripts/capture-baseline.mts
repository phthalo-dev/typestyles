/**
 * Reads an existing `docs/dist` build (does not build) and records parity baselines
 * under `specs/baseline/`: sorted output URLs, llms.txt, and heading ids per HTML page.
 *
 * Usage: node docs/scripts/capture-baseline.mts   (after `vp run -F "docs..." build`)
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../dist');
const outDir = resolve(here, '../../specs/baseline');
const EXTENSIONS = new Set(['.html', '.md', '.txt', '.json']);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(dist)
  .map((file) => '/' + relative(dist, file).split('\\').join('/'))
  // Build-hash assets and the playground vendor tree are not part of the public URL contract.
  .filter((path) => EXTENSIONS.has(path.slice(path.lastIndexOf('.'))))
  .filter((path) => !path.startsWith('/_astro/') && !path.startsWith('/playground/vendor/'))
  .sort();

const headings: Record<string, string[]> = {};
for (const path of files) {
  if (!path.endsWith('.html')) continue;
  const html = readFileSync(join(dist, path), 'utf8');
  const ids = [...html.matchAll(/<h[1-6]\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
  headings[path] = ids;
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'urls.json'), JSON.stringify(files, null, 2) + '\n');
writeFileSync(join(outDir, 'headings.json'), JSON.stringify(headings, null, 2) + '\n');
writeFileSync(join(outDir, 'llms.txt'), readFileSync(join(dist, 'llms.txt'), 'utf8'));
console.log(`baseline: ${files.length} urls, ${Object.keys(headings).length} html pages`);
