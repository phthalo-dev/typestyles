import { describe, it, expect } from 'vitest';
import { fromDTCG } from './from-dtcg';
import type { DTCGGroup } from './types';

function errorsOf(tree: DTCGGroup, options?: Parameters<typeof fromDTCG>[1]) {
  const r = fromDTCG(tree, options);
  if (r.ok) throw new Error('expected errors');
  return r.errors;
}

function valueOf(tree: DTCGGroup, options?: Parameters<typeof fromDTCG>[1]) {
  const r = fromDTCG(tree, options);
  if (!r.ok) throw new Error('unexpected errors: ' + JSON.stringify(r.errors));
  return r.value as any;
}

describe('fromDTCG', () => {
  it('flattens nested groups to a nested object', () => {
    const v = valueOf({ color: { brand: { '500': { $value: '#3b82f6', $type: 'color' } } } });
    expect(v.color.brand['500']).toBe('#3b82f6');
  });

  it('resolves internal aliases', () => {
    const v = valueOf({
      color: { brand: { '500': { $value: '#3b82f6', $type: 'color' } } },
      text: { default: { $value: '{color.brand.500}', $type: 'color' } },
    });
    expect(v.text.default).toBe('#3b82f6');
  });

  it('resolves alias chains', () => {
    const v = valueOf({
      a: { $value: '{b}' },
      b: { $value: '{c}' },
      c: { $value: 'literal' },
    });
    expect(v.a).toBe('literal');
    expect(v.b).toBe('literal');
  });

  it('uses resolveExternal for targets outside the tree', () => {
    const v = valueOf(
      { x: { $value: '{color.palette.blue.7}' } },
      { resolveExternal: (p) => (p === 'color.palette.blue.7' ? 'var(--c-blue-7)' : undefined) },
    );
    expect(v.x).toBe('var(--c-blue-7)');
  });

  it('reports alias-missing', () => {
    const errs = errorsOf({ g: { x: { $value: '{nope.here}' } } });
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('alias-missing');
    expect(errs[0].path).toBe('g.x');
    expect(errs[0].message).toContain('nope.here');
  });

  it('reports alias-cycle', () => {
    const errs = errorsOf({ a: { $value: '{b}' }, b: { $value: '{a}' } });
    expect(errs.some((e) => e.code === 'alias-cycle')).toBe(true);
    const self = errorsOf({ a: { $value: '{a}' } });
    expect(self[0].code).toBe('alias-cycle');
    expect(self[0].path).toBe('a');
  });

  it('inherits $type from enclosing group', () => {
    const errs = errorsOf({
      colors: { $type: 'color', red: { $value: '#f00' } },
      sizes: { $type: 'dimension', big: { $value: '{colors.red}' } },
    });
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('type-mismatch');
    expect(errs[0].path).toBe('sizes.big');
  });

  it('does not check type-mismatch when either side is untyped', () => {
    const v = valueOf({
      a: { $value: '#f00', $type: 'color' },
      b: { $value: '{a}' },
      c: { $value: 'x' },
      d: { $value: '{c}', $type: 'color' },
    });
    expect(v.b).toBe('#f00');
    expect(v.d).toBe('x');
  });

  it('ignores $description and $extensions as children', () => {
    const v = valueOf({
      $description: 'root',
      g: { $description: 'grp', $extensions: { a: 1 }, t: { $value: '1' } },
    });
    expect(v).toEqual({ g: { t: '1' } });
  });

  it('collects all errors and reports invalid tokens', () => {
    const errs = errorsOf({ a: { $value: '{x}' }, b: { $value: '{y}' }, c: 5 as any });
    expect(errs.map((e) => e.code).sort()).toEqual([
      'alias-missing',
      'alias-missing',
      'invalid-token',
    ]);
  });

  it('returns ok with empty value for an empty tree', () => {
    const r = fromDTCG({});
    expect(r).toEqual({ ok: true, value: {}, warnings: [] });
  });

  it('never throws on non-object input', () => {
    expect(fromDTCG(null as any).ok).toBe(false);
  });
});
