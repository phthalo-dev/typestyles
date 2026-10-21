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
} from './schema-recipe';

/**
 * Third argument to a layered `recipe()` / `component()` call.
 * `layer` is one name from the factory's cascade-layer stack.
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
 * How `{ layer }` is accepted.
 *
 * - `none` — no options argument (unlayered factories).
 * - `required` — `{ layer }` is required (`createStyles({ layers })` without a style default).
 * - `optional` — a bare call uses the factory default, and `{ layer }` overrides it
 *   (`createTypeStyles({ layers })`). This is an intersection of the `none` and `required`
 *   lists so schema's `(name, definition, callback)` stays contextually typed.
 */
export type RecipeLayerArg = 'none' | 'required' | 'optional';

/**
 * `recipe` / `component` call signatures, written once.
 *
 * `L` is the cascade-layer name union (`undefined` when the factory has no layers).
 * `Attrs` selects attribute-mode returns for dimensioned and slot recipes.
 * `Layer` is {@link RecipeLayerArg}. Utils do not change these signatures.
 *
 * Kinds stay ordered overloads: their config objects overlap, and excess-property
 * checks only fire when the parameter type is concrete. `vars` is stamped by the
 * overloads that infer it from the config object or from a `c.vars()` ref tree.
 */
export type RecipeFn<
  L extends string | undefined = undefined,
  Attrs extends boolean = false,
  Layer extends RecipeLayerArg = [L] extends [undefined] ? 'none' : 'required',
> = [Layer] extends ['optional']
  ? RecipeCalls<undefined, Attrs> & RecipeCalls<L & string, Attrs>
  : RecipeCalls<[Layer] extends ['none'] ? undefined : L, Attrs>;

type SchemaElement<Attrs extends boolean> = Attrs extends true ? ComponentAttrsResult : string;

type WithVars<R, Vars extends ComponentVarDefinitions> = R & {
  readonly __varDefinitions: Vars;
  readonly vars: ComponentVarRefTree<Vars>;
};

type VarsCallback<Config, Vars extends ComponentVarDefinitions> = (
  ctx: ComponentConfigContext,
) => Omit<Config, 'vars'> & {
  vars: ComponentVarRefTree<Vars> & { readonly [componentVarDefinitionsKey]: Vars };
};

/**
 * No extra arguments when unlayered, so schema's `(name, definition, callback)` stays the
 * only 3-arg match. An optional third parameter would also match that form and drop
 * contextual typing inside the callback.
 */
type Tail<L extends string | undefined> = [L] extends [undefined]
  ? []
  : [options: ComponentCreateOptions<L & string>];

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
    ...schemaOptions: Tail<L>
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
