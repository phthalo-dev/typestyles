import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import fg from 'fast-glob';

/** Mirrors `sanitizeClassSegment` in `typestyles` class naming. */
function sanitizeClassSegment(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
  return normalized.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'style';
}

const RESERVED_COMPONENT_KEYS = new Set([
  'base',
  'variants',
  'compoundVariants',
  'defaultVariants',
  'slots',
]);

export const PUBLIC_CLASSNAMES_SNAPSHOT = '.typestyles-public-classnames.json';

export type PublicClassNameEntry = {
  className: string;
  kind: 'class' | 'component';
  namespace: string;
  suffix?: string;
  file: string;
  line: number;
};

export type PublicClassNamesSnapshot = {
  version: 1;
  classNames: string[];
  entries: PublicClassNameEntry[];
};

export type StylesBindingConfig = {
  mode: 'semantic' | 'hashed' | 'compact' | 'atomic' | 'attribute' | 'bem' | 'template';
  scopeId: string;
};

export type CollectPublicClassNamesOptions = {
  /** Project root for resolving snapshot paths and globs */
  rootDir?: string;
  /** Glob patterns relative to rootDir */
  include?: string[];
  /** Glob patterns to exclude */
  exclude?: string[];
};

const DEFAULT_INCLUDE = ['**/*.{ts,tsx}'];
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/*.d.ts',
  '**/*.test.{ts,tsx}',
  '**/*.spec.{ts,tsx}',
];

function semanticScopePrefix(scopeId: string): string {
  if (!scopeId.trim()) return '';
  return `${sanitizeClassSegment(scopeId)}-`;
}

export function semanticClassName(
  config: StylesBindingConfig,
  namespace: string,
  suffix?: string,
): string | null {
  if (
    config.mode === 'hashed' ||
    config.mode === 'compact' ||
    config.mode === 'atomic' ||
    config.mode === 'template'
  ) {
    return null;
  }
  const prefix = semanticScopePrefix(config.scopeId);
  if (suffix === undefined || suffix === 'base') return `${prefix}${namespace}`;
  // Dimensioned attribute variants are data-* only; the helper cannot tell flat
  // modifiers from option names — prefer `componentClassName` / collect for that.
  if (config.mode === 'attribute') return `${prefix}${namespace}`;
  if (config.mode === 'bem') return `${prefix}${namespace}--${suffix}`;
  return `${prefix}${namespace}--${suffix}`;
}

function getStaticObjectKey(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name)) return name.text;
  return null;
}

function firstStringArg(args: ts.NodeArray<ts.Expression>): string | null {
  const first = args[0];
  if (!first || !ts.isStringLiteral(first)) return null;
  return first.text;
}

function unwrapExpression(expr: ts.Expression): ts.Expression {
  let current = expr;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function objectExpressionFromConfigArg(
  arg: ts.Expression | undefined,
): ts.ObjectLiteralExpression | null {
  if (!arg) return null;
  const expr = unwrapExpression(arg);
  if (ts.isObjectLiteralExpression(expr)) return expr;
  if (ts.isArrowFunction(expr)) {
    if (ts.isBlock(expr.body)) {
      for (const stmt of expr.body.statements) {
        if (
          ts.isReturnStatement(stmt) &&
          stmt.expression &&
          ts.isObjectLiteralExpression(unwrapExpression(stmt.expression))
        ) {
          return unwrapExpression(stmt.expression) as ts.ObjectLiteralExpression;
        }
      }
    } else {
      // `() => ({ ... })` wraps the object in parentheses.
      const body = unwrapExpression(expr.body);
      if (ts.isObjectLiteralExpression(body)) return body;
    }
  }
  return null;
}

function literalFromProperty(obj: ts.ObjectLiteralExpression, key: string): string | null {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const propKey = getStaticObjectKey(prop.name);
    if (propKey !== key) continue;
    const init = unwrapExpression(prop.initializer);
    if (ts.isStringLiteral(init)) return init.text;
    if (ts.isNoSubstitutionTemplateLiteral(init)) return init.text;
  }
  return null;
}

function hasObjectKey(obj: ts.ObjectLiteralExpression, key: string): boolean {
  return obj.properties.some((prop) => {
    if (!ts.isPropertyAssignment(prop)) return false;
    return getStaticObjectKey(prop.name) === key;
  });
}

/** Read the `slots` array literal from an object, if present. */
function slotsArrayFromObject(obj: ts.ObjectLiteralExpression): ts.ArrayLiteralExpression | null {
  const slotsProp = obj.properties.find((prop) => {
    if (!ts.isPropertyAssignment(prop)) return false;
    return getStaticObjectKey(prop.name) === 'slots';
  });
  if (!slotsProp || !ts.isPropertyAssignment(slotsProp)) return null;
  const init = unwrapExpression(slotsProp.initializer);
  return ts.isArrayLiteralExpression(init) ? init : null;
}

/**
 * A schema-first recipe call: `recipe(namespace, definition, callback, options?)`.
 *
 * The style config is the third argument (the callback); the second is a definition
 * `{ slots?, variants }` whose axes are branded `variant.enum(...)` / `variant.boolean(...)`
 * values rather than style objects. In the legacy shapes the third argument is an options
 * object (`{ layer }`), never a function, so a function there is an unambiguous tell.
 */
function isSchemaRecipeCall(node: ts.CallExpression): boolean {
  if (node.arguments.length < 3) return false;
  const callback = node.arguments[2];
  if (!callback) return false;
  const unwrapped = unwrapExpression(callback);
  return ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped);
}

function propertyInit(obj: ts.ObjectLiteralExpression, key: string): ts.Expression | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (getStaticObjectKey(prop.name) === key) return prop.initializer;
  }
  return undefined;
}

/**
 * `recipe({ name, slots?, styles })` or the removed positional
 * `recipe(name, config | definition, callback?)`.
 */
function recipeInputFromCall(node: ts.CallExpression): {
  namespace: string;
  styles: ts.ObjectLiteralExpression | null;
  slots: ts.ArrayLiteralExpression | null;
} | null {
  const first = node.arguments[0];
  if (!first) return null;
  const unwrapped = unwrapExpression(first);
  if (ts.isObjectLiteralExpression(unwrapped)) {
    const namespace = literalFromProperty(unwrapped, 'name');
    if (!namespace) return null;
    return {
      namespace,
      styles: objectExpressionFromConfigArg(propertyInit(unwrapped, 'styles')),
      slots: slotsArrayFromObject(unwrapped),
    };
  }
  return null;
}

/** Slots declared on a schema recipe's definition argument, if any. */
function definitionSlots(arg: ts.Expression | undefined): ts.ArrayLiteralExpression | null {
  if (!arg) return null;
  const def = unwrapExpression(arg);
  if (!ts.isObjectLiteralExpression(def)) return null;
  return slotsArrayFromObject(def);
}

type ComponentClassNamePart = {
  suffix?: string;
  element?: string;
  dimension?: string;
  modifier?: string;
};

function collectClassNamePartsFromConfig(
  obj: ts.ObjectLiteralExpression,
  slotsOverride?: ts.ArrayLiteralExpression | null,
): ComponentClassNamePart[] {
  const parts: ComponentClassNamePart[] = [];

  const hasVariants = hasObjectKey(obj, 'variants');
  const hasCompound = hasObjectKey(obj, 'compoundVariants');
  const hasDefaults = hasObjectKey(obj, 'defaultVariants');
  // Schema-first recipes carry `slots` on the definition (second call argument), not on
  // the callback's returned config, so the caller passes it in.
  const slotsNode = slotsOverride ?? slotsArrayFromObject(obj);
  const hasSlots = slotsNode !== null;

  if (hasSlots && (hasVariants || hasCompound || hasDefaults)) {
    const baseObj = obj.properties.find((prop) => {
      if (!ts.isPropertyAssignment(prop)) return false;
      return getStaticObjectKey(prop.name) === 'base';
    });
    if (
      baseObj &&
      ts.isPropertyAssignment(baseObj) &&
      ts.isObjectLiteralExpression(baseObj.initializer)
    ) {
      for (const slotProp of baseObj.initializer.properties) {
        if (!ts.isPropertyAssignment(slotProp)) continue;
        const slot = getStaticObjectKey(slotProp.name);
        if (slot) parts.push({ element: slot === 'root' ? undefined : slot });
      }
    }

    const variantsProp = obj.properties.find((prop) => {
      if (!ts.isPropertyAssignment(prop)) return false;
      return getStaticObjectKey(prop.name) === 'variants';
    });
    if (
      variantsProp &&
      ts.isPropertyAssignment(variantsProp) &&
      ts.isObjectLiteralExpression(variantsProp.initializer)
    ) {
      for (const dimProp of variantsProp.initializer.properties) {
        if (
          !ts.isPropertyAssignment(dimProp) ||
          !ts.isObjectLiteralExpression(dimProp.initializer)
        ) {
          continue;
        }
        const dimension = getStaticObjectKey(dimProp.name);
        if (!dimension) continue;
        for (const optProp of dimProp.initializer.properties) {
          if (
            !ts.isPropertyAssignment(optProp) ||
            !ts.isObjectLiteralExpression(optProp.initializer)
          ) {
            continue;
          }
          const option = getStaticObjectKey(optProp.name);
          if (!option) continue;
          for (const slotProp of optProp.initializer.properties) {
            if (!ts.isPropertyAssignment(slotProp)) continue;
            const slot = getStaticObjectKey(slotProp.name);
            if (slot) {
              parts.push({
                element: slot === 'root' ? undefined : slot,
                dimension,
                modifier: option,
              });
            }
          }
        }
      }
    }

    return parts;
  }

  if (hasSlots && !hasVariants && !hasCompound && !hasDefaults) {
    // Slot class names come from the declared `slots` list. `styles.base` is the
    // slot style map, not a slot named "base".
    if (slotsNode) {
      for (const element of slotsNode.elements) {
        if (element && ts.isStringLiteral(element)) {
          parts.push({ element: element.text === 'root' ? undefined : element.text });
        }
      }
    }
    return parts;
  }

  if (hasVariants || hasCompound || hasDefaults) {
    parts.push({});

    const variantsProp = obj.properties.find((prop) => {
      if (!ts.isPropertyAssignment(prop)) return false;
      return getStaticObjectKey(prop.name) === 'variants';
    });
    if (
      variantsProp &&
      ts.isPropertyAssignment(variantsProp) &&
      ts.isObjectLiteralExpression(variantsProp.initializer)
    ) {
      for (const dimProp of variantsProp.initializer.properties) {
        if (
          !ts.isPropertyAssignment(dimProp) ||
          !ts.isObjectLiteralExpression(dimProp.initializer)
        ) {
          continue;
        }
        const dimension = getStaticObjectKey(dimProp.name);
        if (!dimension) continue;
        for (const optProp of dimProp.initializer.properties) {
          if (!ts.isPropertyAssignment(optProp)) continue;
          const option = getStaticObjectKey(optProp.name);
          if (option) parts.push({ dimension, modifier: option });
        }
      }
    }

    return parts;
  }

  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = getStaticObjectKey(prop.name);
    if (!key) continue;
    if (key === 'base') {
      parts.push({});
      continue;
    }
    if (RESERVED_COMPONENT_KEYS.has(key)) continue;
    parts.push({ modifier: key });
  }

  return parts;
}

function componentClassName(
  config: StylesBindingConfig,
  namespace: string,
  part: ComponentClassNamePart,
): string | null {
  if (
    config.mode === 'hashed' ||
    config.mode === 'compact' ||
    config.mode === 'atomic' ||
    config.mode === 'template'
  ) {
    return null;
  }

  const prefix = semanticScopePrefix(config.scopeId);
  const block = `${prefix}${namespace}${part.element ? `__${part.element}` : ''}`;
  if (!part.modifier) return block;
  // Dimensioned attribute variants compile to data-* attrs (no public class).
  // Flat attribute modifiers still emit `block--modifier` classes.
  if (config.mode === 'attribute' && part.dimension) return block;
  if (config.mode === 'bem') return `${block}--${part.modifier}`;
  return `${block}--${part.dimension ? `${part.dimension}-` : ''}${part.modifier}`;
}

function parseCreateStylesConfig(init: ts.Expression): StylesBindingConfig {
  const config: StylesBindingConfig = { mode: 'semantic', scopeId: '' };
  let expr = unwrapExpression(init);
  if (ts.isCallExpression(expr)) {
    const firstArg = expr.arguments[0];
    if (!firstArg) return config;
    expr = unwrapExpression(firstArg);
  }
  if (!ts.isObjectLiteralExpression(expr)) return config;

  const mode = literalFromProperty(expr, 'mode');
  if (
    mode === 'semantic' ||
    mode === 'hashed' ||
    mode === 'compact' ||
    mode === 'atomic' ||
    mode === 'attribute' ||
    mode === 'bem' ||
    mode === 'template'
  ) {
    config.mode = mode;
  }
  const scopeId = literalFromProperty(expr, 'scopeId');
  if (scopeId != null) config.scopeId = scopeId;
  return config;
}

function isCreateStylesCall(expr: ts.Expression): boolean {
  const unwrapped = unwrapExpression(expr);
  if (!ts.isCallExpression(unwrapped)) return false;
  const callee = unwrapped.expression;
  if (
    ts.isIdentifier(callee) &&
    (callee.text === 'createStyles' || callee.text === 'createTypeStyles')
  ) {
    return true;
  }
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'typestyles' &&
    (callee.name.text === 'createStyles' || callee.name.text === 'createTypeStyles')
  ) {
    return true;
  }
  return false;
}

function registerBindingFromCreateCall(
  bindings: Map<string, StylesBindingConfig>,
  name: string,
  init: ts.Expression,
): void {
  bindings.set(name, parseCreateStylesConfig(init));
}

function collectBindings(sourceFile: ts.SourceFile): Map<string, StylesBindingConfig> {
  const bindings = new Map<string, StylesBindingConfig>();

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      isCreateStylesCall(node.initializer)
    ) {
      if (ts.isIdentifier(node.name)) {
        registerBindingFromCreateCall(bindings, node.name.text, node.initializer);
      } else if (ts.isObjectBindingPattern(node.name)) {
        const config = parseCreateStylesConfig(node.initializer);
        for (const element of node.name.elements) {
          if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
            bindings.set(element.name.text, config);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return bindings;
}

function normalizeCalleeMethod(name: string): 'class' | 'component' | null {
  if (name === 'style' || name === 'class') return 'class';
  if (name === 'recipe' || name === 'component') return 'component';
  return null;
}

function calleeMethodName(expr: ts.Expression): 'class' | 'component' | null {
  // Flat API: `style(...)` / `recipe(...)` and `typestyles.style` / `typestyles.recipe`
  // Legacy: `styles.class` / `styles.component`
  if (ts.isIdentifier(expr)) {
    return normalizeCalleeMethod(expr.text);
  }
  if (!ts.isPropertyAccessExpression(expr)) return null;
  if (ts.isIdentifier(expr.name)) return normalizeCalleeMethod(expr.name.text);
  return null;
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return line + 1;
}

function stylesBindingFromCallee(
  expr: ts.Expression,
  bindings: Map<string, StylesBindingConfig>,
  defaultConfig?: StylesBindingConfig,
): StylesBindingConfig {
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
    const binding = bindings.get(expr.expression.text);
    if (binding) return binding;
    if (expr.expression.text === 'styles' && defaultConfig) return defaultConfig;
  }
  if (ts.isIdentifier(expr)) {
    return bindings.get(expr.text) ?? defaultConfig ?? { mode: 'semantic', scopeId: '' };
  }
  return defaultConfig ?? { mode: 'semantic', scopeId: '' };
}

function mergeProjectBindings(sourceFiles: ts.SourceFile[]): {
  bindings: Map<string, StylesBindingConfig>;
  defaultConfig?: StylesBindingConfig;
} {
  const bindings = new Map<string, StylesBindingConfig>();
  const configs: StylesBindingConfig[] = [];

  for (const sourceFile of sourceFiles) {
    const fileBindings = collectBindings(sourceFile);
    for (const [key, value] of fileBindings) {
      bindings.set(key, value);
      configs.push(value);
    }
  }

  const unique = new Map<string, StylesBindingConfig>();
  for (const config of configs) {
    unique.set(`${config.mode}:${config.scopeId}`, config);
  }

  const defaultConfig = unique.size === 1 ? [...unique.values()][0] : undefined;
  return { bindings, defaultConfig };
}

function collectCallsFromSourceFile(
  sourceFile: ts.SourceFile,
  relativePath: string,
  bindings: Map<string, StylesBindingConfig>,
  defaultConfig?: StylesBindingConfig,
): PublicClassNameEntry[] {
  const entries: PublicClassNameEntry[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const method = calleeMethodName(node.expression);
      if (method === 'class' || method === 'component') {
        const recipeInput = method === 'component' ? recipeInputFromCall(node) : null;
        const namespace = recipeInput?.namespace ?? firstStringArg(node.arguments);
        if (!namespace) {
          ts.forEachChild(node, visit);
          return;
        }

        const config = stylesBindingFromCallee(node.expression, bindings, defaultConfig);
        const line = lineOf(sourceFile, node.arguments[0] ?? node);

        if (method === 'class') {
          const className = semanticClassName(config, namespace);
          if (className) {
            entries.push({
              className,
              kind: 'class',
              namespace,
              file: relativePath,
              line,
            });
          }
        } else {
          const schemaCall = recipeInput ? false : isSchemaRecipeCall(node);
          const configObj =
            recipeInput?.styles ??
            objectExpressionFromConfigArg(schemaCall ? node.arguments[2] : node.arguments[1]);
          const slotsOverride = recipeInput
            ? recipeInput.slots
            : schemaCall
              ? definitionSlots(node.arguments[1])
              : undefined;
          const parts = configObj
            ? collectClassNamePartsFromConfig(configObj, slotsOverride)
            : [{}];
          for (const part of parts) {
            const className = componentClassName(config, namespace, part);
            if (className) {
              entries.push({
                className,
                kind: 'component',
                namespace,
                suffix: part.modifier
                  ? `${part.element ? `${part.element}-` : ''}${part.dimension ? `${part.dimension}-` : ''}${part.modifier}`
                  : (part.element ?? 'base'),
                file: relativePath,
                line,
              });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return entries;
}

export function collectPublicClassNamesFromFiles(
  filePaths: string[],
  rootDir: string,
): PublicClassNameEntry[] {
  const parsed = filePaths.map((filePath) => {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    return { filePath, sourceFile, relativePath: path.relative(rootDir, filePath) };
  });

  const { bindings, defaultConfig } = mergeProjectBindings(parsed.map((item) => item.sourceFile));
  const entries: PublicClassNameEntry[] = [];

  for (const { sourceFile, relativePath } of parsed) {
    entries.push(...collectCallsFromSourceFile(sourceFile, relativePath, bindings, defaultConfig));
  }

  return dedupeEntries(entries);
}

function dedupeEntries(entries: PublicClassNameEntry[]): PublicClassNameEntry[] {
  const byClass = new Map<string, PublicClassNameEntry>();
  for (const entry of entries) {
    if (!byClass.has(entry.className)) {
      byClass.set(entry.className, entry);
    }
  }
  return [...byClass.values()].sort((a, b) => a.className.localeCompare(b.className));
}

export async function collectPublicClassNames(
  options: CollectPublicClassNamesOptions = {},
): Promise<PublicClassNameEntry[]> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const include = options.include ?? DEFAULT_INCLUDE;
  const exclude = options.exclude ?? DEFAULT_EXCLUDE;

  const files = await fg(include, {
    cwd: rootDir,
    absolute: true,
    ignore: exclude,
  });

  return collectPublicClassNamesFromFiles(files, rootDir);
}

export function collectPublicClassNamesSync(
  options: CollectPublicClassNamesOptions = {},
): PublicClassNameEntry[] {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const include = options.include ?? DEFAULT_INCLUDE;
  const exclude = options.exclude ?? DEFAULT_EXCLUDE;

  const files = fg.sync(include, {
    cwd: rootDir,
    absolute: true,
    ignore: exclude,
  });

  return collectPublicClassNamesFromFiles(files, rootDir);
}

/** @internal Resolve merged `createStyles` / `createTypeStyles` bindings for tests. */
export function resolveProjectStylesBindings(
  filePaths: string[],
  _rootDir: string,
): Map<string, StylesBindingConfig> {
  const parsed = filePaths.map((filePath) => {
    const sourceText = fs.readFileSync(filePath, 'utf8');
    return ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
  });
  return mergeProjectBindings(parsed).bindings;
}

export function buildSnapshot(entries: PublicClassNameEntry[]): PublicClassNamesSnapshot {
  const sorted = dedupeEntries(entries);
  return {
    version: 1,
    classNames: sorted.map((entry) => entry.className),
    entries: sorted,
  };
}

export function loadPublicClassNamesSnapshot(
  snapshotPath: string,
): PublicClassNamesSnapshot | null {
  if (!fs.existsSync(snapshotPath)) return null;
  const raw = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as PublicClassNamesSnapshot;
  if (!raw || raw.version !== 1 || !Array.isArray(raw.classNames)) {
    throw new Error(
      `[typestyles] Invalid public class name snapshot at ${snapshotPath}. Regenerate with \`typestyles snapshot --write\`.`,
    );
  }
  return raw;
}

export function writePublicClassNamesSnapshot(
  snapshotPath: string,
  entries: PublicClassNameEntry[],
): PublicClassNamesSnapshot {
  const snapshot = buildSnapshot(entries);
  fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return snapshot;
}

export function diffRemovedPublicClassNames(
  snapshot: PublicClassNamesSnapshot,
  current: PublicClassNameEntry[],
): PublicClassNameEntry[] {
  const currentSet = new Set(current.map((entry) => entry.className));
  return snapshot.entries.filter((entry) => !currentSet.has(entry.className));
}
