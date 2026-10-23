import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe } from 'vite-plus/test';
import {
  noRemovedPublicClassname,
  resetRemovedPublicClassnameState,
} from './no-removed-public-classname';
import { ruleTester } from '../test/rule-tester';

const validFixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../test/fixtures/public-classnames-valid',
);
const invalidFixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../test/fixtures/public-classnames-invalid',
);
const removedVariantFixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../test/fixtures/public-classnames-invalid-removed-variant',
);

describe('no-removed-public-classname', () => {
  beforeEach(() => {
    resetRemovedPublicClassnameState();
  });

  ruleTester.run('no-removed-public-classname-valid', noRemovedPublicClassname, {
    valid: [
      {
        code: `recipe({ name: 'button', variants: { intent: variant.enum(["primary"], { default: "primary" }) }, styles: { base: { color: 'red' }, variants: { intent: { primary: { backgroundColor: 'blue' } } } } });`,
        filename: path.join(validFixtureRoot, 'button.ts'),
        options: [{ rootDir: validFixtureRoot }],
      },
    ],
    invalid: [],
  });
});

describe('no-removed-public-classname / invalid', () => {
  beforeEach(() => {
    resetRemovedPublicClassnameState();
  });

  ruleTester.run('no-removed-public-classname-invalid', noRemovedPublicClassname, {
    valid: [],
    invalid: [
      {
        code: `recipe({ name: 'btn', variants: { intent: variant.enum(["primary"], { default: "primary" }) }, styles: { base: { color: 'red' }, variants: { intent: { primary: { backgroundColor: 'blue' } } } } });`,
        filename: path.join(invalidFixtureRoot, 'renamed.ts'),
        options: [{ rootDir: invalidFixtureRoot }],
        errors: [{ messageId: 'removed' }, { messageId: 'removed' }],
      },
    ],
  });
});

describe('no-removed-public-classname / removed variant', () => {
  beforeEach(() => {
    resetRemovedPublicClassnameState();
  });

  ruleTester.run('no-removed-public-classname-removed-variant', noRemovedPublicClassname, {
    valid: [],
    invalid: [
      {
        code: `recipe({ name: 'button', variants: { intent: variant.enum(["primary"], { default: "primary" }) }, styles: { base: { color: 'red' }, variants: { intent: { primary: { backgroundColor: 'blue' } } } } });`,
        filename: path.join(removedVariantFixtureRoot, 'button.ts'),
        options: [{ rootDir: removedVariantFixtureRoot }],
        errors: [{ messageId: 'removed' }],
      },
    ],
  });
});
