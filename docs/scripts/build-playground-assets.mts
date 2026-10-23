import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(docsRoot, '..');
const playgroundPublicDir = join(docsRoot, 'public', 'playground');
const outDir = join(playgroundPublicDir, 'vendor');
const typesOutPath = join(playgroundPublicDir, 'types.json');
const monacoCssOutPath = join(playgroundPublicDir, 'monaco-editor.css');

const typestylesDist = join(repoRoot, 'packages', 'typestyles', 'dist');
const reactDist = join(repoRoot, 'packages', 'react', 'dist');
const require = createRequire(import.meta.url);

type TypesManifest = Record<string, string>;

async function bundleTypestylesVendor(): Promise<void> {
  await esbuild.build({
    entryPoints: [join(typestylesDist, 'index.js')],
    outfile: join(outDir, 'typestyles.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
  });
}

async function bundleTypestylesTesting(): Promise<void> {
  await esbuild.build({
    entryPoints: [join(docsRoot, 'src', 'playground', 'typestylesTestingShim.ts')],
    outfile: join(outDir, 'typestyles-testing.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['typestyles'],
  });
}

async function bundleTypestylesReact(): Promise<void> {
  // Single build with code splitting so `index` and `jsx-runtime` share TypeStylesContext.
  await esbuild.build({
    entryPoints: {
      'typestyles-react': join(reactDist, 'index.js'),
      'typestyles-react-jsx-runtime': join(reactDist, 'jsx-runtime.js'),
      'typestyles-react-jsx-dev-runtime': join(reactDist, 'jsx-dev-runtime.js'),
    },
    outdir: outDir,
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'typestyles'],
  });
}

async function bundleIframeRunner(): Promise<void> {
  await esbuild.build({
    entryPoints: [join(docsRoot, 'src', 'playground', 'iframeRunner.ts')],
    outfile: join(outDir, 'iframe-runner.js'),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'typestyles',
      'typestyles/testing',
    ],
  });
}

async function collectDtsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

async function addPackageDts(
  manifest: TypesManifest,
  packageName: string,
  distDir: string,
): Promise<void> {
  const files = await collectDtsFiles(distDir);
  for (const absPath of files) {
    const fileName = absPath.slice(distDir.length + 1);
    const content = await readFile(absPath, 'utf8');
    const virtualPath = `file:///node_modules/${packageName}/${fileName}`;
    manifest[virtualPath] = content;
  }
}

async function addNodeModuleDts(
  manifest: TypesManifest,
  packageName: string,
  entryFile: string,
  virtualFileName = 'index.d.ts',
): Promise<void> {
  const absPath = require.resolve(entryFile);
  const content = await readFile(absPath, 'utf8');
  manifest[`file:///node_modules/${packageName}/${virtualFileName}`] = content;
}

async function addReactTypes(manifest: TypesManifest): Promise<void> {
  const reactTypesRoot = dirname(require.resolve('@types/react/package.json'));
  const files = await collectDtsFiles(reactTypesRoot);
  for (const absPath of files) {
    const fileName = absPath.slice(reactTypesRoot.length + 1);
    const content = await readFile(absPath, 'utf8');
    manifest[`file:///node_modules/@types/react/${fileName}`] = content;
    // Also expose under `react/` so `import … from 'react'` resolves.
    manifest[`file:///node_modules/react/${fileName}`] = content;
  }

  // Package markers so module resolution treats these as packages.
  manifest['file:///node_modules/react/package.json'] = JSON.stringify({
    name: 'react',
    types: 'index.d.ts',
  });
  manifest['file:///node_modules/@types/react/package.json'] = JSON.stringify({
    name: '@types/react',
    types: 'index.d.ts',
  });
}

async function bundleTypes(): Promise<void> {
  const manifest: TypesManifest = {};

  await addPackageDts(manifest, 'typestyles', typestylesDist);
  await addPackageDts(manifest, '@typestyles/react', reactDist);

  manifest['file:///node_modules/typestyles/package.json'] = JSON.stringify({
    name: 'typestyles',
    types: 'index.d.ts',
  });
  manifest['file:///node_modules/@typestyles/react/package.json'] = JSON.stringify({
    name: '@typestyles/react',
    types: 'index.d.ts',
  });

  await addReactTypes(manifest);
  await addNodeModuleDts(manifest, 'csstype', 'csstype/index.d.ts');
  manifest['file:///node_modules/csstype/package.json'] = JSON.stringify({
    name: 'csstype',
    types: 'index.d.ts',
  });

  // jsx-runtime used by automatic JSX (`jsxImportSource: '@typestyles/react'`).
  // The package d.ts omits a `JSX` namespace; TypeScript needs it for IntrinsicElements.
  const jsxRuntimeAugmentation = `

import type { CSSProperties } from 'typestyles';
import type { JSX as ReactJSX } from 'react';

/** Playground augmentation: provide IntrinsicElements + optional \`css\` prop. */
export namespace JSX {
  type Element = ReactJSX.Element;
  type ElementType = ReactJSX.ElementType;
  type ElementClass = ReactJSX.ElementClass;
  type ElementAttributesProperty = ReactJSX.ElementAttributesProperty;
  type ElementChildrenAttribute = ReactJSX.ElementChildrenAttribute;
  type IntrinsicAttributes = ReactJSX.IntrinsicAttributes;
  type IntrinsicClassAttributes<T> = ReactJSX.IntrinsicClassAttributes<T>;
  type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<C, P>;
  type IntrinsicElements = {
    [K in keyof ReactJSX.IntrinsicElements]: ReactJSX.IntrinsicElements[K] & {
      css?: CSSProperties | false | null | undefined;
    };
  };
}
`;

  const jsxRuntime =
    (await readFile(join(reactDist, 'jsx-runtime.d.ts'), 'utf8')) + jsxRuntimeAugmentation;
  manifest['file:///node_modules/@typestyles/react/jsx-runtime.d.ts'] = jsxRuntime;
  const jsxDevRuntime =
    (await readFile(join(reactDist, 'jsx-dev-runtime.d.ts'), 'utf8')) + jsxRuntimeAugmentation;
  manifest['file:///node_modules/@typestyles/react/jsx-dev-runtime.d.ts'] = jsxDevRuntime;

  await writeFile(typesOutPath, JSON.stringify(manifest), 'utf8');
}

async function copyMonacoEditorCss(): Promise<void> {
  // monaco-editor's exports map turns every subpath into `./esm/vs/*.js`, so
  // require.resolve cannot see the real CSS. Read it from node_modules by path.
  const monacoCssSrc = join(
    docsRoot,
    'node_modules',
    'monaco-editor',
    'min',
    'vs',
    'editor',
    'editor.main.css',
  );
  await copyFile(monacoCssSrc, monacoCssOutPath);
}

async function writeIframeHtml(): Promise<void> {
  const iframePath = join(docsRoot, 'public', 'playground', 'iframe.html');
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>typestyles playground preview</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      body {
        font-family: system-ui, sans-serif;
        background: #fff;
        color: #111;
      }
      #root { min-height: 100vh; }
    </style>
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@18.3.1",
          "react-dom": "https://esm.sh/react-dom@18.3.1",
          "react-dom/client": "https://esm.sh/react-dom@18.3.1/client",
          "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
          "typestyles": "/playground/vendor/typestyles.js",
          "typestyles/testing": "/playground/vendor/typestyles-testing.js",
          "@typestyles/react": "/playground/vendor/typestyles-react.js",
          "@typestyles/react/jsx-runtime": "/playground/vendor/typestyles-react-jsx-runtime.js",
          "@typestyles/react/jsx-dev-runtime": "/playground/vendor/typestyles-react-jsx-dev-runtime.js"
        }
      }
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/playground/vendor/iframe-runner.js"></script>
  </body>
</html>
`;
  await writeFile(iframePath, html, 'utf8');
}

async function main(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await bundleTypestylesVendor();
  await bundleTypestylesTesting();
  await bundleTypestylesReact();
  await bundleIframeRunner();
  await bundleTypes();
  await copyMonacoEditorCss();
  await writeIframeHtml();
  console.log('playground assets built → public/playground/');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
