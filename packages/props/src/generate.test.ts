import { describe, it, expect } from 'vite-plus/test';
import { generateAllAtomicClasses, generateFromCollections } from './generate';

describe('generateAllAtomicClasses', () => {
  it('generates classes without conditions when defaultCondition is false', () => {
    const rules = generateAllAtomicClasses('ts', { display: ['flex', 'block'] }, {}, false);
    expect(rules).toHaveLength(2);
    expect(rules[0]).toEqual({
      key: '.ts-display-flex',
      css: '.ts-display-flex { display: flex; }',
    });
    expect(rules[1]).toEqual({
      key: '.ts-display-block',
      css: '.ts-display-block { display: block; }',
    });
  });

  it('generates classes using object-format values', () => {
    const rules = generateAllAtomicClasses('ts', { padding: { sm: '4px', md: '8px' } }, {}, false);
    expect(rules).toHaveLength(2);
    expect(rules.some((r) => r.key === '.ts-padding-sm')).toBe(true);
    expect(rules.some((r) => r.key === '.ts-padding-md')).toBe(true);
    expect(rules.find((r) => r.key === '.ts-padding-sm')?.css).toBe(
      '.ts-padding-sm { padding: 4px; }',
    );
  });

  it('converts camelCase property name to kebab-case in CSS declaration', () => {
    const rules = generateAllAtomicClasses('ts', { backgroundColor: ['red'] }, {}, false);
    expect(rules[0]?.css).toContain('background-color: red');
  });

  it('generates both base class and conditional classes when defaultCondition is false', () => {
    const rules = generateAllAtomicClasses(
      'ts',
      { display: ['flex'] },
      { mobile: { '@media': '(max-width: 640px)' } },
      false,
    );
    expect(rules).toHaveLength(2);
    const base = rules.find((r) => r.key === '.ts-display-flex');
    expect(base).toBeDefined();
    const conditional = rules.find((r) =>
      r.key.includes('@media (max-width: 640px):.ts-display-mobile-flex'),
    );
    expect(conditional).toBeDefined();
    expect(conditional?.css).toContain('@media (max-width: 640px)');
    expect(conditional?.css).toContain('.ts-display-mobile-flex');
  });

  it('generates only conditional classes when defaultCondition names a condition', () => {
    const rules = generateAllAtomicClasses(
      'ts',
      { display: ['flex'] },
      {
        mobile: { '@media': '(max-width: 640px)' },
        desktop: { '@media': '(min-width: 1024px)' },
      },
      'mobile',
    );
    expect(rules).toHaveLength(2);
    const keys = rules.map((r) => r.key);
    // base class uses the mobile (default) condition
    expect(keys.some((k) => k.includes('.ts-display-mobile-flex'))).toBe(true);
    // non-default condition gets its own class
    expect(keys.some((k) => k.includes('.ts-display-desktop-flex'))).toBe(true);
    // no bare class without condition
    expect(keys).not.toContain('.ts-display-flex');
  });

  it('generates container query condition classes', () => {
    const rules = generateAllAtomicClasses(
      'ts',
      { display: ['flex'] },
      { sidebar: { '@container': 'sidebar (min-width: 200px)' } },
      false,
    );
    const conditional = rules.find((r) => r.key.includes('@container'));
    expect(conditional).toBeDefined();
    expect(conditional?.css).toContain('@container sidebar (min-width: 200px)');
    expect(conditional?.css).toContain('.ts-display-sidebar-flex');
  });

  it('generates @supports condition classes', () => {
    const rules = generateAllAtomicClasses(
      'ts',
      { display: ['grid'] },
      { supportsGrid: { '@supports': '(display: grid)' } },
      false,
    );
    const conditional = rules.find((r) => r.key.includes('@supports'));
    expect(conditional).toBeDefined();
    expect(conditional?.css).toContain('@supports (display: grid)');
    expect(conditional?.css).toContain('.ts-display-supportsGrid-grid');
  });

  it('generates selector condition classes with & replaced by className', () => {
    const rules = generateAllAtomicClasses(
      'ts',
      { color: ['red'] },
      { hover: { selector: '&:hover' } },
      false,
    );
    const conditional = rules.find((r) => r.key.includes(':hover'));
    expect(conditional).toBeDefined();
    expect(conditional?.key).toBe('.ts-color-hover-red:hover');
    expect(conditional?.css).toBe('.ts-color-hover-red:hover { color: red; }');
  });

  it('sanitizes values in class names', () => {
    const rules = generateAllAtomicClasses('ts', { padding: ['8px'] }, {}, false);
    expect(rules[0]?.key).toBe('.ts-padding-8px');
    expect(rules[0]?.css).toBe('.ts-padding-8px { padding: 8px; }');
  });

  it('returns empty array when properties are empty', () => {
    const rules = generateAllAtomicClasses('ts', {}, {}, false);
    expect(rules).toHaveLength(0);
  });
});

describe('generateFromCollections', () => {
  it('combines rules from multiple collections', () => {
    const rules = generateFromCollections('ts', [
      {
        properties: { display: ['flex'] },
        conditions: {},
        defaultCondition: false,
        shorthands: {},
      },
      { properties: { color: ['red'] }, conditions: {}, defaultCondition: false, shorthands: {} },
    ]);
    expect(rules).toHaveLength(2);
    expect(rules.some((r) => r.key === '.ts-display-flex')).toBe(true);
    expect(rules.some((r) => r.key === '.ts-color-red')).toBe(true);
  });

  it('returns empty array for empty collections list', () => {
    const rules = generateFromCollections('ts', []);
    expect(rules).toHaveLength(0);
  });

  it('returns empty array for a single collection with no properties', () => {
    const rules = generateFromCollections('ts', [
      { properties: {}, conditions: {}, defaultCondition: false, shorthands: {} },
    ]);
    expect(rules).toHaveLength(0);
  });

  it('accumulates rules from all collections', () => {
    const rules = generateFromCollections('ts', [
      {
        properties: { display: ['flex', 'block'] },
        conditions: {},
        defaultCondition: false,
        shorthands: {},
      },
      {
        properties: { color: ['red', 'blue'] },
        conditions: { hover: { selector: '&:hover' } },
        defaultCondition: false,
        shorthands: {},
      },
    ]);
    // 2 display + 2 color base + 2 color hover = 6
    expect(rules).toHaveLength(6);
  });
});
