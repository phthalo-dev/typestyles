import { discoverDefaultExtractModules, discoverRegisteredComponentsModule } from './discover';

export type TypestylesIntegrationMode = 'runtime' | 'build' | 'hybrid';

export interface TypestylesExtractOptions {
  /**
   * Modules that register typestyles styles, relative to the project root.
   * When omitted, uses {@link discoverDefaultExtractModules}.
   */
  modules?: string[];
  /**
   * Output CSS filename.
   *
   * `@typestyles/vite` omits this by default and emits a content-hashed asset through Vite's
   * `assetFileNames` (usually `assets/typestyles-<hash>.css`). A literal such as `typestyles.css`
   * keeps that exact path. `[name]`, `[hash]`, `[hash:N]`, `[ext]`, and `[extname]` are expanded.
   * The dev server still serves a stable unhashed URL.
   *
   * Other bundlers write this path literally and default to `typestyles.css`.
   */
  fileName?: string;
  /**
   * Additional module that re-exports {@link getRegisteredComponentRefs} (or an
   * equivalent object of every themeable recipe handle) so extract bundles retain
   * full design-system CSS without a hand-maintained registry object.
   */
  registeredComponentsModule?: string;
  /**
   * When `"allRegisteredComponents"`, appends a convention registry module if present
   * ({@link discoverRegisteredComponentsModule}) or {@link registeredComponentsModule}
   * when set. That file must side-effect-import every recipe and reference
   * `getRegisteredComponentRefs(styles)` — the extract entry alone is not enough.
   */
  include?: 'allRegisteredComponents';
}

/**
 * Resolve extraction modules from explicit config or convention entry discovery.
 */
export function resolveExtractModules(
  root: string,
  extract: TypestylesExtractOptions | undefined,
): string[] {
  let modules: string[];
  if (extract?.modules !== undefined) {
    modules = [...extract.modules];
  } else {
    modules = discoverDefaultExtractModules(root);
  }

  let registeredModule = extract?.registeredComponentsModule;
  if (!registeredModule && extract?.include === 'allRegisteredComponents') {
    registeredModule = discoverRegisteredComponentsModule(root);
  }
  if (registeredModule && !modules.includes(registeredModule)) {
    modules.push(registeredModule);
  }

  return modules;
}

/**
 * Default to `build` when at least one extraction module resolves; otherwise `runtime`.
 */
export function resolveExtractMode(
  explicitMode: TypestylesIntegrationMode | undefined,
  resolvedModules: string[],
): TypestylesIntegrationMode {
  return explicitMode ?? (resolvedModules.length > 0 ? 'build' : 'runtime');
}
