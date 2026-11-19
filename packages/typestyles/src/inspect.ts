/**
 * Dev-only inspection helpers for TypeStyles.
 *
 * Import from `'typestyles/inspect'` or use the global `window.__TYPESTYLES_INSPECT__`
 * in the browser console. Everything here is a no-op in production and is stripped from
 * production bundles when imported through the dedicated entry point.
 */
import { getSheetState } from './sheet-context';
import type { ClassSourceInfo } from './sheet-context';
import { devInspectEnabled } from './source-comments';

export type InspectResult = {
  className: string;
  namespace?: string;
  source?: string;
  css: string[];
};

function aggregateResult(className: string, info: ClassSourceInfo): InspectResult {
  return {
    className,
    namespace: info.namespace,
    source: info.source,
    css: [...info.css],
  };
}

/**
 * Look up the source location and generated CSS for a single class name.
 * Returns `undefined` when no rules reference the class or dev inspect is disabled.
 */
export function inspect(className: string): InspectResult | undefined {
  if (!devInspectEnabled()) return undefined;
  const state = getSheetState();
  const info = state.sourceByClassName.get(className);
  if (info) return aggregateResult(className, info);

  // Fall back to a substring scan across all registered CSS.
  const css: string[] = [];
  for (const rule of state.allRules) {
    if (rule.includes(`.${className}`)) css.push(rule);
  }
  if (css.length === 0) return undefined;
  return { className, css };
}

/**
 * Find inspect results for every class name in a space-separated class list
 * (e.g. the `className` string from a component call).
 */
export function inspectClassList(classNames: string): InspectResult[] {
  return classNames
    .split(/\s+/)
    .map((cn) => cn.trim())
    .filter(Boolean)
    .map((cn) => inspect(cn))
    .filter((r): r is InspectResult => r !== undefined);
}

/**
 * Inspect every TypeStyles class on a DOM element.
 */
export function inspectElement(element: Element): InspectResult[] {
  const className = element.className;
  if (typeof className !== 'string') return [];
  return inspectClassList(className);
}

type InspectGlobal = {
  inspect: typeof inspect;
  inspectClassList: typeof inspectClassList;
  inspectElement: typeof inspectElement;
};

declare global {
  // eslint-disable-next-line no-var
  var __TYPESTYLES_INSPECT__: InspectGlobal | undefined;
}

/** Register the inspect helpers on `window.__TYPESTYLES_INSPECT__` for console use. */
function installInspectGlobal(): void {
  if (typeof globalThis === 'undefined') return;
  const g = globalThis as typeof globalThis & { __TYPESTYLES_INSPECT__?: InspectGlobal };
  if (!g.__TYPESTYLES_INSPECT__) {
    g.__TYPESTYLES_INSPECT__ = {
      inspect,
      inspectClassList,
      inspectElement,
    };
  }
}

installInspectGlobal();
