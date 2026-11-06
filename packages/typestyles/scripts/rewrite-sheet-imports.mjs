/**
 * Post-build step: turn the external `#sheet` import into a relative path.
 *
 * Source modules import the stylesheet module as `#sheet` so the bundler keeps
 * it as a separate file (see `vite.config.ts`). Package `imports` aren't
 * supported by every bundler/tool (Parcel without flags, Metro, older Jest),
 * so the published files must not contain them. A relative `./sheet.js`
 * resolves everywhere; the typestyles bundler integrations redirect that one
 * file to `sheet-noop.js` for zero-runtime builds.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const FILE_RE = /\.(?:c?js|d\.c?ts)$/;
const SPEC_RE = /(["'])#sheet\1/g;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (FILE_RE.test(entry.name)) yield full;
  }
}

let rewritten = 0;
for (const file of walk(distDir)) {
  const source = fs.readFileSync(file, 'utf8');
  if (!SPEC_RE.test(source)) continue;
  SPEC_RE.lastIndex = 0;
  const isCjs = /\.c(?:js|ts)$/.test(file);
  const ext = isCjs ? 'cjs' : 'js';
  let rel = path.relative(path.dirname(file), path.join(distDir, `sheet.${ext}`));
  rel = rel.split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  const target = /\.d\.c?ts$/.test(file) ? rel.replace(/\.c?js$/, '') : rel;
  fs.writeFileSync(file, source.replace(SPEC_RE, `$1${target}$1`));
  rewritten++;
}

const leftovers = [...walk(distDir)].filter((f) =>
  /(["'])#sheet\1/.test(fs.readFileSync(f, 'utf8')),
);
if (leftovers.length > 0) {
  console.error(`[typestyles:rewrite-sheet] #sheet still present in: ${leftovers.join(', ')}`);
  process.exit(1);
}
console.log(`[typestyles:rewrite-sheet] rewrote #sheet in ${rewritten} files`);
