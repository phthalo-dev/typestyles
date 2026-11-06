import { describe, expect, it } from 'vite-plus/test';
import {
  findLingeringRuntime,
  findRealSheetModules,
  lingeringRuntimeMessage,
  isSheetRequest,
  toZeroRuntimeSheetId,
  zeroRuntimeLeakMessage,
  ZeroRuntimeSheetWebpackPlugin,
} from './zero-runtime';

describe('toZeroRuntimeSheetId', () => {
  it('maps the real sheet to the no-op sibling (esm and cjs)', () => {
    expect(toZeroRuntimeSheetId('/a/node_modules/typestyles/dist/sheet.js')).toBe(
      '/a/node_modules/typestyles/dist/sheet-noop.js',
    );
    expect(toZeroRuntimeSheetId('C:\\a\\node_modules\\typestyles\\dist\\sheet.cjs')).toBe(
      'C:\\a\\node_modules\\typestyles\\dist\\sheet-noop.cjs',
    );
  });

  it('keeps query strings', () => {
    expect(toZeroRuntimeSheetId('/x/typestyles/dist/sheet.js?v=1')).toBe(
      '/x/typestyles/dist/sheet-noop.js?v=1',
    );
  });

  it('ignores other packages and files', () => {
    expect(toZeroRuntimeSheetId('/x/other-lib/dist/sheet.js')).toBeNull();
    expect(toZeroRuntimeSheetId('/x/typestyles/dist/sheet-noop.js')).toBeNull();
    expect(toZeroRuntimeSheetId('/x/typestyles/dist/index.js')).toBeNull();
  });
});

describe('isSheetRequest', () => {
  it('matches relative sheet imports only', () => {
    expect(isSheetRequest('./sheet.js')).toBe(true);
    expect(isSheetRequest('../sheet.cjs')).toBe(true);
    expect(isSheetRequest('./sheet-noop.js')).toBe(false);
    expect(isSheetRequest('./resheet.js')).toBe(false);
  });
});

describe('ZeroRuntimeSheetWebpackPlugin', () => {
  it('rewrites the resolved resource of the real sheet', () => {
    let afterResolve: ((data: { createData?: { resource?: string } }) => void) | undefined;
    new ZeroRuntimeSheetWebpackPlugin().apply({
      hooks: {
        normalModuleFactory: {
          tap: (_n, fn) =>
            fn({ hooks: { afterResolve: { tap: (_m, cb) => (afterResolve = cb) } } }),
        },
      },
    });
    const real = { createData: { resource: '/n/typestyles/dist/sheet.js' } };
    afterResolve?.(real);
    expect(real.createData.resource).toBe('/n/typestyles/dist/sheet-noop.js');
    const other = { createData: { resource: '/n/typestyles/dist/index.js' } };
    afterResolve?.(other);
    expect(other.createData.resource).toBe('/n/typestyles/dist/index.js');
  });
});

describe('findRealSheetModules / zeroRuntimeLeakMessage', () => {
  it('finds only the real sheet among bundled module ids', () => {
    const ids = [
      '/n/typestyles/dist/index.js',
      '/n/typestyles/dist/sheet-noop.js',
      '/n/typestyles/dist/sheet.js',
      '/n/other/dist/sheet.js',
    ];
    expect(findRealSheetModules(ids)).toEqual(['/n/typestyles/dist/sheet.js']);
    expect(findRealSheetModules(ids.slice(0, 2))).toEqual([]);
  });

  it('names the leaked module in the warning', () => {
    expect(zeroRuntimeLeakMessage(['/n/typestyles/dist/sheet.js'])).toContain(
      '/n/typestyles/dist/sheet.js',
    );
  });
});

describe('findLingeringRuntime', () => {
  const mod = (id: string, renderedLength: number) => ({ id, renderedLength });

  it('ignores what the lite runtime ships and small leftovers', () => {
    expect(
      findLingeringRuntime([
        mod('/n/typestyles/dist/chunks/attrs-runtime.js', 3000),
        mod('/n/typestyles/dist/sheet-noop.js', 500),
        mod('/n/typestyles/dist/index.js', 400), // e.g. only mergeProps survived
        mod('/n/app/src/main.js', 99999),
      ]),
    ).toBeNull();
  });

  it('reports substantial full-runtime modules', () => {
    const found = findLingeringRuntime([
      mod('/n/typestyles/dist/index.js', 40_000),
      mod('/n/typestyles/dist/chunks/breakpoints.js', 20_000),
      mod('/n/typestyles/dist/chunks/attrs-runtime.js', 3000),
    ]);
    expect(found?.ids).toEqual([
      '/n/typestyles/dist/index.js',
      '/n/typestyles/dist/chunks/breakpoints.js',
    ]);
    expect(found?.bytes).toBe(60_000);
    expect(lingeringRuntimeMessage(found!, ['src/theme.ts'])).toContain('src/theme.ts');
  });
});
