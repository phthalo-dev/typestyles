import { variant } from 'typestyles';
import { describe, it, expect, beforeEach } from 'vitest';
import { createTypeStyles, reset, getRegisteredCss, flushSync } from 'typestyles';
import { defineProperties, createProps } from './index';

const { recipe, compose } = createTypeStyles();

describe('real-world example', () => {
  beforeEach(() => {
    reset();
  });

  it('builds a complete design system with atomic utilities', () => {
    // Define responsive breakpoints and atomic utilities
    const atoms = createProps(
      'atoms',
      defineProperties({
        conditions: {
          sm: { '@media': '(min-width: 640px)' },
          md: { '@media': '(min-width: 768px)' },
          lg: { '@media': '(min-width: 1024px)' },
        },
        properties: {
          display: ['none', 'flex', 'block', 'grid', 'inline-flex'],
          flexDirection: ['row', 'column'],
          justifyContent: ['start', 'center', 'end', 'between'],
          alignItems: ['start', 'center', 'end', 'stretch'],
          gap: { 0: '0', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem' },
          padding: { 0: '0', 1: '0.25rem', 2: '0.5rem', 4: '1rem', 8: '2rem' },
          fontSize: { sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem' },
          fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
        },
        shorthands: {
          p: ['padding'],
        },
      }),
    );

    // Define component styles using recipe
    const button = recipe({
      name: 'button',
      variants: { intent: variant.enum(['primary', 'secondary'], { default: 'primary' }) },
      styles: {
        base: {
          borderRadius: '0.375rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': { opacity: 0.9 },
        },
        variants: {
          intent: {
            primary: {
              backgroundColor: '#3b82f6',
              color: 'white',
              '&:hover': { backgroundColor: '#2563eb' },
            },
            secondary: {
              backgroundColor: '#e5e7eb',
              color: '#1f2937',
              '&:hover': { backgroundColor: '#d1d5db' },
            },
          },
        },
      },
    });

    // Compose button with atomic utilities
    const primaryButton = compose(
      button,
      atoms({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        p: 4,
        fontSize: { sm: 'sm', md: 'base' },
        fontWeight: 'semibold',
      }),
    );

    const className = primaryButton();

    // Verify class names are generated
    expect(className).toContain('button');
    expect(className).toContain('button--intent-primary');
    expect(className).toContain('atoms-display-inline-flex');
    expect(className).toContain('atoms-alignItems-center');
    expect(className).toContain('atoms-gap-2');

    flushSync();

    // Verify CSS is injected
    const css = getRegisteredCss();
    expect(css).toContain('button');
    expect(css).toContain('border-radius: 0.375rem');
    expect(css).toContain('atoms-display-inline-flex');
    expect(css).toContain('display: inline-flex');
    expect(css).toContain('@media (min-width: 640px)');
  });

  it('handles complex responsive layouts', () => {
    const layout = createProps(
      'layout',
      defineProperties({
        conditions: {
          mobile: { '@media': '(min-width: 768px)' },
          desktop: { '@media': '(min-width: 1024px)' },
        },
        properties: {
          display: ['block', 'flex', 'grid'],
          gridTemplateColumns: {
            1: '1fr',
            2: 'repeat(2, 1fr)',
            3: 'repeat(3, 1fr)',
            4: 'repeat(4, 1fr)',
          },
        },
      }),
    );

    const gridContainer = layout({
      display: 'grid',
      gridTemplateColumns: {
        mobile: 2,
        desktop: 4,
      },
    });

    expect(gridContainer).toContain('layout-display-grid');
    expect(gridContainer).toContain('layout-gridTemplateColumns-mobile-2');
    expect(gridContainer).toContain('layout-gridTemplateColumns-desktop-4');

    flushSync();
    const css = getRegisteredCss();

    // Verify responsive classes are generated
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain('layout-gridTemplateColumns-mobile-2');
    expect(css).toContain('repeat(2, 1fr)');
    expect(css).toContain('@media (min-width: 1024px)');
    expect(css).toContain('layout-gridTemplateColumns-desktop-4');
    expect(css).toContain('repeat(4, 1fr)');
  });
});
