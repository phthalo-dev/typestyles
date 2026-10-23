import { describe, it, expect } from 'vite-plus/test';
import { parseColor, generateRamp, contrastRatio } from './color-scale';

describe('parseColor', () => {
  it('parses #ffffff to near-white OKLCH', () => {
    const result = parseColor('#ffffff');
    expect(result.l).toBeCloseTo(100, 0);
    expect(result.c).toBeCloseTo(0, 2);
  });

  it('parses #000000 to near-black OKLCH', () => {
    const result = parseColor('#000000');
    expect(result.l).toBeCloseTo(0, 0);
    expect(result.c).toBeCloseTo(0, 2);
  });

  it('parses #ff0000 with expected hue', () => {
    const result = parseColor('#ff0000');
    expect(result.l).toBeGreaterThan(50);
    expect(result.c).toBeGreaterThan(0.2);
    expect(result.h).toBeGreaterThan(20);
    expect(result.h).toBeLessThan(40);
  });

  it('parses shorthand #rgb hex', () => {
    const full = parseColor('#ffffff');
    const short = parseColor('#fff');
    expect(short.l).toBeCloseTo(full.l, 1);
    expect(short.c).toBeCloseTo(full.c, 2);
  });

  it('throws on unsupported formats', () => {
    expect(() => parseColor('red')).toThrow(/unsupported color format/);
    expect(() => parseColor('oklch(50% 0.1 250)')).toThrow(/unsupported color format/);
    expect(() => parseColor('rgb(255, 0, 0)')).toThrow(/unsupported color format/);
  });
});

describe('generateRamp', () => {
  it('returns monotonic lightness (lightest to darkest)', () => {
    const ramp = generateRamp({ hue: 250, chroma: 0.15 });
    const lightness = ramp.map((value) => Number.parseFloat(/^oklch\(([\d.]+)%/.exec(value)![1]));
    for (let i = 1; i < lightness.length; i++) {
      expect(lightness[i]).toBeLessThan(lightness[i - 1]);
    }
  });

  it('is deterministic for fixed inputs', () => {
    const a = generateRamp({ hue: 262, chroma: 0.22 });
    const b = generateRamp({ hue: 262, chroma: 0.22 });
    expect(a).toEqual(b);
  });

  it('matches the design-system 10-step snapshot', () => {
    expect(generateRamp({ hue: 262, chroma: 0.22 })).toMatchInlineSnapshot(`
      [
        "oklch(97.00% 0.031 262)",
        "oklch(88.67% 0.075 262)",
        "oklch(80.33% 0.136 262)",
        "oklch(72.00% 0.189 262)",
        "oklch(63.67% 0.22 262)",
        "oklch(55.33% 0.22 262)",
        "oklch(47.00% 0.198 262)",
        "oklch(38.67% 0.15 262)",
        "oklch(30.33% 0.106 262)",
        "oklch(22.00% 0.07 262)",
      ]
    `);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
  });

  it('returns 1 for identical colors', () => {
    expect(contrastRatio('#888888', '#888888')).toBeCloseTo(1, 5);
    expect(contrastRatio('oklch(50% 0.1 250)', 'oklch(50% 0.1 250)')).toBeCloseTo(1, 4);
  });

  it('orders luminance so lighter color is always numerator', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });
});
