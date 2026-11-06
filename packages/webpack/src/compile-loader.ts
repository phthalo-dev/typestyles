import type { LoaderContext } from 'webpack';
import {
  indexPlans,
  isTransformableId,
  transformRecipeCalls,
  type ClientRecipePlan,
  type PlanIndex,
} from '@typestyles/build-runner';

export interface CompileLoaderOptions {
  /** Resolves the plans recorded by the (single) extraction run of the current compilation. */
  getPlans: () => Promise<readonly ClientRecipePlan[]>;
}

const indexCache = new WeakMap<readonly ClientRecipePlan[], PlanIndex>();

/**
 * Post loader (runs after TypeScript/Babel/etc.): replace `recipe()` definitions that have a
 * recorded plan with `createAttrsRecipeFromPlan(<plan>)`. Modules that can't be parsed as plain JS
 * are passed through untouched.
 */
export default function typestylesCompileLoader(
  this: LoaderContext<CompileLoaderOptions>,
  source: string,
): void {
  const callback = this.async();
  if (!isTransformableId(this.resourcePath)) {
    callback(null, source);
    return;
  }
  const { getPlans } = this.getOptions();
  getPlans().then(
    (plans) => {
      let index = indexCache.get(plans);
      if (!index) {
        index = indexPlans(plans);
        indexCache.set(plans, index);
      }
      callback(null, transformRecipeCalls(source, index) ?? source);
    },
    (error: unknown) => callback(error instanceof Error ? error : new Error(String(error))),
  );
}
