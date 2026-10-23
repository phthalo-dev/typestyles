# @examples/react-design-system

React component library built with [typestyles](https://github.com/phthalo-dev/typestyles) and [`@examples/design-system`](../design-system/README.md) tokens. Consumed by the docs site, `examples/vite-app`, and `examples/next-app`.

Framework-specific wrappers around accessible primitives ([React Aria Components](https://react-spectrum.adobe.com/react-aria/)) with typed variants, design tokens, and theme context.

## Install (within monorepo)

This package is private and workspace-linked:

```json
{
  "dependencies": {
    "@examples/react-design-system": "workspace:*"
  }
}
```

Peer dependencies: `react` and `react-dom` >= 18.

## Usage

```tsx
import {
  Button,
  TextField,
  Dialog,
  DesignSystemProvider,
  defaultTheme,
  layout,
  text,
} from '@examples/react-design-system';

export function App() {
  return (
    <DesignSystemProvider theme={defaultTheme}>
      <main className={layout({ stack: true })}>
        <h1 className={text({ title: true })}>Hello</h1>
        <Button intent="primary">Click me</Button>
      </main>
    </DesignSystemProvider>
  );
}
```

Import the package once in your **extraction entry** so all registrations land in production CSS:

```ts
// src/typestyles-entry.ts
import '@examples/react-design-system';
import './app-styles';
```

## Exports

| Category             | Examples                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| **Components**       | `Button`, `Link`, `TextField`, `Checkbox`, `Switch`, `Select`, `Tabs`, `Dialog`, `Alert`, `CodeBlock`, … |
| **Layout utilities** | `layout`, `text` — re-exported from `@examples/design-system`                                            |
| **Tokens**           | `designTokens`, `defaultTheme`, typed value exports                                                      |
| **Theming**          | `DesignSystemProvider`, `useDesignSystemTheme`                                                           |
| **Hooks**            | Re-exported from `./hooks`                                                                               |

Side effect on import: `globalBody` registers base document styles.

## Structure

```text
src/
  components/     # React Aria–based UI
  styles.ts       # re-exports layout + text from design-system
  tokens.ts       # Re-exports / aliases design-system tokens
  theme.tsx       # DesignSystemProvider
  globalBody.ts   # Document/reset registrations
  index.ts        # Public API
```

Styling follows the same patterns documented for [design systems](https://typestyles.dev/docs/design-system): scoped `createStyles` where needed, shared tokens from `@examples/design-system`, readable semantic class names.

## Learn more

- [`@examples/design-system`](../design-system/README.md) — framework-agnostic tokens and recipes
- [Component libraries guide](https://typestyles.dev/docs/component-libraries)
- [Vite example](../vite-app/README.md) — consumes this package
- [Examples index](../README.md)
