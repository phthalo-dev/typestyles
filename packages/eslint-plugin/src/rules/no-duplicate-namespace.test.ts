import { beforeEach, describe } from 'vitest';
import { noDuplicateNamespace, resetNamespaceRegistry } from './no-duplicate-namespace';
import { ruleTester } from '../test/rule-tester';

describe('no-duplicate-namespace', () => {
  beforeEach(() => {
    resetNamespaceRegistry();
  });

  ruleTester.run('no-duplicate-namespace', noDuplicateNamespace, {
    valid: [
      {
        code: `style('card', { padding: 8 })`,
        filename: 'a.ts',
      },
      {
        code: `style('hero', { display: 'flex' })`,
        filename: 'b.ts',
      },
      {
        code: `recipe({ name: 'button', styles: { base: { color: 'red' } } })`,
        filename: 'recipe.ts',
      },
      {
        code: `tokens.create('color', { primary: '#00f' })`,
        filename: 'tokens.ts',
      },
    ],
    invalid: [
      {
        code: `
            style('card', { padding: 8 });
            style('card', { margin: 0 });
          `,
        filename: 'dup.ts',
        errors: [{ messageId: 'duplicateInFile' }],
      },
    ],
  });
});

describe('no-duplicate-namespace / cross file', () => {
  resetNamespaceRegistry();

  ruleTester.run('no-duplicate-namespace-seed', noDuplicateNamespace, {
    valid: [
      {
        code: `recipe({ name: 'button', styles: { base: { color: 'red' } } })`,
        filename: 'first.ts',
      },
    ],
    invalid: [],
  });

  ruleTester.run('no-duplicate-namespace-collision', noDuplicateNamespace, {
    valid: [],
    invalid: [
      {
        code: `style('button', { padding: 4 })`,
        filename: 'second.ts',
        errors: [{ messageId: 'duplicateAcrossFiles' }],
      },
    ],
  });
});
