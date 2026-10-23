import { variant } from './variant';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vite-plus/test';
import { createStyles } from './styles';
import { mergeProps, combine } from './binding';
import { resetBindingDevWarnings } from './cx';
import { reset } from './sheet';
import { registeredNamespaces } from './registry';

const attributeStyles = createStyles({ mode: 'attribute' });

describe('mergeProps', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('merges plain class strings', () => {
    expect(mergeProps('a', 'b')).toEqual({ className: 'a b' });
  });

  it('spreads attrs and merges className for ComponentAttrsResult', () => {
    const button = attributeStyles.component({
      name: 'merge-btn',
      variants: { tone: variant.enum(['accent'], { default: 'accent' }) },
      styles: { base: { padding: '8px' }, variants: { tone: { accent: { color: 'blue' } } } },
    });

    const result = button({ tone: 'accent' });
    expect(mergeProps(result, 'extra')).toEqual({
      className: 'merge-btn extra',
      'data-tone': 'accent',
    });
  });

  it('ignores falsy className parts', () => {
    const button = attributeStyles.component({
      name: 'falsy-btn',
      variants: { tone: variant.enum(['accent'], { default: 'accent' }) },
      styles: { base: { padding: '8px' }, variants: { tone: { accent: {} } } },
    });

    expect(mergeProps(button({ tone: 'accent' }), false, null, undefined, 'x')).toEqual({
      className: 'falsy-btn x',
      'data-tone': 'accent',
    });
  });
});

describe('combine', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
    resetBindingDevWarnings();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('joins class-only slots with empty attrs', () => {
    const card = attributeStyles.component({
      name: 'combine-card',
      slots: ['root', 'linkRoot'] as const,
      styles: {
        base: {
          root: { display: 'block' },
          linkRoot: { textDecoration: 'none' },
        },
      },
    });

    const c = card();
    expect(combine(c.root, c.linkRoot)).toEqual({
      className: 'combine-card combine-card__linkRoot',
    });
  });

  it('warns on conflicting attribute values and last-wins', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const a = {
      className: 'a',
      attrs: { 'data-tone': 'accent' },
      props: { className: 'a', 'data-tone': 'accent' },
      toString: () => 'a',
    };
    const b = {
      className: 'b',
      attrs: { 'data-tone': 'neutral' },
      props: { className: 'b', 'data-tone': 'neutral' },
      toString: () => 'b',
    };

    expect(combine(a, b)).toEqual({
      className: 'a b',
      'data-tone': 'neutral',
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('combine() "data-tone" conflict'));
  });

  it('accepts trailing options object for consumer className', () => {
    expect(combine('a', 'b', { className: 'extra' })).toEqual({ className: 'a b extra' });
  });

  it('warns when merging attrs from multiple recipe slots', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const button = attributeStyles.component({
      name: 'multi-attr-btn',
      slots: ['root', 'icon'] as const,
      variants: { tone: variant.enum(['accent'], { default: 'accent' }) },
      styles: {
        base: { root: { display: 'flex' }, icon: { width: '16px' } },
        variants: {
          tone: {
            accent: { root: { color: 'blue' }, icon: { color: 'blue' } },
          },
        },
      },
    });

    const s = button({ tone: 'accent' });
    combine(s.root, s.icon);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('combine() merged attrs from multiple slots'),
    );
  });
});
