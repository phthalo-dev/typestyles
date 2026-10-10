# @typestyles/migrate

## 0.4.0

### Minor Changes

- [#99](https://github.com/type-styles/typestyles/pull/99) [`27ad6d0`](https://github.com/type-styles/typestyles/commit/27ad6d0489ad521cb3903a0667956f0b1d2a8cbc) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Migrate codemod: convert prop-based styled-components interpolations to `createVar` + `assignVars`, boolean prop ternaries to `styles.component` variants, destructured prop params, and `@media` blocks (P2.14).

### Patch Changes

- [#98](https://github.com/type-styles/typestyles/pull/98) [`e17b8a0`](https://github.com/type-styles/typestyles/commit/e17b8a06d0a54ed3f6f0907fe84beb3d4fd03989) Thanks [@dbanksdesign](https://github.com/dbanksdesign)! - Add npm landing-page READMEs for every published package, an examples index with contributor guidance, and doc-to-example cross-links (P2.13).

## 0.3.0

### Minor Changes

- [#49](https://github.com/type-styles/typestyles/pull/49): Add ESLint configuration across all packages, examples, and docs. Create shared `eslint.base.js` config with TypeScript rules and add lint scripts to all package.json files. Update CI workflow to run lint via turbo.

### Patch Changes

- [#45](https://github.com/type-styles/typestyles/pull/45): Add comprehensive test coverage for previously untested modules: props utils/generate/runtime, typestyles build, and migrate transform/css/files.
- [#50](https://github.com/type-styles/typestyles/pull/50): Add lint-staged for prettier formatting on pre-commit hook and format entire codebase

## 0.2.0

### Minor Changes

- [#28](https://github.com/type-styles/typestyles/pull/28): Add a new `@typestyles/migrate` CLI package for safely migrating static styled-components and Emotion patterns to typestyles with dry-run output, optional `--write`, and JSON reporting.
