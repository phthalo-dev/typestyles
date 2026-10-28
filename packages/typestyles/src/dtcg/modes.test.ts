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
    expect(errs.find((e) => e.code === 'alias-missing')!.path).toBe('a');
  });

  it('leaves a mode-less token as a scalar', () => {
    const v = valueOf({ bg: { $value: '#fff', $extensions: { other: { x: 1 } } } });
    expect(v.bg).toBe('#fff');
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
