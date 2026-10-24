import postcss, { type ChildNode, type Container } from 'postcss';
import * as t from '@babel/types';
import type { MigrationWarning } from './types';

function camelCaseProperty(property: string): string {
  return property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** A numeric CSS value as an AST node. Babel 8 rejects negative `numericLiteral`s, so `-1` is `-(1)`. */
export function numberNode(n: number): t.Expression {
  return n < 0 ? t.unaryExpression('-', t.numericLiteral(-n)) : t.numericLiteral(n);
}

function toValueNode(value: string, varReplacements?: Map<string, t.Identifier>): t.Expression {
  const trimmed = value.trim();
  if (varReplacements?.has(trimmed)) {
    return varReplacements.get(trimmed)!;
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return numberNode(Number(trimmed));
  }
  return t.stringLiteral(trimmed);
}

function toKeyNode(key: string): t.Expression {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
    return t.identifier(key);
  }
  return t.stringLiteral(key);
}

function nodesToObject(
  nodes: ChildNode[] | undefined,
  warnings: MigrationWarning[],
  varReplacements?: Map<string, t.Identifier>,
): t.ObjectExpression {
  const properties: t.ObjectProperty[] = [];

  for (const node of nodes ?? []) {
    if (node.type === 'decl') {
      const normalized = node.prop.startsWith('--') ? node.prop : camelCaseProperty(node.prop);
      properties.push(
        t.objectProperty(toKeyNode(normalized), toValueNode(node.value, varReplacements)),
      );
      continue;
    }

    if (node.type === 'rule') {
      const nested = nodesToObject(node.nodes, warnings, varReplacements);
      properties.push(t.objectProperty(t.stringLiteral(node.selector.trim()), nested));
      continue;
    }

    if (node.type === 'atrule') {
      const nested = nodesToObject(node.nodes, warnings, varReplacements);
      const atRuleKey = `@${node.name}${node.params ? ` ${node.params}` : ''}`;
      properties.push(t.objectProperty(t.stringLiteral(atRuleKey), nested));
      continue;
    }

    warnings.push({
      message: `Unsupported CSS node "${node.type}" skipped.`,
    });
  }

  return t.objectExpression(properties);
}

export function cssToObjectExpression(
  cssText: string,
  warnings: MigrationWarning[],
  varReplacements?: Map<string, t.Identifier>,
): t.ObjectExpression | null {
  try {
    const root = postcss.parse(cssText);
    return nodesToObject((root as unknown as Container).nodes, warnings, varReplacements);
  } catch (error) {
    warnings.push({
      message: `Could not parse CSS template literal: ${(error as Error).message}`,
    });
    return null;
  }
}
