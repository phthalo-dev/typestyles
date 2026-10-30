import { resetCustomProperties } from './custom-properties';
import {
  namespacesFromTypestylesHmrPrefixes,
  registeredNamespaces,
  releaseReservedNamespacesForComponentOrClassNames,
  resetEmittedClassNameTracking,
} from './registry';
import { resetPropertyRegistrations } from './registered-property';
import {
  getSheetState,
  getGlobalSheetState,
  resetSheetState,
  type SheetState,
} from './sheet-context';
import { consolidateCascadeLayers } from './consolidate-cascade-layers';
import {
  captureSourceLocation,
  formatSourceComment,
  sourceCommentsConfig,
} from './source-comments';

/** Stable id for the managed `<style>` element (SSR, hydration, and client runtime). */
export const TYPESTYLES_STYLE_ID = 'typestyles';

/**
 * Stable id for the text-fallback `<style>` element. Rules the CSSOM rejects
 * via `insertRule` land here as text. They must never be appended as text to
 * the main element: mutating a `<style>` element's text makes the browser
 * re-parse the element from its text content, discarding every rule that was
 * previously added through `insertRule` — one rejected rule would wipe the
 * entire runtime sheet.
 */
export const TYPESTYLES_FALLBACK_STYLE_ID = 'typestyles-fallback';

const STYLE_ELEMENT_ID = TYPESTYLES_STYLE_ID;
const FALLBACK_STYLE_ELEMENT_ID = TYPESTYLES_FALLBACK_STYLE_ID;

function duplicateRuleKeyConflictWarningsEnabled(): boolean {
  if (typeof process === 'undefined') return true;
  return process.env.NODE_ENV !== 'production';
}

/**
 * When the same key is registered again with different CSS, the second rule is skipped
 * (idempotency / HMR). In non-production builds, surface that so overlapping globals
 * (e.g. reset `body` + app `body` in the same scope) are not silent failures.
 */
function warnIfDuplicateRuleKeyConflict(
  key: string,
  previousCss: string,
  ignoredCss: string,
): void {
  if (!duplicateRuleKeyConflictWarningsEnabled()) return;
  const prevShort = previousCss.length > 220 ? `${previousCss.slice(0, 220)}…` : previousCss;
  const nextShort = ignoredCss.length > 220 ? `${ignoredCss.slice(0, 220)}…` : ignoredCss;
  console.warn(
    `[typestyles] Skipped a rule: dedupe key "${key}" already exists with different CSS. ` +
      `Only the first registration is kept. For globals, merge into one \`global.rule\`, ` +
      `or use a distinct selector (e.g. \`html body\` after reset’s \`body\`).\n` +
      `  Existing: ${prevShort}\n` +
      `  Skipped:  ${nextShort}`,
  );
}

/**
 * Whether runtime DOM insertion is disabled (for build-time/zero-runtime mode).
 * The Vite plugin (mode: 'build') defines __TYPESTYLES_RUNTIME_DISABLED__ as the
 * string "true" at build time, so this is true in production and no <style> is created.
 *
 * `@typestyles/next/build` `withTypestylesExtract` sets `NEXT_PUBLIC_TYPESTYLES_RUNTIME_DISABLED`
 * via `next.config` `env` so Turbopack and webpack both inline the flag (DefinePlugin
 * alone does not run under Turbopack).
 */
declare const __TYPESTYLES_RUNTIME_DISABLED__: string | undefined;
function readNextPublicRuntimeDisabled(): boolean {
  if (typeof process === 'undefined' || !process.env) return false;
  return process.env.NEXT_PUBLIC_TYPESTYLES_RUNTIME_DISABLED === 'true';
}
const RUNTIME_DISABLED =
  (typeof __TYPESTYLES_RUNTIME_DISABLED__ !== 'undefined' &&
    __TYPESTYLES_RUNTIME_DISABLED__ === 'true') ||
  readNextPublicRuntimeDisabled();

/**
 * The managed <style> element, lazily created.
 */
let styleElement: HTMLStyleElement | null = null;

/**
 * The managed text-fallback <style> element, lazily created (see
 * {@link TYPESTYLES_FALLBACK_STYLE_ID}).
 */
let fallbackStyleElement: HTMLStyleElement | null = null;

/**
 * Whether we're running in a browser environment.
 */
const isBrowser = typeof document !== 'undefined' && typeof window !== 'undefined';

/**
 * Re-insert every registered rule into a (usually fresh) <style> element.
 * Used when the live element was detached (e.g. Astro view transitions replacing <head>).
 */
function writeAllRulesToStyleElement(el: HTMLStyleElement): void {
  const { allRules } = getSheetState();
  if (RUNTIME_DISABLED || allRules.length === 0) return;
  const sheet = el.sheet;
  if (sheet) {
    for (const css of allRules) {
      try {
        sheet.insertRule(css, sheet.cssRules.length);
      } catch {
        appendFallbackRule(css);
      }
    }
  } else {
    appendFallbackRule(allRules.join('\n'));
  }
}

function getStyleElement(): HTMLStyleElement {
  let reconnectAfterDetach = false;
  if (styleElement && !styleElement.isConnected) {
    reconnectAfterDetach = true;
    styleElement = null;
  }
  if (styleElement) return styleElement;

  // Prefer an element actually in the document (SSR or another copy on the page).
  const existing = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (existing?.isConnected) {
    styleElement = existing;
    return styleElement;
  }

  styleElement = document.createElement('style');
  styleElement.id = STYLE_ELEMENT_ID;
  document.head.appendChild(styleElement);

  // After a doc swap, we have a new empty sheet but insertRule() won't re-queue (deduped keys).
  if (reconnectAfterDetach && getSheetState().allRules.length > 0) {
    writeAllRulesToStyleElement(styleElement);
  }

  return styleElement;
}

/**
 * The fallback element mirrors the main element's lifecycle: reuse a connected
 * element by id, recover from detachment (doc swaps), and keep a deterministic
 * position immediately after the main element so cascade order stays stable.
 */
function getFallbackStyleElement(): HTMLStyleElement {
  if (fallbackStyleElement && !fallbackStyleElement.isConnected) {
    fallbackStyleElement = null;
  }
  if (fallbackStyleElement) return fallbackStyleElement;

  const existing = document.getElementById(FALLBACK_STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (existing?.isConnected) {
    fallbackStyleElement = existing;
    return fallbackStyleElement;
  }

  const main = getStyleElement();
  fallbackStyleElement = document.createElement('style');
  fallbackStyleElement.id = FALLBACK_STYLE_ELEMENT_ID;
  main.insertAdjacentElement('afterend', fallbackStyleElement);
  return fallbackStyleElement;
}

/**
 * Append a rule the CSSOM rejected as text to the fallback element. The
 * fallback element only ever holds text (never `insertRule`), so re-parsing
 * it on append cannot lose rules.
 */
function appendFallbackRule(css: string): void {
  const el = getFallbackStyleElement();
  el.appendChild(document.createTextNode(`${css}\n`));
}

/**
 * Ensure the managed <style id="typestyles"> is attached to the current document and populated.
 * Call after SPA-style navigation (e.g. Astro `astro:after-swap`) when runtime injection is enabled.
 */
export function ensureDocumentStylesAttached(): void {
  if (!isBrowser || RUNTIME_DISABLED) return;
  getStyleElement();
}

function flush(): void {
  const state = getSheetState();
  state.flushScheduled = false;
  if (state.pendingRules.length === 0) return;

  const rules = state.pendingRules;
  state.pendingRules = [];

  if (state.ssrBuffer) {
    state.ssrBuffer.push(...rules);
    return;
  }

  if (!isBrowser || RUNTIME_DISABLED) return;

  const el = getStyleElement();
  const sheet = el.sheet;

  if (sheet) {
    for (const rule of rules) {
      try {
        sheet.insertRule(rule, sheet.cssRules.length);
      } catch {
        // Fallback: append as text on the dedicated fallback element (handles
        // edge cases with certain selectors) — never on `el`, where the text
        // re-parse would discard all previously inserted CSSOM rules.
        appendFallbackRule(rule);
      }
    }
  } else {
    // Sheet not available yet, append as text
    appendFallbackRule(rules.join('\n'));
  }
}

function scheduleFlush(): void {
  const state = getSheetState();
  if (state.flushScheduled) return;
  state.flushScheduled = true;

  if (state.ssrBuffer) {
    // In SSR mode, flush synchronously
    flush();
    return;
  }

  if (isBrowser && !RUNTIME_DISABLED) {
    // Use microtask for fast, batched insertion
    queueMicrotask(flush);
  }
}

/**
 * Register a single `@layer a, b, c;` preamble so layer **order** is defined before any
 * `@layer name { … }` blocks. Inserts at the front of the virtual sheet and at CSSOM index 0
 * when injecting into the document.
 */
export function registerCascadeLayerOrder(preambleKey: string, css: string): void {
  const state = getSheetState();
  const key = `typestyles:@layer-order:${preambleKey}`;
  if (state.insertedRules.has(key)) return;
  state.insertedRules.add(key);

  state.allRules.unshift(css);
  notifyRegisteredCssChanged();

  if (state.ssrBuffer) {
    state.ssrBuffer.unshift(css);
    return;
  }

  if (RUNTIME_DISABLED) return;

  if (!isBrowser) return;

  const el = getStyleElement();
  const sheet = el.sheet;
  if (sheet) {
    try {
      sheet.insertRule(css, 0);
    } catch {
      prependFallbackRule(css);
    }
  } else {
    prependFallbackRule(css);
  }
}

/** Front-insert for the `@layer` order preamble when the CSSOM rejects it. */
function prependFallbackRule(css: string): void {
  const el = getFallbackStyleElement();
  el.insertBefore(document.createTextNode(`${css}\n`), el.firstChild);
}

/**
 * Active HMR slot for `override()` keys (set by Vite-injected `createOverrideHmrSlot`).
 * Module eval is synchronous, so one active slot is enough to attribute keys to the
 * theme / app module that registered them — including via `createDesignTheme` sugar.
 */
let activeOverrideHmrKeys: Set<string> | null = null;

export type OverrideHmrSlot = {
  /** Begin attributing subsequently inserted `override:` keys to this module. */
  activate(): void;
  /** Stop attributing (end of module body). */
  deactivate(): void;
  /** Drop every override key this module registered (Vite `import.meta.hot.dispose`). */
  dispose(): void;
};

/**
 * Create a per-module override HMR slot. Vite injects activate / deactivate / dispose
 * around modules that call `override`, `createDesignTheme`, or `overrideComponent`.
 */
export function createOverrideHmrSlot(): OverrideHmrSlot {
  const keys = new Set<string>();
  return {
    activate() {
      activeOverrideHmrKeys = keys;
    },
    deactivate() {
      if (activeOverrideHmrKeys === keys) activeOverrideHmrKeys = null;
    },
    dispose() {
      invalidateOverrideRuleKeys([...keys]);
      keys.clear();
    },
  };
}

function trackOverrideRuleKey(key: string): void {
  if (activeOverrideHmrKeys) activeOverrideHmrKeys.add(key);
}

/**
 * Replace an existing override rule in the virtual sheet + CSSOM (HMR / re-exec).
 * Always upserts — theme modules re-register the same keys with new CSS, and first-wins
 * would leave stale override styles after edits (including production preview builds).
 */
function upsertOverrideRule(
  state: SheetState,
  key: string,
  previousCss: string,
  css: string,
): void {
  const removedCss = new Set<string>([previousCss]);
  state.insertedRules.delete(key);
  state.ruleCssByKey.delete(key);
  pruneRemovedCss(state, removedCss);
  removeCssomRulesMatching(removedCss);

  state.insertedRules.add(key);
  state.ruleCssByKey.set(key, css);
  state.allRules.push(css);
  trackOverrideRuleKey(key);
  if (!RUNTIME_DISABLED || state.ssrBuffer) {
    state.pendingRules.push(css);
  }
}

/** Collapse whitespace so stored CSS and browser/jsdom `cssText` can compare exactly. */
function normalizeCssForMatch(css: string): string {
  return css.replace(/\s+/g, ' ').trim();
}

/**
 * Peel one outer `@layer` / `@media` / `@supports` wrapper. Layered theme modes
 * register `@layer { @media { .theme-… } }`; live CSSOM often exposes the inner
 * style rule, whose `cssText` must still match.
 */
function unwrapOuterAtRuleBlock(css: string): string | null {
  const trimmed = css.trim();
  const layer = trimmed.match(/^@layer\s+[\w.-]+\s*\{\s*([\s\S]*?)\s*\}\s*$/);
  if (layer?.[1]?.trim()) return layer[1].trim();
  const media = trimmed.match(/^@media\b[^{]*\{\s*([\s\S]*?)\s*\}\s*$/);
  if (media?.[1]?.trim()) return media[1].trim();
  const supports = trimmed.match(/^@supports\b[^{]*\{\s*([\s\S]*?)\s*\}\s*$/);
  if (supports?.[1]?.trim()) return supports[1].trim();
  return null;
}

function registrationCssCandidates(registeredCss: string): string[] {
  const out = [registeredCss];
  let current = registeredCss;
  for (;;) {
    const inner = unwrapOuterAtRuleBlock(current);
    if (inner == null) break;
    out.push(inner);
    current = inner;
  }
  return out;
}

/**
 * True when a live CSSOM rule is exactly one of the registered CSS strings
 * (or an at-rule wrapper peeled off that string).
 * No substring `includes` — those false-positive across attribute selectors and
 * shared declaration blocks (recipe vs override with the same props).
 */
function cssRegistrationMatchesRule(registeredCss: string, rule: CSSRule): boolean {
  const ruleText = normalizeCssForMatch(rule.cssText);
  for (const candidate of registrationCssCandidates(registeredCss)) {
    if (ruleText === normalizeCssForMatch(candidate)) return true;
  }
  return false;
}

function cssTextMatchesRemoved(css: string, removedCss: ReadonlySet<string>): boolean {
  const normalized = normalizeCssForMatch(css);
  for (const registered of removedCss) {
    for (const candidate of registrationCssCandidates(registered)) {
      if (normalized === normalizeCssForMatch(candidate)) return true;
    }
  }
  return false;
}

function stripExactRegisteredCss(text: string, removedCss: ReadonlySet<string>): string {
  let remaining = text;
  for (const registered of removedCss) {
    remaining = remaining.split(registered).join('');
  }
  return remaining;
}

function ruleMatchesRemovedCss(rule: CSSRule, removedCss: ReadonlySet<string>): boolean {
  for (const css of removedCss) {
    if (cssRegistrationMatchesRule(css, rule)) return true;
  }
  return false;
}

function isGroupingRule(rule: CSSRule): rule is CSSGroupingRule {
  return 'cssRules' in rule && typeof (rule as CSSGroupingRule).deleteRule === 'function';
}

function removeMatchingCssomRules(
  list: CSSRuleList,
  owner: { deleteRule(index: number): void },
  removedCss: ReadonlySet<string>,
  prefixes: readonly string[],
  keys: readonly string[],
): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const rule = list[i];
    if (ruleMatchesRemovedCss(rule, removedCss)) {
      owner.deleteRule(i);
      continue;
    }
    if (isGroupingRule(rule)) {
      removeMatchingCssomRules(rule.cssRules, rule, removedCss, prefixes, keys);
      if (rule.cssRules.length === 0) owner.deleteRule(i);
      continue;
    }
    if (prefixes.some((prefix) => ruleMatchesPrefix(rule, prefix))) {
      owner.deleteRule(i);
      continue;
    }
    if (keys.some((key) => ruleMatchesKey(rule.cssText, key))) {
      owner.deleteRule(i);
    }
  }
}

/**
 * Drop live injected rules for an invalidation: exact registered CSS in CSSOM
 * and `#typestyles-fallback`, plus selector/key matches on style rules.
 * Inner grouping rules are deleted individually so a sibling in the same
 * `@layer` / `@media` is not swept away.
 */
function removeCssomRulesMatching(
  removedCss: ReadonlySet<string>,
  options: { prefixes?: readonly string[]; keys?: readonly string[] } = {},
): void {
  if (!isBrowser) return;
  const prefixes = options.prefixes ?? [];
  const keys = options.keys ?? [];
  if (removedCss.size === 0 && prefixes.length === 0 && keys.length === 0) return;

  const sheet = styleElement?.sheet;
  if (sheet) {
    removeMatchingCssomRules(sheet.cssRules, sheet, removedCss, prefixes, keys);
  }

  if (removedCss.size === 0) return;
  const fallback =
    fallbackStyleElement ??
    (document.getElementById(FALLBACK_STYLE_ELEMENT_ID) as HTMLStyleElement | null);
  if (!fallback) return;
  for (const node of Array.from(fallback.childNodes)) {
    const text = node.textContent ?? '';
    if (cssTextMatchesRemoved(text, removedCss)) {
      fallback.removeChild(node);
      continue;
    }
    const next = stripExactRegisteredCss(text, removedCss);
    if (next === text) continue;
    if (!next.trim()) {
      fallback.removeChild(node);
    } else {
      node.textContent = next;
    }
  }
}

/**
 * Invalidate exact override rule keys (virtual sheet + CSSOM).
 * Used by override HMR slots — keys may be `override:…` or `layer:…:override:…`.
 */
export function invalidateOverrideRuleKeys(keys: readonly string[]): void {
  if (keys.length === 0) return;
  const state = getSheetState();
  const removedCss = new Set<string>();
  for (const key of keys) {
    const css = state.ruleCssByKey.get(key);
    if (css != null) removedCss.add(css);
    state.insertedRules.delete(key);
    state.ruleCssByKey.delete(key);
  }
  pruneRemovedCss(state, removedCss);
  removeCssomRulesMatching(removedCss);
}

function recordSource(state: SheetState, css: string): void {
  const config = sourceCommentsConfig();
  if (!config) return;
  const location = captureSourceLocation(config);
  if (location) state.sourceByCss.set(css, location);
}

/**
 * Insert a CSS rule. Deduplicates by rule key.
 */
export function insertRule(key: string, css: string): void {
  const state = getSheetState();
  if (isOverrideRuleKey(key)) trackOverrideRuleKey(key);
  if (state.insertedRules.has(key)) {
    const prev = state.ruleCssByKey.get(key);
    if (prev != null && prev !== css) {
      if (isOverrideRuleKey(key)) {
        upsertOverrideRule(state, key, prev, css);
        notifyRegisteredCssChanged();
        scheduleFlush();
        return;
      }
      warnIfDuplicateRuleKeyConflict(key, prev, css);
    }
    return;
  }
  state.insertedRules.add(key);
  state.ruleCssByKey.set(key, css);
  state.allRules.push(css);
  recordSource(state, css);
  notifyRegisteredCssChanged();
  if (RUNTIME_DISABLED && !state.ssrBuffer) return;
  state.pendingRules.push(css);
  scheduleFlush();
}

/**
 * Insert multiple CSS rules at once.
 */
export function insertRules(rules: Array<{ key: string; css: string }>): void {
  const state = getSheetState();
  let added = false;
  let registered = false;
  for (const { key, css } of rules) {
    if (isOverrideRuleKey(key)) trackOverrideRuleKey(key);
    if (state.insertedRules.has(key)) {
      const prev = state.ruleCssByKey.get(key);
      if (prev != null && prev !== css) {
        if (isOverrideRuleKey(key)) {
          upsertOverrideRule(state, key, prev, css);
          registered = true;
          if (!RUNTIME_DISABLED || state.ssrBuffer) added = true;
          continue;
        }
        warnIfDuplicateRuleKeyConflict(key, prev, css);
      }
      continue;
    }
    state.insertedRules.add(key);
    state.ruleCssByKey.set(key, css);
    state.allRules.push(css);
    recordSource(state, css);
    registered = true;
    if (!RUNTIME_DISABLED || state.ssrBuffer) {
      state.pendingRules.push(css);
      added = true;
    }
  }
  if (registered) notifyRegisteredCssChanged();
  if (added) scheduleFlush();
}

/**
 * Replace a CSS rule (used for HMR). Removes the old rule and inserts the new one.
 */
export function replaceRule(key: string, css: string): void {
  if (!isBrowser || RUNTIME_DISABLED) return;

  const state = getSheetState();
  state.insertedRules.delete(key);
  state.ruleCssByKey.delete(key);

  // Remove existing rule from the sheet if possible
  const el = getStyleElement();
  const sheet = el.sheet;
  if (sheet) {
    for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
      // We can't reliably match by key in CSSOM, so for HMR we fall back to
      // clearing and re-inserting. This is fine since HMR is dev-only.
    }
  }

  insertRule(key, css);
}

/**
 * Start collecting CSS for SSR. Returns a function to stop collection and get the CSS.
 */
export function startCollection(): () => string {
  const state = getSheetState();
  state.ssrBuffer = [];
  return () => {
    const css = state.ssrBuffer ? state.ssrBuffer.join('\n') : '';
    state.ssrBuffer = null;
    return consolidateCascadeLayers(css);
  };
}

/**
 * Return all registered CSS as a string.
 *
 * Unlike `collectStyles`, this doesn't require wrapping a render function.
 * It simply returns every CSS rule that has been registered via
 * `recipe`, `style`, `tokens.create`, `keyframes.create`, etc.
 *
 * Ideal for SSR frameworks that need the CSS separately from the render
 * pass (e.g. TanStack Start's `head()`, Next.js metadata, Remix links).
 *
 * @example
 * ```ts
 * import { getRegisteredCss } from 'typestyles/server';
 *
 * // In a route's head/meta function:
 * export const head = () => ({
 *   styles: [{ id: 'typestyles', children: getRegisteredCss() }],
 * });
 * ```
 */
export function getRegisteredCss(): string {
  const { allRules, sourceByCss } = getSheetState();
  if (sourceByCss.size === 0) return consolidateCascadeLayers(allRules.join('\n'));
  return consolidateCascadeLayers(
    allRules
      .map((css) => {
        const source = sourceByCss.get(css);
        return source ? `${formatSourceComment(source)}\n${css}` : css;
      })
      .join('\n'),
  );
}

const registeredCssListeners = new Set<() => void>();

function notifyRegisteredCssChanged(): void {
  for (const listener of registeredCssListeners) {
    listener();
  }
}

/**
 * Subscribe to changes in the registered CSS (`getRegisteredCss()`).
 * Returns an unsubscribe function. Compatible with `useSyncExternalStore`.
 *
 * @example
 * ```ts
 * import { subscribeRegisteredCss, getRegisteredCss } from 'typestyles/server';
 *
 * const css = useSyncExternalStore(subscribeRegisteredCss, getRegisteredCss, getRegisteredCss);
 * ```
 */
export function subscribeRegisteredCss(listener: () => void): () => void {
  registeredCssListeners.add(listener);
  return () => {
    registeredCssListeners.delete(listener);
  };
}

/**
 * Reset all state (useful for testing).
 */
export function reset(): void {
  activeOverrideHmrKeys = null;
  resetSheetState(getGlobalSheetState());
  const active = getSheetState();
  if (active !== getGlobalSheetState()) {
    resetSheetState(active);
  }
  registeredNamespaces.clear();
  resetEmittedClassNameTracking();
  resetPropertyRegistrations();
  resetCustomProperties();
  notifyRegisteredCssChanged();
  if (isBrowser && styleElement) {
    styleElement.remove();
    styleElement = null;
  }
  if (isBrowser && fallbackStyleElement) {
    fallbackStyleElement.remove();
    fallbackStyleElement = null;
  }
}

/**
 * Flush all pending rules synchronously. Used for SSR and testing.
 */
export function flushSync(): void {
  flush();
}

/**
 * Drop CSS text queued in `pendingRules` / `allRules` / an active `ssrBuffer` for rules whose
 * key was just invalidated. Without this, re-registering a namespace before its first
 * registration has flushed (no intervening `flushSync()` / microtask) leaves the stale CSS
 * sitting in these arrays — `insertedRules` no longer references it, so it's never deduped, and
 * it gets flushed alongside the new CSS as a duplicate, conflicting rule.
 */
function pruneRemovedCss(state: SheetState, removedCss: ReadonlySet<string>): void {
  if (removedCss.size === 0) return;
  state.pendingRules = state.pendingRules.filter((css) => !removedCss.has(css));
  state.allRules = state.allRules.filter((css) => !removedCss.has(css));
  if (state.ssrBuffer) {
    state.ssrBuffer = state.ssrBuffer.filter((css) => !removedCss.has(css));
  }
}

/**
 * Invalidate all dedup keys that start with the given prefix.
 * Also removes matching rules from the live stylesheet.
 * Used for HMR — allows modules to re-register their styles after editing.
 */
export function invalidatePrefix(prefix: string): void {
  const state = getSheetState();
  const removedCss = new Set<string>();
  for (const key of state.insertedRules) {
    if (key.startsWith(prefix)) {
      const css = state.ruleCssByKey.get(key);
      if (css != null) removedCss.add(css);
      state.insertedRules.delete(key);
      state.ruleCssByKey.delete(key);
    }
  }
  pruneRemovedCss(state, removedCss);

  releaseReservedNamespacesForComponentOrClassNames(namespacesFromTypestylesHmrPrefixes([prefix]));

  removeCssomRulesMatching(removedCss, { prefixes: [prefix] });
}

/**
 * Invalidate a list of exact keys or prefixes.
 * Each entry in `keys` is treated as an exact key match.
 * Each entry in `prefixes` is treated as a prefix match.
 * Used for HMR to invalidate all styles from a module at once.
 */
export function invalidateKeys(keys: string[], prefixes: string[]): void {
  const state = getSheetState();
  const removedCss = new Set<string>();
  for (const key of keys) {
    const css = state.ruleCssByKey.get(key);
    if (css != null) removedCss.add(css);
    state.insertedRules.delete(key);
    state.ruleCssByKey.delete(key);
  }
  for (const prefix of prefixes) {
    for (const key of state.insertedRules) {
      if (key.startsWith(prefix)) {
        const css = state.ruleCssByKey.get(key);
        if (css != null) removedCss.add(css);
        state.insertedRules.delete(key);
        state.ruleCssByKey.delete(key);
      }
    }
  }
  pruneRemovedCss(state, removedCss);

  releaseReservedNamespacesForComponentOrClassNames(namespacesFromTypestylesHmrPrefixes(prefixes));

  removeCssomRulesMatching(removedCss, { prefixes, keys });
}

/** Whether a selector key belongs to a component class family at boundaries. */
/**
 * True when `selectorKey` references the block class family for `blockPrefix`
 * (exact `.block`, `.block--…`, `.block__…`, or `.block[…]` / `:…`), but not a
 * sibling identifier that merely shares a string prefix (`.block-group`,
 * `.blockgroup`).
 */
function matchesComponentClassFamily(selectorKey: string, blockPrefix: string): boolean {
  const needle = `.${blockPrefix}`;
  for (let i = 0, f = selectorKey.indexOf(needle); f !== -1; f = selectorKey.indexOf(needle, i)) {
    const a = f + needle.length;
    const n = selectorKey[a];
    if (
      n === undefined ||
      n === '[' ||
      n === ':' ||
      n === ' ' ||
      n === '{' ||
      n === '.' ||
      n === ',' ||
      (n === '-' && selectorKey[a + 1] === '-') ||
      (n === '_' && selectorKey[a + 1] === '_')
    ) {
      return true;
    }
    i = a + 1;
  }
  return false;
}

function ruleMatchesComponentClassFamily(rule: CSSRule, blockPrefix: string): boolean {
  if ('selectorText' in rule) {
    return matchesComponentClassFamily((rule as CSSStyleRule).selectorText, blockPrefix);
  }
  if ('cssRules' in rule) {
    const inner = (rule as CSSGroupingRule).cssRules;
    for (let i = 0; i < inner.length; i++) {
      if (ruleMatchesComponentClassFamily(inner[i], blockPrefix)) return true;
    }
  }
  return false;
}

/**
 * Remove live CSSOM rules whose selector references the theme class token exactly
 * (`.theme-acme`, not `.theme-acme-extra` when disposing `theme-acme`).
 */
export function removeCssomRulesForExactThemeClass(className: string): void {
  if (!isBrowser) return;

  const purge = (list: CSSRuleList, owner: { deleteRule(index: number): void }): void => {
    for (let i = list.length - 1; i >= 0; i--) {
      const rule = list[i];
      if (ruleMatchesComponentClassFamily(rule, className)) {
        owner.deleteRule(i);
        continue;
      }
      if (isGroupingRule(rule)) {
        purge(rule.cssRules, rule);
        if (rule.cssRules.length === 0) owner.deleteRule(i);
      }
    }
  };

  const sheet = styleElement?.sheet;
  if (sheet) purge(sheet.cssRules, sheet);

  const fallback =
    fallbackStyleElement ??
    (document.getElementById(FALLBACK_STYLE_ELEMENT_ID) as HTMLStyleElement | null);
  if (!fallback?.sheet) return;
  purge(fallback.sheet.cssRules, fallback.sheet);
}

/**
 * `override()` keys are `override:…` (or `layer:…:override:…` when layered).
 * Component HMR must not drop them — theme modules own those rules and are not
 * re-executed when the recipe module hot-reloads.
 */
function isOverrideRuleKey(key: string): boolean {
  return key.includes('override:');
}

function ruleCssOwnedByOverride(state: SheetState, rule: CSSRule): boolean {
  for (const [key, css] of state.ruleCssByKey) {
    if (!isOverrideRuleKey(key)) continue;
    if (cssRegistrationMatchesRule(css, rule)) return true;
  }
  return false;
}

/**
 * Drop every rule key tied to a `recipe('namespace', …)` registration, including
 * `@layer`-wrapped keys (`layer:….:.namespace-…`), and release reserved namespace entries.
 * Used for Vite HMR and for dev recovery when a module re-runs before `hot.dispose`.
 * Preserves `override()` rules that target the same class family.
 */
export function invalidateComponentNamespaceForDev(
  namespace: string,
  emittedClassPrefix?: string,
): void {
  const blockPrefix = emittedClassPrefix ?? `${namespace}-`;
  const trailingHyphenFamily = blockPrefix.endsWith('-');
  const selectorInfix = `.${blockPrefix}`;
  const state = getSheetState();
  const keysToDrop: string[] = [];
  for (const k of state.insertedRules) {
    if (isOverrideRuleKey(k)) continue;
    if (trailingHyphenFamily) {
      if (k.includes(selectorInfix)) keysToDrop.push(k);
    } else if (matchesComponentClassFamily(k, blockPrefix)) {
      keysToDrop.push(k);
    }
  }
  if (trailingHyphenFamily) {
    // Prefer exact keys over a selector-infix prefix so `override:` rules that
    // share the class family are not swept away by `invalidateKeys` prefixes.
    invalidateKeys(keysToDrop, []);
    if (isBrowser && styleElement?.sheet) {
      const sheet = styleElement.sheet;
      for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
        const rule = sheet.cssRules[i];
        if (!ruleMatchesPrefix(rule, selectorInfix)) continue;
        if (ruleCssOwnedByOverride(state, rule)) continue;
        sheet.deleteRule(i);
      }
    }
  } else {
    invalidateKeys(keysToDrop, []);
    releaseReservedNamespacesForComponentOrClassNames([namespace], 'component');
    if (isBrowser && styleElement?.sheet) {
      const sheet = styleElement.sheet;
      for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
        const rule = sheet.cssRules[i];
        if (!ruleMatchesComponentClassFamily(rule, blockPrefix)) continue;
        if (ruleCssOwnedByOverride(state, rule)) continue;
        sheet.deleteRule(i);
      }
    }
  }
}

/**
 * True when `selectorKey` references the exact class `className` (`.name`, `.name[…]`,
 * `.name:…`, etc.), but not BEM modifiers/elements (`.name--…`, `.name__…`) or sibling
 * identifiers that share a string prefix (`.name-group`, `.namegroup`).
 *
 * Used by `style` HMR invalidation so re-registering `style('button')` does
 * not drop `recipe('button')` modifier rules.
 */
function matchesExactEmittedClass(selectorKey: string, className: string): boolean {
  const needle = `.${className}`;
  for (let i = 0, f = selectorKey.indexOf(needle); f !== -1; f = selectorKey.indexOf(needle, i)) {
    const a = f + needle.length;
    const n = selectorKey[a];
    if (
      n === undefined ||
      n === '[' ||
      n === ':' ||
      n === ' ' ||
      n === '{' ||
      n === '.' ||
      n === ','
    ) {
      return true;
    }
    i = a + 1;
  }
  return false;
}

function ruleMatchesExactEmittedClass(rule: CSSRule, className: string): boolean {
  if ('selectorText' in rule) {
    return matchesExactEmittedClass((rule as CSSStyleRule).selectorText, className);
  }
  if ('cssRules' in rule) {
    const inner = (rule as CSSGroupingRule).cssRules;
    for (let i = 0; i < inner.length; i++) {
      if (ruleMatchesExactEmittedClass(inner[i], className)) return true;
    }
  }
  return false;
}

/**
 * Drop every rule key tied to a `style('name', …)` registration — the base selector plus
 * any pseudo/nested/at-rule-wrapped variants. Used for Vite HMR and for dev recovery when a
 * module re-runs before `hot.dispose`, including multi-environment SSR setups (e.g. the Vite
 * Environment API, or RSC frameworks like Waku) that re-evaluate the same source module once
 * per environment within a single process.
 *
 * Matching is exact-class (not the component class family), so `style('button')` HMR
 * does not invalidate `button--*` / `button__*` component rules.
 *
 * No-op when `emittedClassName` is `undefined` (hashed/compact/atomic modes derive the class name
 * from the serialized properties, so there's no reliable selector to invalidate ahead of time —
 * same limitation `invalidateComponentNamespaceForDev` has for those modes).
 */
export function invalidateClassNamespaceForDev(emittedClassName?: string): void {
  if (!emittedClassName) return;
  const state = getSheetState();
  const keysToDrop: string[] = [];
  for (const k of state.insertedRules) {
    if (matchesExactEmittedClass(k, emittedClassName)) {
      keysToDrop.push(k);
    }
  }
  invalidateKeys(keysToDrop, []);
  if (isBrowser && styleElement?.sheet) {
    const sheet = styleElement.sheet;
    for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
      if (ruleMatchesExactEmittedClass(sheet.cssRules[i], emittedClassName)) {
        sheet.deleteRule(i);
      }
    }
  }
}

function ruleMatchesPrefix(rule: CSSRule, prefix: string): boolean {
  if (prefix.startsWith('font-face:')) {
    const family = prefix.slice('font-face:'.length).split(':')[0];
    // CSSFontFaceRule has type 5 and cssText contains @font-face
    if (rule.cssText.includes('@font-face')) {
      return rule.cssText.includes(`"${family}"`) || rule.cssText.includes(`'${family}'`);
    }
    return false;
  }
  if ('selectorText' in rule) {
    return (rule as CSSStyleRule).selectorText.startsWith(prefix);
  }
  if ('name' in rule && prefix.startsWith('keyframes:')) {
    return (rule as CSSKeyframesRule).name === prefix.slice('keyframes:'.length);
  }
  // For at-rules wrapping style rules, check inner rules
  if ('cssRules' in rule) {
    const innerRules = (rule as CSSGroupingRule).cssRules;
    for (let i = 0; i < innerRules.length; i++) {
      if (ruleMatchesPrefix(innerRules[i], prefix)) return true;
    }
  }
  return false;
}

function ruleMatchesKey(cssText: string, key: string): boolean {
  if (key.startsWith('tokens:')) {
    // tokens:color or tokens:color@layerName -> :root rule with --color- custom properties
    const rest = key.slice('tokens:'.length);
    const at = rest.lastIndexOf('@');
    const namespace = at === -1 ? rest : rest.slice(0, at);
    return cssText.includes(`:root`) && cssText.includes(`--${namespace}-`);
  }
  if (key.startsWith('theme:')) {
    // theme:dark -> .theme-dark selector
    const name = key.slice('theme:'.length);
    return cssText.includes(`.theme-${name}`);
  }
  if (key.startsWith('keyframes:')) {
    const name = key.slice('keyframes:'.length);
    return cssText.includes(`@keyframes ${name}`);
  }
  return false;
}
