/**
 * Schema-first recipe types (Issue #259).
 *
 * A `RecipeDefinition` describes the public visual props of a component — slots and
 * axes — *before* the style callback. TypeScript contextually types the style map from
 * that definition, so every enum option is required, unknown options are errors, and
 * slot names are checked, without inferring a variant map from the callback return.
 */
import type {
  ComponentAttrsResult,
  ComponentConfigContext,
  ComponentVarDefinitions,
  ComponentVarRefTree,
  InferComponentVarRefTreeDefinitions,
  SlotStyles,
  VariantOptionStyle,
} from './types';
import type { VariantAxis, VariantAxisStyleKeys, VariantOptions } from './variant';

/**
 * A schema recipe definition: the slot names (when the recipe is multi-part) and the
 * axes, each carrying its own default.
 *
 * ```ts
 * const definition = {
 *   slots: ['root', 'icon', 'body'] as const,
 *   variants: {
 *     tone: variant.enum(['info', 'danger'], { default: 'info' }),
 *     elevated: variant.boolean({ default: false }),
 *   },
 * };
 * ```
 */
export type RecipeDefinition = {
  readonly slots?: readonly string[];
  readonly variants: Record<string, VariantAxis>;
};

/** Whether a definition declares slots (multi-part recipe). */
export type RecipeHasSlots<Def extends RecipeDefinition> = Def extends {
  readonly slots: readonly string[];
}
  ? true
  : false;

/** The slot-name union for a definition, or `never` for single-target recipes. */
export type RecipeSlots<Def extends RecipeDefinition> = Def extends {
  readonly slots: readonly (infer S extends string)[];
}
  ? S
  : never;

/** The variant keys declared by a definition. */
export type RecipeVariantKeys<Def extends RecipeDefinition> = keyof Def['variants'] & string;

/** The value accepted on the callable for one axis (`boolean` for boolean axes). */
export type RecipeAxisSelectionValue<A extends VariantAxis> = VariantOptions<A>;

/**
 * Variant selections accepted by the recipe callable. Every axis is optional; `null`
 * is accepted so a selection can be conditionally unset. Use {@link RecipeVariants} for
 * the React/Astro props shape, which strips `null`.
 */
export type RecipeVariantSelections<Def extends RecipeDefinition> = {
  [K in keyof Def['variants']]?: RecipeAxisSelectionValue<Def['variants'][K]> | null | undefined;
};

/** `true` / `false` style-map key for a boolean axis, or the option union for an enum axis. */
export type RecipeOptionsFor<A extends VariantAxis> = VariantAxisStyleKeys<A>;

/**
 * Compound-variant condition value for one axis: the prop value (`boolean` for boolean
 * axes) or the style-map key (`'true'` / `'false'`), matching the legacy config.
 */
export type RecipeCompoundSelectionValue<A extends VariantAxis> =
  | RecipeAxisSelectionValue<A>
  | RecipeOptionsFor<A>;

/** The default value of one axis. */
export type RecipeDefaultValue<A extends VariantAxis> = A['default'];

/** Resolved defaults for a definition — the shape of `recipe.defaults`. */
export type RecipeDefaults<Def extends RecipeDefinition> = {
  [K in keyof Def['variants']]: RecipeDefaultValue<Def['variants'][K]>;
};

/**
 * The style value for one option: a per-slot map for slot recipes, or a single style
 * block for single-target recipes.
 */
export type RecipeStyleValue<Def extends RecipeDefinition> = Def extends {
  readonly slots: readonly (infer S extends string)[];
}
  ? SlotStyles<S>
  : VariantOptionStyle;

/**
 * The object returned by the style callback of a schema recipe.
 *
 * - `variants` is required and complete: every option of every axis must be styled.
 * - `base` is optional.
 * - `compoundVariants` is checked against the schema's option unions.
 * - `defaultVariants` is intentionally absent — defaults live on the axes.
 */
export type RecipeStyles<Def extends RecipeDefinition> = {
  base?: RecipeStyleValue<Def>;
  variants: {
    [K in keyof Def['variants']]: {
      [O in RecipeOptionsFor<Def['variants'][K]>]: RecipeStyleValue<Def>;
    };
  };
  compoundVariants?: ReadonlyArray<{
    variants: {
      [K in keyof Def['variants']]?:
        | RecipeCompoundSelectionValue<Def['variants'][K]>
        | ReadonlyArray<RecipeCompoundSelectionValue<Def['variants'][K]>>;
    };
    style: RecipeStyleValue<Def>;
  }>;
  /**
   * Component-internal custom properties from `c.vars()`. Registered and exposed on the
   * handle as `.vars`, same as legacy recipes.
   */
  vars?: unknown;
};

/** The callable result of a schema recipe: a slot→result map, or a single result. */
export type RecipeReturnValue<Def extends RecipeDefinition, Element> = Def extends {
  readonly slots: readonly (infer S extends string)[];
}
  ? Record<S, Element>
  : Element;

/**
 * Makes an **extra key** in a variant style map a compile error instead of a silent
 * typo. TypeScript skips excess-property checks when the contextual target is a generic
 * type (as `RecipeStyles<Def>` is), so `variants: { tone, nope }` and
 * `tone: { info, extra }` would otherwise typecheck. Intersecting the inferred literal
 * with `Record<extraKey, never>` reinstates the check — an unexpected key resolves to
 * `never`, which the literal cannot satisfy.
 */
type ExactAxisStyleMap<RAxis, A extends VariantAxis> = RAxis &
  Record<Exclude<keyof RAxis, RecipeOptionsFor<A>>, never>;

type ExactVariantsMap<RVariants, Axes extends Record<string, VariantAxis>> = RVariants &
  Record<Exclude<keyof RVariants, keyof Axes>, never> & {
    [K in keyof RVariants & keyof Axes]: ExactAxisStyleMap<RVariants[K], Axes[K]>;
  };

/**
 * The style callback's return type: `RecipeStyles<Def>` with unknown axes and unknown
 * option keys rejected. `R` is the inferred literal, so `keyof R` still contains the
 * excess keys TypeScript would otherwise drop.
 */
export type ExactRecipeStyles<Def extends RecipeDefinition, R> = R &
  Record<Exclude<keyof R, keyof RecipeStyles<Def>>, never> & {
    variants: ExactVariantsMap<R extends { variants: infer V } ? V : never, Def['variants']>;
  };

/**
 * Extract the internal-var definitions declared via `c.vars()` from a callback return.
 * Falls back to the loose `ComponentVarDefinitions` when the recipe declares no vars.
 */
export type RecipeVarsOf<R> = R extends { vars: infer V }
  ? [InferComponentVarRefTreeDefinitions<V>] extends [never]
    ? ComponentVarDefinitions
    : InferComponentVarRefTreeDefinitions<V>
  : ComponentVarDefinitions;

/**
 * Phantom brand carrying a recipe's `Def` on {@link RecipeHandle}.
 *
 * Declared and never emitted. A required unique-symbol property is invertible, so
 * `RecipeHandle<infer Def>` recovers the axis unions. Inferring `Def` from the call
 * signature is not — it collapses to the `RecipeDefinition` constraint (`keyof variants`
 * becomes `string`). `override()` / `OverrideConfigFor` depend on this.
 */
declare const recipeDefinitionBrand: unique symbol;

/**
 * The value returned by a schema `recipe(...)` call: callable with the schema's
 * selections, plus `.defaults` (and `.vars` when `c.vars()` was used).
 */
export type RecipeHandle<
  Def extends RecipeDefinition,
  Element = string,
  Vars extends ComponentVarDefinitions = ComponentVarDefinitions,
> = ((selections?: RecipeVariantSelections<Def>) => RecipeReturnValue<Def, Element>) & {
  /** Resolved axis defaults — one entry per axis. */
  readonly defaults: RecipeDefaults<Def>;
  /**
   * Definition brand for {@link OverrideConfigFor}. Not present at runtime.
   * Required (not optional) so TypeScript can infer `Def`.
   */
  readonly [recipeDefinitionBrand]: Def;
  /** Ref tree for internal vars declared via `c.vars()` during definition. */
  readonly vars?: ComponentVarRefTree<Vars>;
};

/**
 * Strip `null` / `undefined` from each property of an object type while preserving
 * optionality (a homomorphic mapped type).
 */
type StripNullProps<T> = { [K in keyof T]: NonNullable<T[K]> };

/**
 * Extract the go-to props type from a schema recipe handle.
 *
 * Null is stripped from every axis, so React/Astro props read
 * `{ tone?: 'info' | 'danger' }` rather than `{ tone?: 'info' | 'danger' | null }`.
 *
 * @example
 * ```ts
 * const alert = typestyles.recipe('alert', { variants: { … } }, (c) => { … });
 * type AlertProps = RecipeVariants<typeof alert>;
 * ```
 */
export type RecipeVariants<Handle> = Handle extends (selections?: infer S) => unknown
  ? StripNullProps<NonNullable<S>>
  : never;

/** Extract the `.defaults` object from a schema recipe handle. */
export type RecipeDefaultsOf<Handle> = Handle extends { readonly defaults: infer D } ? D : never;

/** Options accepted by the layered schema `recipe` call (`{ layer }` plus `themeable` opt-out). */
export type SchemaRecipeOptions<L extends string = string> = {
  readonly layer: L;
  readonly themeable?: boolean;
};

// ---------------------------------------------------------------------------
// Schema recipe `recipe(...)` signature fragments, reused across the per-mode
// recipe surfaces in styles.ts / create-type-styles.ts.
// ---------------------------------------------------------------------------

/** Unlayered schema `recipe` signature. */
export type SchemaRecipeFn<Element> = <
  const Def extends RecipeDefinition,
  const R extends RecipeStyles<Def>,
>(
  namespace: string,
  definition: Def,
  config: (ctx: ComponentConfigContext) => ExactRecipeStyles<Def, R>,
) => RecipeHandle<Def, Element, RecipeVarsOf<R>>;

/** Layered schema `recipe` signature — a `{ layer }` override follows the callback. */
export type LayeredSchemaRecipeFn<L extends string, Element> = <
  const Def extends RecipeDefinition,
  const R extends RecipeStyles<Def>,
>(
  namespace: string,
  definition: Def,
  config: (ctx: ComponentConfigContext) => ExactRecipeStyles<Def, R>,
  options: SchemaRecipeOptions<L>,
) => RecipeHandle<Def, Element, RecipeVarsOf<R>>;

/** Attribute-mode schema recipe: results are `{ className, attrs, props }`. */
export type AttributeSchemaRecipeFn = SchemaRecipeFn<ComponentAttrsResult>;
export type LayeredAttributeSchemaRecipeFn<L extends string> = LayeredSchemaRecipeFn<
  L,
  ComponentAttrsResult
>;

/** Semantic-mode schema recipe: results are class strings. */
export type SemanticSchemaRecipeFn = SchemaRecipeFn<string>;
export type LayeredSemanticSchemaRecipeFn<L extends string> = LayeredSchemaRecipeFn<L, string>;
