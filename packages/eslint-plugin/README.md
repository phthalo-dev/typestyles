# @typestyles/eslint-plugin

ESLint rules for [typestyles](https://github.com/phthalo-dev/typestyles) style objects — catch authoring mistakes at edit time that would otherwise produce invalid or silently wrong CSS.

StyleX and similar tools reject conflicting declarations at compile time. TypeStyles is runtime-first, so these rules fill the gap: shorthand/longhand conflicts, invalid unitless values, and duplicate namespaces across files.

## Installation

```bash
npm install -D @typestyles/eslint-plugin eslint
```

Peer dependency: ESLint ^8.57 or ^9.

Requires `@typescript-eslint/parser` (or typescript-eslint flat config) for TypeScript/TSX files.

## Quick start (flat config)

```js
// eslint.config.js
import tseslint from 'typescript-eslint';
import { configs as typestylesConfigs } from '@typestyles/eslint-plugin';

export default tseslint.config(...tseslint.configs.recommended, typestylesConfigs.recommended);
```

The `recommended` preset enables all three rules as errors.

## Rules

### `@typestyles/no-shorthand-longhand-conflict`

Disallows mixing CSS shorthand and longhand in the same style object.

```ts
// ❌ paddingTop is ignored unpredictably
style('card', {
  padding: '8px',
  paddingTop: '16px',
});

// ✅ pick one
style('card', { padding: '8px 8px 8px 16px' });
```

Applies to `recipe`, `style`, variant objects, and nested selectors inside those calls. Also applies to legacy `styles.component` / `styles.class` on `createStyles()` instances.

### `@typestyles/no-invalid-unitless-value`

Catches bare number **strings** on properties that need units. TypeStyles auto-appends `px` to numeric literals, not strings.

```ts
// ❌ emits invalid `line-height: 24px` is fine, but `"24"` as string does not get px
style('text', { lineHeight: '24' });

// ✅
style('text', { lineHeight: 24 }); // → 24px where applicable
style('text', { lineHeight: '1.5' }); // unitless ratio as string
```

Optional rule option `checkSuspiciousUnitlessNumbers` warns when a numeric literal is used on truly unitless properties (e.g. `lineHeight: 24` vs `lineHeight: 1.5`).

### `@typestyles/no-duplicate-namespace`

Disallows reusing the same logical namespace across the project:

```ts
// file-a.ts
recipe({ name: 'button', styles: { base: { … } } });

// file-b.ts — ❌ collision
recipe({ name: 'button', styles: { base: { … } } });
```

Tracks `recipe`, `style`, `hash`, `tokens.create`, `tokens.createTheme`, `keyframes.create`, and `global.rule` / `global.fontFace` (and legacy `styles.component`, `styles.class`, `global.style` where used). Reports duplicates within a file and across files in the same ESLint run.

> Bundler plugins (`@typestyles/vite`, etc.) also fail the build on duplicate `recipe` / `style` namespaces. ESLint catches the issue earlier in the editor.

### `@typestyles/no-removed-public-classname` (opt-in)

Guards **publishable** design systems against semver-breaking semantic class renames. Compares the current project scan to a committed `.typestyles-public-classnames.json` snapshot (generate with `typestyles snapshot --write` from [`@typestyles/cli`](../cli)).

```js
'@typestyles/no-removed-public-classname': [
  'error',
  { snapshotFile: '.typestyles-public-classnames.json' },
],
```

Adding new class names never fails — only removals or renames do.

**Diagnostics** are reported once per ESLint run (on `Program:exit`), not at the specific `recipe()` call site. Treat them as project-level semver checks, similar to `no-duplicate-namespace`.

**Static analysis limits** (best-effort, not exhaustive):

- Namespace must be a **string literal** — variables and template literals are skipped
- Direct `recipe()` / `style()` calls and legacy `styles.component()` / `binding.component()` on `createStyles` bindings are found
- Projects with multiple `createTypeStyles({ scopeId })` / `createStyles({ scopeId })` configs only infer a default binding when all configs agree

## Enable individual rules

```js
import typestylesPlugin from '@typestyles/eslint-plugin';

export default [
  {
    plugins: { '@typestyles': typestylesPlugin },
    rules: {
      '@typestyles/no-shorthand-longhand-conflict': 'error',
      '@typestyles/no-invalid-unitless-value': 'warn',
      '@typestyles/no-duplicate-namespace': 'error',
    },
  },
];
```

## Monorepo reference

This repository uses the plugin via `eslint.base.js`:

```js
import { configs as typestylesEslintConfigs } from '@typestyles/eslint-plugin';

export const typestylesAppConfig = tseslint.config(
  ...baseConfig,
  typestylesEslintConfigs.recommended,
);
```

## Related packages

| Package                             | Role                                       |
| ----------------------------------- | ------------------------------------------ |
| [`typestyles`](../typestyles)       | Core library the rules analyze             |
| [`@typestyles/migrate`](../migrate) | Codemods — run ESLint after migrating      |
| [`@typestyles/cli`](../cli)         | `typestyles snapshot` and future CLI tools |
| [`@typestyles/vite`](../vite)       | Build-time duplicate namespace checks      |

## License

Apache-2.0
