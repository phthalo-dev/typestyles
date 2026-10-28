import { describe, it, expect, beforeEach } from 'vitest';
import { fromDTCG } from './from-dtcg';
import { toDTCG } from './to-dtcg';
import type { DTCGGroup } from './types';
import { createTheme } from '../theme';
import { reset, flushSync, getRegisteredCss } from '../sheet';

const EXT = 'dev.typestyles';

function valueOf(tree: DTCGGroup, options?: Parameters<typeof fromDTCG>[1]) {
  const r = fromDTCG(tree, options);
  if (!r.ok) throw new Error('unexpected errors: ' + JSON.stringify(r.errors));
  return r.value as any;
}

function errorsOf(tree: DTCGGroup, options?: Parameters<typeof fromDTCG>[1]) {
  const r = fromDTCG(tree, options);
  if (r.ok) throw new Error('expected errors');
  return r.errors;
}

describe('fromDTCG modes', () => {
  it('maps $extensions dark to { light, dark }', () => {
    const v = valueOf({
      bg: { $value: '#fff', $type: 'color', $extensions: { [EXT]: { dark: '#000' } } },
    });
    expect(v.bg).toEqual({ light: '#fff', dark: '#000' });
  });

  it('resolves a dark alias independently of light', () => {
    const v = valueOf({
      base: { $value: '#111', $type: 'color' },
      inverse: { $value: '#eee', $type: 'color' },
      bg: { $value: '{inverse}', $type: 'color', $extensions: { [EXT]: { dark: '{base}' } } },
    });
    expect(v.bg).toEqual({ light: '#eee', dark: '#111' });
  });

  it('resolves a dark alias via resolveExternal', () => {
    const v = valueOf(
      { bg: { $value: '#fff', $extensions: { [EXT]: { dark: '{ext.black}' } } } },
      { resolveExternal: (p) => (p === 'ext.black' ? '#000' : undefined) },
    );
    expect(v.bg).toEqual({ light: '#fff', dark: '#000' });
  });

  it('reports missing, cyclic and mismatched dark aliases', () => {
    const errs = errorsOf({
      n: { $value: 1, $type: 'number' },
      c: { $value: '#fff', $type: 'color' },
      a: { $value: '#fff', $extensions: { [EXT]: { dark: '{nope}' } } },
      b: { $value: '#fff', $extensions: { [EXT]: { dark: '{b2}' } } },
      b2: { $value: '{b2}' },
      t: { $value: '#fff', $type: 'color', $extensions: { [EXT]: { dark: '{n}' } } },
    });
    const codes = errs.map((e) => e.code);
    expect(codes).toContain('alias-missing');
    expect(codes).toContain('type-mismatch');
    expect(codes).toContain('alias-cycle');
    expect(errs.find((e) => e.code === 'alias-missing')!.path).toBe('a');
  });

  it('leaves a mode-less token as a scalar', () => {
    const v = valueOf({ bg: { $value: '#fff', $extensions: { other: { x: 1 } } } });
    expect(v.bg).toBe('#fff');
  });
});

describe('fromDTCG per-mode alias resolution', () => {
  const X = { $value: '#fff', $extensions: { [EXT]: { dark: '#000' } } };

  it('an alias to a mode-aware token follows its dark value', () => {
    const v = valueOf({ X, Y: { $value: '{X}' } });
    expect(v.Y).toEqual({ light: '#fff', dark: '#000' });
  });

  it('an explicit dark alias to a mode-aware token uses its dark value', () => {
    const v = valueOf({ X, Z: { $value: '{X}', $extensions: { [EXT]: { dark: '{X}' } } } });
    expect(v.Z).toEqual({ light: '#fff', dark: '#000' });
  });

  it('follows chains through mode-less tokens', () => {
    const v = valueOf({ X, W: { $value: '{X}' }, Y: { $value: '{W}' } });
    expect(v.Y).toEqual({ light: '#fff', dark: '#000' });
    expect(v.W).toEqual({ light: '#fff', dark: '#000' });
  });

  it('dark alias to a mode-less target falls back to its light value (scalar if no hop has dark)', () => {
    const v = valueOf({
      base: { $value: '#123' },
      A: { $value: '#fff', $extensions: { [EXT]: { dark: '{base}' } } },
      B: { $value: '{base}' },
    });
    expect(v.A).toEqual({ light: '#fff', dark: '#123' });
    expect(v.B).toBe('#123');
  });

  it('a dark node aliasing its own dark node is an alias-cycle', () => {
    const errs = errorsOf({ X: { $value: '#fff', $extensions: { [EXT]: { dark: '{X}' } } } });
    expect(errs.map((e) => e.code)).toEqual(['alias-cycle']);
    expect(errs[0].message).toContain('X (dark)');
    expect(errs[0].message).not.toContain('\u0000');
  });

  it('cycle messages never contain the internal NUL suffix', () => {
    const errs = errorsOf({
      a: { $value: '#fff', $extensions: { [EXT]: { dark: '{b}' } } },
      b: { $value: '#fff', $extensions: { [EXT]: { dark: '{a}' } } },
    });
    for (const e of errs) expect(e.message).not.toContain('\u0000');
    expect(errs.some((e) => e.code === 'alias-cycle')).toBe(true);
  });

  it('does not report the same error twice for a token', () => {
    const errs = errorsOf({ a: { $value: '{nope}' } });
    expect(errs).toHaveLength(1);
  });

  it('rejects dark: null as invalid-token', () => {
    const errs = errorsOf({ a: { $value: '#fff', $extensions: { [EXT]: { dark: null } } } });
    expect(errs.map((e) => e.code)).toEqual(['invalid-token']);
    expect(errs[0].path).toBe('a');
  });
});

describe('toDTCG', () => {
  it('toDTCG then fromDTCG round-trips mode leaves', () => {
    const tokens = {
      color: { bg: { light: '#fff', dark: '#000' }, brand: '#36f' },
      space: { sm: '4px' },
    };
    const tree = toDTCG(tokens);
    expect((tree.color as any).bg).toEqual({
      $value: '#fff',
      $extensions: { [EXT]: { dark: '#000' } },
    });
    expect(valueOf(tree)).toEqual(tokens);
  });

  it('toDTCG sets $type from typeOf', () => {
    const tree = toDTCG(
      { color: { bg: { light: '#fff', dark: '#000' }, brand: '#36f' }, space: { sm: '4px' } },
      { typeOf: (p) => (p.startsWith('color.') ? 'color' : undefined) },
    );
    expect((tree.color as any).bg.$type).toBe('color');
    expect((tree.color as any).brand).toEqual({ $value: '#36f', $type: 'color' });
    expect((tree.space as any).sm).toEqual({ $value: '4px' });
  });

  it('does not write __proto__ keys unsafely and does not throw on odd input', () => {
    const evil = JSON.parse('{"__proto__":{"polluted":"x"},"ok":"1"}');
    const tree = toDTCG(evil);
    expect(({} as any).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(tree)).toBe(Object.prototype);
    expect((tree as any).ok).toEqual({ $value: '1' });
    expect(() => toDTCG(null as any)).not.toThrow();
    expect(() => toDTCG({ a: undefined, b: () => 1, c: null } as any)).not.toThrow();
    const cyc: any = {};
    cyc.self = cyc;
    expect(() => toDTCG(cyc)).not.toThrow();
  });
});

describe('fromDTCG output with tokens.createTheme', () => {
  beforeEach(() => reset());

  it('is accepted by createTheme', () => {
    const tokens = valueOf({
      color: { text: { $value: '#111', $extensions: { [EXT]: { dark: '#eee' } } } },
    });
    createTheme('dtcg', { tokens }, undefined, undefined, undefined, {
      colorModes: ['light', 'dark'],
    });
    flushSync();
    expect(getRegisteredCss()).toContain('light-dark(#111, #eee)');
  });
});
