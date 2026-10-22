import { describe, it, expect, beforeEach } from 'vitest';
import { createTypeStyles, reset, getRegisteredCss } from 'typestyles';
import { defineProperties, createProps } from './index';

const { recipe, compose } = createTypeStyles();

describe('integration with typestyles', () => {
  beforeEach(() => {
    reset();
  });

  it('works with compose()', () => {
    const base = recipe({ name: 'base', styles: { base: { padding: '8px' } } });

    const atoms = createProps(
      'atoms',
      defineProperties({
        properties: {
          display: ['flex', 'block'],
        },
      }),
    );

    // Compose with string result from props function
    const atomClasses = atoms({ display: 'flex' });
    const composed = compose(base, atomClasses);
    const result = composed();

    expect(result).toBe('base atoms-display-flex');
  });

  it('generates CSS that appears in getRegisteredCss()', () => {
    const atoms = createProps(
      'atoms',
      defineProperties({
        properties: {
          display: ['flex', 'block'],
          padding: { 0: '0', 1: '4px', 2: '8px' },
        },
      }),
    );

    atoms({ display: 'flex', padding: 1 });

    const css = getRegisteredCss();
    expect(css).toContain('.atoms-display-flex');
    expect(css).toContain('display: flex');
    expect(css).toContain('.atoms-padding-1');
    expect(css).toContain('padding: 4px');
  });

  it('handles responsive props with compose()', () => {
    const layout = recipe({ name: 'layout', styles: { base: { maxWidth: '1200px' } } });

    const responsive = createProps(
      'responsive',
      defineProperties({
        conditions: {
          mobile: { '@media': '(min-width: 768px)' },
        },
        properties: {
          display: ['flex', 'block', 'grid'],
        },
      }),
    );

    // Compose with string result from props function
    const responsiveClasses = responsive({ display: { mobile: 'grid' } });
    const composed = compose(layout, responsiveClasses);
    const result = composed();

    expect(result).toBe('layout responsive-display-mobile-grid');
  });
});
