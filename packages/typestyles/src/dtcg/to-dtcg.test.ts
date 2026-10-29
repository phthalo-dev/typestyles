/* oxlint-disable typescript/no-explicit-any -- tests probe malformed input */
import { describe, it, expect } from 'vite-plus/test';
import { toDTCG } from './to-dtcg';

/** Groups plus tokens in a toDTCG result (tokens are not descended into). */
function countNodes(tree: Record<string, unknown>): number {
  let n = 0;
  const stack: Record<string, unknown>[] = [tree];
  for (let g = stack.pop(); g; g = stack.pop()) {
    for (const v of Object.values(g)) {
      n++;
      if (typeof v === 'object' && v !== null && !('$value' in v)) {
        stack.push(v as Record<string, unknown>);
      }
    }
  }
  return n;
}

function throwingKeys(): object {
  return new Proxy(
    {},
    {
      ownKeys() {
        throw new Error('ownKeys');
      },
    },
  );
}

describe('toDTCG cycles and shared references', () => {
  it('skips a mutual cycle (a -> b -> a) instead of unrolling it', () => {
    const a: any = { t: '1' };
    const b: any = { u: '2' };
    a.b = b;
    b.a = a;
    expect(toDTCG({ a })).toEqual({
      a: { t: { $value: '1' }, b: { u: { $value: '2' } } },
    });
  });

  it('skips a branching self-cycle (x.a = x; x.b = x) quickly with bounded output', () => {
    const x: any = { t: '1' };
    x.a = x;
    x.b = x;
    const t0 = performance.now();
    const out = toDTCG(x);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(out).toEqual({ t: { $value: '1' } });
  });

  it('bounds a heavily shared DAG (40 levels of x.a = y; x.b = y) by maxNodes', () => {
    let y: any = { t: '1' };
    for (let i = 0; i < 40; i++) y = { a: y, b: y };
    const t0 = performance.now();
    const out = toDTCG(y);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(countNodes(out)).toBeLessThanOrEqual(50_000);
    expect(countNodes(out)).toBeGreaterThan(40);
    expect(countNodes(toDTCG(y, { maxNodes: 500 }))).toBeLessThanOrEqual(500);
  });

  it('keeps a shared (non-cyclic) object at every place it appears', () => {
    const shared = { x: '1' };
    expect(toDTCG({ a: shared, b: shared })).toEqual({
      a: { x: { $value: '1' } },
      b: { x: { $value: '1' } },
    });
  });

  it('stops at maxNodes and returns what was converted so far', () => {
    let y: any = { t: '1' };
    for (let i = 0; i < 10; i++) y = { a: y, b: y };
    // 2^11 - 2 groups plus 2^10 tokens when fully expanded.
    const full = toDTCG(y);
    expect(countNodes(full)).toBe(2 ** 11 - 2 + 2 ** 10);
    const capped = toDTCG(y, { maxNodes: 100 });
    expect(countNodes(capped)).toBeLessThanOrEqual(100);
    expect(countNodes(capped)).toBeGreaterThan(0);
    expect(toDTCG({ a: '1', b: '2', c: '3' }, { maxNodes: 2 })).toEqual({
      a: { $value: '1' },
      b: { $value: '2' },
    });
  });
});

describe('toDTCG unreadable input', () => {
  it('skips a throwing getter and keeps its siblings', () => {
    const src: any = { a: '1', c: '3' };
    Object.defineProperty(src, 'b', {
      enumerable: true,
      get() {
        throw new Error('nope');
      },
    });
    expect(toDTCG(src)).toEqual({ a: { $value: '1' }, c: { $value: '3' } });
  });

  it('returns an empty tree for a top-level object whose keys cannot be read', () => {
    expect(toDTCG(throwingKeys() as any)).toEqual({});
  });

  it('keeps siblings of a nested object whose keys cannot be read', () => {
    const out = toDTCG({ a: '1', g: throwingKeys(), z: '2' } as any);
    expect(out.a).toEqual({ $value: '1' });
    expect(out.z).toEqual({ $value: '2' });
  });

  it('does not throw on a revoked proxy or null options', () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    expect(() => toDTCG(proxy as any)).not.toThrow();
    expect(() => toDTCG({ a: proxy } as any)).not.toThrow();
    expect(toDTCG({ a: '1' }, null as any)).toEqual({ a: { $value: '1' } });
  });
});
