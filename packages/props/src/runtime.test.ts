import { describe, it, expect } from 'vite-plus/test';
import { buildLookupMap, expandShorthands, createResolver } from './runtime';

describe('buildLookupMap', () => {
  it('collects properties from collections', () => {
    const { propertyMap } = buildLookupMap('ts', [
      {
        properties: { display: ['flex'], color: ['red'] },
        conditions: {},
        defaultCondition: false,
        shorthands: {},
      },
    ]);
    expect(propertyMap.has('display')).toBe(true);
    expect(propertyMap.has('color')).toBe(true);
  });

  it('collects conditions from collections', () => {
    const { conditionKeys } = buildLookupMap('ts', [
      {
        properties: {},
        conditions: {
          mobile: { '@media': '(max-width: 640px)' },
          desktop: { '@media': '(min-width: 1024px)' },
        },
        defaultCondition: false,
        shorthands: {},
      },
    ]);
    expect(conditionKeys.has('mobile')).toBe(true);
    expect(conditionKeys.has('desktop')).toBe(true);
  });

  it('collects shorthands from collections', () => {
    const { shorthands } = buildLookupMap('ts', [
      {
        properties: { paddingTop: ['0'], paddingBottom: ['0'] },
        conditions: {},
        defaultCondition: false,
        shorthands: { paddingY: ['paddingTop', 'paddingBottom'] },
      },
    ]);
    expect(shorthands.get('paddingY')).toEqual(['paddingTop', 'paddingBottom']);
  });

  it('merges properties from multiple collections', () => {
    const { propertyMap } = buildLookupMap('ts', [
      {
        properties: { display: ['flex'] },
        conditions: {},
        defaultCondition: false,
        shorthands: {},
      },
      {
        properties: { color: ['red'] },
        conditions: {},
        defaultCondition: false,
        shorthands: {},
      },
    ]);
    expect(propertyMap.has('display')).toBe(true);
    expect(propertyMap.has('color')).toBe(true);
  });

  it('returns empty structures for empty collections list', () => {
    const { propertyMap, conditionKeys, shorthands } = buildLookupMap('ts', []);
    expect(propertyMap.size).toBe(0);
    expect(conditionKeys.size).toBe(0);
    expect(shorthands.size).toBe(0);
  });
});

describe('expandShorthands', () => {
  it('expands a shorthand into multiple properties', () => {
    const shorthands = new Map([
      ['padding', ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']],
    ]);
    const expanded = expandShorthands({ padding: '8px' }, shorthands);
    expect(expanded).toEqual({
      paddingTop: '8px',
      paddingBottom: '8px',
      paddingLeft: '8px',
      paddingRight: '8px',
    });
  });

  it('passes through non-shorthand properties unchanged', () => {
    const shorthands = new Map<string, string[]>();
    const expanded = expandShorthands({ color: 'red', display: 'flex' }, shorthands);
    expect(expanded).toEqual({ color: 'red', display: 'flex' });
  });

  it('handles a mix of shorthand and regular properties', () => {
    const shorthands = new Map([['px', ['paddingLeft', 'paddingRight']]]);
    const expanded = expandShorthands({ px: '4px', color: 'red' }, shorthands);
    expect(expanded).toEqual({ paddingLeft: '4px', paddingRight: '4px', color: 'red' });
  });

  it('returns empty object for empty input', () => {
    const shorthands = new Map<string, string[]>();
    expect(expandShorthands({}, shorthands)).toEqual({});
  });
});

describe('createResolver', () => {
  it('resolves a direct property value to a class name', () => {
    const resolver = createResolver('ts', new Map([['display', new Set()]]), new Set(), new Map());
    expect(resolver({ display: 'flex' })).toBe('ts-display-flex');
  });

  it('resolves multiple properties to space-separated class names', () => {
    const resolver = createResolver(
      'ts',
      new Map([
        ['display', new Set()],
        ['color', new Set()],
      ]),
      new Set(),
      new Map(),
    );
    const result = resolver({ display: 'flex', color: 'red' });
    expect(result).toContain('ts-display-flex');
    expect(result).toContain('ts-color-red');
  });

  it('resolves conditional values to condition-prefixed class names', () => {
    const conditions = new Set(['mobile', 'desktop']);
    const resolver = createResolver('ts', new Map([['display', new Set()]]), conditions, new Map());
    const result = resolver({ display: { mobile: 'flex', desktop: 'block' } });
    expect(result).toContain('ts-display-mobile-flex');
    expect(result).toContain('ts-display-desktop-block');
  });

  it('skips null and undefined values', () => {
    const resolver = createResolver('ts', new Map(), new Set(), new Map());
    expect(resolver({ display: null, color: undefined })).toBe('');
  });

  it('expands shorthands before resolving', () => {
    const shorthands = new Map([['px', ['paddingLeft', 'paddingRight']]]);
    const resolver = createResolver('ts', new Map(), new Set(), shorthands);
    const result = resolver({ px: '4px' });
    expect(result).toContain('ts-paddingLeft-4px');
    expect(result).toContain('ts-paddingRight-4px');
  });

  it('returns empty string for empty props', () => {
    const resolver = createResolver('ts', new Map(), new Set(), new Map());
    expect(resolver({})).toBe('');
  });

  it('only resolves known condition keys in conditional objects', () => {
    const conditions = new Set(['mobile']);
    const resolver = createResolver('ts', new Map([['display', new Set()]]), conditions, new Map());
    const result = resolver({ display: { mobile: 'flex', unknown: 'block' } });
    expect(result).toContain('ts-display-mobile-flex');
    expect(result).not.toContain('unknown');
  });
});
