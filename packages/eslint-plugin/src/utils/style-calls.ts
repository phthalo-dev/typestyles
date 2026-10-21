import type { TSESTree } from '@typescript-eslint/utils';

export type NamespaceKind =
  | 'style'
  | 'recipe'
  | 'hash'
  | 'styles.class'
  | 'styles.component'
  | 'styles.hashClass'
  | 'tokens.create'
  | 'tokens.createTheme'
  | 'createTheme'
  | 'keyframes.create'
  | 'global.rule'
  | 'global.style'
  | 'global.fontFace';

export interface NamespaceCall {
  kind: NamespaceKind;
  /** Logical namespace key used for duplicate detection. */
  key: string;
  /** AST node for the namespace string literal (for reporting). */
  nameNode: TSESTree.StringLiteral;
}

function memberPropertyName(node: TSESTree.MemberExpression): string | null {
  if (node.property.type === 'Identifier' && !node.computed) return node.property.name;
  if (node.property.type === 'Literal' && typeof node.property.value === 'string') {
    return node.property.value;
  }
  return null;
}

function calleeRootName(node: TSESTree.CallExpression['callee']): string | null {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    if (node.object.type === 'Identifier') return node.object.name;
    if (node.object.type === 'MemberExpression') {
      const inner = memberPropertyName(node.object);
      const outer = calleeRootName(node.object);
      if (outer && inner) return `${outer}.${inner}`;
    }
  }
  return null;
}

function isMemberCall(
  callee: TSESTree.CallExpression['callee'],
  objectName: string,
  method: string,
): boolean {
  if (callee.type !== 'MemberExpression') return false;
  const methodName = memberPropertyName(callee);
  if (methodName !== method) return false;
  if (callee.object.type === 'Identifier') return callee.object.name === objectName;
  return false;
}

function firstStringArg(args: TSESTree.CallExpressionArgument[]): TSESTree.StringLiteral | null {
  const first = args[0];
  if (!first || first.type === 'SpreadElement') return null;
  if (first.type === 'Literal' && typeof first.value === 'string') return first;
  return null;
}

/** `name` string on `recipe({ name: '…' })` / `styles.component({ name: '…' })`. */
function nameFromObjectArg(args: TSESTree.CallExpressionArgument[]): TSESTree.StringLiteral | null {
  const first = args[0];
  if (!first || first.type !== 'ObjectExpression') return null;
  for (const prop of first.properties) {
    if (prop.type !== 'Property' || prop.computed) continue;
    const key =
      prop.key.type === 'Identifier'
        ? prop.key.name
        : prop.key.type === 'Literal' && typeof prop.key.value === 'string'
          ? prop.key.value
          : null;
    if (key !== 'name') continue;
    if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') return prop.value;
  }
  return null;
}

function recipeNameArg(args: TSESTree.CallExpressionArgument[]): TSESTree.StringLiteral | null {
  return nameFromObjectArg(args) ?? firstStringArg(args);
}

/**
 * Detect TypeStyles namespace registrations from call expressions.
 * Matches API shape (e.g. `style('card', …)` / `recipe('button', …)`) regardless of import alias.
 */
export function getNamespaceCall(node: TSESTree.CallExpression): NamespaceCall | null {
  const { callee, arguments: args } = node;

  if (callee.type === 'Identifier' && callee.name === 'style') {
    const nameNode = firstStringArg(args);
    if (!nameNode) return null;
    return { kind: 'style', key: `.${nameNode.value}-`, nameNode };
  }

  if (callee.type === 'Identifier' && callee.name === 'recipe') {
    const nameNode = recipeNameArg(args);
    if (!nameNode) return null;
    return { kind: 'recipe', key: `.${nameNode.value}-`, nameNode };
  }

  if (callee.type === 'Identifier' && callee.name === 'hash') {
    const first = args[0];
    if (!first || first.type === 'SpreadElement') return null;
    // hash(props, { label }) — label may be in options object; skip keying when absent
    if (args[1]?.type === 'ObjectExpression') {
      for (const prop of args[1].properties) {
        if (
          prop.type === 'Property' &&
          prop.key.type === 'Identifier' &&
          prop.key.name === 'label' &&
          prop.value.type === 'Literal' &&
          typeof prop.value.value === 'string'
        ) {
          return { kind: 'hash', key: `.${prop.value.value}-`, nameNode: prop.value };
        }
      }
    }
    return null;
  }

  if (isMemberCall(callee, 'styles', 'class')) {
    const nameNode = firstStringArg(args);
    if (!nameNode) return null;
    return { kind: 'styles.class', key: `.${nameNode.value}-`, nameNode };
  }

  if (isMemberCall(callee, 'styles', 'component')) {
    const nameNode = recipeNameArg(args);
    if (!nameNode) return null;
    return { kind: 'styles.component', key: `.${nameNode.value}-`, nameNode };
  }

  if (isMemberCall(callee, 'styles', 'hashClass')) {
    const first = args[0];
    if (!first || first.type === 'SpreadElement') return null;
    if (first.type === 'Literal' && typeof first.value === 'string') {
      return { kind: 'styles.hashClass', key: `.${first.value}-`, nameNode: first };
    }
    const label = args[1];
    if (label?.type === 'Literal' && typeof label.value === 'string') {
      return { kind: 'styles.hashClass', key: `.${label.value}-`, nameNode: label };
    }
    return null;
  }

  if (isMemberCall(callee, 'tokens', 'create')) {
    const nameNode = firstStringArg(args);
    if (!nameNode) return null;
    return { kind: 'tokens.create', key: `tokens:${nameNode.value}`, nameNode };
  }

  if (isMemberCall(callee, 'tokens', 'createTheme')) {
    const nameNode = firstStringArg(args);
    if (!nameNode) return null;
    return { kind: 'tokens.createTheme', key: `theme:${nameNode.value}`, nameNode };
  }

  if (callee.type === 'Identifier' && callee.name === 'createTheme') {
    const nameNode = firstStringArg(args);
    if (!nameNode) return null;
    return { kind: 'createTheme', key: `theme:${nameNode.value}`, nameNode };
  }

  if (isMemberCall(callee, 'keyframes', 'create')) {
    const nameNode = firstStringArg(args);
    if (!nameNode) return null;
    return { kind: 'keyframes.create', key: `keyframes:${nameNode.value}`, nameNode };
  }

  if (isMemberCall(callee, 'global', 'rule') || isMemberCall(callee, 'global', 'style')) {
    const nameNode = firstStringArg(args);
    if (!nameNode) return null;
    return {
      kind: isMemberCall(callee, 'global', 'rule') ? 'global.rule' : 'global.style',
      key: nameNode.value,
      nameNode,
    };
  }

  if (isMemberCall(callee, 'global', 'fontFace')) {
    const nameNode = firstStringArg(args);
    if (!nameNode) return null;
    return { kind: 'global.fontFace', key: `font-face:${nameNode.value}`, nameNode };
  }

  // `myStyles.class` / `myTokens.create` from createStyles/createTokens bindings
  if (callee.type === 'MemberExpression') {
    const method = memberPropertyName(callee);
    const root = calleeRootName(callee);
    if (method === 'class' && root) {
      const nameNode = firstStringArg(args);
      if (!nameNode) return null;
      return { kind: 'styles.class', key: `.${nameNode.value}-`, nameNode };
    }
    if (method === 'component' && root) {
      const nameNode = firstStringArg(args);
      if (!nameNode) return null;
      return { kind: 'styles.component', key: `.${nameNode.value}-`, nameNode };
    }
    if (method === 'create' && root?.endsWith('tokens')) {
      const nameNode = firstStringArg(args);
      if (!nameNode) return null;
      return { kind: 'tokens.create', key: `tokens:${nameNode.value}`, nameNode };
    }
  }

  return null;
}

/** Extract style object literals passed to TypeStyles style APIs. */
export function getStyleObjectArguments(
  node: TSESTree.CallExpression,
): TSESTree.ObjectExpression[] {
  const { callee, arguments: args } = node;
  const objects: TSESTree.ObjectExpression[] = [];

  const pushObject = (arg: TSESTree.CallExpressionArgument | undefined) => {
    if (!arg || arg.type === 'SpreadElement') return;
    if (arg.type === 'ObjectExpression') objects.push(arg);
    if (arg.type === 'ArrowFunctionExpression' && arg.body.type === 'ObjectExpression') {
      objects.push(arg.body);
    }
  };

  if (callee.type === 'Identifier' && (callee.name === 'style' || callee.name === 'recipe')) {
    pushObject(args[1]);
    return objects;
  }

  if (callee.type === 'Identifier' && callee.name === 'hash') {
    pushObject(args[0]);
    return objects;
  }

  if (callee.type === 'MemberExpression') {
    const method = memberPropertyName(callee);
    if (method === 'class' || method === 'component' || method === 'rule' || method === 'style') {
      pushObject(args[1]);
      return objects;
    }
    if (method === 'hashClass' || method === 'rules') {
      const first = args[0];
      if (first && first.type !== 'SpreadElement' && first.type === 'ObjectExpression') {
        objects.push(first);
      }
      return objects;
    }
  }

  return objects;
}
