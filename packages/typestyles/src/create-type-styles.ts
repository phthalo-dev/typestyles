import type { ClassNamingConfig } from './class-naming';
import { createGlobal } from './create-global';
import type { GlobalApiLayered, GlobalApiUnlayered } from './create-global';
import { createStyles } from './styles';
import type {
  AttributeComponentFn,
  ComponentRegistryApi,
  LayeredAttributeComponentFn,
  LayeredComponentFn,
  StylesApi,
} from './styles';
import type { CSSProperties, StyleUtils } from './types';
import type { BreakpointsConfig } from './breakpoints';
import type { ColorModeMap } from './color-modes';
import { createTokens } from './tokens';
import type { TokensApi } from './tokens';
import type { CascadeLayersObjectInput } from './layers';
import type { OverrideFn } from './override';
import type { ScopeOptions } from './scope';
import type { StylesPropertyFn } from './types';
import type { ContainerNameRef } from './container';
import type { BreakpointMediaFn, MediaFn } from './media';

type NamingPartial = Partial<Omit<ClassNamingConfig, 'cascadeLayers' | 'styleLayer'>> & {
  breakpoints?: BreakpointsConfig;
  colorModes?: ColorModeMap;
};

/**
 * Nested cascade-layer config for {@link createTypeStyles}.
 * `token` and `style` defaults are required so call sites rarely repeat `{ layer }`.
 */
export type TypeStylesLayersConfig<L extends string = string> = {
  readonly order: readonly [L, ...L[]];
  /** Default `@layer` for `:root` / theme token CSS. */
  readonly token: L;
  /** Default `@layer` for `style` / `recipe` / `hash`. */
  readonly style: L;
  /** Default `@layer` for `global.rule` / `global.rules` / `global.apply`. */
  readonly global?: L;
  readonly prependFrameworkLayers?: readonly string[];
};

export type StyleFn = (
  name: string,
  properties: CSSProperties,
  options?: { layer?: string },
) => string;

/** Deterministic hashed class from a style object (was `styles.hashClass`). */
export type HashFn = (
  properties: CSSProperties,
  options?: { label?: string; layer?: string },
) => string;

// ---------------------------------------------------------------------------
// `recipe` call signatures per factory config. `createTypeStyles({ layers })`
// always provides a `layers.style` default, so both bare `recipe(ns, config)`
// calls and `recipe(ns, config, { layer })` overrides typecheck — the unlayered
// and layered overload sets are intersected.
// ---------------------------------------------------------------------------

/** Semantic-mode `recipe` for factories without cascade layers (same overloads as `styles.component`). */
export type SemanticRecipeFn = StylesApi['component'];

/**
 * Semantic-mode `recipe` for `createTypeStyles({ layers })` — bare calls use the factory
 * `layers.style` default; a `{ layer }` third argument overrides it.
 */
export type LayeredSemanticRecipeFn<L extends string> = StylesApi['component'] &
  LayeredComponentFn<L>;

/**
 * Attribute-mode (`mode: 'attribute'`) `recipe` — dimensioned and slot recipes resolve to
 * `{ className, attrs, props }` results instead of class strings.
 */
export type AttributeRecipeFn = AttributeComponentFn;

/**
 * Attribute-mode `recipe` for `createTypeStyles({ mode: 'attribute', layers })` — bare calls use
 * the factory `layers.style` default; a `{ layer }` third argument overrides it.
 */
export type LayeredAttributeRecipeFn<L extends string> = AttributeComponentFn &
  LayeredAttributeComponentFn<L>;

/** Flat public surface returned by {@link createTypeStyles}. */
export type TypeStylesApi<Recipe = LayeredSemanticRecipeFn<string>> = ComponentRegistryApi & {
  readonly classNaming: Readonly<ClassNamingConfig>;
  /** Create a single named class (was `styles.class`). */
  style: StyleFn;
  /** Deterministic hashed class from a style object (was `styles.hashClass`). */
  hash: HashFn;
  /**
   * Multi-variant / slot recipe (was `styles.component`). Typed per factory config via the
   * {@link createTypeStyles} overloads: attribute-mode factories return `{ className, attrs, props }`
   * results; layered factories accept a `{ layer }` override on top of the `layers.style` default.
   */
  recipe: Recipe;
  tokens: TokensApi;
  global: GlobalApiUnlayered | GlobalApiLayered;
  compose: StylesApi['compose'];
  override: OverrideFn;
  scope: (opts: ScopeOptions, className: string, overrides: CSSProperties) => void;
  property: StylesPropertyFn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  container: any;
  containerRef: (label: string) => ContainerNameRef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supports: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  atRuleBlock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  when: any;
  breakpoint: BreakpointMediaFn;
  media: MediaFn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  has: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  is: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where: any;
};

type CreateTypeStylesOptionsBase = NamingPartial & {
  utils?: StyleUtils;
  mode?: ClassNamingConfig['mode'];
  /**
   * HTML attribute for automatic dark fallbacks of token values that cannot compile
   * to `light-dark()`. Default: `"data-color-mode"`.
   */
  colorModeAttribute?: string;
};

function cascadeInputFromLayers(
  layers:
    | TypeStylesLayersConfig
    | (CascadeLayersObjectInput & { token: string; style: string; global?: string }),
): CascadeLayersObjectInput {
  return {
    order: layers.order,
    prependFrameworkLayers: layers.prependFrameworkLayers,
  };
}

function buildStyleFn(styles: StylesApi | StylesApiWithLayersLoose): StyleFn {
  return (name, properties, options) => {
    if (styles.classNaming.cascadeLayers) {
      return (styles as StylesApiWithLayersLoose).class(name, properties, options);
    }
    return styles.class(name, properties);
  };
}

function buildHashFn(styles: StylesApi | StylesApiWithLayersLoose): HashFn {
  return (properties, options) => {
    if (styles.classNaming.cascadeLayers) {
      return (styles as StylesApiWithLayersLoose).hashClass(properties, options);
    }
    return styles.hashClass(properties, options?.label);
  };
}

/** Minimal layered surface so we can forward `{ layer }` without importing the full layered type. */
type StylesApiWithLayersLoose = Omit<StylesApi, 'class' | 'hashClass'> & {
  class: (name: string, properties: CSSProperties, options?: { layer?: string }) => string;
  hashClass: (properties: CSSProperties, options?: { label?: string; layer?: string }) => string;
};

function flattenTypeStylesApi<Recipe = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any,
  tokens: TokensApi,
  global: GlobalApiUnlayered | GlobalApiLayered,
): TypeStylesApi<Recipe> {
  const s = styles as ComponentRegistryApi & {
    classNaming: ClassNamingConfig;
    component: StylesApi['component'];
    compose: StylesApi['compose'];
    override: OverrideFn;
    scope: TypeStylesApi['scope'];
    property: StylesPropertyFn;
    container: TypeStylesApi['container'];
    containerRef: TypeStylesApi['containerRef'];
    supports: TypeStylesApi['supports'];
    atRuleBlock: TypeStylesApi['atRuleBlock'];
    when: TypeStylesApi['when'];
    breakpoint: BreakpointMediaFn;
    media: MediaFn;
    has: TypeStylesApi['has'];
    is: TypeStylesApi['is'];
    where: TypeStylesApi['where'];
  };
  return {
    classNaming: s.classNaming,
    style: buildStyleFn(s as StylesApi),
    hash: buildHashFn(s as StylesApi),
    recipe: s.component as unknown as Recipe,
    tokens,
    global,
    compose: s.compose,
    override: s.override,
    scope: s.scope,
    property: s.property,
    container: s.container,
    containerRef: s.containerRef,
    supports: s.supports,
    atRuleBlock: s.atRuleBlock,
    when: s.when,
    breakpoint: s.breakpoint,
    media: s.media,
    has: s.has,
    is: s.is,
    where: s.where,
    getComponent: s.getComponent.bind(s),
    getThemeableComponents: s.getThemeableComponents.bind(s),
    listComponentNamespaces: s.listComponentNamespaces.bind(s),
  };
}

/** Unified factory: one `scopeId`, shared cascade layer stack, flat public surface. */
export function createTypeStyles<const L extends string>(
  options: CreateTypeStylesOptionsBase & { mode: 'attribute'; layers: TypeStylesLayersConfig<L> },
): TypeStylesApi<LayeredAttributeRecipeFn<L>>;

export function createTypeStyles(
  options: CreateTypeStylesOptionsBase & { mode: 'attribute' },
): TypeStylesApi<AttributeRecipeFn>;

export function createTypeStyles<const L extends string>(
  options: CreateTypeStylesOptionsBase & { layers: TypeStylesLayersConfig<L> },
): TypeStylesApi<LayeredSemanticRecipeFn<L>>;

export function createTypeStyles(
  options?: CreateTypeStylesOptionsBase,
): TypeStylesApi<SemanticRecipeFn>;

export function createTypeStyles(
  options: CreateTypeStylesOptionsBase & { layers?: TypeStylesLayersConfig } = {},
): TypeStylesApi<unknown> {
  const { layers, utils, colorModeAttribute, ...rest } = options;

  if (layers != null) {
    if (layers.token == null || layers.token === '') {
      throw new Error(
        '[typestyles] `createTypeStyles({ layers })` requires `layers.token` — the default `@layer` for `:root` and theme CSS.',
      );
    }
    if (layers.style == null || layers.style === '') {
      throw new Error(
        '[typestyles] `createTypeStyles({ layers })` requires `layers.style` — the default `@layer` for `style` / `recipe`.',
      );
    }
    const cascade = cascadeInputFromLayers(layers);
    const styles =
      utils !== undefined
        ? createStyles({
            ...rest,
            layers: cascade,
            tokenLayer: layers.token,
            styleLayer: layers.style,
            utils,
          })
        : createStyles({
            ...rest,
            layers: cascade,
            tokenLayer: layers.token,
            styleLayer: layers.style,
          });
    const tokens = createTokens({
      scopeId: rest.scopeId,
      layers: cascade,
      tokenLayer: layers.token,
      colorModes: rest.colorModes,
      colorModeAttribute,
      themeStyles: styles,
    });
    const global = createGlobal({
      layers: cascade,
      scopeId: rest.scopeId,
      globalLayer: layers.global,
      breakpoints: rest.breakpoints,
    });
    return flattenTypeStylesApi(styles, tokens, global);
  }

  const styles = utils !== undefined ? createStyles({ ...rest, utils }) : createStyles(rest);
  const tokens = createTokens({
    scopeId: rest.scopeId,
    colorModes: rest.colorModes,
    colorModeAttribute,
    themeStyles: styles,
  });
  const global = createGlobal({ scopeId: rest.scopeId, breakpoints: rest.breakpoints });
  return flattenTypeStylesApi(styles, tokens, global);
}
