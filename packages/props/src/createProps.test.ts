import { describe, it, expect, beforeEach } from 'vite-plus/test';
import { reset, flushSync, getRegisteredCss } from 'typestyles';
import { defineProperties } from './defineProperties';
import { createProps } from './createProps';

describe('createProps', () => {
  beforeEach(() => {
    reset();
  });

  it('creates a props function', () => {
    const collection = defineProperties({
      properties: {
        display: ['flex', 'block'],
      },
    });

    const props = createProps('atoms', collection);

    expect(typeof props).toBe('function');
  });

  it('generates class names for simple properties', () => {
    const collection = defineProperties({
      properties: {
        display: ['flex', 'block', 'grid'],
      },
    });

    const props = createProps('atoms', collection);

    expect(props({ display: 'flex' })).toBe('atoms-display-flex');
    expect(props({ display: 'block' })).toBe('atoms-display-block');
  });

  it('generates class names for object-based values', () => {
    const collection = defineProperties({
      properties: {
        padding: { 0: '0', 1: '4px', 2: '8px', 3: '16px' },
      },
    });

    const props = createProps('spacing', collection);

    expect(props({ padding: 0 })).toBe('spacing-padding-0');
    expect(props({ padding: 2 })).toBe('spacing-padding-2');
  });

  it('handles conditional values', () => {
    const collection = defineProperties({
      conditions: {
        mobile: { '@media': '(min-width: 768px)' },
        desktop: { '@media': '(min-width: 1024px)' },
      },
      properties: {
        display: ['flex', 'block'],
      },
    });

    const props = createProps('atoms', collection);

    expect(props({ display: { mobile: 'flex' } })).toBe('atoms-display-mobile-flex');
    expect(props({ display: { desktop: 'block' } })).toBe('atoms-display-desktop-block');
  });

  it('handles mixed conditional and direct values', () => {
    const collection = defineProperties({
      conditions: {
        mobile: { '@media': '(min-width: 768px)' },
      },
      properties: {
        display: ['flex', 'block'],
        padding: { 0: '0', 1: '4px', 2: '8px' },
      },
    });

    const props = createProps('atoms', collection);

    expect(props({ display: { mobile: 'flex' }, padding: 1 })).toBe(
      'atoms-display-mobile-flex atoms-padding-1',
    );
  });

  it('expands shorthands', () => {
    const collection = defineProperties({
      properties: {
        paddingTop: { 0: '0', 1: '4px', 2: '8px' },
        paddingRight: { 0: '0', 1: '4px', 2: '8px' },
        paddingBottom: { 0: '0', 1: '4px', 2: '8px' },
        paddingLeft: { 0: '0', 1: '4px', 2: '8px' },
      },
      shorthands: {
        padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
      },
    });

    const props = createProps('spacing', collection);

    const result = props({ padding: 2 });
    expect(result).toContain('spacing-paddingTop-2');
    expect(result).toContain('spacing-paddingRight-2');
    expect(result).toContain('spacing-paddingBottom-2');
    expect(result).toContain('spacing-paddingLeft-2');
  });

  it('injects CSS rules', () => {
    const collection = defineProperties({
      properties: {
        display: ['flex', 'block'],
      },
    });

    createProps('atoms', collection);
    flushSync();

    const css = getRegisteredCss();
    expect(css).toContain('.atoms-display-flex');
    expect(css).toContain('display: flex');
  });

  it('exposes properties set', () => {
    const collection = defineProperties({
      properties: {
        display: ['flex'],
        padding: { 0: '0', 1: '4px' },
      },
      shorthands: {
        p: ['padding'],
      },
    });

    const props = createProps('atoms', collection);

    expect(props.properties.has('display')).toBe(true);
    expect(props.properties.has('padding')).toBe(true);
    expect(props.properties.has('p')).toBe(true);
  });

  it('combines multiple property collections', () => {
    const layout = defineProperties({
      properties: {
        display: ['flex', 'block'],
      },
    });

    const spacing = defineProperties({
      properties: {
        padding: { 0: '0', 1: '4px' },
      },
    });

    const props = createProps('atoms', layout, spacing);

    expect(props({ display: 'flex', padding: 1 })).toBe('atoms-display-flex atoms-padding-1');
  });

  it('handles null and undefined values', () => {
    const collection = defineProperties({
      properties: {
        display: ['flex', 'block'],
        padding: { 0: '0', 1: '4px' },
      },
    });

    const props = createProps('atoms', collection);

    expect(props({ display: 'flex', padding: null as unknown })).toBe('atoms-display-flex');
    expect(props({ display: undefined as unknown, padding: 1 })).toBe('atoms-padding-1');
  });
});
