/**
 * `typestyles/lite` — runtime for compile-time-transformed zero-runtime builds.
 *
 * Contains only what a *call* of a recipe needs. The bundler plugin replaces
 * `recipe({ ... })` definitions with `createAttrsRecipeFromPlan(plan)`, where
 * `plan` was recorded while the real runtime executed during extraction.
 */
export { createAttrsRecipeFromPlan } from './attrs-runtime';
export type { AttrsRecipePlan } from './attrs-runtime';
