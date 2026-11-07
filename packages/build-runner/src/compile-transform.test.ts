import { describe, expect, it } from 'vite-plus/test';
import {
  indexPlans,
  isTransformableId,
  transformRecipeCalls as transformWithMap,
  type PlanIndex,
} from './compile-transform';
import type { ClientRecipePlan } from './index';

const btn: ClientRecipePlan = {
  kind: 'attrs',
  namespace: 'btn',
  base: 'ui-btn',
  dimensions: { tone: ['a', 'b'] },
  defaults: { tone: 'a' },
};
const card: ClientRecipePlan = {
  kind: 'multi-slot',
  namespace: 'card',
  slots: { root: 'ui-card' },
};

const transformRecipeCalls = (code: string, plans: PlanIndex) =>
  transformWithMap(code, plans)?.code ?? null;

describe('transformRecipeCalls', () => {
  const plans = indexPlans([btn, card]);

  it('replaces member and bare recipe calls and imports the lite runtime', () => {
    const out = transformRecipeCalls(
      `const a = typestyles.recipe({ name: 'btn', styles: () => ({}) });
const b = recipe({ name: "card", slots: ['root'] });`,
      plans,
    );
    expect(out).toContain(
      `import { createAttrsRecipeFromPlan as __tsAttrsRecipe } from "typestyles/lite";`,
    );
    expect(out).toContain(`const a = __tsAttrsRecipe(${JSON.stringify(btn)});`);
    expect(out).toContain(`const b = __tsAttrsRecipe(${JSON.stringify(card)});`);
    expect(out).not.toContain('styles: () =>');
  });

  it('leaves unknown names, ambiguous names, dynamic names and other shapes alone', () => {
    const ambiguous = indexPlans([btn, btn]);
    expect(transformRecipeCalls(`recipe({ name: 'other' })`, plans)).toBeNull();
    expect(transformRecipeCalls(`recipe({ name: 'btn' })`, ambiguous)).toBeNull();
    expect(transformRecipeCalls(`recipe({ name: NAME })`, plans)).toBeNull();
    expect(transformRecipeCalls(`recipe('btn')`, plans)).toBeNull();
    expect(transformRecipeCalls(`recipe({ name: 'btn' }, extra)`, plans)).toBeNull();
    expect(transformRecipeCalls(`const recipe = 1; recipe + 1`, plans)).toBeNull();
  });

  it('returns null for code that is not plain JS', () => {
    expect(transformRecipeCalls(`const x: number = recipe({ name: 'btn' });`, plans)).toBeNull();
  });

  it('does nothing to a recipe call without plans', () => {
    expect(transformRecipeCalls(`recipe({ name: 'btn' })`, indexPlans([]))).toBeNull();
  });

  it('marks style factories imported from typestyles pure so an unused instance can be dropped', () => {
    const out = transformRecipeCalls(
      `import { createTypeStyles, createTokens as tokens } from 'typestyles';\n` +
        `export const ts = createTypeStyles({ scopeId: 'a' });\nconst t = tokens();`,
      indexPlans([]),
    );
    expect(out).toBe(
      `import { createTypeStyles, createTokens as tokens } from 'typestyles';\n` +
        `export const ts = /* @__PURE__ */ createTypeStyles({ scopeId: 'a' });\nconst t = /* @__PURE__ */ tokens();`,
    );
    expect(out).not.toContain('typestyles/lite');
  });

  it('does not mark same-named functions from elsewhere pure', () => {
    expect(
      transformRecipeCalls(
        `import { createTokens } from './my-store';\ncreateTokens(theme);\nfunction createStyles() {}\ncreateStyles();`,
        indexPlans([]),
      ),
    ).toBeNull();
  });

  it('leaves calls alone when a spread or a second `name` key could change the runtime name', () => {
    expect(transformRecipeCalls(`recipe({ name: 'btn', ...overrides })`, plans)).toBeNull();
    expect(transformRecipeCalls(`recipe({ ...base, name: 'btn' })`, plans)).toBeNull();
    expect(transformRecipeCalls(`recipe({ name: 'btn', name: 'card' })`, plans)).toBeNull();
    expect(transformRecipeCalls(`recipe({ name: 'btn', [key]: 1 })`, plans)).toBeNull();
  });

  it('treats a name with an unplanned recipe as ambiguous', () => {
    const withUnplanned = indexPlans([btn, { kind: 'unplanned', namespace: 'btn' }]);
    expect(transformRecipeCalls(`recipe({ name: 'btn' })`, withUnplanned)).toBeNull();
    expect(
      transformRecipeCalls(
        `recipe({ name: 'btn' })`,
        indexPlans([{ kind: 'unplanned', namespace: 'btn' }]),
      ),
    ).toBeNull();
  });

  it('returns a source map that points rewritten code back at the input', () => {
    const input = `const a = 1;\nconst b = recipe({ name: 'btn', styles: {} });\nconst c = 2;\n`;
    const result = transformWithMap(input, plans, undefined, 'src/btn.js');
    expect(result).not.toBeNull();
    expect(result!.map.sources).toEqual(['src/btn.js']);
    expect(result!.map.sourcesContent).toEqual([input]);
    // One import line is prepended, so the input's three lines map to output lines 2–4.
    expect(result!.map.mappings.split(';')[0]).toBe('');
  });
});

describe('isTransformableId', () => {
  it('accepts js-family files and rejects virtual modules and assets', () => {
    expect(isTransformableId('/a/b.mjs')).toBe(true);
    expect(isTransformableId('/a/b.tsx?v=1')).toBe(true);
    expect(isTransformableId('\0virtual:x.js')).toBe(false);
    expect(isTransformableId('/a/b.css')).toBe(false);
  });
});
