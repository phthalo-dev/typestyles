import { describe } from 'vite-plus/test';
import { noInvalidUnitlessValue } from './no-invalid-unitless-value';
import { ruleTester } from '../test/rule-tester';

describe('no-invalid-unitless-value', () => {
  ruleTester.run('no-invalid-unitless-value', noInvalidUnitlessValue, {
    valid: [
      `style('card', { width: 100 })`,
      `style('card', { width: '100px' })`,
      `style('text', { lineHeight: 1.5 })`,
      `style('text', { lineHeight: '24px' })`,
      `style('text', { fontWeight: 700 })`,
      `style('media', { aspectRatio: 1.5 })`,
    ],
    invalid: [
      {
        code: `style('card', { width: '100' })`,
        errors: [{ messageId: 'bareNumberString' }],
      },
      {
        code: `style('card', { padding: '16' })`,
        errors: [{ messageId: 'bareNumberString' }],
      },
      {
        code: `style('text', { lineHeight: 24 })`,
        errors: [{ messageId: 'suspiciousUnitlessNumber' }],
      },
    ],
  });
});
