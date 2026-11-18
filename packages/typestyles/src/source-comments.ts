/**
 * Opt-in `/* path:line *\/` comments for extracted CSS (used by the build-time extract).
 *
 * Comments cannot survive `CSSStyleSheet.insertRule`, so this only affects the string from
 * `getRegisteredCss()`. The extract script sets `globalThis.__TYPESTYLES_SOURCE_COMMENTS__`
 * before any style registers; with it unset, nothing is captured and output is unchanged.
 */

export type SourceCommentsConfig = { root?: string };
export type DevInspectConfig = { root?: string } | boolean;

declare global {
  // eslint-disable-next-line no-var
  var __TYPESTYLES_SOURCE_COMMENTS__: SourceCommentsConfig | undefined;
  // eslint-disable-next-line no-var
  var __TYPESTYLES_DEV_INSPECT__: DevInspectConfig | undefined;
  // eslint-disable-next-line no-var
  var __TYPESTYLES_DEV_INSPECT_ROOT__: string | undefined;
}

/** Frames from this package are skipped so the location is the caller's `recipe()` / `style()`. */
const INTERNAL_FRAME_RE =
  /node_modules[\\/]typestyles[\\/]|packages[\\/]typestyles[\\/](?:dist|src)[\\/](?!.*\.test\.[jt]sx?)/;
const FRAME_LOCATION_RE = /(?:\(|\s)((?:file:\/\/)?[^()\s]+?):(\d+):\d+\)?\s*$/;

function isProductionEnv(): boolean {
  try {
    return process.env.NODE_ENV === 'production';
  } catch {
    // `process` is not defined (native browser ESM): treat as development.
    return false;
  }
}

export function sourceCommentsConfig(): SourceCommentsConfig | undefined {
  return typeof globalThis === 'undefined' ? undefined : globalThis.__TYPESTYLES_SOURCE_COMMENTS__;
}

function inspectConfig(): DevInspectConfig | undefined {
  return typeof globalThis === 'undefined' ? undefined : globalThis.__TYPESTYLES_DEV_INSPECT__;
}

/**
 * Whether runtime dev inspection (source-location registry) is enabled.
 * On by default in non-production builds; disable with `globalThis.__TYPESTYLES_DEV_INSPECT__ = false`.
 */
export function devInspectEnabled(): boolean {
  if (inspectConfig() === false) return false;
  return !isProductionEnv();
}

/**
 * Whether to emit `data-ts-source` attributes in attribute mode.
 * Opt-in: set `globalThis.__TYPESTYLES_DEV_INSPECT__ = true` (or `{ root }`).
 */
export function devSourceAttributeEnabled(): boolean {
  const config = inspectConfig();
  if (config === false) return false;
  if (config === true) return true;
  if (config && typeof config === 'object' && config.root) return true;
  return false;
}

function devInspectRoot(): string | undefined {
  const config = inspectConfig();
  if (config && typeof config === 'object' && config.root) return config.root;
  if (typeof globalThis === 'undefined') return undefined;
  return globalThis.__TYPESTYLES_DEV_INSPECT_ROOT__;
}

function relativize(file: string, root: string | undefined): string {
  let path = file.startsWith('file://') ? decodeURIComponent(file.slice(7)) : file;
  path = path.replace(/\\/g, '/');
  if (root) {
    const base = root.replace(/\\/g, '/').replace(/\/$/, '') + '/';
    if (path.startsWith(base)) path = path.slice(base.length);
  }
  return path;
}

function captureLocation(root: string | undefined): string | undefined {
  const stack = new Error().stack;
  if (!stack) return undefined;
  for (const frame of stack.split('\n').slice(1)) {
    if (INTERNAL_FRAME_RE.test(frame)) continue;
    const match = FRAME_LOCATION_RE.exec(frame);
    if (!match) continue;
    const file = match[1]!;
    if (file.startsWith('node:')) continue;
    return `${relativize(file, root)}:${match[2]}`;
  }
  return undefined;
}

/** `path:line` of the first stack frame outside typestyles, or `undefined` if none is found. */
export function captureSourceLocation(config: SourceCommentsConfig): string | undefined {
  return captureLocation(config.root);
}

/** `path:line` of the first stack frame outside typestyles, for runtime dev inspection. */
export function captureDevSourceLocation(): string | undefined {
  return captureLocation(devInspectRoot());
}

/** Make `location` safe inside a CSS comment. */
export function formatSourceComment(location: string): string {
  return `/* ${location.replace(/\*\//g, '* /')} */`;
}
