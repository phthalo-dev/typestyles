import { createRegisteredPropertyRef, isRegisteredPropertyRef } from './var-ref-tree';
import type { CreateTokenValues, TokenRefTree } from './types';

/** Runtime `tokens.use` on theme surfaces (keeps DTS independent of generic `TokensApi<R>`). */
export type ThemeTokenUseFn = (namespaceOrRef: string) => unknown;

/**
 * Token bag on {@link Theme} — `use()` plus namespace shortcuts (`tokens.color`, `tokens.brand`, …).
 * Generic `E` adds typed trees for `createTheme({ tokens })` namespaces (#234).
 */
export type ThemeTokenContext<E extends Record<string, CreateTokenValues> = Record<string, never>> =
  {
    use: ThemeTokenUseFn;
  } & {
    [K in keyof E & string]: TokenRefTree<E[K]>;
  };

export function createThemeTokenContext(use: ThemeTokenUseFn): ThemeTokenContext {
  return new Proxy({ use } as ThemeTokenContext, {
    get(target, prop, receiver) {
      if (prop === 'use') return use;
      if (typeof prop === 'string') {
        return use(prop);
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

const VAR_NAME = /^var\((--[^,)\s]+)\)$/;

function toOverrideNode(value: unknown): unknown {
  if (typeof value === 'string') {
    const match = VAR_NAME.exec(value);
    return match ? createRegisteredPropertyRef(match[1]!) : value;
  }
  if (value !== null && typeof value === 'object' && !isRegisteredPropertyRef(value)) {
    return new Proxy(value, {
      get(target, prop, receiver) {
        if (typeof prop === 'symbol' || prop === 'toString' || prop === 'valueOf') {
          return Reflect.get(target, prop, receiver);
        }
        return toOverrideNode(Reflect.get(target, prop, receiver));
      },
    });
  }
  return value;
}

/**
 * Token bag passed to `override({ styles: (ctx) => … })` and `createTheme({ components })`
 * factories as `ctx.tokens`. Same paths as {@link createThemeTokenContext}, but every leaf is a
 * `{ name, var }` ref (what `OverrideTokenNode` promises), so `tokens.space.md.var` works and
 * `${tokens.space.md}` still interpolates to `var(--…)`.
 */
export function createOverrideTokenContext(use: ThemeTokenUseFn): ThemeTokenContext {
  const base = createThemeTokenContext(use);
  return new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'use') return use;
      return toOverrideNode(Reflect.get(target, prop, receiver));
    },
  });
}

/**
 * Deep-copy a style object returned by an override factory, replacing token refs used directly
 * as values (`{ margin: tokens.space.md }`) with their `var(--…)` string.
 */
export function coerceTokenRefValues<T>(value: T): T {
  if (isRegisteredPropertyRef(value)) return String(value) as T;
  if (Array.isArray(value)) return value.map(coerceTokenRefValues) as T;
  if (value !== null && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = coerceTokenRefValues(v);
    return out as T;
  }
  return value;
}
