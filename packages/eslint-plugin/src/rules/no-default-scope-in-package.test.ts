import { describe } from 'vite-plus/test';
import { noDefaultScopeInPackage } from './no-default-scope-in-package';
import { ruleTester } from '../test/rule-tester';

describe('no-default-scope-in-package', () => {
  ruleTester.run('no-default-scope-in-package', noDefaultScopeInPackage, {
    valid: [
      {
        code: `const { style, recipe } = createTypeStyles({ scopeId: 'pkg' });
style('card', { padding: 8 });
recipe({ name: 'button', styles: { base: { color: 'red' } } });`,
        filename: 'src/card.ts',
      },
      {
        code: `import { style, recipe } from './runtime';
style('card', { padding: 8 });
recipe({ name: 'button', styles: { base: { color: 'red' } } });`,
        filename: 'src/button.ts',
      },
      {
        code: `const { style } = createTypeStyles({ scopeId: pkg.name, mode: 'semantic' });
style('card', { padding: 8 });`,
        filename: 'src/card.ts',
      },
      {
        code: `const api = createStyles({ scopeId: 'pkg' });
api.class('card', { padding: 8 });`,
        filename: 'src/a.ts',
      },
      {
        code: `myStyles.class('card', { padding: 8 })`,
        filename: 'src/card.ts',
      },
      {
        code: `const opts = { scopeId: 'pkg' };
createTypeStyles(opts);`,
        filename: 'src/runtime.ts',
      },
      {
        code: `compose(a, b)`,
        filename: 'src/a.ts',
      },
    ],
    invalid: [
      {
        code: `createTypeStyles()`,
        filename: 'src/runtime.ts',
        errors: [{ messageId: 'unscopedFactory' }],
      },
      {
        code: `createTypeStyles({})`,
        filename: 'src/runtime.ts',
        errors: [{ messageId: 'unscopedFactory' }],
      },
      {
        code: `createStyles({ mode: 'semantic' })`,
        filename: 'src/runtime.ts',
        errors: [{ messageId: 'unscopedFactory' }],
      },
      {
        code: `const { style } = createTypeStyles();
style('card', { padding: 8 });`,
        filename: 'src/card.ts',
        errors: [{ messageId: 'unscopedFactory' }],
      },
      {
        code: `styles.class('card', { padding: 8 })`,
        filename: 'src/card.ts',
        errors: [{ messageId: 'unscopedInPackage' }],
      },
      {
        code: `styles.component({ name: 'button', styles: { base: { color: 'red' } } })`,
        filename: 'src/button.ts',
        errors: [{ messageId: 'unscopedInPackage' }],
      },
      {
        code: `styles.hashClass({ color: 'red' })`,
        filename: 'src/a.ts',
        errors: [{ messageId: 'unscopedInPackage' }],
      },
    ],
  });
});
