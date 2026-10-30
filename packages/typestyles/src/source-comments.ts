/**
 * Opt-in `/* path:line *\/` comments for extracted CSS (used by the build-time extract).
 *
 * Comments cannot survive `CSSStyleSheet.insertRule`, so this only affects the string from
 * `getRegisteredCss()`. The extract script sets `globalThis.__TYPESTYLES_SOURCE_COMMENTS__`
 * before any style registers; with it unset, nothing is captured and output is unchanged.
 */

export type SourceCommentsConfig = { root?: string };

declare global {
  // eslint-disable-next-line no-var
  var __TYPESTYLES_SOURCE_COMMENTS__: SourceCommentsConfig | undefined;
}

/** Frames from this package are skipped so the location is the caller's `recipe()` / `style()`. */
const INTERNAL_FRAME_RE =
  /node_modules[\\/]typestyles[\\/]|packages[\\/]typestyles[\\/](?:dist|src)[\\/]/;
const FRAME_LOCATION_RE = /(?:\(|\s)((?:file:\/\/)?[^()\s]+?):(\d+):\d+\)?\s*$/;

export function sourceCommentsConfig(): SourceCommentsConfig | undefined {
  return typeof globalThis === 'undefined' ? undefined : globalThis.__TYPESTYLES_SOURCE_COMMENTS__;
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

/** `path:line` of the first stack frame outside typestyles, or `undefined` if none is found. */
export function captureSourceLocation(config: SourceCommentsConfig): string | undefined {
  const stack = new Error().stack;
  if (!stack) return undefined;
  for (const frame of stack.split('\n').slice(1)) {
    if (INTERNAL_FRAME_RE.test(frame)) continue;
    const match = FRAME_LOCATION_RE.exec(frame);
    if (!match) continue;
    const file = match[1]!;
    if (file.startsWith('node:')) continue;
    return `${relativize(file, config.root)}:${match[2]}`;
  }
  return undefined;
}

/** Make `location` safe inside a CSS comment. */
export function formatSourceComment(location: string): string {
  return `/* ${location.replace(/\*\//g, '* /')} */`;
}
