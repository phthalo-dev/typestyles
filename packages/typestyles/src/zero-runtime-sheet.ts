/**
 * Zero-runtime sheet stub.
 *
 * `vp pack`'s `core` config aliases `./sheet` to this module (see
 * `vite.config.ts`, the `core` pack entry). Every export is signature-
 * compatible with the real `sheet` module, but performs no registration and
 * no DOM work — pure, name-only builds (`typestyles/core`) therefore never
 * reach the CSS insertion / stylesheet state machine, and consumer bundlers
 * can tree-shake it out of the client bundle entirely.
 *
 * Signatures intentionally mirror `sheet.ts` so importers compile unchanged
 * in both graphs.
 */

export function registerCascadeLayerOrder(_preambleKey: string, _css: string): void {}

export function insertRule(_key: string, _css: string): void {}

export function insertRules(_rules: Array<{ key: string; css: string }>): void {}

export function startCollection(): () => string {
  return () => '';
}

export function getRegisteredCss(): string {
  return '';
}

export function subscribeRegisteredCss(_listener: () => void): () => void {
  return () => {};
}

export function reset(): void {}

export function flushSync(): void {}

export function invalidateKeys(_keys: string[], _prefixes: string[]): void {}

export function removeCssomRulesForExactThemeClass(_className: string): void {}

export function invalidateComponentNamespaceForDev(
  _namespace: string,
  _emittedClassPrefix?: string,
): void {}

export function invalidateClassNamespaceForDev(_emittedClassName?: string): void {}

export function ensureDocumentStylesAttached(): void {}
