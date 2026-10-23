import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import {
  flattenVarValues,
  resolveVarOverrides,
  resolveVarHostSlot,
  resolveVarHostClass,
  expandVarOverrideDeclarations,
} from './component-var-overrides';
import type { ComponentVarRegistry } from './component-meta';
import type { DimensionedComponentMeta, SlotComponentMeta } from './component-meta';

describe('flattenVarValues', () => {
  it('flattens nested objects to dashed paths', () => {
    const entries = flattenVarValues({
      padding: { outer: { x: '24px', y: '16px' } },
      content: { width: '1200px' },
    });
    expect(entries).toEqual([
      { path: 'padding-outer-x', value: '24px' },
      { path: 'padding-outer-y', value: '16px' },
      { path: 'content-width', value: '1200px' },
    ]);
  });

  it('accepts dotted top-level keys', () => {
    const entries = flattenVarValues({ 'padding.outer.x': '24px' });
    expect(entries).toEqual([{ path: 'padding-outer-x', value: '24px' }]);
  });

  it('preserves CSSVarRef and color-mode pairs', () => {
    const entries = flattenVarValues({
      border: 'transparent',
      headingColor: 'var(--brand-heading)',
      surface: { light: '#fff', dark: '#111' },
    });
    expect(entries).toEqual([
      { path: 'border', value: 'transparent' },
      { path: 'headingColor', value: 'var(--brand-heading)' },
      { path: 'surface', value: { light: '#fff', dark: '#111' } },
    ]);
  });

  it('recurses light/dark children when registry has split paths', () => {
    const registry: ComponentVarRegistry = {
      hostSlot: 'base',
      vars: [
        { path: 'surface-light', name: '--x-surface-light' },
        { path: 'surface-dark', name: '--x-surface-dark' },
      ],
      byPath: new Map([
        ['surface-light', { path: 'surface-light', name: '--x-surface-light' }],
        ['surface-dark', { path: 'surface-dark', name: '--x-surface-dark' }],
      ]),
    };
    const entries = flattenVarValues({ surface: { light: '#eee', dark: '#222' } }, '', registry);
    expect(entries).toEqual([
      { path: 'surface-light', value: '#eee' },
      { path: 'surface-dark', value: '#222' },
    ]);
  });
});

describe('resolveVarOverrides', () => {
  const registry: ComponentVarRegistry = {
    hostSlot: 'root',
    vars: [
      { path: 'border', name: '--nav-border', defaultValue: '#ccc' },
      { path: 'padding-outer-x', name: '--nav-padding-outer-x', defaultValue: '8px' },
    ],
    byPath: new Map([
      ['border', { path: 'border', name: '--nav-border', defaultValue: '#ccc' }],
      [
        'padding-outer-x',
        { path: 'padding-outer-x', name: '--nav-padding-outer-x', defaultValue: '8px' },
      ],
    ]),
  };

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('maps logical paths to registered custom property names', () => {
    expect(
      resolveVarOverrides(registry, {
        border: 'transparent',
        padding: { outer: { x: '24px' } },
      }),
    ).toEqual({
      '--nav-border': 'transparent',
      '--nav-padding-outer-x': '24px',
    });
  });

  it('warns and skips unknown keys in development', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveVarOverrides(registry, { missing: 'x' })).toEqual({});
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Unknown component var "missing"'));
  });
});

describe('expandVarOverrideDeclarations', () => {
  it('compiles color-compatible pairs to light-dark()', () => {
    const { expanded, darkOnly } = expandVarOverrideDeclarations(
      { '--nav-border': { light: '#fff', dark: '#111' } },
      ['light', 'dark'],
    );
    expect(expanded).toEqual({ '--nav-border': 'light-dark(#fff, #111)' });
    expect(darkOnly).toBeNull();
  });

  it('splits incompatible pairs into darkOnly', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { expanded, darkOnly } = expandVarOverrideDeclarations(
      { '--nav-glow': { light: '0 0 0 3px blue', dark: '0 0 16px navy' } },
      ['light', 'dark'],
    );
    expect(expanded).toEqual({ '--nav-glow': '0 0 0 3px blue' });
    expect(darkOnly).toEqual({ '--nav-glow': '0 0 16px navy' });
    warn.mockRestore();
  });
});

describe('resolveVarHostSlot', () => {
  it('uses root when present in slots', () => {
    expect(resolveVarHostSlot({ slots: ['icon', 'root'] })).toBe('root');
  });

  it('uses first slot when root is absent', () => {
    expect(resolveVarHostSlot({ slots: ['stickyTop', 'content'] })).toBe('stickyTop');
  });

  it('defaults to base for dimensioned recipes', () => {
    expect(resolveVarHostSlot({ base: { color: 'red' } })).toBe('base');
  });
});

describe('resolveVarHostClass', () => {
  it('resolves dimensioned host from meta.base', () => {
    const meta: DimensionedComponentMeta = {
      namespace: 'btn',
      kind: 'dimensioned',
      namingMode: 'semantic',
      base: 'btn',
      variants: {},
    };
    const registry: ComponentVarRegistry = {
      hostSlot: 'base',
      vars: [],
      byPath: new Map(),
    };
    expect(resolveVarHostClass(meta, registry)).toBe('btn');
  });

  it('resolves slotted host from meta.base[slot]', () => {
    const meta: SlotComponentMeta = {
      namespace: 'nav',
      kind: 'slot',
      namingMode: 'semantic',
      slots: ['root', 'icon'],
      base: { root: 'nav', icon: 'nav__icon' },
      variants: {},
    };
    const registry: ComponentVarRegistry = {
      hostSlot: 'root',
      vars: [],
      byPath: new Map(),
    };
    expect(resolveVarHostClass(meta, registry)).toBe('nav');
  });
});
