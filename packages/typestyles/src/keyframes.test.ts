import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { createKeyframes } from './keyframes';
import { reset, flushSync } from './sheet';

/**
 * Helper to get all injected CSS text from the style element.
 * jsdom doesn't support CSSKeyframesRule, so we check via textContent fallback.
 */
function getInjectedCSS(): string {
  const style = document.getElementById('typestyles') as HTMLStyleElement;
  if (!style) return '';

  // Collect from both cssRules (insertRule path) and textContent (fallback path)
  const fromRules = Array.from(style.sheet?.cssRules ?? [])
    .map((r) => r.cssText)
    .join('\n');
  const fromText = style.textContent ?? '';

  return fromRules + fromText;
}

describe('createKeyframes', () => {
  beforeEach(() => {
    reset();
  });

  it('returns the animation name', () => {
    const name = createKeyframes('fadeIn', {
      from: { opacity: 0 },
      to: { opacity: 1 },
    });

    expect(name).toBe('fadeIn');
  });

  it('injects a @keyframes rule', () => {
    createKeyframes('slideUp', {
      from: { transform: 'translateY(20px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    });

    flushSync();

    const css = getInjectedCSS();
    expect(css).toContain('@keyframes slideUp');
    expect(css).toContain('from');
    expect(css).toContain('to');
    expect(css).toContain('opacity');
    expect(css).toContain('transform');
  });

  it('supports percentage stops', () => {
    createKeyframes('bounce', {
      '0%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-20px)' },
      '100%': { transform: 'translateY(0)' },
    });

    flushSync();

    const css = getInjectedCSS();
    expect(css).toContain('@keyframes bounce');
    expect(css).toContain('0%');
    expect(css).toContain('50%');
    expect(css).toContain('100%');
  });

  it('converts camelCase properties to kebab-case', () => {
    createKeyframes('grow', {
      from: { fontSize: '12px', backgroundColor: 'red' },
      to: { fontSize: '24px', backgroundColor: 'blue' },
    });

    flushSync();

    const css = getInjectedCSS();
    expect(css).toContain('font-size');
    expect(css).toContain('background-color');
  });

  it('is usable as a string in animation shorthand', () => {
    const fadeIn = createKeyframes('fadeIn', {
      from: { opacity: 0 },
      to: { opacity: 1 },
    });

    const animation = `${fadeIn} 300ms ease`;
    expect(animation).toBe('fadeIn 300ms ease');
  });

  it('deduplicates same-name keyframes', () => {
    createKeyframes('dedupTest', {
      from: { opacity: 0 },
      to: { opacity: 1 },
    });

    createKeyframes('dedupTest', {
      from: { opacity: 0.5 },
      to: { opacity: 1 },
    });

    flushSync();

    const css = getInjectedCSS();
    const matches = css.match(/@keyframes dedupTest/g);
    expect(matches).toHaveLength(1);
  });

  it('handles numeric values with px', () => {
    createKeyframes('slide', {
      from: { width: 0 },
      to: { width: 100 },
    });

    flushSync();

    const css = getInjectedCSS();
    expect(css).toContain('width: 100px');
  });

  it('handles zero values without px', () => {
    createKeyframes('fadeFromZero', {
      from: { margin: 0 },
      to: { margin: 20 },
    });

    flushSync();

    const css = getInjectedCSS();
    expect(css).toContain('margin: 0;');
    expect(css).toContain('margin: 20px;');
  });
});
