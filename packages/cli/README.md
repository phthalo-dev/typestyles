# @typestyles/cli

Command-line tools for [typestyles](https://github.com/phthalo-dev/typestyles).

## Install

```bash
pnpm add -D @typestyles/cli
```

## Commands

### `typestyles snapshot`

Snapshot semantic class names from `style()` / `recipe()` call sites (and legacy `styles.class` / `styles.component` on `createStyles()` instances).
Use with `@typestyles/no-removed-public-classname` to guard breaking renames in
publishable packages.

```bash
# Write `.typestyles-public-classnames.json` in the project root
typestyles snapshot --write

# Preview without writing
typestyles snapshot --root ./packages/ui
```

## Programmatic API

The snapshot library is also exported for tooling (e.g. the ESLint plugin):

```ts
import { collectPublicClassNamesSync, writePublicClassNamesSnapshot } from '@typestyles/cli';
```

See [Publishing Packages — guard public class names](https://typestyles.dev/docs/publishing-packages#guard-public-class-names).
