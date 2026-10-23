import { describe, expect, it } from 'vite-plus/test';
import { atan2, calc, clamp, cos, hypot, pow, sin, sqrt, tan } from './css-math';

describe('calc', () => {
  it('wraps a static expression', () => {
    expect(calc`100% - 1px`).toBe('calc(100% - 1px)');
  });

  it('interpolates values', () => {
    expect(calc`100vh - 2 * ${'8px'}`).toBe('calc(100vh - 2 * 8px)');
  });

  it('interpolates numbers', () => {
    expect(calc`${16}px + 1rem`).toBe('calc(16px + 1rem)');
  });

  it('handles multiple holes', () => {
    expect(calc`${100}% - ${2} * ${'4px'}`).toBe('calc(100% - 2 * 4px)');
  });
});

describe('clamp', () => {
  it('emits clamp with three arguments', () => {
    expect(clamp('1rem', '5vw', '3rem')).toBe('clamp(1rem, 5vw, 3rem)');
  });

  it('accepts numbers where units are implied elsewhere', () => {
    expect(clamp(0, 10, 100)).toBe('clamp(0, 10, 100)');
  });
});

describe('trig and exponential functions', () => {
  it('sin', () => {
    expect(sin('45deg')).toBe('sin(45deg)');
  });

  it('cos', () => {
    expect(cos('45deg')).toBe('cos(45deg)');
  });

  it('tan', () => {
    expect(tan('45deg')).toBe('tan(45deg)');
  });

  it('atan2', () => {
    expect(atan2('1', '1')).toBe('atan2(1, 1)');
  });

  it('pow', () => {
    expect(pow('2', '8')).toBe('pow(2, 8)');
  });

  it('sqrt', () => {
    expect(sqrt('16')).toBe('sqrt(16)');
  });

  it('hypot with no arguments', () => {
    expect(hypot()).toBe('hypot()');
  });

  it('hypot with one argument', () => {
    expect(hypot('3px')).toBe('hypot(3px)');
  });

  it('hypot with multiple arguments', () => {
    expect(hypot('3px', '4px')).toBe('hypot(3px, 4px)');
    expect(hypot('3px', '4px', '5px')).toBe('hypot(3px, 4px, 5px)');
  });
});
