import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const assetsDir = join(dist, 'assets');
const cssName = readdirSync(assetsDir).find((name) =>
  /^typestyles-[A-Za-z0-9_-]+\.css$/.test(name),
);

if (!cssName) {
  throw new Error('Expected dist/assets/typestyles-<hash>.css after vite build');
}

const css = readFileSync(join(assetsDir, cssName), 'utf8');
if (!css.includes('vue-button')) {
  throw new Error('Expected vue-button styles in extracted CSS');
}

const html = readFileSync(join(dist, 'index.html'), 'utf8');
if (!html.includes(`/assets/${cssName}`)) {
  throw new Error('Expected index.html to link the hashed typestyles CSS');
}
if (html.includes('href="/typestyles.css"') || existsSync(join(dist, 'typestyles.css'))) {
  throw new Error('Expected the unhashed typestyles.css path to be removed from the build');
}

const jsFiles = readdirSync(assetsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => readFileSync(join(assetsDir, entry.name), 'utf8'));

if (!jsFiles.some((source) => source.includes('vue-button'))) {
  throw new Error('Expected vue-button class helper in JS bundle');
}

console.log('vue-app build verification passed');
