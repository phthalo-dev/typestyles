import { describe, it, expect } from 'vite-plus/test';
import { mediaQueries } from './media-queries';

describe('mediaQueries', () => {
  it('prefersReducedMotion', () => {
    expect(mediaQueries.prefersReducedMotion.reduce).toBe(
      '@media (prefers-reduced-motion: reduce)',
    );
    expect(mediaQueries.prefersReducedMotion.noPreference).toBe(
      '@media (prefers-reduced-motion: no-preference)',
    );
  });

  it('prefersContrast', () => {
    expect(mediaQueries.prefersContrast.more).toBe('@media (prefers-contrast: more)');
    expect(mediaQueries.prefersContrast.less).toBe('@media (prefers-contrast: less)');
    expect(mediaQueries.prefersContrast.noPreference).toBe(
      '@media (prefers-contrast: no-preference)',
    );
  });

  it('hover', () => {
    expect(mediaQueries.hover.hover).toBe('@media (hover: hover)');
    expect(mediaQueries.hover.none).toBe('@media (hover: none)');
  });

  it('anyHover', () => {
    expect(mediaQueries.anyHover.hover).toBe('@media (any-hover: hover)');
    expect(mediaQueries.anyHover.none).toBe('@media (any-hover: none)');
  });

  it('pointer', () => {
    expect(mediaQueries.pointer.fine).toBe('@media (pointer: fine)');
    expect(mediaQueries.pointer.coarse).toBe('@media (pointer: coarse)');
    expect(mediaQueries.pointer.none).toBe('@media (pointer: none)');
  });

  it('anyPointer', () => {
    expect(mediaQueries.anyPointer.fine).toBe('@media (any-pointer: fine)');
    expect(mediaQueries.anyPointer.coarse).toBe('@media (any-pointer: coarse)');
    expect(mediaQueries.anyPointer.none).toBe('@media (any-pointer: none)');
  });
});

describe('mediaQueries package export', () => {
  it('is re-exported from the package root', async () => {
    const pkg = await import('./index');
    expect(pkg.mediaQueries).toBe(mediaQueries);
  });
});
