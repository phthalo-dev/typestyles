export type ClassSourceInfo = {
  /** `path:line` of the call that registered this class, if captured. */
  source?: string;
  /** Logical namespace (recipe name or class name) when it can be inferred. */
  namespace?: string;
  /** Every registered CSS rule whose selector includes this class. */
  css: string[];
};

export type SheetState = {
  insertedRules: Set<string>;
  ruleCssByKey: Map<string, string>;
  pendingRules: string[];
  allRules: string[];
  flushScheduled: boolean;
  ssrBuffer: string[] | null;
  /** Rule CSS → `path:line`; only filled when source comments are enabled. */
  sourceByCss: Map<string, string>;
  /** Class name → aggregated debug info; only filled when dev inspect is enabled. */
  sourceByClassName: Map<string, ClassSourceInfo>;
};

export function createSheetState(): SheetState {
  return {
    insertedRules: new Set(),
    ruleCssByKey: new Map(),
    pendingRules: [],
    allRules: [],
    flushScheduled: false,
    ssrBuffer: null,
    sourceByCss: new Map(),
    sourceByClassName: new Map(),
  };
}

export function resetSheetState(state: SheetState): void {
  state.insertedRules.clear();
  state.ruleCssByKey.clear();
  state.pendingRules = [];
  state.allRules.length = 0;
  state.flushScheduled = false;
  state.ssrBuffer = null;
  state.sourceByCss.clear();
  state.sourceByClassName.clear();
}

const globalSheetState = createSheetState();

let getStoreImpl: () => SheetState = () => globalSheetState;
let runIsolatedImpl: <T>(fn: () => T) => T = (fn) => fn();

/** Register Node AsyncLocalStorage isolation (see `sheet-node.ts`). */
export function configureSheetIsolation(config: {
  getStore: () => SheetState;
  runIsolated: <T>(fn: () => T) => T;
}): void {
  getStoreImpl = config.getStore;
  runIsolatedImpl = config.runIsolated;
}

export function getSheetState(): SheetState {
  return getStoreImpl();
}

export function getGlobalSheetState(): SheetState {
  return globalSheetState;
}

/** Run `fn` with a fresh sheet store on Node (no-op in the browser bundle). */
export function runWithIsolatedSheet<T>(fn: () => T): T {
  return runIsolatedImpl(fn);
}
