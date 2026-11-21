import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { createStyles } from './styles';
import { reset } from './sheet';

describe('duplicate style definition warning (dev)', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    reset();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  const dupCalls = () => warn.mock.calls.filter((c) => String(c[0]).includes('Duplicate style'));

  it('warns when two names in one scope declare identical rules', () => {
    const s = createStyles({ scopeId: 'dup-a' });
    s.class('eyebrow-a', { textTransform: 'uppercase', letterSpacing: '0.1em' });
    s.class('eyebrow-b', { textTransform: 'uppercase', letterSpacing: '0.1em' });
    expect(dupCalls()).toHaveLength(1);
    expect(String(dupCalls()[0]![0])).toContain('"eyebrow-a" and "eyebrow-b"');
  });

  it('does not warn for different rules, other scopes, or re-registering one name', () => {
    const a = createStyles({ scopeId: 'dup-b' });
    const b = createStyles({ scopeId: 'dup-c' });
    a.class('one', { color: 'red' });
    a.class('two', { color: 'blue' });
    b.class('three', { color: 'red' });
    a.class('one', { color: 'red' });
    expect(dupCalls()).toHaveLength(0);
  });
});
