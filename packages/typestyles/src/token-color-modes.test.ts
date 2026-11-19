import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import { colorModes, isColorModeObject } from './color-modes';
import {
  canUseLightDarkForTokenValue,
  expandModeAwareTokenValues,
  mergeTokenTreesWithColorModes,
  coerceUnexpandedModeLeaves,
} from './token-color-modes';

describe('token-color-modes', () => {
  it('detects color vs shadow token leaves', () => {
    expect(canUseLightDarkForTokenValue('oklch(55% 0.2 290)')).toBe(true);
    expect(canUseLightDarkForTokenValue('var(--color-accent)')).toBe(true);
    expect(canUseLightDarkForTokenValue('0 0 0 3px oklch(90% 0.08 290)')).toBe(false);
  });

  it('only treats color keywords as colors (var-ui#248)', () => {
    for (const color of ['red', 'RebeccaPurple', 'transparent', 'currentColor', 'Canvas', '#fff']) {
      expect(canUseLightDarkForTokenValue(color)).toBe(true);
    }
    for (const fn of ['lab(50% 40 59)', 'color(display-p3 1 0 0)', 'conic-gradient(red, blue)']) {
      expect(canUseLightDarkForTokenValue(fn)).toBe(true);
    }
    for (const other of ['normal', 'screen', 'none', 'grayscale(1)', 'blur(4px)', '0.5', '2px']) {
      expect(canUseLightDarkForTokenValue(other)).toBe(false);
    }
  });

  it('emits a keyword mode leaf as a dark-mode override, silently (var-ui#248)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { expanded, darkOnly } = expandModeAwareTokenValues(
      { artBlend: { light: 'normal', dark: 'screen' } },
      colorModes,
    );
    expect(expanded).toEqual({ artBlend: 'normal' });
    expect(darkOnly).toEqual({ artBlend: 'screen' });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('expands mode-aware leaves to light-dark()', () => {
    const { expanded } = expandModeAwareTokenValues(
      { accent: { light: '#111', dark: '#eee' } },
      colorModes,
    );
    expect(expanded).toEqual({ accent: 'light-dark(#111, #eee)' });
  });

  it('keeps identical mode-aware leaves as scalars', () => {
    const { expanded } = expandModeAwareTokenValues(
      { border: { light: '#000', dark: '#000' } },
      colorModes,
    );
    expect(expanded).toEqual({ border: '#000' });
  });

  it('splits incompatible leaves into darkOnly', () => {
    const { expanded, darkOnly } = expandModeAwareTokenValues(
      { glow: { light: '0 0 0 3px blue', dark: '0 0 16px navy' } },
      colorModes,
    );
    expect(expanded).toEqual({ glow: '0 0 0 3px blue' });
    expect(darkOnly).toEqual({ glow: '0 0 16px navy' });
  });

  it('merges token trees with light-dark leaves', () => {
    const { merged } = mergeTokenTreesWithColorModes(
      { accent: { default: '#111' } },
      { accent: { default: '#eee' } },
    );
    expect(merged).toEqual({ accent: { default: 'light-dark(#111, #eee)' } });
  });

  it('detects mode-aware leaves for merge', () => {
    expect(isColorModeObject({ light: '#111', dark: '#222' }, colorModes)).toBe(true);
  });

  it('applies scalar dark patch over mode-aware base leaf', () => {
    const { merged } = mergeTokenTreesWithColorModes(
      { accent: { light: '#111', dark: '#222' } },
      { accent: '#eee' },
    );
    expect(merged).toEqual({ accent: 'light-dark(#111, #eee)' });
  });

  it('coerces mode-aware leaves without colorModes to light value', () => {
    expect(coerceUnexpandedModeLeaves({ accent: { light: '#111', dark: '#eee' } })).toEqual({
      accent: '#111',
    });
    const { expanded } = expandModeAwareTokenValues(
      { accent: { light: '#111', dark: '#eee' } },
      undefined,
    );
    expect(expanded).toEqual({ accent: '#111' });
  });

  describe('dev warnings', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    afterEach(() => {
      vi.stubEnv('NODE_ENV', originalEnv ?? 'test');
      vi.restoreAllMocks();
    });

    it('warns when colorModes is not configured', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expandModeAwareTokenValues({ accent: { light: '#111', dark: '#eee' } }, undefined);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('colorModes'));
    });
  });
});
