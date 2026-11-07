import type { LoaderContext } from 'webpack';
import {
  chainSourceMap,
  indexPlans,
  isTransformableId,
  mayNeedRecompile,
  transformRecipeCalls,
  type ClientPlanEntry,
  type PlanIndex,
} from '@typestyles/build-runner';

export interface CompileLoaderOptions {
  /** Resolves the plans recorded by the (single) extraction run of the current compilation. */
  getPlans: () => Promise<readonly ClientPlanEntry[]>;
}

const indexCache = new WeakMap<readonly ClientPlanEntry[], PlanIndex>();

/**
 * Post loader (runs after TypeScript/Babel/etc.): replace `recipe()` definitions that have a
 * recorded plan with `createAttrsRecipeFromPlan(<plan>)`. Modules that can't be parsed as plain JS
 * are passed through untouched.
 */
export default function typestylesCompileLoader(
  this: LoaderContext<CompileLoaderOptions>,
  source: string,
  inputMap?: unknown,
): void {
  const callback = this.async();
  if (!isTransformableId(this.resourcePath) || !mayNeedRecompile(source)) {
    callback(null, source, inputMap as never);
    return;
  }
  // The inlined plan depends on other modules (tokens, config) and on this compilation's
  // extraction run, not just this file: never reuse a cached result (memory or filesystem cache).
  this.cacheable(false);
  const { getPlans } = this.getOptions();
  getPlans().then(
    (plans) => {
      let index = indexCache.get(plans);
      if (!index) {
        index = indexPlans(plans);
        indexCache.set(plans, index);
      }
      const result = transformRecipeCalls(source, index, undefined, this.resourcePath);
      if (!result) {
        callback(null, source, inputMap as never);
        return;
      }
      callback(
        null,
        result.code,
        this.sourceMap ? (chainSourceMap(result.map, inputMap) as never) : undefined,
      );
    },
    (error: unknown) => callback(error instanceof Error ? error : new Error(String(error))),
  );
}
