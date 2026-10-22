import type {
  ComponentAttrsResult,
  ComponentVarDefinitions,
  ComponentVarRefTree,
  VariantOptionStyle,
} from './types';
import type {
  ExactRecipeStyles,
  RecipeDefaults,
  RecipeDefinition,
  RecipeHandle,
  RecipeStyles,
  RecipeVariantSelections,
} from './schema-recipe';
import type { VariantAxis } from './variant';

/**
 * Third argument used to be a layered `recipe()` options bag. `layer` and `themeable`
 * now sit on the recipe object. The name stays so existing imports keep compiling.
 */
export type ComponentCreateOptions<L extends string = string> = {
  readonly layer: L;
  /**
   * When `false`, the component is omitted from theme `components` overrides.
   * @default true
   */
  readonly themeable?: boolean;
};

/**
 * How `{ layer }` is accepted on the recipe object.
 *
 * - `none` — unlayered factories. `layer` is rejected.
 * - `required` — `createStyles({ layers })` without a style default.
 * - `optional` — bare calls use the factory `layers.style` default (`createTypeStyles`).
 */
export type RecipeLayerArg = 'none' | 'required' | 'optional';

/**
 * One `recipe({ name, styles, ... })` call.
 *
 * `slots`, `variants`, and `vars` are inferred from those fields. `styles` is checked
 * against that schema — it is not inferred from the callback return. The call always
 * returns `{ className, attrs, props }` (one per slot when `slots` is set). Attribute
 * mode still decides whether variant selections become data attributes or classes.
 */
type RecipeFields<
  Slots extends readonly string[],
  Axes extends Record<string, VariantAxis>,
  Vars extends ComponentVarDefinitions,
  Layer extends RecipeLayerArg,
  L extends string | undefined,
> = {
  readonly name: string;
  /** When `false`, theme `components` overrides skip this recipe. @default true */
  readonly themeable?: boolean;
  readonly slots?: Slots;
  /** Axes (`variant.enum` / `variant.boolean`), not option styles. */
  readonly variants?: Axes;
  /** Declarations (`syntax`, initial `value`). The callback receives the ref tree. */
  readonly vars?: Vars;
} & LayerFields<Layer, L>;

type RecipeChecked<Slots, Axes, R> = [Axes] extends [never]
  ? NoAxisStyle<Slots, R>
  : AxisStyle<Slots, Axes, R>;

/**
 * One call. `slots`, `variants`, and `vars` are inferred from those fields.
 * `NoInfer` keeps `styles` from widening them, then the object or callback is
 * checked against that schema. `R` stays an inference site so extra keys in the
 * style literal resolve to `never`.
 */
export type RecipeFn<
  L extends string | undefined = undefined,
  Layer extends RecipeLayerArg = [L] extends [undefined] ? 'none' : 'required',
> = {
  <
    const Slots extends readonly string[] = never,
    const Axes extends Record<string, VariantAxis> = never,
    const Vars extends ComponentVarDefinitions = never,
    const R extends RecipeStyleBody<Slots, Axes> = RecipeStyleBody<Slots, Axes>,
  >(
    input: RecipeFields<Slots, Axes, Vars, Layer, L> & {
      readonly styles: (
        ctx: RecipeStyleArg<NoInfer<Vars>>,
      ) => RecipeChecked<NoInfer<Slots>, Axes, R>;
    },
  ): RecipeCallResult<Slots, Axes, Vars>;
  <
    const Slots extends readonly string[] = never,
    const Axes extends Record<string, VariantAxis> = never,
    const Vars extends ComponentVarDefinitions = never,
    const R extends RecipeStyleBody<Slots, Axes> = RecipeStyleBody<Slots, Axes>,
  >(
    input: RecipeFields<Slots, Axes, Vars, Layer, L> & {
      readonly styles: RecipeChecked<NoInfer<Slots>, Axes, R>;
    },
  ): RecipeCallResult<Slots, Axes, Vars>;
};

/** Callback argument. `vars` is `{}` when the recipe did not declare any. */
export type RecipeStyleArg<Vars> = [Vars] extends [never]
  ? { readonly vars: Record<never, never> }
  : { readonly vars: ComponentVarRefTree<Vars> };

type SlotKey<Slots> = [Slots] extends [readonly (infer S extends string)[]] ? S : never;

type RecipeDef<Slots, Axes> = ([Slots] extends [never]
  ? { readonly slots?: undefined }
  : { readonly slots: Slots }) &
  ([Axes] extends [never] ? { readonly variants?: undefined } : { readonly variants: Axes });

type ExactSlotRecord<R, Slots> = [Slots] extends [never]
  ? R
  : R & Record<Exclude<keyof R, SlotKey<Slots>>, never>;

type NoAxisStyle<Slots, R> = R &
  Record<Exclude<keyof R, 'base'>, never> & {
    base?: [Slots] extends [never]
      ? VariantOptionStyle
      : ExactSlotRecord<R extends { base: infer B } ? B : Record<never, never>, Slots>;
  };

type ExactVariantSlots<Slots, V> = {
  [K in keyof V]: {
    [O in keyof V[K]]: ExactSlotRecord<V[K][O], Slots>;
  };
};

type AxisStyle<Slots, Axes, R> = ExactRecipeStyles<RecipeDef<Slots, Axes> & RecipeDefinition, R> & {
  base?: [Slots] extends [never]
    ? VariantOptionStyle
    : ExactSlotRecord<R extends { base: infer B } ? B : Record<never, never>, Slots>;
} & ([Slots] extends [never]
    ? unknown
    : R extends { variants: infer V }
      ? { variants: ExactVariantSlots<Slots, V> }
      : unknown);

type RecipeStyleBody<Slots, Axes> = [Axes] extends [never]
  ? {
      base?: [Slots] extends [never]
        ? VariantOptionStyle
        : Partial<Record<SlotKey<Slots>, VariantOptionStyle>>;
    }
  : RecipeStyles<RecipeDef<Slots, Axes> & RecipeDefinition>;

type LayerFields<Layer extends RecipeLayerArg, L extends string | undefined> = [Layer] extends [
  'none',
]
  ? { readonly layer?: never }
  : [Layer] extends ['required']
    ? { readonly layer: L & string }
    : { readonly layer?: L & string };

type HideVars<H> = H extends (...args: infer P) => infer R
  ? ((...args: P) => R) & Omit<H, 'vars'>
  : H;

/**
 * Class-name strings hung on a slotted recipe (`layout.stack`, `alert.root`).
 * Built from the `slots` tuple, not from `RecipeDefinition`, so a widened `string[]`
 * cannot become an index signature on the branded handle.
 */
type SlotClassNames<Slots> = [SlotKey<Slots>] extends [never]
  ? unknown
  : [string] extends [SlotKey<Slots>]
    ? unknown
    : { readonly [K in SlotKey<Slots>]: string };

/**
 * Value returned by {@link RecipeFn} (`recipe()` / `component()`).
 *
 * Exported so a library can name this type in its own `.d.ts`. Expanding the
 * handle prints `recipeDefinitionBrand`, which is not a public export, and
 * `tsc --declaration` fails with TS4023.
 */
export type RecipeCallResult<Slots, Axes, Vars extends ComponentVarDefinitions> = ([Vars] extends [
  never,
]
  ? HideVars<RecipeHandle<RecipeDef<Slots, Axes> & RecipeDefinition, ComponentAttrsResult>>
  : RecipeHandle<RecipeDef<Slots, Axes> & RecipeDefinition, ComponentAttrsResult, Vars> & {
      readonly vars: ComponentVarRefTree<Vars>;
    }) &
  SlotClassNames<Slots>;

export type { RecipeDefaults, RecipeVariantSelections };
