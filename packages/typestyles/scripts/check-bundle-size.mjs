import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.js');
const colorPath = path.join(distDir, 'color.js');

/** Gzip budget for the main runtime entry (`dist/index.js`) and its code-split chunks. */
const INDEX_GZIP_BUDGET = 39_800;

function gzipSize(filePath) {
  return zlib.gzipSync(fs.readFileSync(filePath)).length;
}

function fail(message) {
  console.error(`[typestyles:bundle-size] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  fail(`Missing ${indexPath} — run pnpm build first.`);
}

const indexGzip = gzipSize(indexPath);
console.log(
  `[typestyles:bundle-size] index.js gzip: ${indexGzip} bytes (budget ${INDEX_GZIP_BUDGET})`,
);

if (indexGzip > INDEX_GZIP_BUDGET) {
  fail(`Main entry exceeds gzip budget by ${indexGzip - INDEX_GZIP_BUDGET} bytes.`);
}

if (fs.existsSync(colorPath)) {
  const colorGzip = gzipSize(colorPath);
  console.log(`[typestyles:bundle-size] color.js gzip: ${colorGzip} bytes (separate subpath)`);
}
