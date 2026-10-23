import { describe, it, expect } from 'vite-plus/test';
import { defineProperties } from './defineProperties';

describe('defineProperties', () => {
  it('creates a property collection with properties', () => {
    const collection = defineProperties({
      properties: {
        display: ['flex', 'block', 'grid'],
        padding: { 0: '0', 1: '4px', 2: '8px' },
      },
    });

    expect(collection.properties).toEqual({
      display: ['flex', 'block', 'grid'],
      padding: { 0: '0', 1: '4px', 2: '8px' },
    });
  });

  it('handles conditions', () => {
    const collection = defineProperties({
      conditions: {
        mobile: { '@media': '(min-width: 768px)' },
        desktop: { '@media': '(min-width: 1024px)' },
      },
      properties: {
        display: ['flex', 'block'],
      },
    });

    expect(collection.conditions).toEqual({
      mobile: { '@media': '(min-width: 768px)' },
      desktop: { '@media': '(min-width: 1024px)' },
    });
  });

  it('handles shorthands', () => {
    const collection = defineProperties({
      properties: {
        paddingTop: { 0: '0', 1: '4px' },
        paddingRight: { 0: '0', 1: '4px' },
        paddingBottom: { 0: '0', 1: '4px' },
        paddingLeft: { 0: '0', 1: '4px' },
      },
      shorthands: {
        padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
      },
    });

    expect(collection.shorthands).toEqual({
      padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
    });
  });

  it('defaults to false for defaultCondition', () => {
    const collection = defineProperties({
      properties: {
        display: ['flex'],
      },
    });

    expect(collection.defaultCondition).toBe(false);
  });

  it('accepts explicit defaultCondition', () => {
    const collection = defineProperties({
      conditions: {
        mobile: { '@media': '(min-width: 768px)' },
      },
      defaultCondition: 'mobile',
      properties: {
        display: ['flex'],
      },
    });

    expect(collection.defaultCondition).toBe('mobile');
  });
});
