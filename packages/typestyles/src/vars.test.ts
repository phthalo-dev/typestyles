import { describe, it, expect, beforeEach, expectTypeOf } from 'vite-plus/test';
import { createVar, assignVars, __resetVarCounter } from './vars';
import type { CSSVarRef, ComponentVariants, ComponentFunction } from './types';

describe('createVar', () => {
  beforeEach(() => {
    __resetVarCounter();
  });

  it('returns a var() string matching var(--ts-N) when unnamed', () => {
    const v = createVar();
    expect(v).toMatch(/^var\(--ts-\d+\)$/);
  });

  it('returns different strings on consecutive calls', () => {
    const a = createVar();
    const b = createVar();
    expect(a).not.toBe(b);
  });

  it('increments the counter sequentially for anonymous vars', () => {
    const a = createVar();
    const b = createVar();
    expect(a).toBe('var(--ts-1)');
    expect(b).toBe('var(--ts-2)');
  });

  it('uses a sanitized debug name for named vars', () => {
    const v = createVar('cardBg');
    expect(v).toBe('var(--ts-cardbg)');
  });

  it('suffixes duplicate debug names for uniqueness', () => {
    const a = createVar('cardBg');
    const b = createVar('cardBg');
    expect(a).toBe('var(--ts-cardbg)');
    expect(b).toBe('var(--ts-cardbg-2)');
  });

  it('includes a fallback when provided', () => {
    const v = createVar('cardBg', '#ffffff');
    expect(v).toBe('var(--ts-cardbg, #ffffff)');
  });

  it('returns a CSSVarRef type', () => {
    const v = createVar();
    expectTypeOf(v).toMatchTypeOf<CSSVarRef>();
  });
});

describe('assignVars', () => {
  beforeEach(() => {
    __resetVarCounter();
  });

  it('maps a single var ref to its value', () => {
    const myVar = createVar('accent');
    expect(assignVars({ [myVar]: 'red' })).toEqual({ '--ts-accent': 'red' });
  });

  it('maps multiple var refs in one call', () => {
    const a = createVar('fg');
    const b = createVar('bg');
    expect(assignVars({ [a]: 'red', [b]: 'blue' })).toEqual({
      '--ts-fg': 'red',
      '--ts-bg': 'blue',
    });
  });

  it('extracts the property name from var refs with fallbacks', () => {
    const v = createVar('cardBg', '#fff');
    expect(assignVars({ [v]: '#ff0099' })).toEqual({ '--ts-cardbg': '#ff0099' });
  });

  it('skips null and undefined values', () => {
    const a = createVar();
    const b = createVar();
    const result = assignVars({
      [a]: 'red',
      [b]: undefined,
    } as Partial<Record<CSSVarRef, string>>);
    expect(result).toEqual({ '--ts-1': 'red' });
    expect('--ts-2' in result).toBe(false);
  });

  it('returns an empty object for empty input', () => {
    expect(assignVars({})).toEqual({});
  });

  it('return type is Record<string, string>', () => {
    const v = createVar();
    const result = assignVars({ [v]: 'red' });
    expectTypeOf(result).toMatchTypeOf<Record<string, string>>();
  });
});

describe('ComponentVariants', () => {
  it('extracts variant prop types from a ComponentFunction', () => {
    type MockFn = ComponentFunction<{
      intent: { primary: object; ghost: object };
      size: { sm: object; lg: object };
    }>;

    type Props = ComponentVariants<MockFn>;

    expectTypeOf<Props>().toMatchTypeOf<{
      intent?: 'primary' | 'ghost';
      size?: 'sm' | 'lg';
    }>();
  });

  it('resolves to never for non-ComponentFunction types', () => {
    type Props = ComponentVariants<string>;
    expectTypeOf<Props>().toBeNever();
  });
});
