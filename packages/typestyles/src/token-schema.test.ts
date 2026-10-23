import { describe, it, expect } from 'vite-plus/test';
import {
  flattenTokenSchema,
  mergeTokenTrees,
  tokenSchemaLeavesEqual,
  getSchemaSyntaxLeaves,
} from './token-schema';

describe('token-schema', () => {
  it('flattenTokenSchema collects leaves with paths', () => {
    const schema = {
      accent: {
        default: { syntax: '<color>', inherits: false },
        subtle: true,
      },
    } as const;

    expect(flattenTokenSchema(schema)).toEqual([
      { path: 'accent-default', leaf: { syntax: '<color>', inherits: false } },
      { path: 'accent-subtle', leaf: true },
    ]);
  });

  it('mergeTokenTrees deep-merges nested schema chunks', () => {
    const a = { accent: { default: { syntax: '<color>', inherits: false } } };
    const b = { accent: { subtle: true }, meta: { version: true } };

    expect(mergeTokenTrees(a, b)).toEqual({
      accent: {
        default: { syntax: '<color>', inherits: false },
        subtle: true,
      },
      meta: { version: true },
    });
  });

  it('tokenSchemaLeavesEqual compares syntax and plain leaves', () => {
    expect(tokenSchemaLeavesEqual(true, true)).toBe(true);
    expect(
      tokenSchemaLeavesEqual(
        { syntax: '<color>', inherits: false },
        { syntax: '<color>', inherits: false },
      ),
    ).toBe(true);
    expect(tokenSchemaLeavesEqual(true, { syntax: '<color>', inherits: false })).toBe(false);
    expect(
      tokenSchemaLeavesEqual(
        { syntax: '<color>', inherits: false },
        { syntax: '<length>', inherits: false },
      ),
    ).toBe(false);
    expect(
      tokenSchemaLeavesEqual({ syntax: '<color>' }, { syntax: '<color>', inherits: true }),
    ).toBe(true);
  });

  it('getSchemaSyntaxLeaves returns paths with syntax', () => {
    const schema = {
      accent: { default: { syntax: '<color>', inherits: false }, subtle: true },
    };
    expect([...getSchemaSyntaxLeaves(schema)]).toEqual(['accent-default']);
  });
});
