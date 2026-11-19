import { describe, it, expect, beforeEach, vi } from 'vite-plus/test';
import { createBreakpointMediaFn, createMediaFn, resolveBreakpointMediaKey } from './media';
import { resolveBreakpoints } from './breakpoints';
import { createStyles } from './styles';
import { createTokens } from './tokens';
import { reset, getRegisteredCss } from './sheet';
import { registeredNamespaces } from './registry';

const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
} as const;

describe('resolveBreakpointMediaKey', () => {
  it('wraps configured breakpoint conditions as @media keys', () => {
    expect(resolveBreakpointMediaKey(breakpoints, 'md')).toBe('@media (min-width: 768px)');
  });

  it('uses configured condition as-is when no feature is passed', () => {
    expect(resolveBreakpointMediaKey(breakpoints, 'sm')).toBe('@media (min-width: 640px)');
  });

  it('maps min-width breakpoints to an exclusive width range when max is requested', () => {
    expect(resolveBreakpointMediaKey(breakpoints, 'md', 'max')).toBe('@media (width < 768px)');
  });

  it('maps min-height breakpoints to max-height when requested', () => {
    const heightBreakpoints = { tall: '(min-height: 600px)' } as const;
    expect(resolveBreakpointMediaKey(heightBreakpoints, 'tall', 'maxHeight')).toBe(
      '@media (height < 600px)',
    );
    expect(resolveBreakpointMediaKey(heightBreakpoints, 'tall', 'minHeight')).toBe(
      '@media (min-height: 600px)',
    );
  });

  it('supports object feature options', () => {
    expect(resolveBreakpointMediaKey(breakpoints, 'md', { min: true })).toBe(
      '@media (min-width: 768px)',
    );
  });

  it('resolves keys from breakpoints derived via fromTokens', () => {
    const tokens = createTokens();
    const media = tokens.create('media', {
      sm: '(min-width: 640px)',
    });
    const resolved = resolveBreakpoints({
      fromTokens: media,
      md: '(min-width: 768px)',
    });

    expect(resolveBreakpointMediaKey(resolved, 'sm')).toBe('@media (min-width: 640px)');
    expect(resolveBreakpointMediaKey(resolved, 'md')).toBe('@media (min-width: 768px)');
  });

  it('leaves compound conditions unchanged and warns when feature override is requested', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const compound = { md: '(min-width: 768px) and (orientation: landscape)' };
    expect(resolveBreakpointMediaKey(compound, 'md', 'max')).toBe(
      '@media (min-width: 768px) and (orientation: landscape)',
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('feature override'));

    warn.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  it('throws for unknown breakpoint names', () => {
    expect(() => resolveBreakpointMediaKey(breakpoints, 'xl')).toThrow(/Unknown breakpoint "xl"/);
  });

  it('throws when breakpoints are unset', () => {
    expect(() => resolveBreakpointMediaKey(undefined, 'md')).toThrow(/require `breakpoints`/);
  });

  it('normalizes bare-length breakpoints to min-width when no feature is passed', () => {
    const bare = { md: '48rem', xl: '80rem' } as const;
    expect(resolveBreakpointMediaKey(bare, 'xl')).toBe('@media (min-width: 80rem)');
    expect(resolveBreakpointMediaKey(bare, 'md')).toBe('@media (min-width: 48rem)');
  });

  it('maps bare-length breakpoints to max-width when a feature is passed', () => {
    const bare = { xl: '80rem' } as const;
    expect(resolveBreakpointMediaKey(bare, 'xl', 'max')).toBe('@media (width < 80rem)');
  });
});

describe('createMediaFn', () => {
  it('returns a spreadable at-rule block', () => {
    const media = createMediaFn(breakpoints);
    expect(media('md', { display: 'grid' })).toEqual({
      '@media (min-width: 768px)': { display: 'grid' },
    });
  });

  it('accepts feature + block overload', () => {
    const media = createMediaFn(breakpoints);
    expect(media('md', 'max', { display: 'none' })).toEqual({
      '@media (width < 768px)': { display: 'none' },
    });
  });

  it('accepts object feature + block in three-argument form', () => {
    const media = createMediaFn(breakpoints);
    expect(media('md', { max: true }, { display: 'none' })).toEqual({
      '@media (width < 768px)': { display: 'none' },
    });
  });
});

describe('createStyles breakpoint helpers', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('emits min-width media rules from styles.media in components', () => {
    const styles = createStyles({ scopeId: 'media-test', breakpoints });
    styles.component({
      name: 'card',
      styles: {
        base: {
          display: 'grid',
          gridTemplateColumns: '1fr',
          ...styles.media('md', { gridTemplateColumns: 'repeat(2, 1fr)' }),
        },
      },
    });

    const css = getRegisteredCss();
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain('grid-template-columns: repeat(2, 1fr)');
  });

  it('emits valid media rules for bare-length breakpoints', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const styles = createStyles({
      scopeId: 'media-test-bare',
      breakpoints: { xl: '80rem' },
    });
    styles.class('reveal', {
      display: 'none',
      ...styles.atRuleBlock(styles.breakpoint('xl'), {
        display: 'block',
      }),
    });

    const css = getRegisteredCss();
    expect(css).toContain('@media (min-width: 80rem)');
    expect(css).not.toContain('@media (80rem)');
    expect(css).toContain('display: block');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('bare value'));

    warn.mockRestore();
  });

  it('works with styles.breakpoint + atRuleBlock', () => {
    const styles = createStyles({ scopeId: 'media-test-bp', breakpoints });
    styles.class('layout', {
      ...styles.atRuleBlock(styles.breakpoint('sm'), {
        gap: '24px',
      }),
    });

    const css = getRegisteredCss();
    expect(css).toContain('@media (min-width: 640px)');
    expect(css).toContain('gap: 24px');
  });
});

describe('createBreakpointMediaFn typing', () => {
  it('narrows breakpoint names and infers literal @media keys', () => {
    const breakpoint = createBreakpointMediaFn(breakpoints);
    const key: '@media (min-width: 768px)' = breakpoint('md');
    expect(key).toBe('@media (min-width: 768px)');
  });
});

describe('exclusive max derived across axes', () => {
  it('maxHeight derived from a min-width breakpoint is exclusive too', () => {
    const bps = { md: '(min-width: 768px)' };
    expect(resolveBreakpointMediaKey(bps, 'md', 'maxHeight')).toBe('@media (height < 768px)');
  });
});
