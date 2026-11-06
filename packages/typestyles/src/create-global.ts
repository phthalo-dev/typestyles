import type { CSSProperties, FontFaceProps } from './types';
import { serializeStyle } from './serialize-style';
import { insertRules } from '#sheet';
import type { CascadeLayersInput } from './layers';
import {
  applyLayerToRules,
  assertOwnLayer,
  resolveCascadeLayers,
  type ResolvedCascadeLayers,
} from './layers';
import { globalFontFace } from './global';
import type { GlobalStyleTuple } from './global-style-tuple';
import { parseGlobalStyleArgs } from './global-style-tuple';
import { resolveBreakpoints, type BreakpointsConfig } from './breakpoints';
import type { BreakpointMap } from './breakpoints';

type CreateGlobalOptions = {
  /**
   * Prefixes inserted rule keys so globals from different bundles dedupe independently.
   * Within one scope, each `selector` (+ optional `layer`) maps to a single rule: a second
   * `global.rule('body', …)` with different properties is ignored; non-production builds warn.
   */
  scopeId?: string;
  /** Same breakpoint map as `createTypeStyles({ breakpoints })` for responsive global styles. */
  breakpoints?: BreakpointsConfig;
};

type CreateGlobalWithLayers = CreateGlobalOptions & {
  layers: CascadeLayersInput;
  /**
   * Default `@layer` for `rule()` / `rules()` when the call (or recipe tuple) omits `{ layer }`.
   * Must be one of the stack’s own layer names (not a prepended framework layer).
   */
  globalLayer?: string;
};

export type GlobalApiUnlayered = {
  readonly cascadeLayers: undefined;
  /** Insert rules for a single CSS selector. */
  rule(selector: string, properties: CSSProperties, options?: { layer?: string }): void;
  /** Insert rules for many selectors in one call (shared optional `{ layer }`). */
  rules(styles: Record<string, CSSProperties>, options?: { layer?: string }): void;
  /** Apply multiple `typestyles/globals` recipe tuples. */
  apply(...tuples: GlobalStyleTuple[]): void;
  fontFace(family: string, props: FontFaceProps): void;
};

export type GlobalApiLayered = {
  readonly cascadeLayers: ResolvedCascadeLayers;
  rule(selector: string, properties: CSSProperties, options?: { layer?: string }): void;
  rules(styles: Record<string, CSSProperties>, options?: { layer?: string }): void;
  apply(...tuples: GlobalStyleTuple[]): void;
  fontFace(family: string, props: FontFaceProps): void;
};

export function createGlobal(options?: CreateGlobalOptions): GlobalApiUnlayered;

export function createGlobal(options: CreateGlobalWithLayers): GlobalApiLayered;

export function createGlobal(
  options?: CreateGlobalOptions | CreateGlobalWithLayers,
): GlobalApiUnlayered | GlobalApiLayered {
  const scopeId = options?.scopeId;
  const scopePrefix = scopeId != null && scopeId !== '' ? `g:${scopeId}:` : '';
  const breakpoints: BreakpointMap | undefined = resolveBreakpoints(options?.breakpoints);
  const layersOpt = options && 'layers' in options ? options.layers : undefined;
  const globalLayerDefault =
    options && 'layers' in options && 'globalLayer' in options ? options.globalLayer : undefined;

  const stack = layersOpt != null ? resolveCascadeLayers(layersOpt, scopeId) : undefined;

  if (stack && globalLayerDefault != null && globalLayerDefault !== '') {
    assertOwnLayer(stack, globalLayerDefault, 'createGlobal({ globalLayer })');
  }

  const rule = (selector: string, properties: CSSProperties, opts?: { layer?: string }): void => {
    const rulesCss = serializeStyle(selector, properties, { breakpoints }).map((r) => ({
      ...r,
      key: scopePrefix + r.key,
    }));

    if (stack) {
      const layer = opts?.layer ?? globalLayerDefault;
      if (layer == null || layer === '') {
        throw new Error(
          '[typestyles] `global.rule(..., { layer })` (or factory `layers.global`) is required when using cascade layers without a default global layer.',
        );
      }
      assertOwnLayer(stack, layer, `global.rule('${selector}', …)`);
      insertRules(applyLayerToRules(rulesCss, layer, stack));
      return;
    }

    if (process.env.NODE_ENV !== 'production' && opts?.layer != null) {
      console.warn(
        '[typestyles] `layer` in `global.rule(..., { layer })` is ignored when cascade layers were not configured.',
      );
    }
    insertRules(rulesCss);
  };

  const rules = (styles: Record<string, CSSProperties>, opts?: { layer?: string }): void => {
    for (const [selector, properties] of Object.entries(styles)) {
      rule(selector, properties, opts);
    }
  };

  const apply = (...tuples: GlobalStyleTuple[]): void => {
    for (const t of tuples) {
      const parsed = parseGlobalStyleArgs(t);
      rule(parsed.selector, parsed.properties, parsed.options);
    }
  };

  return {
    cascadeLayers: stack,
    rule,
    rules,
    apply,
    fontFace: globalFontFace,
  } as GlobalApiUnlayered | GlobalApiLayered;
}
