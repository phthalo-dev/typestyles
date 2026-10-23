# @typestyles/build-runner

Shared build-time utilities for [typestyles](https://github.com/phthalo-dev/typestyles) bundler integrations — CSS extraction, convention entry discovery, namespace analysis, and CI verification.

You typically consume this package **indirectly** through `@typestyles/vite`, `@typestyles/rollup`, `@typestyles/esbuild`, `@typestyles/webpack`, or `@typestyles/next/build`. Install it directly when writing custom build scripts, CI checks, or a new integration.

## Why extraction needs a runner

Zero-runtime mode works by **executing** your style registration modules in Node, then calling `getRegisteredCss()`. That requires:

1. Bundling TypeScript/JSX entry files (esbuild, no `tsx` dependency in apps)
2. Running the bundle in a subprocess with `typestyles` available
3. Returning the collected CSS string

Every official bundler plugin delegates to `runTypestylesBuild()` so behavior stays identical across Vite, Rollup, webpack, and Next.js prebuild scripts.

## Installation

```bash
npm install -D @typestyles/build-runner typestyles
```

Dependency: esbuild (bundled by this package for extraction).

## Quick start — extract CSS in a script

```ts
import { writeFileSync } from 'node:fs';
import {
  discoverDefaultExtractModules,
  runTypestylesBuild,
  verifyTypestylesBuild,
} from '@typestyles/build-runner';

const root = process.cwd();
const modules = discoverDefaultExtractModules(root);

if (modules.length === 0) {
  throw new Error('No convention entry found — add src/typestyles-entry.ts');
}

const css = await runTypestylesBuild({ root, modules });
writeFileSync('dist/typestyles.css', css);

verifyTypestylesBuild({
  root,
  cssFile: 'dist/typestyles.css',
  minBytes: 100,
  requiredCssSubstrings: ['.button-base'],
});
```

Used by: [`examples/next-app/scripts/verify-typestyles.mts`](../../examples/next-app/scripts/verify-typestyles.mts)

## Convention entry discovery

When integrations omit explicit `extract.modules`, they call `discoverDefaultExtractModules(root)`:

```text
src/typestyles-entry.ts   (.tsx, .js, .mjs tried per base)
src/typestyles.ts
src/styles/index.ts
src/styles.ts
styles/typestyles-entry.ts
styles/typestyles.ts
```

Constants:

```ts
import {
  DEFAULT_EXTRACT_MODULE_BASES,
  DEFAULT_EXTRACT_MODULE_CANDIDATES,
  discoverDefaultExtractModules,
} from '@typestyles/build-runner';
```

Your entry file should import every module that registers styles as a side effect:

```ts
// src/typestyles-entry.ts
import './tokens';
import './components/button';
```

**Important:** Styles not reachable from the entry graph are **silently omitted** from extracted CSS. Always verify output in CI.

## Verify builds in CI

`verifyTypestylesBuild()` catches empty files, missing assets, and manifest mismatches:

```ts
import { verifyTypestylesBuild, VerifyTypestylesBuildError } from '@typestyles/build-runner';

try {
  verifyTypestylesBuild({
    root: process.cwd(),
    cssFile: 'dist/typestyles.css',
    manifestFile: 'dist/typestyles.manifest.json', // optional
    manifestCssPath: 'typestyles.css',
    minBytes: 500,
    requiredCssSubstrings: ['--color-primary', '.button-base'],
  });
} catch (err) {
  if (err instanceof VerifyTypestylesBuildError) {
    console.error(err.code, err.message);
  }
  process.exit(1);
}
```

Next.js writes manifests via `buildTypestylesForNext` — pass the same paths your app expects.

Docs: [Zero-runtime — verify the build](https://typestyles.dev/docs/zero-runtime#verify-the-build)

## API reference

### `runTypestylesBuild({ root, modules })`

Bundles and executes entry modules; returns CSS string.

```ts
const css = await runTypestylesBuild({
  root: '/path/to/project',
  modules: ['src/typestyles-entry.ts'],
});
```

### `verifyTypestylesBuild(options)`

Throws `VerifyTypestylesBuildError` with a `code` on failure.

| Option                  | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `root`                  | Project root                                    |
| `cssFile`               | Extracted CSS path (relative to `root`)         |
| `manifestFile`          | Optional manifest path; omit or `false` to skip |
| `manifestCssPath`       | Expected `css` field in manifest                |
| `minBytes`              | Minimum file size (default: non-empty)          |
| `requiredCssSubstrings` | Sanity-check strings that must appear in CSS    |
| `minRouteEntries`       | For manifest v2: minimum route CSS entries      |

### Per-route CSS (Next.js)

`collectAndWriteRouteCss`, `discoverNextAppRoutes`, `traceTypestylesModules`, and `getRouteCss` support App Router critical CSS. `@typestyles/next/build` wires these into `buildTypestylesForNext` by default when `app/` exists.

### `discoverDefaultExtractModules(root)`

Returns `string[]` — at most one relative path, or `[]`.

### `resolveExtractModules(root, extract?)`

Resolves explicit `extract.modules` or falls back to discovery. Used by bundler plugins.

### `resolveExtractMode(mode?, modules?)`

Returns `'build'` when modules exist and mode is omitted; otherwise `'runtime'`.

### `extractNamespaces(sourceCode)`

Parses a file for typestyles registration calls. Returns `{ keys, prefixes }` for duplicate detection:

```ts
import { extractNamespaces } from '@typestyles/build-runner';

const { prefixes } = extractNamespaces(source);
// recipe({ name: 'button', ... }) → prefixes includes '.button-'
```

### `reportDuplicateNamespaces(map, fileId, prefixes, reporter)`

Shared duplicate-namespace error reporting for Vite/Rollup/webpack plugins.

## Integration authors

Re-export discovery helpers from your plugin entry so apps can introspect defaults:

```ts
export {
  DEFAULT_EXTRACT_MODULE_CANDIDATES,
  discoverDefaultExtractModules,
} from '@typestyles/build-runner';
```

See `@typestyles/vite` for the reference integration.

## Related packages

| Package                             | Uses build-runner for                        |
| ----------------------------------- | -------------------------------------------- |
| [`@typestyles/vite`](../vite)       | `vite build` asset emission + dev middleware |
| [`@typestyles/rollup`](../rollup)   | Rollup/Rolldown `generateBundle`             |
| [`@typestyles/esbuild`](../esbuild) | esbuild plugin                               |
| [`@typestyles/webpack`](../webpack) | webpack compilation assets                   |
| [`@typestyles/next`](../next)       | `buildTypestylesForNext` prebuild            |

## License

Apache-2.0
