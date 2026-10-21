import type { CSSProperties } from './types';
import type { ResolvedCascadeLayers } from './layers';
import { trackEmittedClassName } from './registry';

/**
 * How generated class names are formed for `style`, `recipe`,
 * and related APIs.
 *
 * - `semantic` — readable names like `button`, `button--intent-primary` (default).
 *   With `scopeId` set, names are prefixed with the sanitized scope: `my-ui-button`.
 * - `hashed` — stable hash from namespace, variant segment, and declarations, with a short namespace slug for debugging.
 * - `compact` — hash-only names (shortest) for whole style objects; same collision properties as `hashed` when `scopeId` differs.
 * - `atomic` — one class per CSS declaration; identical declarations dedupe across the codebase.
 * - `attribute` — dimensioned `recipe()` variants compile to `&[data-{dimension}="{option}"]`
 *   selectors under one base class instead of discrete classes; the call returns
 *   `{ className, attrs, props }`. See `specs/semantic-and-attribute-mode.md`.
 * - `bem` — dimensioned/slot `recipe()` variants compile to BEM modifier classes
 *   (`block--modifier`, `block__element--modifier`); the base/root class drops the `-base` suffix.
 *   See `specs/classname-template-mode.md`. `style()` and flat configs behave like `semantic`.
 * - `template` — like `bem`, but the block/element/modifier class name is decided by a
 *   user-supplied `classNameTemplate: (ctx) => string` instead of a fixed convention.
 *   `mode: 'bem'` is itself implemented as a built-in preset of this same mechanism. See
 *   `specs/classname-template-mode.md`. `style()` and flat configs behave like `semantic`.
 */
export type ClassNamingMode =
  | 'semantic'
  | 'hashed'
  | 'compact'
  | 'atomic'
  | 'attribute'
  | 'bem'
  | 'template';

/**
 * Passed to `classNameTemplate` for every base/element/modifier class name a `mode: 'bem'` or
 * `mode: 'template'` dimensioned/slot `recipe()` call needs to emit. One call per
 * class — `dimension`/`modifier` are both `undefined` when naming a base/block/element class
 * itself, both set when naming a modifier class.
 */
export type ClassNameContext = {
  /** Sanitized scope prefix from `scopeId` (already includes a trailing `-`), `''` when unscoped. */
  scope: string;
  /** `recipe()` namespace, e.g. `'button'`. */
  namespace: string;
  /** Slot name for slot/multi-slot components (`'root'` is passed as `undefined`, matching BEM's root→block rule); `undefined` for non-slot components. */
  element: string | undefined;
  /** Variant dimension name, e.g. `'intent'`; `undefined` for flat semantic modifiers or when naming the base/block/element class itself. */
  dimension: string | undefined;
  /** Variant option value, e.g. `'primary'`; `undefined` when naming the base/block/element class itself. May be set with `dimension` undefined for flat semantic modifiers. */
  modifier: string | undefined;
};

export type ClassNameTemplate = (ctx: ClassNameContext) => string;

/** `buildTemplateClassName`'s caller supplies everything except `scope` — it's filled in from `cfg`. */
export type TemplateClassNameInput = Omit<ClassNameContext, 'scope'>;

export type ClassNamingConfig = {
  mode: ClassNamingMode;
  /** Prefix for hashed / compact / atomic output and for `hashClass`. Default `ts`. */
  prefix: string;
  /**
   * Package, app, or per-file id: same logical `recipe` / `style` name under different
   * scopes produces different classes — in `semantic` mode the sanitized scope is prefixed onto the
   * class name (`my-ui-button`); in `hashed`/`compact`/`atomic` mode it is mixed into the hash. This matches
   * how `tokens.create` scopes custom property names. In development, re-registering the same
   * scope + component name (e.g. HMR) clears prior rules instead of throwing. Use
   * `fileScopeId(import.meta)` for file-local isolation (CSS Modules–style).
   */
  scopeId: string;
  /**
   * When set (via `createStyles({ layers: … })` / `createTypeStyles({ layers })`), emitted
   * rules are wrapped in `@layer`. Prefer factory `styleLayer` (or `layers.style`) so callers
   * can omit per-call `{ layer }`; otherwise each `style` / `recipe` / `hash` call must pass it.
   */
  cascadeLayers?: ResolvedCascadeLayers;
  /**
   * Default `@layer` for `style` / `recipe` / `hash` when the call omits `{ layer }`.
   * Set via `createTypeStyles({ layers: { style } })` or `createStyles({ styleLayer })`.
   */
  styleLayer?: string;
  /**
   * Breakpoint names → media query conditions (without `@media` wrapper).
   * Enables `{ base, md, lg }` shorthand on CSS property values.
   */
  breakpoints?: Record<string, string>;
  /**
   * Color mode keys for `{ light, dark }` shorthand on CSS property values.
   * Compiles color/image properties to `light-dark()`; structural properties should use `conditions`.
   * **Order:** index `0` = light-scheme `light-dark()` arg, index `1` = dark-scheme arg.
   * Prefer `colorModes` from `typestyles` (`['light', 'dark']`).
   */
  colorModes?: readonly string[];
  /**
   * Required when `mode: 'template'`. Decides the class name for every base/element and
   * modifier class a dimensioned or slot `recipe()` call emits. Not called for
   * `style()` or flat (non-dimensioned) configs — those stay semantic-style. See
   * `ClassNameContext` and `specs/classname-template-mode.md`.
   */
  classNameTemplate?: ClassNameTemplate;
};

/** Default naming options used by `createStyles()` when no overrides are passed. */
export const defaultClassNamingConfig: ClassNamingConfig = {
  mode: 'semantic',
  prefix: 'ts',
  scopeId: '',
};

export function mergeClassNaming(partial?: Partial<ClassNamingConfig>): ClassNamingConfig {
  return { ...defaultClassNamingConfig, ...partial };
}

export function stableSerialize(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableSerialize(v)).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`);

  return `{${entries.join(',')}}`;
}

export function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Stable, short id derived from `import.meta.url` (file path). Use as `createStyles({ scopeId: fileScopeId(import.meta) })`
 * so the same logical namespace in different files does not collide (similar to CSS Modules file scope).
 *
 * @example
 * ```ts
 * const styles = createStyles({ scopeId: fileScopeId(import.meta) });
 * recipe({ name: 'button', styles: { base: { padding: '8px' } } });
 * ```
 */
export function fileScopeId(meta: { url: string }): string {
  let pathKey = meta.url;
  try {
    pathKey = new URL(meta.url).pathname;
  } catch {
    // keep raw url
  }
  return `file-${hashString(pathKey)}`;
}

export function sanitizeClassSegment(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
  return normalized.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'style';
}

/** CSS custom property namespace segment for `tokens.create` / `createTheme` when `scopeId` is set. */
export function scopedTokenNamespace(
  scopeId: string | undefined,
  logicalNamespace: string,
): string {
  if (!scopeId || !scopeId.trim()) return logicalNamespace;
  const scope = sanitizeClassSegment(scopeId);
  if (!logicalNamespace) return scope;
  return `${scope}-${logicalNamespace}`;
}

/**
 * Sanitized scope prefix used for `semantic` mode class names, mirroring how
 * `scopedTokenNamespace` scopes custom property names. Empty when no `scopeId`.
 */
function semanticScopePrefix(cfg: ClassNamingConfig): string {
  if (!cfg.scopeId || !cfg.scopeId.trim()) return '';
  return `${sanitizeClassSegment(cfg.scopeId)}-`;
}

function ownerKey(cfg: ClassNamingConfig, namespace: string, kind: 'class' | 'component'): string {
  return `${cfg.scopeId || 'default'}:${kind}:${namespace}`;
}

/**
 * The emitted class-name prefix shared by every class a `recipe({ name })`
 * call produces under this naming config (no leading dot). `null` in `compact`/`atomic`/
 * `template` mode — hash-only names have no per-namespace prefix, and an arbitrary
 * `classNameTemplate` function's output prefix isn't predictable without calling it; atomic
 * mode also omits a shared variant prefix.
 */
export function emittedComponentClassPrefix(
  cfg: ClassNamingConfig,
  namespace: string,
): string | null {
  // Bare block prefix — HMR matches the class family at boundaries (sheet.ts).
  if (cfg.mode === 'bem' || cfg.mode === 'semantic' || cfg.mode === 'attribute')
    return `${semanticScopePrefix(cfg)}${namespace}`;
  if (cfg.mode === 'hashed') return `${cfg.prefix}-${sanitizeClassSegment(namespace)}-`;
  return null;
}

/**
 * The emitted class name a `style(name, …)` call produces under this naming config.
 * `null` in `hashed`/`compact`/`atomic` mode — the name is derived from the serialized
 * properties, which aren't available before they're computed.
 */
export function emittedClassName(cfg: ClassNamingConfig, name: string): string | null {
  if (
    cfg.mode === 'semantic' ||
    cfg.mode === 'attribute' ||
    cfg.mode === 'bem' ||
    cfg.mode === 'template'
  )
    return `${semanticScopePrefix(cfg)}${name}`;
  return null;
}

/** `style(name, …)` */
export function buildSingleClassName(
  cfg: ClassNamingConfig,
  name: string,
  properties: CSSProperties,
): string {
  if (
    cfg.mode === 'semantic' ||
    cfg.mode === 'attribute' ||
    cfg.mode === 'bem' ||
    cfg.mode === 'template'
  ) {
    const className = `${semanticScopePrefix(cfg)}${name}`;
    trackEmittedClassName(className, ownerKey(cfg, name, 'class'));
    return className;
  }

  const payload = stableSerialize({
    ...(cfg.scopeId ? { scope: cfg.scopeId } : {}),
    namespace: name,
    suffix: '',
    properties,
  });
  const h = hashString(payload);
  const className =
    cfg.mode === 'compact'
      ? `${cfg.prefix}-${h}`
      : `${cfg.prefix}-${sanitizeClassSegment(name)}-${h}`;
  trackEmittedClassName(className, ownerKey(cfg, name, 'class'));
  return className;
}

/**
 * `recipe` / components with `slots`: logical namespace plus
 * a variant segment (`base`, `intent-primary`, `root-trigger-primary`, …).
 */
export function buildComponentClassName(
  cfg: ClassNamingConfig,
  namespace: string,
  suffix: string,
  properties: CSSProperties,
): string {
  if (
    cfg.mode === 'semantic' ||
    cfg.mode === 'attribute' ||
    cfg.mode === 'bem' ||
    cfg.mode === 'template'
  ) {
    const className = `${semanticScopePrefix(cfg)}${namespace}-${suffix}`;
    trackEmittedClassName(className, ownerKey(cfg, namespace, 'component'));
    return className;
  }

  const payload = stableSerialize({
    ...(cfg.scopeId ? { scope: cfg.scopeId } : {}),
    namespace,
    suffix,
    properties,
  });
  const h = hashString(payload);
  const className =
    cfg.mode === 'compact'
      ? `${cfg.prefix}-${h}`
      : `${cfg.prefix}-${sanitizeClassSegment(namespace)}-${h}`;
  trackEmittedClassName(className, ownerKey(cfg, namespace, 'component'));
  return className;
}

/** Built-in preset used internally when `mode: 'bem'`. Reference implementation for `mode: 'template'` users. */
function bemTemplate(ctx: ClassNameContext): string {
  const base = ctx.element
    ? `${ctx.scope}${ctx.namespace}__${ctx.element}`
    : `${ctx.scope}${ctx.namespace}`;
  return ctx.modifier ? `${base}--${ctx.modifier}` : base;
}

/** Built-in preset for `mode: 'semantic'`. */
function semanticTemplate(ctx: ClassNameContext): string {
  const block = ctx.element
    ? `${ctx.scope}${ctx.namespace}__${ctx.element}`
    : `${ctx.scope}${ctx.namespace}`;
  if (!ctx.modifier) return block;
  return ctx.dimension ? `${block}--${ctx.dimension}-${ctx.modifier}` : `${block}--${ctx.modifier}`;
}

export function resolveClassNameTemplate(cfg: ClassNamingConfig): ClassNameTemplate {
  if (cfg.mode === 'semantic') return semanticTemplate;
  if (cfg.mode === 'bem') return bemTemplate;
  if (cfg.mode === 'template' && cfg.classNameTemplate) return cfg.classNameTemplate;
  throw new Error(`[typestyles] resolveClassNameTemplate: unsupported mode "${cfg.mode}".`);
}

const VALID_CLASS_NAME = /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/;

/**
 * `mode: 'bem'` / `mode: 'template'` class-name builder — replaces the old `buildBemBlockClassName`/
 * `buildBemElementClassName`/`buildBemModifierClassName` trio with one call per class. Resolves the
 * effective template, calls it with a fully-populated `ClassNameContext`, validates the output is a
 * legal CSS identifier in dev, and tracks it in the emitted-class registry like every other builder.
 */
export function buildTemplateClassName(
  cfg: ClassNamingConfig,
  input: TemplateClassNameInput,
): string {
  const ctx: ClassNameContext = { scope: semanticScopePrefix(cfg), ...input };
  const template = resolveClassNameTemplate(cfg);
  const className = template(ctx);
  if (process.env.NODE_ENV !== 'production' && !VALID_CLASS_NAME.test(className)) {
    throw new Error(
      `[typestyles] classNameTemplate returned an invalid CSS class name "${className}" for context ` +
        `${JSON.stringify(ctx)}. Class names must match ${VALID_CLASS_NAME}.`,
    );
  }
  trackEmittedClassName(className, ownerKey(cfg, ctx.namespace, 'component'));
  return className;
}

/**
 * Builds a class using the built-in semantic template regardless of `cfg.mode`.
 * Attribute components use this for their stable block class without exposing
 * attribute mode as a general template mode.
 */
export function buildSemanticTemplateClassName(
  cfg: ClassNamingConfig,
  input: TemplateClassNameInput,
): string {
  const ctx: ClassNameContext = { scope: semanticScopePrefix(cfg), ...input };
  const className = semanticTemplate(ctx);
  trackEmittedClassName(className, ownerKey(cfg, ctx.namespace, 'component'));
  return className;
}
