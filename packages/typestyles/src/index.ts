import { createStyles } from './styles';
import { createTokens } from './tokens';
import { createTypeStyles } from './create-type-styles';
import { createGlobal } from './create-global';
import { createTheme, createDarkMode, when, colorMode, resolvedDarkWhen } from './theme';
import { createKeyframes } from './keyframes';
import {
  getRegisteredCss,
  subscribeRegisteredCss,
  insertRules,
  reset,
  flushSync,
  ensureDocumentStylesAttached,
} from './sheet';
import { createVar, assignVars } from './vars';
import { cx } from './cx';
import { mergeProps, combine } from './binding';
import { container, createContainerRef } from './container';
import { supports } from './supports';
import { atRuleBlock } from './at-rule-block';
import { has, is, where } from './relational-pseudo';
import { whenStyle } from './when-style';
import { atan2, calc, clamp, cos, hypot, pow, sin, sqrt, tan } from './css-math';
import { content } from './css-content';

export type {
  StylesApi,
  StylesApiWithLayers,
  CreateStylesInput,
  LayerOption,
  ComponentCreateOptions,
  LayeredComponentFn,
  AttributeStylesApi,
  AttributeStylesApiWithLayers,
  AttributeComponentFn,
  LayeredAttributeComponentFn,
} from './styles';
export type { CreateTokensOptions, TokensApi } from './tokens';
export type { ThemeTokenContext } from './theme-token-context';
export type { BreakpointMap, BreakpointsConfig, ResponsiveValue } from './breakpoints';
export { resolveBreakpoints, toMediaAtRuleKey } from './breakpoints';
export type {
  MediaQueryKey,
  MediaKeyFromCondition,
  MediaBreakpointFeature,
  MediaBreakpointOptions,
  BreakpointMediaFn,
  MediaFn,
} from './media';
export { createBreakpointMediaFn, createMediaFn, resolveBreakpointMediaKey } from './media';
export type { MediaQueries } from './media-queries';
export { mediaQueries } from './media-queries';
export type { ColorModeMap, ModeAwareValue, LightDarkColorModes } from './color-modes';
export { colorModes, resolveColorModes, acceptsLightDark } from './color-modes';
export type { ConditionCompileContext } from './condition-compile';
export { getTokenLeafValues, getDeclaredNamespace } from './tokens';
export type { SerializeStyleOptions } from './serialize-style';

export type { CascadeLayersInput, CascadeLayersObjectInput, ResolvedCascadeLayers } from './layers';

export type {
  ClassNamingConfig,
  ClassNamingMode,
  ClassNameContext,
  ClassNameTemplate,
} from './class-naming';
export {
  mergeClassNaming,
  defaultClassNamingConfig,
  scopedTokenNamespace,
  fileScopeId,
} from './class-naming';

export type { ScopeOptions } from './scope';
export { createScope } from './scope';

export type {
  OverrideOptions,
  OverrideConfig,
  SlotOverrideConfig,
  MultiSlotOverrideConfig,
  FlatOverrideConfig,
  OverrideConfigFor,
  InferVarDefinitions,
  ComponentVarAssignValue,
  ComponentVarValues,
  OverrideFn,
} from './override';
export { conditional } from './override';

export type {
  ComponentMeta,
  ComponentMetaBase,
  ComponentVarRegistry,
  DimensionedComponentMeta,
  FlatComponentMeta,
  RecipeSchemaAxis,
  RecipeSchemaMeta,
  RegisteredComponentVar,
  SlotComponentMeta,
  MultiSlotComponentMeta,
  VariantSelectorMap,
  SlotVariantSelectorMap,
} from './component-meta';
export { getComponentMeta } from './component-meta';

export { variant, variantEnum, variantBoolean, recipeAxisBrand } from './variant';
export type {
  BooleanVariantAxis,
  EnumVariantAxis,
  VariantAxis,
  VariantAxisStyleKeys,
  VariantOptions,
} from './variant';

export type {
  AttributeSchemaRecipeFn,
  LayeredAttributeSchemaRecipeFn,
  LayeredSchemaRecipeFn,
  LayeredSemanticSchemaRecipeFn,
  RecipeDefinition,
  RecipeDefaults,
  RecipeDefaultsOf,
  RecipeHandle,
  RecipeCompoundSelectionValue,
  RecipeOptionsFor,
  RecipeReturnValue,
  RecipeSlots,
  RecipeStyleValue,
  RecipeStyles,
  RecipeVariantKeys,
  RecipeVariantSelections,
  RecipeVariants,
  SchemaRecipeFn,
  SchemaRecipeOptions,
  SemanticSchemaRecipeFn,
} from './schema-recipe';
export { getRegisteredComponentRefs } from './component-registry';
export type {
  ThemeComponentsOverrideMap,
  OverrideConfigForNamespace,
} from './theme-component-types';

/** Primary app/library entry. Prefer this over the lower-level factories. */
export { createTypeStyles };
export type {
  TypeStylesApi,
  TypeStylesLayersConfig,
  StyleFn,
  HashFn,
  SemanticRecipeFn,
  LayeredSemanticRecipeFn,
  AttributeRecipeFn,
  LayeredAttributeRecipeFn,
} from './create-type-styles';

/**
 * Lower-level factories (prefer {@link createTypeStyles} for apps).
 * Kept for advanced splits and internal tests.
 */
export { createStyles, createTokens, createGlobal };

export type { GlobalApiUnlayered, GlobalApiLayered } from './create-global';

export type { GlobalStyleTuple } from './global-style-tuple';

export { container, createContainerRef, supports, atRuleBlock, has, is, where, whenStyle };
export { atProperty } from './at-property';
export type { AtPropertyPreset, AtPropertyPresetName } from './at-property';

export { atan2, calc, clamp, content, cos, hypot, pow, sin, sqrt, tan };

export type { CssMathValue } from './css-math';

export type {
  ContainerQueryKey,
  ContainerQueryFeatures,
  ContainerQueryObject,
  ContainerObjectKey,
  ContainerNameRef,
  CreateContainerRefOptions,
} from './container';

export type { SupportsQueryKey, SupportsQueryFeatures, SupportsObjectKey } from './supports';

export type { HasNestedKey, IsNestedKey, WhereNestedKey, IsPseudoArg } from './relational-pseudo';

export type {
  CSSProperties,
  CSSValue,
  StyleDefinitions,
  StyleDefinitionsWithUtils,
  CSSPropertiesWithUtils,
  StyleUtils,
  TokenValues,
  TokenRef,
  TokenRefTree,
  TokenDescriptor,
  CreatedTokenRef,
  ModeAwareTokenLeaf,
  ModeAwareTokenObject,
  InferTokenValues,
  InferTokenNamespace,
  TokenRegistry,
  ThemeOverrides,
  FlatTokenEntry,
  FlatTokenPathEntry,
  KeyframeStops,
  VariantDefinitions,
  VariantOptionStyle,
  StylableOverride,
  ConditionalOverride,
  VariantOptionKey,
  CompoundSelectionValue,
  ComponentConfig,
  ComponentConfigContext,
  ComponentConfigInput,
  ComponentInternalVarRef,
  RegisteredPropertyRef,
  PropertyRegistration,
  PropertyRef,
  PropertyOptions,
  RegisteredPropertyOptions,
  ComponentReturn,
  ComponentAttrsReturn,
  ComponentAttrsResult,
  SlotAttrsReturn,
  ComponentVarDefinitions,
  ComponentVarConfigInput,
  ComponentVarDescriptor,
  ComponentVarNode,
  ComponentVarOptions,
  ComponentVarRefTree,
  componentVarDefinitionsKey,
  FlatComponentConfig,
  FlatComponentConfigInput,
  FlatComponentReturn,
  FlatComponentSelections,
  ComponentSelections,
  SlotStyles,
  SlotVariantDefinitions,
  SlotComponentConfig,
  SlotComponentConfigInput,
  SlotComponentFunction,
  MultiSlotReturn,
  MultiSlotConfigInput,
  FontFaceProps,
  FontFaceSrc,
  CSSVarRef,
  ComponentVariants,
  ComposeFn,
  ComposeSelectorInput,
  MergeComposeSelections,
  ThemeCondition,
  ThemeConditionMedia,
  ThemeConditionAttr,
  ThemeConditionClass,
  ThemeConditionSelector,
  ThemeConditionAnd,
  ThemeConditionOr,
  ThemeConditionNot,
  ThemeModeDefinition,
  ThemeConfig,
  ThemeSource,
  Theme,
  ThemeOverrideInput,
  DeepPartialThemeTokens,
  DeepPartialTokenValues,
  TokenSchema,
  TokenSchemaLeaf,
  CreateTokenValues,
  CreateTokenNode,
  DeclaredTokenRef,
  InferFromSchema,
  InferValuesFromSchema,
  CssSyntax,
  SyntaxRef,
  SyntaxRefAccepts,
  CreateValueForSyntax,
  CompatibleSourceSyntax,
  SyntaxAwareLonghands,
  SyntaxPropertyValue,
  CSSPropertyValue,
} from './types';

export { flattenTokenEntries, flattenTokenPaths, isTokenDescriptor } from './types';

export { createVar, assignVars };

export { createTheme, createDarkMode, when, colorMode, resolvedDarkWhen };
export {
  canUseLightDarkForTokenValue,
  cloneThemeValues,
  mergeThemeOverrides,
  normalizeModeAwareOverrides,
  normalizeThemeConfig,
} from './token-color-modes';
export { applyThemeOverride, bindThemeOverride, mergeThemeSource } from './theme-source-merge';
export type {
  CreateThemeInput,
  InferThemeTokensFromConfig,
  ThemeComponentsFor,
} from './theme-types';
export { themeConfigToSource } from './theme-types';

export type { ThemeEmitLayerContext } from './theme';

/**
 * Keyframe animation API (not scoped to a `createTypeStyles` instance).
 *
 * @example
 * ```ts
 * const fadeIn = keyframes.create('fadeIn', {
 *   from: { opacity: 0 },
 *   to: { opacity: 1 },
 * });
 *
 * const card = recipe('card', {
 *   base: { animation: `${fadeIn} 300ms ease` },
 * });
 * ```
 */
export const keyframes = {
  create: createKeyframes,
} as const;

/**
 * Return all registered CSS as a string (for SSR).
 */
export { getRegisteredCss };

/**
 * Subscribe to changes in the registered CSS. Returns an unsubscribe function.
 * Compatible with `useSyncExternalStore`.
 */
export { subscribeRegisteredCss };

/**
 * Insert multiple CSS rules into the stylesheet.
 * Low-level API used internally and by packages like @typestyles/props.
 */
export { insertRules };

/**
 * Testing utilities for clearing the stylesheet and flushing pending rules.
 */
export { reset, flushSync, ensureDocumentStylesAttached };

/**
 * Join class name parts, filtering out falsy values.
 *
 * A lightweight utility for combining TypeStyles classes, external class
 * strings, and conditional expressions into a single `className` string.
 *
 * @example
 * ```ts
 * import { cx } from 'typestyles';
 *
 * cx(card('root'), isActive && 'active', externalClassName);
 * // => "card-root active my-external-class"
 * ```
 */
export { cx, mergeProps, combine };
export type { RecipeInput } from './binding';
