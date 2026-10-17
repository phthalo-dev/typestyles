/**
 * Variant axis helpers for **schema-first recipes** (Issue #259).
 *
 * An axis is a branded value describing one visual prop: its options and its default.
 * Passing axes on a recipe definition — before the style callback — lets TypeScript
 * contextually type the style map from keys it already knows, instead of trying to
 * infer a variant map from the callback return (the fragile path in #149 / #201).
 *
 * ```ts
 * import { variant } from 'typestyles';
 *
 * export const surfaceAppearance = variant.enum(['subtle', 'solid', 'outline'], {
 *   default: 'subtle',
 * });
 * export const elevated = variant.boolean({ default: false });
 * ```
 */

/**
 * Runtime brand on every axis object. Lets `recipe` tell a schema definition from a
 * legacy style config without guessing at the shape of `variants`.
 */
export const recipeAxisBrand = Symbol('typestyles.variantAxis');

/** An enum axis: one of a fixed set of string options. */
export type EnumVariantAxis<
  Options extends readonly string[] = readonly string[],
  Default extends Options[number] = Options[number],
> = {
  readonly kind: 'enum';
  /** The allowed option literals, in declaration order. */
  readonly options: Options;
  /** The default option — always one of `options`. */
  readonly default: Default;
  readonly [recipeAxisBrand]: true;
};

/** A boolean axis: `true` / `false`, compiled to the two CSS branches of an attribute. */
export type BooleanVariantAxis<Default extends boolean = boolean> = {
  readonly kind: 'boolean';
  /** The default — a real `boolean`, not the string `'true'` / `'false'`. */
  readonly default: Default;
  readonly [recipeAxisBrand]: true;
};

/** Any recipe axis. */
export type VariantAxis = EnumVariantAxis | BooleanVariantAxis;

/**
 * The option union declared by an axis.
 *
 * ```ts
 * type Appearance = VariantOptions<typeof surfaceAppearance>; // 'subtle' | 'solid' | 'outline'
 * ```
 */
export type VariantOptions<A extends VariantAxis> = A extends {
  readonly kind: 'enum';
  readonly options: infer O extends readonly string[];
}
  ? O[number]
  : A extends { readonly kind: 'boolean' }
    ? boolean
    : never;

/** The style-map keys of an axis — enum options, or `'true' | 'false'` for a boolean axis. */
export type VariantAxisStyleKeys<A extends VariantAxis> = A extends {
  readonly kind: 'enum';
  readonly options: infer O extends readonly string[];
}
  ? O[number]
  : A extends { readonly kind: 'boolean' }
    ? 'true' | 'false'
    : never;

/** Create an enum axis. `options` must contain `config.default`. */
export function variantEnum<
  const Options extends readonly string[],
  const Default extends Options[number],
>(options: Options, config: { readonly default: Default }): EnumVariantAxis<Options, Default> {
  return {
    kind: 'enum',
    options,
    default: config.default,
    [recipeAxisBrand]: true,
  } as EnumVariantAxis<Options, Default>;
}

/** Create a boolean axis. The callable prop is `boolean`; the style map is keyed `'true'` / `'false'`. */
export function variantBoolean<const Default extends boolean>(config: {
  readonly default: Default;
}): BooleanVariantAxis<Default> {
  return {
    kind: 'boolean',
    default: config.default,
    [recipeAxisBrand]: true,
  } as BooleanVariantAxis<Default>;
}

/**
 * `variant.enum(...)` / `variant.boolean(...)`.
 *
 * Prefer a named export per shared axis so components and docs read the same
 * definition:
 *
 * ```ts
 * export const controlSize = variant.enum(['sm', 'md', 'lg'], { default: 'md' });
 * ```
 */
export const variant = {
  enum: variantEnum,
  boolean: variantBoolean,
} as const;
