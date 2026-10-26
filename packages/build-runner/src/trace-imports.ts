import { build as esbuildBuild } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TYPESTYLES_IMPORT_RE } from './namespaces';

const EXTERNAL_PREFIXES = [
  'react',
  'react-dom',
  'react/',
  'react-dom/',
  'next',
  'next/',
  'server-only',
  'client-only',
  'typestyles',
  'typestyles/',
];

function isExternalBareImport(specifier: string): boolean {
  if (specifier.startsWith('node:')) return true;
  return EXTERNAL_PREFIXES.some(
    (prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`),
  );
}

function isExternalAssetPath(path: string, importer: string, namespace: string): boolean {
  if (path.endsWith('.css')) return true;
  const fromCss = namespace === 'css' || importer.endsWith('.css');
  if (fromCss && path.startsWith('/') && !path.startsWith('//')) {
    return true;
  }
  return false;
}

function fileImportsTypestyles(absPath: string): boolean {
  if (!existsSync(absPath)) return false;
  try {
    return TYPESTYLES_IMPORT_RE.test(readFileSync(absPath, 'utf8'));
  } catch {
    return false;
  }
}

interface TraceInputOptions {
  /**
   * Keep modules that esbuild would drop as side-effect-free. CSS extraction
   * bundles with `treeShaking: false` and `ignoreAnnotations: true`, so the
   * coverage check has to follow that same graph.
   */
  keepSideEffects: boolean;
}

/**
 * Relative input paths (esbuild metafile keys) reachable from `entryFiles`.
 */
async function traceInputPaths(
  root: string,
  entryFiles: string[],
  options: TraceInputOptions,
): Promise<string[]> {
  const absEntries = entryFiles.map((file) => resolve(root, file));
  const missing = absEntries.filter((file) => !existsSync(file));
  if (missing.length > 0) {
    throw new Error(
      `[typestyles] Cannot trace imports; missing entry file(s): ${missing.join(', ')}`,
    );
  }

  const tsconfigPath = join(root, 'tsconfig.json');
  const result = await esbuildBuild({
    entryPoints: absEntries,
    bundle: true,
    write: false,
    outdir: root,
    metafile: true,
    platform: 'neutral',
    format: 'esm',
    logLevel: 'silent',
    absWorkingDir: root,
    ...(options.keepSideEffects ? { treeShaking: false, ignoreAnnotations: true } : {}),
    ...(existsSync(tsconfigPath) ? { tsconfig: tsconfigPath } : {}),
    plugins: [
      {
        name: 'typestyles-trace-imports',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (isExternalAssetPath(args.path, args.importer, args.namespace)) {
              return { path: args.path, external: true };
            }
            if (args.path.startsWith('.')) {
              return null;
            }
            if (isExternalBareImport(args.path)) {
              return { path: args.path, external: true };
            }
            return null;
          });
        },
      },
    ],
  });

  return Object.keys(result.metafile?.inputs ?? {});
}

/**
 * Trace local modules reachable from entry files and return those that import `typestyles`.
 * Paths are relative to `root` with `/` separators.
 */
export async function traceTypestylesModules(
  root: string,
  entryFiles: string[],
): Promise<string[]> {
  const inputs = await traceInputPaths(root, entryFiles, { keepSideEffects: false });
  const traced = new Set<string>();

  for (const inputPath of inputs) {
    const absPath = resolve(root, inputPath);
    if (!fileImportsTypestyles(absPath)) continue;
    traced.add(inputPath.replace(/\\/g, '/'));
  }

  return [...traced].sort();
}

/**
 * Every file esbuild keeps when bundling `entryFiles` the way CSS extraction does
 * (side-effect imports stay). Paths are relative to `root`.
 */
export async function traceReachableFiles(root: string, entryFiles: string[]): Promise<string[]> {
  const inputs = await traceInputPaths(root, entryFiles, { keepSideEffects: true });
  return inputs.map((inputPath) => inputPath.replace(/\\/g, '/'));
}

let moduleLoadNonce = 0;

/** Load a traced module for style extraction (cache-busted so re-runs re-register styles). */
export function createModuleLoader(root: string, modulePath: string): () => Promise<unknown> {
  const abs = resolve(root, modulePath);
  const href = pathToFileURL(abs).href;
  return () => import(`${href}?typestyles-extract=${++moduleLoadNonce}`);
}
