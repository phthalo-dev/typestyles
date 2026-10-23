import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { atProperty } from './at-property';
import { createTokens } from './tokens';
const tokens = createTokens();
import { getRegisteredCss, reset, flushSync } from './sheet';

describe('atProperty', () => {
  it('exposes spreadable presets with syntax and initial placeholders', () => {
    expect(atProperty.color).toEqual({
      syntax: '<color>',
      initial: 'transparent',
    });
    expect(atProperty.angle.syntax).toBe('<angle>');
  });

  it('list applies a list multiplier to a preset syntax', () => {
    expect(atProperty.list(atProperty.color)).toEqual({
      syntax: '<color>+',
      initial: 'transparent',
    });
    expect(atProperty.list(atProperty.color, '#')).toMatchObject({ syntax: '<color>#' });
  });

  it('union joins preset syntax strings', () => {
    expect(atProperty.union(atProperty.length, atProperty.percentage)).toEqual({
      syntax: '<length> | <percentage>',
      inherits: false,
    });
  });

  it('spread override changes inherits while keeping syntax', () => {
    expect({ ...atProperty.color, inherits: true }).toEqual({
      syntax: '<color>',
      inherits: true,
      initial: 'transparent',
    });
  });
});

describe('atProperty with tokens.declare', () => {
  beforeEach(() => {
    reset();
  });

  it('registers @property from preset leaves', () => {
    tokens.declare('at-prop-color', {
      accent: { default: atProperty.color },
      border: { ...atProperty.color, inherits: true },
      hue: { syntax: atProperty.angle.syntax },
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --at-prop-color-accent-default');
    expect(css).toContain('initial-value: transparent');
    expect(css).toMatch(/@property --at-prop-color-accent-default \{[^}]*inherits: true;/);
    expect(css).toContain('@property --at-prop-color-border');
    expect(css).toContain('inherits: true');
    expect(css).toContain('@property --at-prop-color-hue');
    expect(css).toContain('initial-value: 0deg');
  });
});
