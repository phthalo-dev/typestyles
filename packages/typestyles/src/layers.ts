import { stableSerialize, hashString } from './class-naming';
import { registerCascadeLayerOrder } from '#sheet';

/**
 * Declare cascade layer order and optionally prepend framework layer names
 * (e.g. Bootstrap) so TypeStyles participates in the same ordering graph.
 */
export type CascadeLayersObjectInput = {
  readonly order: readonly string[];
  readonly prependFrameworkLayers?: readonly string[];
};

/** Argument to `createStyles` / `createTokens` / `createTypeStyles` when enabling `@layer`. */
export type CascadeLayersInput = readonly string[] | CascadeLayersObjectInput;

/** Normalized cascade layer stack for runtime CSS emission. */
export type ResolvedCascadeLayers = {
  /** Dedup key for the `@layer a, b, c;` preamble. */
  readonly preambleKey: string;
  /** Full `@layer …;` order statement (prepend + own layers). */
  readonly preambleCss: string;
  /** Layers TypeStyles may emit into (excludes `prependFrameworkLayers`). */
  readonly ownOrder: readonly string[];
  /** Full ordering passed to the preamble. */
  readonly fullOrder: readonly string[];
};

export function resolveCascadeLayers(
  input: CascadeLayersInput,
  scopeId: string | undefined,
): ResolvedCascadeLayers {
  let prepend: string[];
  let own: string[];
  if (Array.isArray(input)) {
    prepend = [];
    own = input.map((s: string) => String(s).trim());
  } else {
    const obj = input as CascadeLayersObjectInput;
    prepend = [...(obj.prependFrameworkLayers ?? [])];
    own = obj.order.map((s: string) => String(s).trim());
  }

  if (own.length === 0) {
    throw new Error(
      '[typestyles] `layers` must contain at least one layer name when cascade layers are enabled.',
    );
  }

  const seen = new Set<string>();
  for (const name of own) {
    if (!name) {
      throw new Error('[typestyles] Layer names in `layers` must be non-empty strings.');
    }
    if (seen.has(name)) {
      throw new Error(`[typestyles] Duplicate layer name "${name}" in \`layers\`.`);
    }
    seen.add(name);
  }

  const fullOrder = [...prepend, ...own];
  const preambleCss = `@layer ${fullOrder.join(', ')};`;
  const preambleKey = hashString(stableSerialize({ scope: scopeId ?? '', order: fullOrder }));

  return {
    preambleKey,
    preambleCss,
    ownOrder: own,
    fullOrder,
  };
}

export function assertOwnLayer(stack: ResolvedCascadeLayers, layer: string, context: string): void {
  if (!stack.ownOrder.includes(layer)) {
    throw new Error(
      `[typestyles] Invalid \`layer: "${layer}"\` for ${context}. ` +
        `Expected one of: ${stack.ownOrder.map((l) => `"${l}"`).join(', ')}.`,
    );
  }
}

/**
 * Wrap serialized rules in `@layer { … }` and ensure the order preamble is registered once.
 */
export function applyLayerToRules(
  rules: Array<{ key: string; css: string }>,
  layer: string,
  stack: ResolvedCascadeLayers,
): Array<{ key: string; css: string }> {
  registerCascadeLayerOrder(stack.preambleKey, stack.preambleCss);
  return rules.map((r) => ({
    key: `layer:${layer}:${r.key}`,
    css: `@layer ${layer} {\n${r.css}\n}`,
  }));
}

export function applyLayerToRule(
  key: string,
  css: string,
  layer: string,
  stack: ResolvedCascadeLayers,
): Array<{ key: string; css: string }> {
  return applyLayerToRules([{ key, css }], layer, stack);
}
