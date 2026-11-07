import { parse as acornParse } from 'acorn';
import remapping from '@jridgewell/remapping';
import MagicString, { type SourceMap } from 'magic-string';
import type { ClientPlanEntry, ClientRecipePlan } from './index';

/** Specifier the transform imports the lite runtime from. */
export const LITE_SPECIFIER = 'typestyles/lite';
const LITE_BINDING = '__tsAttrsRecipe';

/** Minimal ESTree shape the transform touches. */
interface AstNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

/** Parses a JS module into an ESTree AST (Rollup's `this.parse` fits). */
export type ParseFn = (code: string) => unknown;

/** Default parser: acorn, latest ECMAScript, ESM. JSX/TS are not handled. */
export const parseModule: ParseFn = (code) =>
  acornParse(code, { ecmaVersion: 'latest', sourceType: 'module' });

/**
 * Plans keyed by recipe `name`. A name recorded more than once (two scopes
 * with the same recipe name) maps to `null`: it can't be matched safely from
 * source alone, so such calls keep the runtime.
 */
export type PlanIndex = Map<string, ClientRecipePlan | null>;

export function indexPlans(plans: readonly ClientPlanEntry[]): PlanIndex {
  const index: PlanIndex = new Map();
  for (const plan of plans) {
    // An `unplanned` recipe still owns its name: a same-named plan from another scope must not
    // be handed to its call site.
    const usable = plan.kind === 'unplanned' ? null : plan;
    index.set(plan.namespace, index.has(plan.namespace) ? null : usable);
  }
  return index;
}

/**
 * Factories whose calls only register styles; their result is droppable when unused. Only calls
 * of bindings imported from `typestyles` (or a `typestyles/*` entry) are annotated.
 */
const PURE_FACTORIES = new Set([
  'createTypeStyles',
  'createStyles',
  'createTokens',
  'createGlobal',
]);

/** Cheap pre-filter so unrelated modules skip parsing. */
export function mightContainRecipeCalls(code: string): boolean {
  return /\b(?:recipe|createTypeStyles|createStyles|createTokens|createGlobal)\s*\(/.test(code);
}

/** Package specifiers whose factory exports are annotated `@__PURE__`. */
const TYPESTYLES_SOURCE = /^typestyles(?:\/|$)/;

/**
 * Whether a cached transform result of this module may be stale once plans change: it had (or
 * still has) calls the transform rewrites. Use for Rollup's `shouldTransformCachedModule`.
 */
export function mayNeedRecompile(code: string): boolean {
  return mightContainRecipeCalls(code) || code.includes(LITE_SPECIFIER);
}

/** True for module ids the transform should look at (plain JS-family files). */
export function isTransformableId(id: string): boolean {
  return /\.(?:[cm]?[jt]sx?)(?:\?|$)/.test(id) && !id.includes('\0');
}

/** Rewritten code plus a hires source map from the input code. */
export interface CompileTransformResult {
  code: string;
  map: SourceMap;
}

/**
 * Replace `recipe({ name: '<literal>', ... })` / `x.recipe({ ... })` calls that
 * have a recorded plan with `createAttrsRecipeFromPlan(<plan>)`, importing the
 * lite runtime. Returns `null` when nothing changed (or the code can't be
 * parsed as plain JS — e.g. TypeScript that hasn't been transformed yet).
 */
export function transformRecipeCalls(
  code: string,
  plans: PlanIndex,
  parse: ParseFn = parseModule,
  id?: string,
): CompileTransformResult | null {
  if (!mightContainRecipeCalls(code)) return null;

  let ast: AstNode;
  try {
    ast = parse(code) as AstNode;
  } catch {
    return null;
  }

  const pureLocals = typestylesFactoryLocals(ast);
  const out = new MagicString(code);
  let replaced = false;
  let changed = false;
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const n = node as AstNode;
    if (typeof n.type !== 'string') return;
    if (n.type === 'CallExpression') {
      const plan = planForCall(n, plans);
      if (plan) {
        out.overwrite(n.start, n.end, `${LITE_BINDING}(${JSON.stringify(plan)})`);
        replaced = changed = true;
        return; // the replaced subtree is gone; don't descend.
      }
      if (isPureFactoryCall(n, pureLocals)) {
        // In a zero-runtime client bundle, registering styles is a no-op (the CSS ships as a
        // file), so an instance nothing reads can be dropped: tell the bundler.
        out.appendLeft(n.start, '/* @__PURE__ */ ');
        changed = true;
      }
    }
    for (const key of Object.keys(n)) {
      if (key === 'type' || key === 'start' || key === 'end') continue;
      visit(n[key]);
    }
  };
  visit(ast);

  if (!changed) return null;
  if (replaced) {
    out.prepend(
      `import { createAttrsRecipeFromPlan as ${LITE_BINDING} } from ${JSON.stringify(LITE_SPECIFIER)};\n`,
    );
  }
  return {
    code: out.toString(),
    map: out.generateMap({ hires: true, includeContent: true, ...(id ? { source: id } : {}) }),
  };
}

/** Local names bound to typestyles' style factories by `import { … } from 'typestyles…'`. */
function typestylesFactoryLocals(program: AstNode): Set<string> {
  const locals = new Set<string>();
  for (const statement of (program.body as AstNode[] | undefined) ?? []) {
    if (statement.type !== 'ImportDeclaration') continue;
    const source = (statement.source as AstNode).value;
    if (typeof source !== 'string' || !TYPESTYLES_SOURCE.test(source)) continue;
    for (const specifier of statement.specifiers as AstNode[]) {
      if (specifier.type !== 'ImportSpecifier') continue;
      const imported = specifier.imported as AstNode;
      const importedName = imported.type === 'Identifier' ? imported.name : imported.value;
      if (typeof importedName === 'string' && PURE_FACTORIES.has(importedName)) {
        locals.add((specifier.local as AstNode).name as string);
      }
    }
  }
  return locals;
}

function isPureFactoryCall(call: AstNode, pureLocals: Set<string>): boolean {
  const callee = call.callee as AstNode;
  return callee.type === 'Identifier' && pureLocals.has(callee.name as string);
}

/**
 * `recipe({ name: '<literal>', ... })` or `x.recipe({ ... })` with a known, unambiguous plan.
 * Gives up when the runtime `name` could differ from the literal: a spread, a computed key, or
 * more than one `name` key.
 */
function planForCall(call: AstNode, plans: PlanIndex): ClientRecipePlan | null {
  const callee = call.callee as AstNode;
  const calleeName =
    callee.type === 'Identifier'
      ? (callee.name as string)
      : callee.type === 'MemberExpression' && !callee.computed
        ? ((callee.property as AstNode).name as string | undefined)
        : undefined;
  if (calleeName !== 'recipe') return null;

  const args = call.arguments as AstNode[];
  const first = args[0];
  if (args.length !== 1 || !first || first.type !== 'ObjectExpression') return null;

  let name: string | null = null;
  for (const prop of first.properties as AstNode[]) {
    if (prop.type !== 'Property' || prop.computed) return null;
    const key = prop.key as AstNode;
    const keyName =
      key.type === 'Identifier' ? key.name : key.type === 'Literal' ? key.value : null;
    if (keyName !== 'name') continue;
    if (name !== null) return null;
    const value = prop.value as AstNode;
    if (value.type !== 'Literal' || typeof value.value !== 'string') return null;
    name = value.value;
  }
  return name === null ? null : (plans.get(name) ?? null);
}

/**
 * Chain the transform's map onto the map of the code it was given (from an earlier loader or
 * compile step), so the result maps back to the original source. Without a previous map the
 * transform's own map is returned.
 */
export function chainSourceMap(map: SourceMap, previous: unknown): object {
  if (!previous) return map;
  const prev = typeof previous === 'string' ? JSON.parse(previous) : previous;
  return remapping([map as never, prev as never], () => null);
}
