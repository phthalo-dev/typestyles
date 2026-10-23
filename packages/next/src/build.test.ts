import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, vi } from 'vite-plus/test';
import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import { withTypestyles, withTypestylesExtract } from './build';

type WebpackContext = Parameters<NonNullable<NextConfig['webpack']>>[1];

describe('withTypestylesExtract', () => {
  it('merges NEXT_PUBLIC_TYPESTYLES_RUNTIME_DISABLED into env for Turbopack + webpack', () => {
    const merged = withTypestylesExtract({ env: { CUSTOM: 'x' } }, { disableClientRuntime: true });
    expect(merged.env).toEqual({
      CUSTOM: 'x',
      NEXT_PUBLIC_TYPESTYLES_RUNTIME_DISABLED: 'true',
    });
  });

  it('does not override env when disableClientRuntime is false', () => {
    const merged = withTypestylesExtract({ env: { CUSTOM: 'x' } }, { disableClientRuntime: false });
    expect(merged.env).toEqual({ CUSTOM: 'x' });
  });

  it('chains user webpack() and adds DefinePlugin on the client', async () => {
    const webpackMod = await import('webpack');
    const userWebpack = vi.fn((cfg: { plugins: unknown[] }) => {
      cfg.plugins.push('user-marker');
      return cfg;
    });
    const merged = withTypestylesExtract({ webpack: userWebpack });
    const config = { plugins: [] as unknown[] };
    const webpackHook = merged.webpack;
    if (typeof webpackHook !== 'function') {
      throw new Error('expected webpack hook');
    }
    const result = webpackHook(
      config as Configuration,
      {
        isServer: false,
      } as WebpackContext,
    );
    expect(userWebpack).toHaveBeenCalled();
    const hasDefine = result.plugins?.some(
      (p: unknown) => p instanceof webpackMod.default.DefinePlugin,
    );
    expect(hasDefine).toBe(true);
  });

  it('applies extract in production when a convention entry exists under root', () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-next-cwd-'));
    mkdirSync(join(dir, 'styles'), { recursive: true });
    writeFileSync(join(dir, 'styles/typestyles-entry.ts'), 'export {}\n');

    vi.stubEnv('NODE_ENV', 'production');
    try {
      const merged = withTypestyles({ env: { CUSTOM: 'y' } }, { root: dir });
      expect(merged.env).toEqual({
        CUSTOM: 'y',
        NEXT_PUBLIC_TYPESTYLES_RUNTIME_DISABLED: 'true',
      });
    } finally {
      vi.unstubAllEnvs();
    }

    rmSync(dir, { recursive: true, force: true });
  });

  it('does not apply extract in development even when a convention entry exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'typestyles-next-dev-'));
    mkdirSync(join(dir, 'styles'), { recursive: true });
    writeFileSync(join(dir, 'styles/typestyles-entry.ts'), 'export {}\n');

    vi.stubEnv('NODE_ENV', 'development');
    try {
      const merged = withTypestyles({ env: { CUSTOM: 'y' } }, { root: dir });
      expect(merged.env).toEqual({ CUSTOM: 'y' });
    } finally {
      vi.unstubAllEnvs();
    }

    rmSync(dir, { recursive: true, force: true });
  });

  it('does not add DefinePlugin for server bundles', async () => {
    const webpackMod = await import('webpack');
    const merged = withTypestylesExtract({});
    const config = { plugins: [] as unknown[] };
    const webpackHook = merged.webpack;
    if (typeof webpackHook !== 'function') {
      throw new Error('expected webpack hook');
    }
    const result = webpackHook(
      config as Configuration,
      {
        isServer: true,
      } as WebpackContext,
    );
    const hasDefine = result.plugins?.some(
      (p: unknown) => p instanceof webpackMod.default.DefinePlugin,
    );
    expect(hasDefine).toBe(false);
  });
});
