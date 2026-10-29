/* oxlint-disable typescript/no-explicit-any -- tests probe malformed input */
import { describe, it, expect } from 'vite-plus/test';
import { fromDTCG } from './from-dtcg';
import { createTokens } from '../tokens';
import { reset, flushSync, getRegisteredCss } from '../sheet';
import type { DTCGGroup } from './types';

const EXT = 'dev.typestyles';

function errorsOf(tree: DTCGGroup, options?: Parameters<typeof fromDTCG>[1]) {
  const r = fromDTCG(tree, options);
  if (r.ok) throw new Error('expected errors, got ' + JSON.stringify(r.value).slice(0, 200));
  return r.errors;
}

function okOf(tree: DTCGGroup, options?: Parameters<typeof fromDTCG>[1]) {
  const r = fromDTCG(tree, options);
  if (!r.ok) throw new Error('unexpected errors: ' + JSON.stringify(r.errors).slice(0, 500));
  return r;
}

/** A string value is rejected as $value, dark value, resolveExternal result and nested string. */
function expectRejectedOnAllPaths(value: string) {
  const label = JSON.stringify(value).slice(0, 80);
  const trees: [DTCGGroup, Parameters<typeof fromDTCG>[1]?][] = [
    [{ t: { $value: value } }],
    [{ t: { $value: '#fff', $extensions: { [EXT]: { dark: value } } } }],
    [{ x: { $value: '{ext.a}' } }, { resolveExternal: () => value }],
    [{ t: { $value: { value, unit: 'px' } } }],
    [{ t: { $value: ['ok', value] } }],
  ];
  for (const [tree, options] of trees) {
    expect(errorsOf(tree, options)[0].code, label).toBe('invalid-token');
  }
}

/** A string value is accepted unchanged as $value and as a dark value. */
function expectAccepted(value: string) {
  const v = okOf({
    t: { $value: value },
    d: { $value: '1', $extensions: { [EXT]: { dark: value } } },
  }).value as any;
  expect(v.t, JSON.stringify(value)).toBe(value);
  expect(v.d.dark, JSON.stringify(value)).toBe(value);
}

const UNCAPPED = { maxDepth: Infinity, maxNameLength: Infinity, maxTokens: Infinity };

function timed<T>(fn: () => T): { result: T; ms: number } {
  const t0 = performance.now();
  const result = fn();
  return { result, ms: performance.now() - t0 };
}

describe('fromDTCG limits (hostile input)', () => {
  it('rejects a name longer than maxNameLength without walking its subtree', () => {
    const big = 'k'.repeat(100_000);
    const group: any = {};
    for (let i = 0; i < 200; i++) group['t' + i] = { $value: '#fff' };
    const { result, ms } = timed(() => fromDTCG({ [big]: group }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('invalid-token');
    expect(result.errors[0].message).toContain('maxNameLength');
    expect(result.errors[0].path.length).toBeLessThanOrEqual(200);
    expect(result.errors[0].message.length).toBeLessThanOrEqual(600);
    expect(ms).toBeLessThan(500);
  });

  it('allows names up to maxNameLength (default 128)', () => {
    okOf({ ['a'.repeat(128)]: { $value: '1' } });
    expect(errorsOf({ ['a'.repeat(129)]: { $value: '1' } })[0].code).toBe('invalid-token');
    okOf({ ['a'.repeat(129)]: { $value: '1' } }, { maxNameLength: 129 });
  });

  it('rejects nesting deeper than maxDepth (default 32) and stops walking', () => {
    const make = (levels: number) => {
      const root: any = {};
      let cur = root;
      for (let i = 0; i < levels; i++) {
        cur.tok = { $value: '1px' };
        cur['g' + i] = {};
        cur = cur['g' + i];
      }
      return root;
    };
    // make(n) puts its deepest keys at depth n.
    okOf(make(32));
    // Both keys at depth 33 are rejected; nothing below them is walked.
    const errs = errorsOf(make(40));
    expect(errs).toHaveLength(2);
    for (const e of errs) {
      expect(e.code).toBe('invalid-token');
      expect(e.message).toContain('maxDepth');
    }
    okOf(make(40), { maxDepth: 64 });
  });

  it('caps deep trees of long names fast (1KB keys, 1000 levels)', () => {
    const root: any = {};
    let cur = root;
    for (let i = 0; i < 1000; i++) {
      const k = String(i).padStart(1024, 'x');
      cur.tok = { $value: '1px' };
      cur[k] = {};
      cur = cur[k];
    }
    const { result, ms } = timed(() => fromDTCG(root));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('invalid-token');
    }
    expect(ms).toBeLessThan(500);
  });

  it('keeps memory/time independent of path length when limits are lifted', () => {
    const big = 'k'.repeat(1 << 20);
    const group: any = {};
    for (let i = 0; i < 300; i++) group['t' + i] = { $value: '#fff' };
    const tree = { [big]: group, alias: { $value: `{${big}.t7}` } };
    const { result, ms } = timed(() => fromDTCG(tree, UNCAPPED));
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.value as any).alias).toBe('#fff');
    expect(ms).toBeLessThan(500);
  });

  it('walks very deep trees without recursion when maxDepth is lifted', () => {
    const root: any = {};
    let cur = root;
    for (let i = 0; i < 20_000; i++) {
      cur.g = {};
      cur = cur.g;
    }
    cur.t = { $value: '1' };
    const r = fromDTCG(root, UNCAPPED);
    expect(r.ok).toBe(true);
  });

  it('rejects more than maxTokens tokens', () => {
    const tree: any = {};
    // Aliases point at the token past the cap; no alias-missing noise from a partial tree.
    for (let i = 0; i < 11; i++) tree['t' + i] = { $value: i < 10 ? '{t10}' : '1' };
    const errs = errorsOf(tree, { maxTokens: 10 });
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('invalid-token');
    expect(errs[0].message).toContain('maxTokens');
    okOf(tree, { maxTokens: 11 });
  });

  it('resolves 50k honest tokens quickly', () => {
    const tree: any = {};
    for (let g = 0; g < 500; g++) {
      const grp: any = {};
      for (let i = 0; i < 100; i++) {
        grp['t' + i] = { $value: i % 2 ? `{g${(g + 1) % 500}.t0}` : '#abcdef' };
      }
      tree['g' + g] = grp;
    }
    const { result, ms } = timed(() => fromDTCG(tree));
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.value as any).g499.t1).toBe('#abcdef');
    expect(ms).toBeLessThan(1500);
  });

  it('truncates long paths and alias targets in error messages', () => {
    const target = 'x'.repeat(10_000);
    const errs = errorsOf({ a: { $value: `{${target}}` } }, UNCAPPED);
    expect(errs[0].code).toBe('alias-missing');
    expect(errs[0].message.length).toBeLessThanOrEqual(600);
    const deep: any = {};
    let cur = deep;
    for (let i = 0; i < 20; i++) {
      cur = cur['n'.repeat(100) + i] = {};
    }
    cur.t = { $value: '{missing}' };
    const e2 = errorsOf(deep, UNCAPPED)[0];
    expect(e2.path.length).toBeLessThanOrEqual(200);
    expect(e2.message.length).toBeLessThanOrEqual(600);
  });

  it('keeps cycle messages bounded for long cycles', () => {
    const tree: any = {};
    for (let i = 0; i < 1000; i++) tree['t' + i] = { $value: `{t${(i + 1) % 1000}}` };
    const errs = errorsOf(tree);
    expect(errs[0].code).toBe('alias-cycle');
    expect(errs[0].message.length).toBeLessThanOrEqual(600);
  });
});

describe('fromDTCG CSS-safety of names and values', () => {
  it('rejects the injection probes', () => {
    const probes: DTCGGroup[] = [
      { color: { evil: { $value: 'red;}</style><script>alert(1)</script><style>x{' } } },
      { bg: { $value: '#fff', $extensions: { [EXT]: { dark: '#000;} body{display:none' } } } },
      { 'a;}body{x:y': { $value: '1' } },
    ];
    for (const p of probes) {
      const errs = errorsOf(p);
      expect(errs.map((e) => e.code)).toEqual(['invalid-token']);
    }
  });

  it('rejects names with forbidden characters, whitespace, control characters or empty', () => {
    const bad = [
      '',
      'a b',
      'a\tb',
      'a b',
      'a\u0000b',
      'a\u0085b',
      ...'.{};:<>\\"\'()@,!`'.split('').map((c) => `a${c}b`),
    ];
    for (const name of bad) {
      const errs = errorsOf({ g: { [name]: { $value: '1' } } });
      expect(
        errs.map((e) => e.code),
        JSON.stringify(name),
      ).toEqual(['invalid-token']);
    }
    // Group names are checked too.
    expect(errorsOf({ 'a b': { t: { $value: '1' } } })[0].code).toBe('invalid-token');
  });

  it('only allows letters, digits, - and _ in names', () => {
    for (const name of ['a/b', 'a+b', 'a%b', 'a#b', 'a&b', 'a*b', 'a b', 'a.b', 'a=b', 'a~b']) {
      const errs = errorsOf({ g: { [name]: { $value: '1' } } });
      expect(
        errs.map((e) => e.code),
        JSON.stringify(name),
      ).toEqual(['invalid-token']);
      expect(errs[0].path).toBe(`g.${name}`);
    }
    // Structured value keys follow the same rule.
    expect(errorsOf({ t: { $value: { 'a/b': '1' } } })[0].code).toBe('invalid-token');
  });

  it('keeps other names legal', () => {
    const names = ['7', '100', '500', '10', '2xl', 'brand-500', 'snake_case', 'Über', 'ünïcødé'];
    const g: any = {};
    for (const n of names) g[n] = { $value: '1' };
    const v = okOf({ g }).value as any;
    expect(Object.keys(v.g)).toEqual(expect.arrayContaining(names));
  });

  it('accepts combining marks, so decomposed (NFD) and composed (NFC) names both pass', () => {
    const nfd = 'a\u0308';
    const nfc = '\u00e4';
    const v = okOf({ g: { [nfd]: { $value: '1' }, [nfc]: { $value: '2' } } }).value as any;
    expect(v.g[nfd]).toBe('1');
    expect(v.g[nfc]).toBe('2');
  });

  it('accepted names give valid custom properties with tokens.create default naming', () => {
    reset();
    const names = ['500', '7', '10', '2xl', 'brand-500', 'snake_case', 'Über', '_x', '-y'];
    const g: any = {};
    for (const n of names) g[n] = { $value: '1px', $extensions: { [EXT]: { dark: '2px' } } };
    const value = okOf({ space: g, plain: { $value: '3px' } }).value as any;
    createTokens().create('dtcg', value);
    flushSync();
    const css = getRegisteredCss();
    const props = [...css.matchAll(/(--[^\s:;{}]+)\s*:/g)].map((m) => m[1]);
    expect(props.length).toBeGreaterThanOrEqual(names.length + 1);
    // A CSS custom property name: "--" then name code points (ASCII letters, digits, - and _,
    // or anything non-ASCII).
    for (const p of props) expect(p, p).toMatch(/^--[a-zA-Z0-9_\-\u0080-\u{10FFFF}]+$/u);
    for (const n of names) expect(props).toContain(`--dtcg-space-${n}`);
  });

  it('rejects values with characters that break CSS', () => {
    for (const ch of [';', '{', '}', '<', '>', '\\', '\n', '\r', '\u0000', '\u007f']) {
      const value = `a${ch}b`;
      expect(errorsOf({ t: { $value: value } })[0].code, JSON.stringify(ch)).toBe('invalid-token');
      expect(
        errorsOf({ t: { $value: '#fff', $extensions: { [EXT]: { dark: value } } } })[0].code,
      ).toBe('invalid-token');
    }
  });

  it('rejects CSS comment delimiters and unbalanced quotes in values', () => {
    const bad = ['a /* b', 'a */ b', '/**/', '"Inter, sans-serif', "'Inter", '"a" "b', "'a' 'b' '"];
    for (const value of bad) {
      const label = JSON.stringify(value);
      expect(errorsOf({ t: { $value: value } })[0].code, label).toBe('invalid-token');
      expect(
        errorsOf({ t: { $value: '#fff', $extensions: { [EXT]: { dark: value } } } })[0].code,
        label,
      ).toBe('invalid-token');
      expect(
        errorsOf({ x: { $value: '{ext.a}' } }, { resolveExternal: () => value })[0].code,
        label,
      ).toBe('invalid-token');
      expect(errorsOf({ t: { $value: { value, unit: 'px' } } })[0].code, label).toBe(
        'invalid-token',
      );
      expect(errorsOf({ t: { $value: ['ok', value] } })[0].code, label).toBe('invalid-token');
    }
  });

  it('rejects unterminated strings and unbalanced brackets', () => {
    const bad = [
      `"'" '`,
      `'"' "`,
      '"abc',
      "'abc",
      'calc(1px',
      'rgb(1,2,3',
      'url(x',
      'a[b',
      'a)',
      'a]',
      '(]',
      '[)',
    ];
    for (const value of bad) {
      const label = JSON.stringify(value);
      expect(errorsOf({ t: { $value: value } })[0].code, label).toBe('invalid-token');
      expect(
        errorsOf({ t: { $value: '#fff', $extensions: { [EXT]: { dark: value } } } })[0].code,
        label,
      ).toBe('invalid-token');
      expect(
        errorsOf({ x: { $value: '{ext.a}' } }, { resolveExternal: () => value })[0].code,
        label,
      ).toBe('invalid-token');
      expect(errorsOf({ t: { $value: { value, unit: 'px' } } })[0].code, label).toBe(
        'invalid-token',
      );
      expect(errorsOf({ t: { $value: ['ok', value] } })[0].code, label).toBe('invalid-token');
    }
  });

  it('reads an unquoted url( like CSS: up to the first ")", with no quotes or "(" inside', () => {
    for (const value of [
      `url(a")")`,
      `url(a')')`,
      `url(a"x)" )`,
      `URL(a"x)" )`,
      `uRl(  a'x)' )`,
      'url(a(b)',
      'url(a',
      'url( ',
      "URL(a'b)",
    ]) {
      expectRejectedOnAllPaths(value);
    }
    for (const value of [
      'url("a(b")',
      "url('x')",
      'url(x)',
      'url(https://example.com/a.png)',
      'url( x )',
      'url(  "x" )',
      'var(--x, url(y))',
      'URL(x) url(y)',
    ]) {
      expectAccepted(value);
    }
  });

  it('keeps balanced quotes and brackets, including other quotes or brackets inside strings', () => {
    const values = [
      `"Children's Font", serif`,
      "'Segoe UI', sans-serif",
      '"Inter", sans-serif',
      '0 1px 2px rgba(0,0,0,.1)',
      'var(--c-blue-7)',
      'light-dark(#fff, #000)',
      'calc(1px + (2px * 3))',
      'url("a(b")',
      `'a"b[' "c)'d"`,
    ];
    const tree: any = {};
    values.forEach((v, i) => (tree['t' + i] = { $value: v }));
    const out = okOf(tree).value as any;
    values.forEach((v, i) => expect(out['t' + i]).toBe(v));
  });

  it('keeps balanced quotes and lone slashes or asterisks in values', () => {
    const values = [
      '"Inter", sans-serif',
      "'Segoe UI', sans-serif",
      `"Inter", 'Segoe UI', system-ui`,
      'calc(100% / 3)',
      'calc(2 * 4px)',
      '1px / 2px',
      'url("a.png")',
    ];
    const tree: any = {};
    values.forEach((v, i) => (tree['t' + i] = { $value: v }));
    const out = okOf(tree).value as any;
    values.forEach((v, i) => expect(out['t' + i]).toBe(v));
    expect(okOf({ t: { $value: { family: '"Inter", sans-serif' } } }).value).toEqual({
      t: { family: '"Inter", sans-serif' },
    });
  });

  it('keeps legitimate CSS values', () => {
    const values = [
      '"Inter", sans-serif',
      "'Inter', sans-serif",
      '0 1px 2px rgba(0,0,0,.1)',
      'var(--c-blue-7)',
      'light-dark(#fff, #000)',
      '#3b82f6',
      '16px',
      '50%',
      'calc(100% / 3)',
    ];
    const tree: any = {};
    values.forEach((v, i) => (tree['t' + i] = { $value: v }));
    const out = okOf(tree).value as any;
    values.forEach((v, i) => expect(out['t' + i]).toBe(v));
    expect(okOf({ n: { $value: 4 }, b: { $value: true } }).value).toEqual({ n: 4, b: true });
  });

  it('checks resolveExternal results', () => {
    const errs = errorsOf(
      { x: { $value: '{ext.a}' } },
      { resolveExternal: () => 'red;}</style><script>' },
    );
    expect(errs.map((e) => e.code)).toEqual(['invalid-token']);
    expect(errs[0].path).toBe('x');
  });

  it('checks strings and keys nested in structured values', () => {
    expect(errorsOf({ t: { $value: { value: '1;}', unit: 'px' } } })[0].code).toBe('invalid-token');
    expect(errorsOf({ t: { $value: { 'a;b': '1' } } })[0].code).toBe('invalid-token');
    expect(errorsOf({ t: { $value: ['ok', '<x>'] } })[0].code).toBe('invalid-token');
    // A nested null must not end the check early.
    expect(errorsOf({ t: { $value: { b: '1;}', a: null } } })[0].code).toBe('invalid-token');
    expect(errorsOf({ t: { $value: ['1;}', null] } })[0].code).toBe('invalid-token');
  });
});

describe('fromDTCG name collisions', () => {
  it('rejects a dotted key that would collide with a nested path', () => {
    const errs = errorsOf({ 'a.b': { $value: '1' }, a: { b: { $value: '2' } } });
    expect(errs.map((e) => e.code)).toEqual(['invalid-token']);
    expect(errs[0].path).toBe('a.b');
  });

  it('rejects NUL-suffixed keys that mimic internal dark nodes', () => {
    const e1 = errorsOf({ a: { $value: 'y' }, 'a\u0000dark': { $value: 'x' } });
    expect(e1.map((e) => e.code)).toEqual(['invalid-token']);
    const e2 = errorsOf({ 'b\u0000dark': { $value: 'x' } });
    expect(e2.map((e) => e.code)).toEqual(['invalid-token']);
  });
});

describe('fromDTCG value shapes and warnings', () => {
  it('rejects null and undefined $value', () => {
    expect(errorsOf({ t: { $value: null } })[0].code).toBe('invalid-token');
    expect(errorsOf({ t: { $value: undefined } })[0].code).toBe('invalid-token');
  });

  it('treats a non-string resolveExternal result as missing', () => {
    const errs = errorsOf({ x: { $value: '{ext.a}' } }, { resolveExternal: () => 5 as any });
    expect(errs.map((e) => e.code)).toEqual(['alias-missing']);
  });

  it('passes structured values through with a warning', () => {
    const value = { colorSpace: 'srgb', components: [0, 0.5, 1] };
    const r = okOf({ c: { $value: value, $type: 'color' } });
    expect((r.value as any).c).toEqual(value);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('c');
    expect(r.warnings[0]).toContain('structured value passed through');
  });

  it('rejects embedded aliases (only whole-value aliases resolve; braces are not allowed in values)', () => {
    const errs = errorsOf({ s: { $value: '4px' }, t: { $value: '1px {s}' } });
    expect(errs.map((e) => e.code)).toEqual(['invalid-token']);
    expect(errs[0].path).toBe('t');
    expect(errs[0].message).toContain('whole-value');
  });

  it('warns when a token also has child keys', () => {
    const r = okOf({ t: { $value: '1', child: { $value: '2' } } as any });
    expect(r.value).toEqual({ t: '1' });
    expect(r.warnings.some((w) => w.includes('t') && w.includes('ignored'))).toBe(true);
  });

  it('warns about dark on a group and a non-object dev.typestyles extension', () => {
    const r = okOf({
      g: { $extensions: { [EXT]: { dark: '#000' } }, t: { $value: '1' } },
      u: { $value: '1', $extensions: { [EXT]: 'dark' } },
    } as any);
    expect(r.warnings).toHaveLength(2);
    expect(r.warnings.some((w) => w.startsWith('g:'))).toBe(true);
    expect(r.warnings.some((w) => w.startsWith('u:'))).toBe(true);
  });
});

describe('fromDTCG unreadable trees', () => {
  it('keeps errors collected before a throw and says "could not read tree"', () => {
    const tree: any = { bad: 5 };
    Object.defineProperty(tree, 'boom', {
      enumerable: true,
      get() {
        throw new Error('nope');
      },
    });
    const errs = errorsOf(tree);
    expect(errs.map((e) => e.code)).toEqual(['invalid-token', 'invalid-token']);
    expect(errs[0].path).toBe('bad');
    expect(errs[1].message).toContain('could not read tree');
  });

  it('does not loop on circular (non-JSON) groups', () => {
    const tree: any = { t: { $value: '1' } };
    tree.self = tree;
    expect(fromDTCG(tree, UNCAPPED).ok).toBe(false);
  });
});

describe('fromDTCG options and caps', () => {
  it('treats null or non-object options as {}', () => {
    expect(fromDTCG({ t: { $value: '1' } }, null as any)).toEqual({
      ok: true,
      value: { t: '1' },
      warnings: [],
    });
    expect(fromDTCG({ t: { $value: '1' } }, 5 as any).ok).toBe(true);
    const throwing = new Proxy(
      {},
      {
        get() {
          throw new Error('nope');
        },
      },
    );
    expect(() => fromDTCG({ t: { $value: '1' } }, throwing as any)).not.toThrow();
  });

  it('stops early with at most maxErrors + 1 errors (100k invalid names)', () => {
    const tree: any = {};
    for (let i = 0; i < 100_000; i++) tree['a b' + i] = { $value: '1' };
    const { result, ms } = timed(() => fromDTCG(tree));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(101);
    const last = result.errors[100];
    expect(last.code).toBe('invalid-token');
    expect(last.path).toBe('');
    expect(last.message).toContain('maxErrors');
    expect(ms).toBeLessThan(500);
    const few = errorsOf(tree, { maxErrors: 3 });
    expect(few).toHaveLength(4);
    expect(few[3].path).toBe('');
  });

  it('counts errors omitted during alias resolution', () => {
    const tree: any = {};
    for (let i = 0; i < 10; i++) tree['t' + i] = { $value: `{missing${i}}` };
    const errs = errorsOf(tree, { maxErrors: 4 });
    expect(errs).toHaveLength(5);
    expect(errs.slice(0, 4).every((e) => e.code === 'alias-missing')).toBe(true);
    expect(errs[4]).toMatchObject({ code: 'invalid-token', path: '' });
    expect(errs[4].message).toContain('6 more');
    expect(errorsOf(tree)).toHaveLength(10);
  });

  it('keeps at most maxWarnings warnings plus one summary line', () => {
    const tree: any = {};
    for (let i = 0; i < 300; i++) tree['t' + i] = { $value: { a: '1' } };
    const r = okOf(tree);
    expect(r.warnings).toHaveLength(101);
    expect(r.warnings[100]).toContain('200 more');
    const few = okOf(tree, { maxWarnings: 2 });
    expect(few.warnings).toHaveLength(3);
    expect(few.warnings[2]).toContain('298 more');
    expect(okOf({ t: { $value: { a: '1' } } }).warnings).toHaveLength(1);
  });
});
