import { describe, it, expect } from 'vite-plus/test';
import { generateGeometricScale, generateLinearScale, expandDurationBand } from './token-scale';

describe('generateGeometricScale', () => {
  it('produces deterministic output for a known (base, ratio, steps) triple', () => {
    // Classic major-third font ladder anchored at 16.
    const scale = generateGeometricScale({
      base: 16,
      ratio: 1.25,
      steps: [-2, -1, 0, 1, 2, 3, 4],
    });
    expect(scale).toEqual([
      Math.round(16 / 1.25 ** 2), // 10.24 → 10
      Math.round(16 / 1.25), // 12.8 → 13
      16,
      20,
      25,
      Math.round(16 * 1.25 ** 3), // 31.25 → 31
      Math.round(16 * 1.25 ** 4), // 39.0625 → 39
    ]);
    expect(scale).toEqual([10, 13, 16, 20, 25, 31, 39]);
  });

  it('returns exactly base at offset 0 (no rounding drift)', () => {
    for (const base of [4, 12, 16, 100]) {
      const [value] = generateGeometricScale({ base, ratio: 1.333, steps: [0] });
      expect(value).toBe(base);
    }
  });

  it('preserves the order of steps and returns one value per step', () => {
    const steps = [3, -1, 0, 2];
    const scale = generateGeometricScale({ base: 16, ratio: 1.25, steps });
    expect(scale).toHaveLength(steps.length);
    expect(scale).toEqual([31, 13, 16, 25]);
  });

  it('supports a single-step scale', () => {
    expect(generateGeometricScale({ base: 8, ratio: 2, steps: [1] })).toEqual([16]);
  });

  it('returns an empty array for empty steps', () => {
    expect(generateGeometricScale({ base: 16, ratio: 1.25, steps: [] })).toEqual([]);
  });

  it('rounds with Math.round by default and honors a round override', () => {
    // 16 * 1.2 = 19.2 → Math.round gives 19, Math.ceil gives 20, identity keeps 19.2.
    expect(generateGeometricScale({ base: 16, ratio: 1.2, steps: [1] })).toEqual([19]);
    expect(generateGeometricScale({ base: 16, ratio: 1.2, steps: [1], round: Math.ceil })).toEqual([
      20,
    ]);
    expect(generateGeometricScale({ base: 16, ratio: 1.2, steps: [1], round: (n) => n })).toEqual([
      19.2,
    ]);
  });

  it('throws on zero, negative, or non-finite ratio', () => {
    expect(() => generateGeometricScale({ base: 16, ratio: 0, steps: [0] })).toThrow(
      /`ratio` must be greater than 0/,
    );
    expect(() => generateGeometricScale({ base: 16, ratio: -1.25, steps: [0] })).toThrow(
      /`ratio` must be greater than 0/,
    );
    expect(() => generateGeometricScale({ base: 16, ratio: Number.NaN, steps: [0] })).toThrow(
      /`ratio` must be a finite number/,
    );
    expect(() => generateGeometricScale({ base: 16, ratio: Infinity, steps: [0] })).toThrow(
      /`ratio` must be a finite number/,
    );
  });

  it('throws on non-finite base', () => {
    expect(() => generateGeometricScale({ base: Number.NaN, ratio: 1.25, steps: [0] })).toThrow(
      /`base` must be a finite number/,
    );
  });

  it('throws on non-integer step offsets', () => {
    expect(() => generateGeometricScale({ base: 16, ratio: 1.25, steps: [0.5] })).toThrow(
      /signed integer offsets/,
    );
    expect(() => generateGeometricScale({ base: 16, ratio: 1.25, steps: [Number.NaN] })).toThrow(
      /signed integer offsets/,
    );
  });
});

describe('generateLinearScale', () => {
  it('produces deterministic output for a known (base, multiplier, steps) triple', () => {
    // Radius-style ladder: 4px grid, 1x multiplier.
    expect(generateLinearScale({ base: 4, multiplier: 1, steps: [1, 2, 3, 4, 6] })).toEqual([
      4, 8, 12, 16, 24,
    ]);
  });

  it('applies the multiplier on top of base * step', () => {
    expect(generateLinearScale({ base: 4, multiplier: 1.5, steps: [1, 2, 3] })).toEqual([
      6, 12, 18,
    ]);
  });

  it('returns all zeros when multiplier is 0', () => {
    expect(generateLinearScale({ base: 4, multiplier: 0, steps: [1, 2, 3, 4] })).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it('returns 0 for a step of 0', () => {
    expect(generateLinearScale({ base: 4, multiplier: 1, steps: [0, 1] })).toEqual([0, 4]);
  });

  it('supports a single-step scale and empty steps', () => {
    expect(generateLinearScale({ base: 4, multiplier: 1, steps: [2] })).toEqual([8]);
    expect(generateLinearScale({ base: 4, multiplier: 1, steps: [] })).toEqual([]);
  });

  it('rounds with Math.round by default and honors a round override', () => {
    // 5 * 1 * 0.5 = 2.5 → Math.round gives 3, Math.floor gives 2.
    expect(generateLinearScale({ base: 5, multiplier: 0.5, steps: [1] })).toEqual([3]);
    expect(
      generateLinearScale({ base: 5, multiplier: 0.5, steps: [1], round: Math.floor }),
    ).toEqual([2]);
  });

  it('throws on non-finite base, multiplier, or steps', () => {
    expect(() => generateLinearScale({ base: Number.NaN, multiplier: 1, steps: [1] })).toThrow(
      /`base` must be a finite number/,
    );
    expect(() => generateLinearScale({ base: 4, multiplier: Infinity, steps: [1] })).toThrow(
      /`multiplier` must be a finite number/,
    );
    expect(() => generateLinearScale({ base: 4, multiplier: 1, steps: [Number.NaN] })).toThrow(
      /`steps\[\]` must be a finite number/,
    );
  });
});

describe('expandDurationBand', () => {
  it('computes min/max from the stated formula for arbitrary inputs', () => {
    const cases: Array<{ base: number; ratio: number }> = [
      { base: 150, ratio: 0.625 },
      { base: 300, ratio: 0.5 },
      { base: 120, ratio: 0.8 },
      { base: 90, ratio: 0.75 },
    ];
    for (const { base, ratio } of cases) {
      const band = expandDurationBand({ base, ratio });
      expect(band.min).toBe(Math.round((base * ratio) / 5) * 5);
      expect(band.max).toBe(Math.round(base / ratio / 5) * 5);
      expect(band.base).toBe(base);
    }
  });

  it('rounds to the nearest 5 by default', () => {
    // 150 * 0.625 = 93.75 → 95; 150 / 0.625 = 240 → 240.
    expect(expandDurationBand({ base: 150, ratio: 0.625 })).toEqual({
      min: 95,
      base: 150,
      max: 240,
    });
  });

  it('passes base through unchanged even when it is not a multiple of roundTo', () => {
    expect(expandDurationBand({ base: 123, ratio: 0.5 }).base).toBe(123);
  });

  it('honors a roundTo override', () => {
    // 150 * 0.625 = 93.75 → nearest 1 is 94; nearest 25 is 100.
    expect(expandDurationBand({ base: 150, ratio: 0.625, roundTo: 1 })).toEqual({
      min: 94,
      base: 150,
      max: 240,
    });
    expect(expandDurationBand({ base: 150, ratio: 0.625, roundTo: 25 })).toEqual({
      min: 100,
      base: 150,
      max: 250,
    });
  });

  it('returns min < base < max for ratios below 1 and a degenerate band at ratio 1', () => {
    const band = expandDurationBand({ base: 200, ratio: 0.5 });
    expect(band.min).toBeLessThan(band.base);
    expect(band.max).toBeGreaterThan(band.base);
    expect(expandDurationBand({ base: 200, ratio: 1 })).toEqual({ min: 200, base: 200, max: 200 });
  });

  it('throws on zero, negative, or non-finite ratio', () => {
    expect(() => expandDurationBand({ base: 150, ratio: 0 })).toThrow(
      /`ratio` must be greater than 0/,
    );
    expect(() => expandDurationBand({ base: 150, ratio: -0.5 })).toThrow(
      /`ratio` must be greater than 0/,
    );
    expect(() => expandDurationBand({ base: 150, ratio: Number.NaN })).toThrow(
      /`ratio` must be a finite number/,
    );
  });

  it('throws on zero or negative roundTo and non-finite base', () => {
    expect(() => expandDurationBand({ base: 150, ratio: 0.5, roundTo: 0 })).toThrow(
      /`roundTo` must be greater than 0/,
    );
    expect(() => expandDurationBand({ base: 150, ratio: 0.5, roundTo: -5 })).toThrow(
      /`roundTo` must be greater than 0/,
    );
    expect(() => expandDurationBand({ base: Infinity, ratio: 0.5 })).toThrow(
      /`base` must be a finite number/,
    );
  });
});
