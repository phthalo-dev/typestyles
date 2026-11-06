import { parse as acornParse } from 'acorn';
import type { ClientRecipePlan } from './index';

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

export function indexPlans(plans: readonly ClientRecipePlan[]): PlanIndex {
  const index: PlanIndex = new Map();
  for (const plan of plans) {
    index.set(plan.namespace, index.has(plan.namespace) ? null : plan);
  }
  return index;
}

/** Factories whose calls only register styles; their result is droppable when unused. */
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

/** True for module ids the transform should look at (plain JS-family files). */
export function isTransformableId(id: string): boolean {
  return /\.(?:[cm]?[jt]sx?)(?:\?|$)/.test(id) && !id.includes('\0');
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
): string | null {
  if (!mightContainRecipeCalls(code)) return null;

  let ast: AstNode;
  try {
    ast = parse(code) as AstNode;
  } catch {
    return null;
  }

  const edits: Array<{ start: number; end: number; text: string; plan?: boolean }> = [];
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
        edits.push({
          start: n.start,
          end: n.end,
          text: `${LITE_BINDING}(${JSON.stringify(plan)})`,
          plan: true,
        });
        return; // the replaced subtree is gone; don't descend.
      }
      if (isPureFactoryCall(n)) {
        // In a zero-runtime client bundle, registering styles is a no-op (the CSS ships as a
        // file), so an instance nothing reads can be dropped: tell the bundler.
        edits.push({ start: n.start, end: n.start, text: '/* @__PURE__ */ ' });
      }
    }
    for (const key of Object.keys(n)) {
      if (key === 'type' || key === 'start' || key === 'end') continue;
      visit(n[key]);
    }
  };
  visit(ast);

  if (edits.length === 0) return null;
  let out = code;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  }
  if (!edits.some((e) => e.plan)) return out;
  return `import { createAttrsRecipeFromPlan as ${LITE_BINDING} } from ${JSON.stringify(LITE_SPECIFIER)};\n${out}`;
}

function isPureFactoryCall(call: AstNode): boolean {
  const callee = call.callee as AstNode;
  return callee.type === 'Identifier' && PURE_FACTORIES.has(callee.name as string);
}

/** `recipe({ name: '<literal>', ... })` or `x.recipe({ ... })` with a known, unambiguous plan. */
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

  for (const prop of first.properties as AstNode[]) {
    if (prop.type !== 'Property' || prop.computed) continue;
    const key = prop.key as AstNode;
    const keyName =
      key.type === 'Identifier' ? key.name : key.type === 'Literal' ? key.value : null;
    if (keyName !== 'name') continue;
    const value = prop.value as AstNode;
    if (value.type !== 'Literal' || typeof value.value !== 'string') return null;
    return plans.get(value.value) ?? null;
  }
  return null;
}
