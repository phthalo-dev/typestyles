import type {
  CreateTokenValues,
  ThemeComponentOverrideEntry,
  ThemeCondition,
  ThemeConfig,
  ThemeOverrideContext,
  ThemeSource,
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

/** Typed `components` map for `createTheme` (factories see `ctx.tokens` from `tokens`). */
export type ThemeComponentsFor<T extends Pick<ThemeConfig, 'tokens'>> = {
  components?: Record<
    string,
    | ThemeComponentOverrideEntry
    | ((ctx: ThemeOverrideContext<InferThemeTokensFromConfig<T>>) => ThemeComponentOverrideEntry)
  >;
};

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
