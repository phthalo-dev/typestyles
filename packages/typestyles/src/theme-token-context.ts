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
