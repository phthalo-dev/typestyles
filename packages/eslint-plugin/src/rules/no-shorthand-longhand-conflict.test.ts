import { describe } from 'vitest';
import { noShorthandLonghandConflict } from './no-shorthand-longhand-conflict';
import { ruleTester } from '../test/rule-tester';

describe('no-shorthand-longhand-conflict', () => {
  ruleTester.run('no-shorthand-longhand-conflict', noShorthandLonghandConflict, {
    valid: [
      `style('card', { paddingTop: 8, paddingBottom: 8 })`,
      `style('card', { padding: 8 })`,
      `style('card', {
          padding: 8,
          '&:hover': { paddingTop: 12 },
        })`,
      `recipe({ name: 'button', variants: { size: variant.enum(["sm", "lg"], { default: "sm" }) }, styles: { base: { color: 'red' }, variants: { size: {
              sm: { padding: 4 },
              lg: { paddingTop: 12 },
            } } } })`,
    ],
    invalid: [
      {
        code: `style('card', { padding: 8, paddingTop: 4 })`,
        errors: [{ messageId: 'conflict' }],
      },
      {
        code: `style('card', { margin: 0, marginLeft: 4 })`,
        errors: [{ messageId: 'conflict' }],
      },
      {
        code: `style('box', { border: '1px solid', borderColor: 'red' })`,
        errors: [{ messageId: 'conflict' }],
      },
    ],
  });
});
