import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { colorModes } from './color-modes';
import { normalizeModeAwareOverrides } from './token-color-modes';
import { createTheme } from './theme';
import { reset, getRegisteredCss, flushSync } from './sheet';

describe('normalizeModeAwareOverrides', () => {
  it('splits nested color trees into light base and dark patch', () => {
    const { base, darkPatch } = normalizeModeAwareOverrides(
      {
        color: {
          text: {
            primary: { light: '#111', dark: '#eee' },
            muted: { light: '#666', dark: '#999' },
          },
          bg: { canvas: { light: '#fff', dark: '#000' } },
        },
      },
      colorModes,
    );

    expect(base).toEqual({
      color: {
        text: { primary: '#111', muted: '#666' },
        bg: { canvas: '#fff' },
      },
    });
    expect(darkPatch).toEqual({
      color: {
        text: { primary: '#eee', muted: '#999' },
        bg: { canvas: '#000' },
      },
    });
  });

  it('omits darkPatch entries when light and dark match', () => {
    const { base, darkPatch } = normalizeModeAwareOverrides(
      {
        color: { border: { light: '#ccc', dark: '#ccc' } },
      },
      colorModes,
    );
    expect(base).toEqual({ color: { border: '#ccc' } });
    expect(darkPatch).toEqual({});
  });
});

describe('createTheme with mode-aware leaves', () => {
  beforeEach(() => reset());

  it('compiles nested mode-aware leaves to light-dark()', () => {
    createTheme(
      'nested',
      {
        base: {
          color: {
            accent: { default: { light: '#111', dark: '#333' } },
          },
        },
      },
      undefined,
      undefined,
      undefined,
      { colorModes: ['light', 'dark'] },
    );
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/--color-accent-default:\s*light-dark\(#111, #333\)/);
  });
});
