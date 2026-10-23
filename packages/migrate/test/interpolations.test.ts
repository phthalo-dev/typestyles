import { describe, expect, it } from 'vite-plus/test';
import {
  parseBooleanTernaryInterpolation,
  parseBooleanTemplateInterpolations,
  parsePropInterpolation,
  parseTemplateInterpolations,
  reconstructInterpolatedCss,
  reconstructStaticCssWithoutVariants,
} from '../src/interpolations';
import { parse } from '@babel/parser';
import * as t from '@babel/types';

function parseExpression(code: string): t.Expression {
  const ast = parse(`(${code})`, { sourceType: 'module' });
  const statement = ast.program.body[0];
  if (!t.isExpressionStatement(statement)) {
    throw new Error('Expected expression statement');
  }
  return statement.expression;
}

function parseTemplate(code: string): t.TemplateLiteral {
  const ast = parse(`const x = ${code}`, {
    sourceType: 'module',
    plugins: ['typescript'],
  });
  const declaration = ast.program.body[0];
  if (!t.isVariableDeclaration(declaration)) {
    throw new Error('Expected variable declaration');
  }
  const init = declaration.declarations[0]?.init;
  if (!init || !t.isTemplateLiteral(init)) {
    throw new Error('Expected template literal');
  }
  return init;
}

describe('parsePropInterpolation', () => {
  it('parses props => props.color', () => {
    expect(parsePropInterpolation(parseExpression('(props) => props.color'))).toEqual({
      propName: 'color',
    });
  });

  it('parses destructured prop params', () => {
    expect(parsePropInterpolation(parseExpression('({ color }) => color'))).toEqual({
      propName: 'color',
    });
  });

  it('rejects theme access', () => {
    expect(parsePropInterpolation(parseExpression('(props) => props.theme.color'))).toBeNull();
  });

  it('rejects conditional expressions', () => {
    expect(
      parsePropInterpolation(parseExpression("(props) => (props.primary ? 'red' : 'blue')")),
    ).toBeNull();
  });
});

describe('parseTemplateInterpolations', () => {
  it('extracts suffix text after interpolation', () => {
    const template = parseTemplate('`width: ${(props) => props.width}px;`');
    expect(parseTemplateInterpolations(template)).toEqual([
      { index: 0, propName: 'width', suffix: 'px' },
    ]);
  });

  it('reconstructs css with placeholders', () => {
    const template = parseTemplate('`color: ${(props) => props.color}; background: red;`');
    const interpolations = parseTemplateInterpolations(template);
    expect(interpolations).not.toBeNull();
    expect(reconstructInterpolatedCss(template, interpolations!)).toBe(
      'color: __ts_migrate_var_0__; background: red;',
    );
  });
});

describe('parseBooleanTernaryInterpolation', () => {
  it('parses boolean prop ternaries', () => {
    expect(
      parseBooleanTernaryInterpolation(
        parseExpression("(props) => (props.primary ? '#0066ff' : '#6b7280')"),
      ),
    ).toEqual({
      propName: 'primary',
      trueValue: '#0066ff',
      falseValue: '#6b7280',
    });
  });
});

describe('parseBooleanTemplateInterpolations', () => {
  it('extracts css property and variant values', () => {
    const template = parseTemplate(
      '`padding: 8px; background-color: ${(props) => (props.primary ? "#0066ff" : "#6b7280")};`',
    );
    expect(parseBooleanTemplateInterpolations(template)).toEqual([
      {
        index: 0,
        propName: 'primary',
        trueValue: '#0066ff',
        falseValue: '#6b7280',
        cssProperty: 'backgroundColor',
      },
    ]);
  });

  it('reconstructs static css without variant declarations', () => {
    const template = parseTemplate(
      '`padding: 8px; background-color: ${(props) => (props.primary ? "#0066ff" : "#6b7280")}; color: white;`',
    );
    const interpolations = parseBooleanTemplateInterpolations(template);
    expect(interpolations).not.toBeNull();
    expect(reconstructStaticCssWithoutVariants(template, interpolations!)).toBe(
      'padding: 8px; color: white;',
    );
  });
});
