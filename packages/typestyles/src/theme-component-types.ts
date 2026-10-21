import type { OverrideConfigFor, OverrideStyleContext } from './override';

type PatchVars<C> = OverrideConfigFor<C> extends { vars?: infer V } ? V : never;
type PatchStyles<C> = Omit<OverrideConfigFor<C>, 'vars'>;

/**
 * Map of theme `components` overrides keyed by namespace when you have a const
 * registry object (e.g. `getRegisteredComponentRefs(styles)`).
 * The component key replaces `recipe`.
 */
export type ThemeComponentsOverrideMap<T extends Record<string, object>> = {
  readonly [K in keyof T]?: {
    readonly vars?: PatchVars<T[K]>;
    readonly styles?: PatchStyles<T[K]> | ((ctx: OverrideStyleContext<T[K]>) => PatchStyles<T[K]>);
  };
};

export type OverrideConfigForNamespace<
  TRegistry extends Record<string, object>,
  N extends keyof TRegistry & string,
> = OverrideConfigFor<TRegistry[N]>;
