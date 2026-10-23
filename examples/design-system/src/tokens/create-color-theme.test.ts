import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import * as colorScale from 'typestyles/color-scale';
import { basePaletteTokenValues } from './palette';
import { createColorTheme } from './create-color-theme';
import type { DesignColorValues } from './semantic';

/** Snapshot of palette output before the color-scale extraction — guards byte-identical ramps. */
const PALETTE_BYTE_IDENTICAL_FIXTURE: Record<string, string> = {
  'sky-7': 'oklch(47.00% 0.126 238)',
  'neutral-1': 'oklch(97.00% 0 0)',
  'red-7': 'oklch(47.00% 0.189 27)',
  'gray-1': 'oklch(97.00% 0.002 264)',
};

function assertDesignColorShape(values: DesignColorValues): void {
  expect(values.background).toMatchObject({
    app: expect.any(String),
    surface: expect.any(String),
    subtle: expect.any(String),
    elevated: expect.any(String),
  });
  expect(values.text).toMatchObject({
    primary: expect.any(String),
    secondary: expect.any(String),
    onAccent: expect.any(String),
    onDanger: expect.any(String),
  });
  expect(values.accent).toMatchObject({ default: expect.any(String), hover: expect.any(String) });
  expect(values.border).toMatchObject({
    default: expect.any(String),
    strong: expect.any(String),
    focus: expect.any(String),
  });
  expect(values.shadow).toMatchObject({ offset: expect.any(String) });
  expect(values.danger).toMatchObject({ default: expect.any(String), solid: expect.any(String) });
  expect(values.success).toMatchObject({ default: expect.any(String), solid: expect.any(String) });
  expect(values.warning).toMatchObject({
    default: expect.any(String),
    onSolid: expect.any(String),
  });
  expect(values.info).toMatchObject({ default: expect.any(String), onSolid: expect.any(String) });
  expect(values.overlay).toMatchObject({ default: expect.any(String) });
}

describe('palette extraction', () => {
  it('keeps representative palette steps byte-identical after generateRamp refactor', () => {
    for (const [key, expected] of Object.entries(PALETTE_BYTE_IDENTICAL_FIXTURE)) {
      expect(basePaletteTokenValues[key as keyof typeof basePaletteTokenValues]).toBe(expected);
    }
  });
});

describe('createColorTheme', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns DesignColorValues-shaped light and dark for the default accent', () => {
    const theme = createColorTheme({ accent: '#0064E0' });
    assertDesignColorShape(theme.light);
    assertDesignColorShape(theme.dark);
    expect(theme).toMatchSnapshot();
  });

  it('returns themes for a saturated pink accent', () => {
    const theme = createColorTheme({ accent: '#FF1493' });
    assertDesignColorShape(theme.light);
    assertDesignColorShape(theme.dark);
    expect(theme).toMatchSnapshot();
  });

  it('clamps chroma for a near-gray accent', () => {
    const theme = createColorTheme({ accent: '#808080' });
    assertDesignColorShape(theme.light);
    expect(theme.light.accent.default).toMatch(/oklch\(/);
    expect(theme).toMatchSnapshot();
  });

  it('warns when contrast validation fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(colorScale, 'contrastRatio').mockReturnValue(3);
    createColorTheme({ accent: '#0064E0', contrast: 'standard' });
    expect(warn).toHaveBeenCalled();
    const messages = warn.mock.calls.map((call) => String(call[0]));
    expect(messages.some((msg) => msg.includes('createColorTheme'))).toBe(true);
  });

  it('stays silent for a known-good accent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    createColorTheme({ accent: '#0064E0', contrast: 'standard' });
    expect(warn).not.toHaveBeenCalled();
  });
});
