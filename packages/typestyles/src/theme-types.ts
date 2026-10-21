import type { OverrideTokenNode } from './override';
import type {
  CreateTokenValues,
  ThemeCondition,
  ThemeConfig,
  ThemeSource,
  VariantOptionStyle,
} from './types';

type TokensMap = Record<string, CreateTokenValues>;

/** Empty tokens map without a string index signature (avoids `keyof` → `string` in merges). */
type NoTokens = Record<never, CreateTokenValues>;

type TokensFromOptional<T> = T extends TokensMap ? T : NoTokens;

/**
 * Token namespaces from a `createTheme` config (`tokens`).
 * Used as {@link Theme}'s type parameter so {@link Theme.override} can constrain patches.
 */
export type InferThemeTokensFromConfig<C extends Pick<ThemeConfig, 'tokens'>> = TokensFromOptional<
  C['tokens']
>;

/** Partial style object inside a theme `components` entry. Slots nest under `base`. */
export type ThemeComponentStylePatch = {
  base?: VariantOptionStyle | Record<string, VariantOptionStyle>;
  variants?: Record<
    string,
    Record<string, VariantOptionStyle | Record<string, VariantOptionStyle>>
  >;
  compoundVariants?: ReadonlyArray<{
    variants: Record<string, unknown>;
    style: VariantOptionStyle | Record<string, VariantOptionStyle>;
  }>;
};

export type ThemeComponentPatch = {
  /** New values for vars the recipe already declared. */
  vars?: Record<string, unknown>;
  styles?:
    | ThemeComponentStylePatch
    | ((ctx: {
        readonly vars: { readonly [key: string]: { readonly name: string; readonly var: string } };
        readonly tokens: OverrideTokenNode;
      }) => ThemeComponentStylePatch);
};

/** Typed `components` map for `createTheme`. The component key replaces `recipe`. */
export type ThemeComponentsFor<T extends Pick<ThemeConfig, 'tokens'>> = [
  InferThemeTokensFromConfig<T>,
] extends [never]
  ? { components?: Record<string, ThemeComponentPatch> }
  : { components?: Record<string, ThemeComponentPatch> };

type CreateThemeConfigFields = Omit<ThemeConfig, 'components'>;

/**
 * Single argument to `tokens.createTheme()` — theme name, token layers, optional recipe overrides.
 *
 * - **`tokens`** — per-namespace values on `.theme-{name}` (registers namespaces for `theme.tokens` refs).
 *   Use mode-aware `{ light, dark }` leaves for CSS `light-dark()`.
 * - **`modes`** — conditional override layers (see theming docs / `tokens.colorMode.*` presets).
 * - **`components`** — per-recipe CSS overrides scoped to this theme class.
 * - **`replace`** — when true (default), reusing `name` replaces the previous theme registration.
 * - **`resolvedDarkWhen`** — condition for dark fallbacks of values that cannot compile to `light-dark()`.
 *
 * Fork child themes with {@link Theme.override}, not a second `createTheme` merge API.
 */
export type CreateThemeInput<T extends CreateThemeConfigFields = CreateThemeConfigFields> = {
  name: string;
  replace?: boolean;
  /**
   * Overrides the instance dark fallback for values that cannot compile to `light-dark()`.
   * Defaults to the color-mode attribute on the theme class or a descendant.
   */
  resolvedDarkWhen?: ThemeCondition;
} & T &
  ThemeComponentsFor<T>;

/** Build a {@link ThemeSource} snapshot from a resolved theme config (no `components`). */
export function themeConfigToSource(config: Pick<ThemeConfig, keyof ThemeSource>): ThemeSource {
  const source: ThemeSource = {};
  if (config.tokens !== undefined) source.tokens = config.tokens;
  if (config.modes !== undefined) source.modes = config.modes;
  return source;
}
