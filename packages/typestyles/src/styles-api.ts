import type { ClassNamingConfig } from './class-naming';
import type { ContainerNameRef, container as containerQuery } from './container';
import type { supports as supportsQuery } from './supports';
import type { atRuleBlock as atRuleBlockFn } from './at-rule-block';
import type { whenStyle as whenStyleFn } from './when-style';
import type { BreakpointMediaFn, MediaFn } from './media';
import type { has as hasNested, is as isNested, where as whereNested } from './relational-pseudo';
import type { ComponentRegistryApi } from './component-registry';
import type { OverrideFn } from './override';
import type { ScopeOptions } from './scope';
import type { RecipeFn } from './recipe-fn';
import type {
  CSSProperties,
  CSSPropertiesWithUtils,
  ComposeFn,
  ComposeSelectorInput,
  StyleUtils,
  StylesPropertyFn,
} from './types';

/**
 * `createStyles` / `withUtils` return type.
 *
 * `U` is `undefined` until utils are registered. `L` is `undefined` when the
 * factory has no cascade layers. `Attrs` is attribute mode.
 */
export type StylesSurface<
  U = undefined,
  L extends string | undefined = undefined,
  Attrs extends boolean = false,
> = ComponentRegistryApi & {
  readonly classNaming: Readonly<ClassNamingConfig>;
  readonly container: typeof containerQuery;
  readonly containerRef: (label: string) => ContainerNameRef;
  readonly supports: typeof supportsQuery;
  readonly atRuleBlock: typeof atRuleBlockFn;
  readonly when: typeof whenStyleFn;
  readonly breakpoint: BreakpointMediaFn;
  readonly media: MediaFn;
  readonly has: typeof hasNested;
  readonly is: typeof isNested;
  readonly where: typeof whereNested;
  class: ClassFn<U, L>;
  hashClass: HashFn<U, L>;
  component: RecipeFn<L, Attrs>;
  compose: <const S extends readonly ComposeSelectorInput[]>(...selectors: S) => ComposeFn<S>;
  scope: ScopeFn<U, L>;
  override: [L] extends [undefined] ? OverrideFn : OverrideFn<L & string>;
} & ([U] extends [StyleUtils] ? object : WithoutUtils<L, Attrs>);

/** `property` and `withUtils` exist only before utils are applied. That matches the runtime object. */
type WithoutUtils<L extends string | undefined, Attrs extends boolean> = {
  property: StylesPropertyFn;
  withUtils: <U2 extends StyleUtils>(utils: U2) => StylesSurface<U2, L, Attrs>;
};

type StyleProps<U> = [U] extends [StyleUtils]
  ? CSSPropertiesWithUtils<U & StyleUtils>
  : CSSProperties;

type ClassFn<U, L extends string | undefined> = [L] extends [undefined]
  ? (name: string, properties: StyleProps<U>) => string
  : (name: string, properties: StyleProps<U>, options: { readonly layer: L & string }) => string;

type HashFn<U, L extends string | undefined> = [L] extends [undefined]
  ? (properties: StyleProps<U>, label?: string) => string
  : (
      properties: StyleProps<U>,
      options: { readonly layer: L & string; readonly label?: string },
    ) => string;

type ScopeFn<U, L extends string | undefined> = [L] extends [undefined]
  ? (opts: ScopeOptions, className: string, overrides: StyleProps<U>) => void
  : (
      opts: ScopeOptions & { readonly layer?: L & string },
      className: string,
      overrides: StyleProps<U>,
    ) => void;

export type StylesApi = StylesSurface;
export type StylesApiWithLayers<L extends string> = StylesSurface<undefined, L, false>;
export type StylesWithUtilsApi<U extends StyleUtils> = StylesSurface<U, undefined, false>;
export type StylesWithUtilsApiLayered<U extends StyleUtils, L extends string> = StylesSurface<
  U,
  L,
  false
>;
export type AttributeStylesApi = StylesSurface<undefined, undefined, true>;
export type AttributeStylesApiWithLayers<L extends string> = StylesSurface<undefined, L, true>;
export type AttributeStylesWithUtilsApi<U extends StyleUtils> = StylesSurface<U, undefined, true>;
export type AttributeStylesWithUtilsApiLayered<
  U extends StyleUtils,
  L extends string,
> = StylesSurface<U, L, true>;

/** @deprecated Identical to {@link LayeredComponentFn}. Utils do not change recipe signatures. */
export type LayeredComponentFnWithUtils<L extends string> = RecipeFn<L, false>;
export type LayeredComponentFn<L extends string> = RecipeFn<L, false>;
export type AttributeComponentFn = RecipeFn<undefined, true>;
export type LayeredAttributeComponentFn<L extends string> = RecipeFn<L, true>;

type HasUtils<O> = O extends { utils: infer U extends StyleUtils } ? U : undefined;
type HasAttrs<O> = O extends { mode: 'attribute' } ? true : false;
type LayerNames<O> = O extends { layers: infer L extends readonly string[] }
  ? L[number]
  : O extends { layers: object }
    ? string
    : undefined;

/** Return type of {@link createStyles}, derived from the options object instead of an overload list. */
export type CreateStylesResult<O> = StylesSurface<HasUtils<O>, LayerNames<O>, HasAttrs<O>>;
