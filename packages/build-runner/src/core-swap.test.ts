import { describe, expect, it } from 'vite-plus/test';
import {
  TYPESTYLES_CORE_SPECIFIER,
  TYPESTYLES_RUNTIME_SPECIFIER,
  aliasCapturesTypestylesRuntime,
} from './core-swap';

describe('aliasCapturesTypestylesRuntime', () => {
  it('matches the exact bare specifier', () => {
    expect(aliasCapturesTypestylesRuntime(TYPESTYLES_RUNTIME_SPECIFIER)).toBe(true);
  });

  it('matches webpack-style exact keys', () => {
    expect(aliasCapturesTypestylesRuntime(`${TYPESTYLES_RUNTIME_SPECIFIER}$`)).toBe(true);
  });

  it('matches exact-anchor regexes', () => {
    expect(aliasCapturesTypestylesRuntime(/^typestyles$/)).toBe(true);
    expect(aliasCapturesTypestylesRuntime(new RegExp('^(?:typestyles)$'))).toBe(true);
  });

  it('does not match the core subpath or unrelated specifiers', () => {
    expect(aliasCapturesTypestylesRuntime(TYPESTYLES_CORE_SPECIFIER)).toBe(false);
    expect(aliasCapturesTypestylesRuntime('typestyles/server')).toBe(false);
    expect(aliasCapturesTypestylesRuntime('type')).toBe(false);
    expect(aliasCapturesTypestylesRuntime('@typestyles/vite')).toBe(false);
  });

  it('does not treat subpath-inclusive regexes as the runtime bootstrap', () => {
    expect(aliasCapturesTypestylesRuntime(/typestyles/)).toBe(false);
    expect(aliasCapturesTypestylesRuntime(/^typestyles(?:\/.*)?$/)).toBe(false);
    expect(aliasCapturesTypestylesRuntime(/^@typestyles\/(?!core)/)).toBe(false);
  });
});
