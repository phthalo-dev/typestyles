import type * as CSS from 'csstype';
import type { ColorModeMap, LightDarkColorModes, ModeAwareValue } from './color-modes';

/**
 * A CSS value that can be a standard value or a token reference (var() string).
 *
 * Values are emitted verbatim. TypeScript does **not** validate CSS syntax, so a typo in
 * `calc()`, `clamp()`, `min()`, `max()`, `url()`, etc. (for example a missing `)`) can produce
 * invalid CSS that breaks parsing for following rules. Use **`calc`** (tagged template) and
 * **`clamp`** from `typestyles` to keep function parentheses balanced, or small named helpers;
 * see the docs “TypeScript Tips” page.
 *
 * The string arm is `string & {}` (the csstype pattern) rather than plain `string`: any `string` is
 * still assignable, but a union like `'flex' | 'block' | (string & {})` does not collapse to `string`,
 * so editors keep suggesting keyword values (Issue #311).
 */
// oxlint-disable-next-line @typescript-eslint/no-empty-object-type -- `string & {}` keeps keyword completions
export type CSSValue = (string & {}) | number;

type CSSVarRef = `var(--${string})` | `var(--${string}, ${string})`;

/**
 * CSS Values syntax strings supported by {@link atProperty} presets and
 * `tokens.declare()` schema leaves.
 */
export type CssSyntax =
  | '<color>'
  | '<number>'
  | '<integer>'
  | '<length>'
  | '<percentage>'
  | '<length-percentage>'
  | '<angle>'
  | '<time>'
  | '<resolution>'
  | '<length> | <percentage>';

declare const SyntaxBrand: unique symbol;

/**
 * A typed token / `@property` reference carrying CSS syntax at compile time.
 * Produced by `tokens.declare()` and `ctx.vars.declare()` syntax leaves.
 */
export type SyntaxRef<S extends string = string> = {
  readonly name: string;
  readonly var: CSSVarRef;
  readonly [SyntaxBrand]?: S;
  toString(): string;
  valueOf(): string;
};

/**
 * Syntaxes whose `SyntaxRef` may be assigned where `Expected` is required.
 * Mirrors a practical subset of CSS Values assignability.
 */
export type CompatibleSourceSyntax<Expected extends CssSyntax> =
  Expected extends '<length-percentage>'
    ? '<length-percentage>' | '<length>' | '<percentage>'
    : Expected extends '<length> | <percentage>'
      ? '<length> | <percentage>' | '<length-percentage>' | '<length>' | '<percentage>'
      : Expected extends '<number>'
        ? '<number>' | '<integer>'
        : Expected;

/** `SyntaxRef` values assignable where syntax `Expected` is required. */
export type SyntaxRefAccepts<Expected extends CssSyntax> =
  | SyntaxRef<Expected>
  | (CompatibleSourceSyntax<Expected> extends Expected
      ? never
      : SyntaxRef<Extract<CompatibleSourceSyntax<Expected>, CssSyntax>>);

/** Mode-aware leaf for `tokens.create({ decl })` when `colorModes` is configured. */
export type ModeAwareCreateValue<M extends ColorModeMap = LightDarkColorModes> = {
  readonly [K in M[number]]: string | number;
};

/** Accepted values for a declared syntax leaf in `tokens.create({ decl })`. */
export type CreateValueForSyntax<
  S extends CssSyntax,
  M extends ColorModeMap = LightDarkColorModes,
> = string | number | SyntaxRefAccepts<S> | ModeAwareCreateValue<M>;

export type SyntaxPropertyValue<S extends CssSyntax, K extends keyof CSS.Properties<CSSValue>> =
  | CSS.Properties<CSSValue>[K]
  | CSSValue
  | SyntaxRefAccepts<S>
  | {
      readonly [M in LightDarkColorModes[number]]:
        | CSS.Properties<CSSValue>[K]
        | CSSValue
        | SyntaxRefAccepts<S>;
    };

type ColorLonghand =
  | 'color'
  | 'backgroundColor'
  | 'borderColor'
  | 'borderTopColor'
  | 'borderRightColor'
  | 'borderBottomColor'
  | 'borderLeftColor'
  | 'outlineColor'
  | 'caretColor'
  | 'columnRuleColor'
  | 'textDecorationColor'
  | 'textEmphasisColor';

type LengthPercentageLonghand =
  | 'width'
  | 'height'
  | 'minWidth'
  | 'maxWidth'
  | 'minHeight'
  | 'maxHeight'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'inset'
  | 'insetBlock'
  | 'insetInline'
  | 'gap'
  | 'rowGap'
  | 'columnGap'
  | 'padding'
  | 'paddingTop'
  | 'paddingRight'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingBlock'
  | 'paddingInline'
  | 'margin'
  | 'marginTop'
  | 'marginRight'
  | 'marginBottom'
  | 'marginLeft'
  | 'marginBlock'
  | 'marginInline'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'wordSpacing'
  | 'textIndent'
  | 'borderRadius'
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'borderBottomRightRadius'
  | 'borderBottomLeftRadius';

type LengthLonghand =
  | 'borderWidth'
  | 'borderTopWidth'
  | 'borderRightWidth'
  | 'borderBottomWidth'
  | 'borderLeftWidth'
  | 'outlineWidth';

type NumberLonghand = 'opacity' | 'flexGrow' | 'flexShrink' | 'zIndex' | 'fontWeight' | 'lineClamp';

type TimeLonghand =
  | 'transitionDuration'
  | 'animationDuration'
  | 'transitionDelay'
  | 'animationDelay';

type AngleLonghand = 'rotate';

type MapSyntaxLonghands<Props extends string, S extends CssSyntax> = {
  [K in Props]: K extends keyof CSS.Properties<CSSValue>
    ? SyntaxPropertyValue<S, K & keyof CSS.Properties<CSSValue>>
    : never;
};

/**
 * Longhands that accept {@link SyntaxRef} values when assigned in `styles()`,
 * `VariantOptionStyle`, and related style object types.
 */
export type SyntaxAwareLonghands = MapSyntaxLonghands<ColorLonghand, '<color>'> &
  MapSyntaxLonghands<LengthPercentageLonghand, '<length-percentage>'> &
  MapSyntaxLonghands<LengthLonghand, '<length>'> &
  MapSyntaxLonghands<NumberLonghand, '<number>'> &
  MapSyntaxLonghands<TimeLonghand, '<time>'> &
  MapSyntaxLonghands<AngleLonghand, '<angle>'>;

type SyntaxAwareLonghandKey = keyof SyntaxAwareLonghands;

/** Pick syntax-aware value type for a csstype longhand, or the default widening. */
export type CSSPropertyValue<K extends keyof CSS.Properties<CSSValue>> =
  K extends SyntaxAwareLonghandKey
    ? SyntaxAwareLonghands[K]
    : ModeAwareValue<CSS.Properties<CSSValue>[K] | CSSValue, LightDarkColorModes>;
