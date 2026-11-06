import { describe, expect, it } from 'vite-plus/test';
import { indexPlans, isTransformableId, transformRecipeCalls } from './compile-transform';
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

  it('marks style factories pure so an unused instance can be dropped', () => {
    const out = transformRecipeCalls(
      `export const ts = createTypeStyles({ scopeId: 'a' });\nconst t = createTokens();`,
      indexPlans([]),
    );
    expect(out).toBe(
      `export const ts = /* @__PURE__ */ createTypeStyles({ scopeId: 'a' });\nconst t = /* @__PURE__ */ createTokens();`,
    );
    expect(out).not.toContain('typestyles/lite');
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
