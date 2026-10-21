import type {
  ComponentAttrsResult,
  ComponentAttrsReturn,
  ComponentConfig,
  ComponentConfigContext,
  ComponentConfigInput,
  ComponentReturn,
  ComponentVarDefinitions,
  ComponentVarRefTree,
  FlatComponentConfig,
  FlatComponentConfigInput,
  FlatComponentReturn,
  MultiSlotConfig,
  MultiSlotConfigInput,
  MultiSlotReturn,
  SlotAttrsReturn,
  SlotComponentConfig,
  SlotComponentConfigInput,
  SlotComponentFunction,
  SlotVariantDefinitions,
  VariantDefinitions,
  componentVarDefinitionsKey,
} from './types';
import type {
  ExactRecipeStyles,
  RecipeDefinition,
  RecipeHandle,
  RecipeStyles,
  RecipeVarsOf,
  SchemaRecipeOptions,
} from './schema-recipe';

/**
 * `recipe` / `component` call signatures, written once.
 *
 * `L` is the cascade-layer name union (`undefined` when the factory has no layers).
 * `Attrs` selects attribute-mode returns for dimensioned and slot recipes.
 * Utils do not change these signatures.
 *
 * Kinds stay ordered overloads: their config objects overlap, and excess-property
 * checks only fire when the parameter type is concrete. `vars` is stamped by the
 * overloads that infer it from the config object or from a `c.vars()` ref tree.
 *
 * Unlayered calls take `(name, config)` only. An optional third argument would
 * also match schema's `(name, definition, callback)` and drop contextual typing
 * inside that callback. Layered calls require `{ layer }` as the next argument.
 */
export type RecipeFn<
  L extends string | undefined = undefined,
  Attrs extends boolean = false,
> = RecipeCalls<L, Attrs>;

type SchemaElement<Attrs extends boolean> = Attrs extends true ? ComponentAttrsResult : string;

type SchemaTail<L extends string | undefined> = [L] extends [undefined]
  ? []
  : [options: SchemaRecipeOptions<L & string>];

type WithVars<R, Vars extends ComponentVarDefinitions> = R & {
  readonly __varDefinitions: Vars;
  readonly vars: ComponentVarRefTree<Vars>;
};

type VarsCallback<Config, Vars extends ComponentVarDefinitions> = (
  ctx: ComponentConfigContext,
) => Omit<Config, 'vars'> & {
  vars: ComponentVarRefTree<Vars> & { readonly [componentVarDefinitionsKey]: Vars };
};

type CallOptions<L extends string> = {
  readonly layer: L;
  readonly themeable?: boolean;
  /** Accepted at runtime. Does not infer `.vars`. */
  readonly varDefinitions?: ComponentVarDefinitions;
};

/** No extra arguments when unlayered, so schema's 3-arg form stays the only match. */
type Tail<L extends string | undefined> = [L] extends [undefined]
  ? []
  : [options: CallOptions<L & string>];

type SlotReturn<
  Slots extends readonly string[],
  V extends SlotVariantDefinitions<Slots[number]>,
  Attrs extends boolean,
> = Attrs extends true ? SlotAttrsReturn<Slots, V> : SlotComponentFunction<Slots, V>;

type DimensionedReturn<V extends VariantDefinitions, Attrs extends boolean> = Attrs extends true
  ? ComponentAttrsReturn<V>
  : ComponentReturn<V>;

type RecipeCalls<L extends string | undefined, Attrs extends boolean> = {
  <const Def extends RecipeDefinition, const R extends RecipeStyles<Def>>(
    namespace: string,
    definition: Def,
    config: (ctx: ComponentConfigContext) => ExactRecipeStyles<Def, R>,
    ...schemaOptions: SchemaTail<L>
  ): RecipeHandle<Def, SchemaElement<Attrs>, RecipeVarsOf<R>>;

  <
    const Slots extends readonly string[],
    V extends SlotVariantDefinitions<Slots[number]>,
    const Vars extends ComponentVarDefinitions,
  >(
    namespace: string,
    config: SlotComponentConfig<Slots, V> & { vars: Vars },
    ...options: Tail<L>
  ): WithVars<SlotReturn<Slots, V, Attrs>, Vars>;
  <
    const Slots extends readonly string[],
    V extends SlotVariantDefinitions<Slots[number]>,
    const Vars extends ComponentVarDefinitions,
  >(
    namespace: string,
    config: VarsCallback<SlotComponentConfig<Slots, V>, Vars>,
    ...options: Tail<L>
  ): WithVars<SlotReturn<Slots, V, Attrs>, Vars>;
  <const Slots extends readonly string[], V extends SlotVariantDefinitions<Slots[number]>>(
    namespace: string,
    config: SlotComponentConfigInput<Slots, V>,
    ...options: Tail<L>
  ): SlotReturn<Slots, V, Attrs>;

  <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: MultiSlotConfig<Slots> & { vars: Vars },
    ...options: Tail<L>
  ): WithVars<MultiSlotReturn<Slots>, Vars>;
  <const Slots extends readonly string[], const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: VarsCallback<MultiSlotConfig<Slots>, Vars>,
    ...options: Tail<L>
  ): WithVars<MultiSlotReturn<Slots>, Vars>;
  <const Slots extends readonly string[]>(
    namespace: string,
    config: MultiSlotConfigInput<Slots>,
    ...options: Tail<L>
  ): MultiSlotReturn<Slots>;

  <const V extends VariantDefinitions, const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: ComponentConfig<V> & { vars: Vars },
    ...options: Tail<L>
  ): WithVars<DimensionedReturn<V, Attrs>, Vars>;
  <const V extends VariantDefinitions, const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: VarsCallback<ComponentConfig<V>, Vars>,
    ...options: Tail<L>
  ): WithVars<DimensionedReturn<V, Attrs>, Vars>;
  <const V extends VariantDefinitions>(
    namespace: string,
    config: ComponentConfigInput<V>,
    ...options: Tail<L>
  ): DimensionedReturn<V, Attrs>;

  <const K extends string, const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: FlatComponentConfig<K> & { vars: Vars },
    ...options: Tail<L>
  ): WithVars<FlatComponentReturn<K>, Vars>;
  <const K extends string, const Vars extends ComponentVarDefinitions>(
    namespace: string,
    config: VarsCallback<FlatComponentConfig<K>, Vars>,
    ...options: Tail<L>
  ): WithVars<FlatComponentReturn<K>, Vars>;
  <const K extends string>(
    namespace: string,
    config: FlatComponentConfigInput<K>,
    ...options: Tail<L>
  ): FlatComponentReturn<K>;
};
