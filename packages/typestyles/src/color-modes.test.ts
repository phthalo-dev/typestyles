import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import { serializeStyle } from './serialize-style';
import {
  colorModes,
  expandColorModeProperty,
  isColorModeObject,
  acceptsLightDark,
  resolveColorModes,
} from './color-modes';
import { createStyles } from './styles';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { registeredNamespaces } from './registry';

describe('colorModes serialization', () => {
  const registeredColorModes = colorModes;

  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('exports the default light/dark tuple', () => {
    expect(colorModes).toEqual(['light', 'dark']);
  });

  it('detects mode objects', () => {
    expect(isColorModeObject({ light: 'a', dark: 'b' }, registeredColorModes)).toBe(true);
    expect(isColorModeObject({ base: '8px', md: '16px' }, registeredColorModes)).toBe(false);
  });

  it('expands color properties to light-dark()', () => {
    expect(acceptsLightDark('color')).toBe(true);
    expect(acceptsLightDark('fontWeight')).toBe(false);
    expect(expandColorModeProperty('color', { light: 'a', dark: 'b' }, registeredColorModes)).toBe(
      'light-dark(a, b)',
    );
  });

  it('expands image properties to light-dark()', () => {
    expect(acceptsLightDark('backgroundImage')).toBe(true);
    expect(
      expandColorModeProperty(
        'backgroundImage',
        { light: 'url(/light.png)', dark: 'url(/dark.png)' },
        registeredColorModes,
      ),
    ).toBe('light-dark(url(/light.png), url(/dark.png))');
  });

  it('serializes mode values in serializeStyle', () => {
    const rules = serializeStyle(
      '.card',
      { borderColor: { light: 'red', dark: 'blue' } },
      { colorModes: registeredColorModes },
    );
    expect(rules[0].css).toContain('border-color: light-dark(red, blue)');
  });

  it('leaves scalar values unchanged', () => {
    const rules = serializeStyle('.card', { color: 'red' }, { colorModes: registeredColorModes });
    expect(rules[0].css).toContain('color: red');
  });

  it('serializes mode values on styles.component() definitions', () => {
    const styles = createStyles({ colorModes: registeredColorModes });
    styles.component({
      name: 'mode-comp-card',
      styles: {
        base: {
          color: { light: '#111', dark: '#eee' },
          borderColor: { light: 'red', dark: 'blue' },
        },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.mode-comp-card');
    expect(css).toContain('color: light-dark(#111, #eee)');
    expect(css).toContain('border-color: light-dark(red, blue)');
  });

  it('skips conditions key in plain style objects with a dev warning', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const rules = serializeStyle('.card', {
      color: 'red',
      conditions: [{ when: { type: 'media', query: 'x' }, style: { opacity: 0.5 } }],
    } as never);

    expect(rules[0].css).toContain('color: red');
    expect(rules[0].css).not.toContain('conditions');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('conditions'));

    warn.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe('dev warnings', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('warns when colorModes is not configured', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      serializeStyle('.card', { color: { light: 'a', dark: 'b' } });
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('colorModes'));
      warn.mockRestore();
    });

    it('warns on structural properties', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expandColorModeProperty('fontWeight', { light: 400, dark: 600 }, registeredColorModes);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('light-dark()'));
      warn.mockRestore();
    });

    it('warns when mode and breakpoint keys are mixed on one property', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      serializeStyle(
        '.card',
        { padding: { light: '8px', dark: '12px', md: '16px' } },
        {
          colorModes: registeredColorModes,
          breakpoints: { md: '(min-width: 768px)' },
        },
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('mixes mode'));
      warn.mockRestore();
    });

    it('warns when more than two color modes are registered', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      resolveColorModes(['light', 'dark', 'highContrast']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('at most two'));
      warn.mockRestore();
    });

    it('warns when light/dark keys are registered in reverse order', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      resolveColorModes(['dark', 'light']);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('array order'));
      warn.mockRestore();
    });

    it('expands with reversed registration order using array index, not key names', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const reversed = ['dark', 'light'] as const;
      const expanded = expandColorModeProperty('color', { dark: '#eee', light: '#111' }, reversed);
      expect(expanded).toBe('light-dark(#eee, #111)');
      warn.mockRestore();
    });
  });
});
