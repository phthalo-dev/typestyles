import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverse, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { cssToObjectExpression } from './css';
import {
  parseBooleanTemplateInterpolations,
  parseTemplateInterpolations,
  placeholderToken,
  reconstructInterpolatedCss,
  reconstructStaticCssWithoutVariants,
  toComponentConstName,
  toVarDebugName,
} from './interpolations';
import type { FileMigrationResult, MigrationWarning } from './types';
import { buildVariantRecipeInput } from './variants';

type StyledTarget =
  | { kind: 'intrinsic'; jsxName: t.JSXIdentifier }
  | { kind: 'component'; jsxName: t.JSXIdentifier | t.JSXMemberExpression };

type PropVarBinding = {
  propName: string;
  varConstName: string;
  suffix: string;
};

type StyledTransform = {
  originalName: string;
  mode: 'class' | 'component';
  classConstName: string;
  target: StyledTarget;
  propVars: PropVarBinding[];
  variantProps: string[];
};

function toKebabCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

function memberExpressionToJsxName(
  expression: t.Expression,
): t.JSXIdentifier | t.JSXMemberExpression | null {
  if (t.isIdentifier(expression)) {
    return t.jsxIdentifier(expression.name);
  }

  if (t.isMemberExpression(expression) && !expression.computed) {
    const left = memberExpressionToJsxName(expression.object as t.Expression);
    const right = t.isIdentifier(expression.property)
      ? t.jsxIdentifier(expression.property.name)
      : null;
    if (!left || !right) return null;
    return t.jsxMemberExpression(left, right);
  }

  return null;
}

function parseStyledTarget(
  tag: t.TaggedTemplateExpression['tag'],
  styledNames: Set<string>,
): StyledTarget | null {
  if (
    t.isMemberExpression(tag) &&
    t.isIdentifier(tag.object) &&
    styledNames.has(tag.object.name) &&
    t.isIdentifier(tag.property)
  ) {
    return { kind: 'intrinsic', jsxName: t.jsxIdentifier(tag.property.name) };
  }

  if (t.isCallExpression(tag) && t.isIdentifier(tag.callee) && styledNames.has(tag.callee.name)) {
    const firstArg = tag.arguments[0];
    if (!firstArg || !t.isExpression(firstArg)) return null;
    const jsxName = memberExpressionToJsxName(firstArg);
    if (!jsxName) return null;
    return { kind: 'component', jsxName };
  }

  return null;
}

function addWarning(warnings: MigrationWarning[], message: string, nodeName?: string): void {
  warnings.push({ message, nodeName });
}

function createMergedClassExpression(
  existing: t.Expression,
  classNameExpression: t.Expression,
): t.Expression {
  return t.callExpression(
    t.memberExpression(
      t.callExpression(
        t.memberExpression(
          t.arrayExpression([existing, classNameExpression]),
          t.identifier('filter'),
        ),
        [t.identifier('Boolean')],
      ),
      t.identifier('join'),
    ),
    [t.stringLiteral(' ')],
  );
}

function updateClassNameAttribute(
  openingElement: t.JSXOpeningElement,
  classNameExpression: t.Expression,
): void {
  const existingAttr = openingElement.attributes.find(
    (attribute): attribute is t.JSXAttribute =>
      t.isJSXAttribute(attribute) && t.isJSXIdentifier(attribute.name, { name: 'className' }),
  );

  if (!existingAttr) {
    openingElement.attributes.push(
      t.jsxAttribute(t.jsxIdentifier('className'), t.jsxExpressionContainer(classNameExpression)),
    );
    return;
  }

  if (!existingAttr.value) {
    existingAttr.value = t.jsxExpressionContainer(classNameExpression);
    return;
  }

  if (t.isStringLiteral(existingAttr.value)) {
    existingAttr.value = t.jsxExpressionContainer(
      createMergedClassExpression(t.stringLiteral(existingAttr.value.value), classNameExpression),
    );
    return;
  }

  if (t.isJSXExpressionContainer(existingAttr.value)) {
    existingAttr.value = t.jsxExpressionContainer(
      createMergedClassExpression(
        existingAttr.value.expression as t.Expression,
        classNameExpression,
      ),
    );
  }
}

function hasLocalBinding(ast: t.File, name: string): boolean {
  for (const statement of ast.program.body) {
    if (!t.isVariableDeclaration(statement)) continue;
    for (const declarator of statement.declarations) {
      if (t.isIdentifier(declarator.id) && declarator.id.name === name) return true;
      if (t.isObjectPattern(declarator.id)) {
        for (const prop of declarator.id.properties) {
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.value) && prop.value.name === name) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function ensureTypestylesRuntime(
  ast: t.File,
  needs: { style: boolean; recipe: boolean; vars: boolean },
): void {
  const requiredSpecifiers = new Set<string>(['createTypeStyles']);
  if (needs.recipe) requiredSpecifiers.add('variant');
  if (needs.vars) {
    requiredSpecifiers.add('createVar');
    requiredSpecifiers.add('assignVars');
  }

  let typestylesImport: t.ImportDeclaration | null = null;
  let lastImportIndex = -1;

  for (let i = 0; i < ast.program.body.length; i++) {
    const statement = ast.program.body[i];
    if (t.isImportDeclaration(statement)) {
      lastImportIndex = i;
      if (statement.source.value === 'typestyles' && typestylesImport == null) {
        typestylesImport = statement;
      }
    }
  }

  const buildSpecifiers = (names: Set<string>): t.ImportSpecifier[] =>
    [...names].map((name) => t.importSpecifier(t.identifier(name), t.identifier(name)));

  if (!typestylesImport) {
    ast.program.body.unshift(
      t.importDeclaration(buildSpecifiers(requiredSpecifiers), t.stringLiteral('typestyles')),
    );
    lastImportIndex = 0;
  } else {
    for (const name of requiredSpecifiers) {
      const hasSpecifier = typestylesImport.specifiers.some(
        (specifier) =>
          t.isImportSpecifier(specifier) &&
          t.isIdentifier(specifier.imported, { name }) &&
          t.isIdentifier(specifier.local, { name }),
      );

      if (!hasSpecifier) {
        typestylesImport.specifiers.push(t.importSpecifier(t.identifier(name), t.identifier(name)));
      }
    }
  }

  const destructureProps: t.ObjectProperty[] = [];
  if (needs.style && !hasLocalBinding(ast, 'style')) {
    destructureProps.push(
      t.objectProperty(t.identifier('style'), t.identifier('style'), false, true),
    );
  }
  if (needs.recipe && !hasLocalBinding(ast, 'recipe')) {
    destructureProps.push(
      t.objectProperty(t.identifier('recipe'), t.identifier('recipe'), false, true),
    );
  }

  if (destructureProps.length === 0) return;

  const factoryDecl = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.objectPattern(destructureProps),
      t.callExpression(t.identifier('createTypeStyles'), []),
    ),
  ]);
  ast.program.body.splice(lastImportIndex + 1, 0, factoryDecl);
}

function cleanupUnusedImports(ast: t.File): void {
  traverse(ast, {
    Program(path) {
      path.scope.crawl();
    },
    ImportDeclaration(path) {
      const unusedLocals = path.node.specifiers.filter((specifier) => {
        if (
          path.node.source.value === 'typestyles' &&
          t.isImportSpecifier(specifier) &&
          (specifier.local.name === 'createTypeStyles' ||
            specifier.local.name === 'createVar' ||
            specifier.local.name === 'assignVars')
        ) {
          return false;
        }
        const local = specifier.local.name;
        const binding = path.scope.getBinding(local);
        return !binding || binding.referencePaths.length === 0;
      });

      if (unusedLocals.length === 0) return;

      path.node.specifiers = path.node.specifiers.filter(
        (specifier) => !unusedLocals.includes(specifier),
      );
      if (path.node.specifiers.length === 0) {
        path.remove();
      }
    },
  });
}

function createAssignVarValue(propExpression: t.Expression, suffix: string): t.Expression {
  if (!suffix) return propExpression;

  if (t.isStringLiteral(propExpression)) {
    return t.stringLiteral(`${propExpression.value}${suffix}`);
  }

  return t.binaryExpression('+', propExpression, t.stringLiteral(suffix));
}

function buildAssignVarsCall(
  propVars: PropVarBinding[],
  propValues: Map<string, t.Expression>,
): t.CallExpression {
  const properties = propVars
    .filter((binding) => propValues.has(binding.propName))
    .map((binding) => {
      const propExpression = propValues.get(binding.propName)!;
      return t.objectProperty(
        t.identifier(binding.varConstName),
        createAssignVarValue(propExpression, binding.suffix),
        true,
      );
    });

  return t.callExpression(t.identifier('assignVars'), [t.objectExpression(properties)]);
}

function mergeStyleExpressions(
  existing: t.Expression,
  assignVarsCall: t.CallExpression,
): t.Expression {
  return t.objectExpression([t.spreadElement(existing), t.spreadElement(assignVarsCall)]);
}

function updateStyleAttribute(
  openingElement: t.JSXOpeningElement,
  assignVarsCall: t.CallExpression,
): void {
  const existingAttr = openingElement.attributes.find(
    (attribute): attribute is t.JSXAttribute =>
      t.isJSXAttribute(attribute) && t.isJSXIdentifier(attribute.name, { name: 'style' }),
  );

  if (!existingAttr) {
    openingElement.attributes.push(
      t.jsxAttribute(t.jsxIdentifier('style'), t.jsxExpressionContainer(assignVarsCall)),
    );
    return;
  }

  if (!existingAttr.value) {
    existingAttr.value = t.jsxExpressionContainer(assignVarsCall);
    return;
  }

  if (t.isJSXExpressionContainer(existingAttr.value)) {
    existingAttr.value = t.jsxExpressionContainer(
      mergeStyleExpressions(existingAttr.value.expression as t.Expression, assignVarsCall),
    );
  }
}

function collectPropValuesFromJsx(
  openingElement: t.JSXOpeningElement,
  propNames: Set<string>,
): Map<string, t.Expression> {
  const values = new Map<string, t.Expression>();

  for (const attribute of openingElement.attributes) {
    if (!t.isJSXAttribute(attribute) || !t.isJSXIdentifier(attribute.name)) continue;
    if (!propNames.has(attribute.name.name)) continue;

    if (!attribute.value) {
      values.set(attribute.name.name, t.booleanLiteral(true));
      continue;
    }

    if (t.isStringLiteral(attribute.value)) {
      values.set(attribute.name.name, t.stringLiteral(attribute.value.value));
      continue;
    }

    if (t.isJSXExpressionContainer(attribute.value)) {
      values.set(attribute.name.name, attribute.value.expression as t.Expression);
    }
  }

  return values;
}

function removeStyledProps(openingElement: t.JSXOpeningElement, propNames: Set<string>): void {
  openingElement.attributes = openingElement.attributes.filter((attribute) => {
    if (!t.isJSXAttribute(attribute) || !t.isJSXIdentifier(attribute.name)) return true;
    return !propNames.has(attribute.name.name);
  });
}

function buildComponentClassNameExpression(
  componentConstName: string,
  variantProps: string[],
  propValues: Map<string, t.Expression>,
): t.MemberExpression {
  const properties = variantProps
    .filter((propName) => propValues.has(propName))
    .map((propName) => t.objectProperty(t.identifier(propName), propValues.get(propName)!));

  const call =
    properties.length === 0
      ? t.callExpression(t.identifier(componentConstName), [])
      : t.callExpression(t.identifier(componentConstName), [t.objectExpression(properties)]);

  return t.memberExpression(call, t.identifier('className'));
}

function migrateBooleanVariantTemplate(
  path: NodePath<t.VariableDeclarator>,
  variableName: string,
  template: t.TemplateLiteral,
  styledTarget: StyledTarget,
  warnings: MigrationWarning[],
  styledTransforms: Map<string, StyledTransform>,
): boolean {
  const booleanInterpolations = parseBooleanTemplateInterpolations(template);
  if (!booleanInterpolations) return false;

  const staticCss = reconstructStaticCssWithoutVariants(template, booleanInterpolations);
  const baseObject = cssToObjectExpression(staticCss, warnings);
  if (!baseObject) {
    addWarning(warnings, 'Skipped because CSS could not be parsed.', variableName);
    return false;
  }

  const componentConstName = path.scope.generateUidIdentifier(
    toComponentConstName(variableName),
  ).name;
  const recipeInput = buildVariantRecipeInput(
    toKebabCase(variableName),
    baseObject,
    booleanInterpolations,
  );
  const variantProps = [
    ...new Set(booleanInterpolations.map((interpolation) => interpolation.propName)),
  ];

  const declaration = path.parentPath;
  if (!declaration.isVariableDeclaration()) return false;

  declaration.node.declarations = [
    t.variableDeclarator(
      t.identifier(componentConstName),
      t.callExpression(t.identifier('recipe'), [recipeInput]),
    ),
  ];

  styledTransforms.set(variableName, {
    originalName: variableName,
    mode: 'component',
    classConstName: componentConstName,
    target: styledTarget,
    propVars: [],
    variantProps,
  });

  return true;
}

function migrateInterpolatedTemplate(
  path: NodePath<t.VariableDeclarator>,
  variableName: string,
  template: t.TemplateLiteral,
  styledTarget: StyledTarget,
  warnings: MigrationWarning[],
  styledTransforms: Map<string, StyledTransform>,
): boolean {
  const interpolations = parseTemplateInterpolations(template);
  if (!interpolations) {
    addWarning(
      warnings,
      'Skipped template literal with unsupported interpolations. Only prop-based patterns like `${props => props.color}` are migrated.',
      variableName,
    );
    return false;
  }

  const cssText = reconstructInterpolatedCss(template, interpolations);
  const propVars: PropVarBinding[] = interpolations.map((interpolation) => ({
    propName: interpolation.propName,
    varConstName: path.scope.generateUidIdentifier(
      `${variableName}${interpolation.propName.charAt(0).toUpperCase()}${interpolation.propName.slice(1)}Var`,
    ).name,
    suffix: interpolation.suffix,
  }));

  const varReplacements = new Map<string, t.Identifier>();
  for (let i = 0; i < interpolations.length; i++) {
    varReplacements.set(
      placeholderToken(interpolations[i].index),
      t.identifier(propVars[i].varConstName),
    );
  }

  const objectExpression = cssToObjectExpression(cssText, warnings, varReplacements);
  if (!objectExpression) {
    addWarning(warnings, 'Skipped because CSS could not be parsed.', variableName);
    return false;
  }

  const classConstName = path.scope.generateUidIdentifier(`${variableName}Class`).name;
  const varDeclarators = propVars.map((propVar) =>
    t.variableDeclarator(
      t.identifier(propVar.varConstName),
      t.callExpression(t.identifier('createVar'), [
        t.stringLiteral(toVarDebugName(variableName, propVar.propName)),
      ]),
    ),
  );

  const declaration = path.parentPath;
  if (!declaration.isVariableDeclaration()) return false;

  declaration.node.declarations = [
    ...varDeclarators,
    t.variableDeclarator(
      t.identifier(classConstName),
      t.callExpression(t.identifier('style'), [
        t.stringLiteral(toKebabCase(variableName)),
        objectExpression,
      ]),
    ),
  ];

  styledTransforms.set(variableName, {
    originalName: variableName,
    mode: 'class',
    classConstName,
    target: styledTarget,
    propVars,
    variantProps: [],
  });

  return true;
}

function isOnlyJsxReferences(
  binding: NodePath<t.VariableDeclarator>['scope']['bindings'][string],
): boolean {
  return binding.referencePaths.every((referencePath) => {
    const parent = referencePath.parentPath;
    if (!parent) return false;
    return (
      (parent.isJSXOpeningElement() && parent.get('name') === referencePath) ||
      (parent.isJSXClosingElement() && parent.get('name') === referencePath)
    );
  });
}

export function migrateSource(filePath: string, source: string): FileMigrationResult {
  const warnings: MigrationWarning[] = [];
  let changed = false;

  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const styledNames = new Set<string>();
  const cssTagNames = new Set<string>();
  const styledTransforms = new Map<string, StyledTransform>();
  let needsVars = false;
  let needsStyle = false;
  let needsRecipe = false;

  traverse(ast, {
    ImportDeclaration(path) {
      if (
        path.node.source.value === 'styled-components' ||
        path.node.source.value === '@emotion/styled'
      ) {
        for (const specifier of path.node.specifiers) {
          if (t.isImportDefaultSpecifier(specifier)) {
            styledNames.add(specifier.local.name);
          }
          if (
            t.isImportSpecifier(specifier) &&
            t.isIdentifier(specifier.imported, { name: 'css' })
          ) {
            cssTagNames.add(specifier.local.name);
          }
        }
      }

      if (
        path.node.source.value === '@emotion/react' ||
        path.node.source.value === '@emotion/css'
      ) {
        for (const specifier of path.node.specifiers) {
          if (
            t.isImportSpecifier(specifier) &&
            t.isIdentifier(specifier.imported, { name: 'css' })
          ) {
            cssTagNames.add(specifier.local.name);
          }
        }
      }
    },
  });

  traverse(ast, {
    VariableDeclarator(path) {
      if (!t.isIdentifier(path.node.id)) return;
      if (!t.isTaggedTemplateExpression(path.node.init)) return;

      const variableName = path.node.id.name;
      const binding = path.scope.getBinding(variableName);
      if (!binding) return;

      const template = path.node.init.quasi;
      const hasInterpolations = template.expressions.length > 0;
      const styledTarget = parseStyledTarget(path.node.init.tag, styledNames);

      if (hasInterpolations) {
        if (!styledTarget) {
          addWarning(
            warnings,
            'Skipped template literal with interpolations. Only styled-components prop patterns are migrated.',
            variableName,
          );
          return;
        }

        const declaration = path.parentPath;
        if (
          declaration.parentPath?.isExportNamedDeclaration() ||
          declaration.parentPath?.isExportDefaultDeclaration()
        ) {
          addWarning(
            warnings,
            'Skipped exported styled component to avoid changing external API shape.',
            variableName,
          );
          return;
        }

        if (!isOnlyJsxReferences(binding)) {
          addWarning(warnings, 'Skipped styled component with non-JSX references.', variableName);
          return;
        }

        if (
          migrateBooleanVariantTemplate(
            path,
            variableName,
            template,
            styledTarget,
            warnings,
            styledTransforms,
          )
        ) {
          needsRecipe = true;
          changed = true;
          return;
        }

        if (
          migrateInterpolatedTemplate(
            path,
            variableName,
            template,
            styledTarget,
            warnings,
            styledTransforms,
          )
        ) {
          needsVars = true;
          needsStyle = true;
          changed = true;
        }
        return;
      }

      const cssText = template.quasis.map((quasi) => quasi.value.cooked ?? '').join('');
      const objectExpression = cssToObjectExpression(cssText, warnings);
      if (!objectExpression) {
        addWarning(warnings, 'Skipped because CSS could not be parsed.', variableName);
        return;
      }

      if (styledTarget) {
        const declaration = path.parentPath;
        if (
          declaration.parentPath?.isExportNamedDeclaration() ||
          declaration.parentPath?.isExportDefaultDeclaration()
        ) {
          addWarning(
            warnings,
            'Skipped exported styled component to avoid changing external API shape.',
            variableName,
          );
          return;
        }

        if (!isOnlyJsxReferences(binding)) {
          addWarning(warnings, 'Skipped styled component with non-JSX references.', variableName);
          return;
        }

        const classConstName = path.scope.generateUidIdentifier(`${variableName}Class`).name;
        path.node.id = t.identifier(classConstName);
        path.node.init = t.callExpression(t.identifier('style'), [
          t.stringLiteral(toKebabCase(variableName)),
          objectExpression,
        ]);

        styledTransforms.set(variableName, {
          originalName: variableName,
          mode: 'class',
          classConstName,
          target: styledTarget,
          propVars: [],
          variantProps: [],
        });
        needsStyle = true;
        changed = true;
        return;
      }

      if (t.isIdentifier(path.node.init.tag) && cssTagNames.has(path.node.init.tag.name)) {
        path.node.init = t.callExpression(t.identifier('style'), [
          t.stringLiteral(toKebabCase(variableName)),
          objectExpression,
        ]);
        needsStyle = true;
        changed = true;
      }
    },
  });

  if (styledTransforms.size > 0) {
    traverse(ast, {
      JSXElement(path) {
        const openingName = path.node.openingElement.name;
        if (!t.isJSXIdentifier(openingName)) return;
        const transform = styledTransforms.get(openingName.name);
        if (!transform) return;

        path.node.openingElement.name = transform.target.jsxName;
        if (path.node.closingElement) {
          path.node.closingElement.name = transform.target.jsxName;
        }

        const classNameExpression =
          transform.mode === 'component'
            ? buildComponentClassNameExpression(
                transform.classConstName,
                transform.variantProps,
                collectPropValuesFromJsx(path.node.openingElement, new Set(transform.variantProps)),
              )
            : t.identifier(transform.classConstName);

        updateClassNameAttribute(path.node.openingElement, classNameExpression);

        if (transform.propVars.length > 0) {
          const propNames = new Set(transform.propVars.map((propVar) => propVar.propName));
          const propValues = collectPropValuesFromJsx(path.node.openingElement, propNames);

          if (propValues.size > 0) {
            const assignVarsCall = buildAssignVarsCall(transform.propVars, propValues);
            updateStyleAttribute(path.node.openingElement, assignVarsCall);
            removeStyledProps(path.node.openingElement, propNames);
          }
        }

        if (transform.variantProps.length > 0) {
          removeStyledProps(path.node.openingElement, new Set(transform.variantProps));
        }
      },
    });
  }

  if (changed) {
    ensureTypestylesRuntime(ast, {
      style: needsStyle,
      recipe: needsRecipe,
      vars: needsVars,
    });
    cleanupUnusedImports(ast);
  }

  const output = generate(
    ast,
    {
      retainLines: false,
      comments: true,
      concise: false,
    },
    source,
  );

  return {
    filePath,
    changed: changed && output.code !== source,
    code: output.code,
    warnings,
  };
}
