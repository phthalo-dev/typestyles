import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { reset } from './globals';
import { reset as sheetReset, flushSync, getRegisteredCss } from './sheet';
import { createGlobal } from './create-global';

describe('reset (Josh Comeau)', () => {
  beforeEach(() => {
    sheetReset();
  });

  it('emits the core reset rules via globalApply', () => {
    createGlobal().apply(...reset({ includeAppRootIsolation: false }));
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('box-sizing: border-box');
    expect(css).toContain('*:not(dialog)');
    expect(css).toContain('margin: 0');
    expect(css).toContain('prefers-reduced-motion: no-preference');
    expect(css).toContain('interpolate-size: allow-keywords');
    expect(css).toContain('body {');
    expect(css).toContain('line-height: 1.5');
    expect(css).toContain('-webkit-font-smoothing: antialiased');
    expect(css).toContain('img, picture, video, canvas, svg');
    expect(css).toContain('display: block');
    expect(css).toContain('max-width: 100%');
    expect(css).toContain('input, button, textarea, select');
    expect(css).toContain('font: inherit');
    expect(css).toContain('overflow-wrap: break-word');
    expect(css).toContain('text-wrap: pretty');
    expect(css).toContain('text-wrap: balance');
    expect(css).not.toContain('#root');
  });

  it('includes app root isolation by default', () => {
    createGlobal().apply(...reset());
    flushSync();
    expect(getRegisteredCss()).toContain('#root, #__next');
    expect(getRegisteredCss()).toContain('isolation: isolate');
  });

  it('supports layer on each tuple for createGlobal', () => {
    const g = createGlobal({
      layers: ['reset', 'components'] as const,
      globalLayer: 'reset',
    });
    g.apply(...reset({ includeAppRootIsolation: false, layer: 'components' }));
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/@layer components/);
    expect(css).toContain('box-sizing: border-box');
  });
});
