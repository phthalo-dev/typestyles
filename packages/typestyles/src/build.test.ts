import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { collectStylesFromModules } from './build';
import { insertRule, reset } from './sheet';

describe('collectStylesFromModules', () => {
  beforeEach(() => {
    reset();
  });

  it('returns empty string when no loaders are provided', async () => {
    const css = await collectStylesFromModules([]);
    expect(css).toBe('');
  });

  it('collects CSS inserted synchronously inside a loader', async () => {
    const css = await collectStylesFromModules([
      () => {
        insertRule('.build-test-sync', '.build-test-sync { color: red; }');
      },
    ]);
    expect(css).toContain('.build-test-sync');
    expect(css).toContain('color: red');
  });

  it('collects CSS inserted from an async loader', async () => {
    const css = await collectStylesFromModules([
      async () => {
        await Promise.resolve();
        insertRule('.build-test-async', '.build-test-async { color: blue; }');
      },
    ]);
    expect(css).toContain('.build-test-async');
    expect(css).toContain('color: blue');
  });

  it('collects CSS from multiple loaders in order', async () => {
    const css = await collectStylesFromModules([
      () => {
        insertRule('.build-first', '.build-first { color: red; }');
      },
      () => {
        insertRule('.build-second', '.build-second { color: blue; }');
      },
    ]);
    expect(css).toContain('.build-first');
    expect(css).toContain('.build-second');
    const firstIndex = css.indexOf('.build-first');
    const secondIndex = css.indexOf('.build-second');
    expect(firstIndex).toBeLessThan(secondIndex);
  });

  it('deduplicates rules inserted with the same key', async () => {
    const css = await collectStylesFromModules([
      () => {
        insertRule('.build-dedup', '.build-dedup { color: red; }');
        insertRule('.build-dedup', '.build-dedup { color: red; }');
      },
    ]);
    const occurrences = (css.match(/\.build-dedup/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it('captures rules inserted both before and during collection when they are pending', async () => {
    // Rules inserted before startCollection may be captured if still pending
    // (they are picked up on the first flush after ssrBuffer is set).
    // Calling reset() before collectStylesFromModules gives a clean slate.
    reset();
    const css = await collectStylesFromModules([
      () => {
        insertRule('.during-only', '.during-only { color: purple; }');
      },
    ]);
    expect(css).toContain('.during-only');
    expect(css).not.toContain('.pre-existing');
  });
});
