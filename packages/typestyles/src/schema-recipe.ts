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
 * Variant selections accepted by the recipe callable. Every axis is optional.
 *
 * ```ts
 * type AlertProps = RecipeVariants<typeof alert>;
 * // { tone?: 'info' | 'success' | …; appearance?: …; contentGap?: … }
 * ```
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
 * The value returned by a schema `recipe(...)` call: callable with the schema's
 * selections, plus `.defaults` (and `.vars` when `c.vars()` was used).
 */
export type RecipeHandle<Def extends RecipeDefinition, Element = string> = ((
  selections?: RecipeVariantSelections<Def>,
) => RecipeReturnValue<Def, Element>) & {
  /** Resolved axis defaults — one entry per axis. */
  readonly defaults: RecipeDefaults<Def>;
  /** Ref tree for internal vars declared via `c.vars()` during definition. */
  readonly vars?: ComponentVarRefTree<ComponentVarDefinitions>;
};

/**
 * Extract the go-to props type from a schema recipe handle.
 *
 * @example
 * ```ts
 * const alert = typestyles.recipe('alert', { variants: { … } }, (c) => { … });
 * type AlertProps = RecipeVariants<typeof alert>;
 * ```
 */
export type RecipeVariants<Handle> = Handle extends (selections?: infer S) => unknown
  ? NonNullable<S>
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
export type SchemaRecipeFn<Element> = <const Def extends RecipeDefinition>(
  namespace: string,
  definition: Def,
  config: (ctx: ComponentConfigContext) => RecipeStyles<Def>,
) => RecipeHandle<Def, Element>;

/** Layered schema `recipe` signature — a `{ layer }` override follows the callback. */
export type LayeredSchemaRecipeFn<L extends string, Element> = <const Def extends RecipeDefinition>(
  namespace: string,
  definition: Def,
  config: (ctx: ComponentConfigContext) => RecipeStyles<Def>,
  options: SchemaRecipeOptions<L>,
) => RecipeHandle<Def, Element>;

/** Attribute-mode schema recipe: results are `{ className, attrs, props }`. */
export type AttributeSchemaRecipeFn = SchemaRecipeFn<ComponentAttrsResult>;
export type LayeredAttributeSchemaRecipeFn<L extends string> = LayeredSchemaRecipeFn<
  L,
  ComponentAttrsResult
>;

/** Semantic-mode schema recipe: results are class strings. */
export type SemanticSchemaRecipeFn = SchemaRecipeFn<string>;
export type LayeredSemanticSchemaRecipeFn<L extends string> = LayeredSchemaRecipeFn<L, string>;
