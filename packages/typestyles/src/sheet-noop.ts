/**
 * Zero-runtime sheet stub.
 *
 * Ships beside the real `sheet` module. Every other module imports the sheet
 * through one stable relative path (`./sheet.js`, rewritten after the build),
 * and the bundler integrations redirect that single file to this one in
 * zero-runtime builds. Every export is signature-compatible with the real
 * module but performs no registration and no DOM work, so consumer bundles
 * never include the CSS insertion / stylesheet state machine, and all entry
 * points (`typestyles`, `typestyles/css`, …) still share one registry.
 *
 * Signatures intentionally mirror `sheet.ts` so importers compile unchanged
 * in both graphs.
 */

/** Diagnostics are a development concern; zero-runtime builds never run them. */
export function devDiagnosticsEnabled(): boolean {
  return false;
}

export function recordClientPlan(_build: () => unknown): void {}

export function recordClientPlanVars(_namespace: string, _vars: Record<string, string>): void {}

export function getClientPlans(): readonly never[] {
  return [];
}

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
