# @typestyles/next

Next.js integration for typestyles with full support for App Router, Pages Router, and React Server Components.

## Installation

```bash
npm install @typestyles/next typestyles
# or
pnpm add @typestyles/next typestyles
# or
yarn add @typestyles/next typestyles
```

## Requirements

- Next.js >= 13.0.0
- React >= 18.0.0
- typestyles >= 0.1.0

## Quick Start

### App Router (Recommended)

Import `getRegisteredCss` in your root layout to inject styles during SSR:

```tsx
// app/layout.tsx
import { getRegisteredCss } from '@typestyles/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const css = getRegisteredCss();

  return (
    <html lang="en">
      <head>{css && <style dangerouslySetInnerHTML={{ __html: css }} />}</head>
      <body>{children}</body>
    </html>
  );
}
```

### Pages Router

Wrap your pages with the stylesheet component:

```tsx
// pages/_app.tsx
import { TypestylesStylesheet } from '@typestyles/next';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <TypestylesStylesheet>
      <Component {...pageProps} />
    </TypestylesStylesheet>
  );
}
```

## React Server Components (RSC)

The package provides multiple approaches for RSC support:

### Option 1: Layout SSR (Simplest)

Import `getRegisteredCss` in your root layout - this works in both Server and Client Components:

```tsx
// app/layout.tsx
import { getRegisteredCss } from '@typestyles/next';

export default function RootLayout({ children }) {
  const css = getRegisteredCss();

  return (
    <html>
      <head>{css && <style dangerouslySetInnerHTML={{ __html: css }} />}</head>
      <body>{children}</body>
    </html>
  );
}
```

### Option 2: Client Component Provider

For complex cases with dynamic styles, create a client component wrapper:

```tsx
// components/TypestylesProvider.tsx
'use client';

import { getRegisteredCss } from 'typestyles/server';
import { useEffect, useState } from 'react';

export function TypestylesProvider({ children }) {
  const [css, setCss] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCss(getRegisteredCss());
  }, []);

  return (
    <>
      {children}
      {mounted && css && <style id="typestyles" dangerouslySetInnerHTML={{ __html: css }} />}
    </>
  );
}
```

Then use it in your layout:

```tsx
// app/layout.tsx
import { TypestylesProvider } from '@/components/TypestylesProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TypestylesProvider>{children}</TypestylesProvider>
      </body>
    </html>
  );
}
```

### Option 3: Collecting from a specific component tree

`getTypestylesMetadata` (alias of `collectStylesFromComponent`) renders a React element on the server and returns the CSS registered during that render. Use it when you need CSS scoped to a subtree rather than the whole app. For App Router pages, injecting the result still belongs in `layout.tsx` / `<head>` (Next.js `Metadata` does not provide a supported hook for arbitrary `<style>` payloads).

```tsx
import { getTypestylesMetadata } from '@typestyles/next/server';
import { Home } from './Home';

const css = await getTypestylesMetadata(<Home />);
// Pass `css` into your layout <style> or streaming head pipeline.
```

## Build-time CSS + Turbopack

To ship a static stylesheet and avoid client-side `<style>` injection (uses `typestyles/build` under the hood):

1. Run **`buildTypestylesForNext({ root })`** before `next build`. It discovers the same **convention entry** as `@typestyles/vite` (see `DEFAULT_EXTRACT_MODULE_CANDIDATES` from `@typestyles/build-runner`) and by default writes **`app/typestyles.css`** plus **`app/typestyles.manifest.json`** (override paths or pass explicit `modules` when needed). When `app/` exists, it also emits **per-route CSS** under `app/_typestyles/routes/` and a **manifest v2** `routes` map (`routeCss: false` to disable).
2. Import that CSS from your root layout (e.g. `import './typestyles.css'`).
3. Wrap config with **`withTypestyles`** from `@typestyles/next/build` — in **production**, if a convention entry exists, it applies **`withTypestylesExtract`**; in **development** it leaves your config unchanged so the runtime stays on.

`withTypestylesExtract` sets **`NEXT_PUBLIC_TYPESTYLES_RUNTIME_DISABLED`** via `next.config` `env` (works with **webpack and Turbopack**) and adds webpack **`DefinePlugin`** for `__TYPESTYLES_RUNTIME_DISABLED__` on client bundles when webpack runs. Example app: `examples/next-app`.

### Runtime in development, zero-runtime in production

During `next dev`, keeping the client runtime **enabled** avoids tying every style tweak to a pre-build extraction step. In production, disable injection so the browser loads one cacheable stylesheet.

```js
// next.config.mjs
import { withTypestyles } from '@typestyles/next/build';

export default withTypestyles({
  transpilePackages: ['typestyles', '@typestyles/next'],
});
```

You still typically run extraction before production builds (CI or `prebuild`). For full manual control, **`withTypestylesExtract`** remains available.

## API Reference

### getRouteCss

Read pre-extracted CSS for an App Router route from the build manifest (v2). Falls back to the full-app stylesheet when no route entry exists.

```tsx
import { getRouteCss } from '@typestyles/next/server';

const css = getRouteCss('/about', { root: process.cwd() });
```

### getRegisteredCss

Returns all currently registered CSS as a string. This is the simplest way to get styles for SSR.

```tsx
import { getRegisteredCss } from '@typestyles/next';

const css = getRegisteredCss();
```

### collectStylesFromComponent

Collect styles from a React component tree. Useful when you need explicit control over style collection.

```tsx
import { collectStylesFromComponent } from '@typestyles/next/server';
import { YourComponent } from './YourComponent';

const css = await collectStylesFromComponent(<YourComponent />);
```

### getTypestylesMetadata

Same as `collectStylesFromComponent` — renders the given element on the server and returns registered CSS. Use when you want a dedicated name for “CSS for this subtree.”

```tsx
import { getTypestylesMetadata } from '@typestyles/next/server';
import { Home } from './Home';

const css = await getTypestylesMetadata(<Home />);
```

### TypestylesStylesheet (Pages Router)

A React component that renders typestyles CSS. Works with Pages Router.

```tsx
import { TypestylesStylesheet } from '@typestyles/next';

<TypestylesStylesheet>
  <YourApp />
</TypestylesStylesheet>;
```

## Examples

### Basic Usage with App Router

```tsx
// app/page.tsx
import { createTypeStyles } from 'typestyles';

const { recipe } = createTypeStyles({ scopeId: 'app' });

const button = recipe({
  name: 'button',
  styles: {
    base: {
      padding: '12px 24px',
      backgroundColor: '#0066ff',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    },
  },
});

export default function Home() {
  return (
    <main>
      <button className={button()}>Click me</button>
    </main>
  );
}
```

### With Design Tokens

```tsx
// app/styles.ts
import { createTypeStyles } from 'typestyles';

export const { recipe, tokens } = createTypeStyles({ scopeId: 'app' });

export const colors = tokens.create('color', {
  primary: '#0066ff',
  secondary: '#64748b',
});

export const spacing = tokens.create('space', {
  sm: '8px',
  md: '16px',
  lg: '24px',
});

// app/page.tsx
import { recipe, colors, spacing } from './styles';

const card = recipe({
  name: 'card',
  styles: {
    base: {
      padding: spacing.md,
      backgroundColor: colors.primary,
      borderRadius: '8px',
    },
  },
});

export default function Page() {
  return <div className={card()}>Hello World</div>;
}
```

### With Dark Mode

```tsx
// app/layout.tsx
import { createTypeStyles } from 'typestyles';
import { getRegisteredCss } from '@typestyles/next';

const { tokens } = createTypeStyles({ scopeId: 'app' });

const darkTheme = tokens.createTheme('dark', {
  base: {
    color: {
      background: '#1a1a1a',
      text: '#ffffff',
    },
  },
});

export default function RootLayout({ children }) {
  const css = getRegisteredCss();

  return (
    <html className={darkTheme.className}>
      <head>{css && <style dangerouslySetInnerHTML={{ __html: css }} />}</head>
      <body>{children}</body>
    </html>
  );
}
```

## Fonts and local files

`global.fontFace()` registers `@font-face` like any other TypeStyles global. For **Next’s pre-build extraction** (`buildTypestylesForNext`), prefer fonts under **`public/fonts/`** and a root-relative `url('/fonts/…')` in `src` so Node does not need to resolve binary imports.

For **Vite**, you can use `import file from './font.woff2?url'` and `url(\`${file}\`) format('woff2')` so production CSS points at hashed assets.

See the **Fonts** guide in the TypeStyles docs (`docs/content/docs/fonts.md`, route `/docs/fonts` on the docs site).

## Troubleshooting

### Flash of Unstyled Content (FOUC)

If you see a flash of unstyled content, ensure `getRegisteredCss()` is called in the layout and styles are injected before the body renders.

### Styles not appearing

Make sure `typestyles` is installed in your project:

```bash
npm install typestyles
```

### TypeScript errors

Ensure you have `"moduleResolution": "bundler"` or `"node"` in your `tsconfig.json`.

## License

Apache-2.0
