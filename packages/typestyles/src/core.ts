/**
 * Pure, name-only build of the public API.
 *
 * Build-time aliasing (see `vite.config.ts` pack config `core`) swaps
 * `./sheet` for `./zero-runtime-sheet`, so this entry ships the same
 * `createTypeStyles` / `styles` / `tokens` / … factories but without the CSS
 * insertion runtime, the stylesheet state, or any DOM plumbing. Calls return
 * the same class names and data attributes as the runtime entry — producing
 * them requires only serialization + naming, not registration.
 *
 * The bundler plugins resolve `typestyles` → `typestyles/core` for client
 * bundles in zero-runtime (build-extraction) mode; extraction itself runs the
 * real runtime entry in a node subprocess.
 */
export * from './index';
