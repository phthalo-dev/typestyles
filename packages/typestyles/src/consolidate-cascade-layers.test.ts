import { describe, it, expect } from 'vite-plus/test';
import { consolidateCascadeLayers, splitTopLevelCss } from './consolidate-cascade-layers';

describe('splitTopLevelCss', () => {
  it('splits preamble, @property, and @layer blocks', () => {
    const css = `@layer a, b;
@property --x { syntax: "<color>"; inherits: true; initial-value: transparent; }
@layer a {
.foo { color: red; }
}
@layer b {
.bar { color: blue; }
}`;
    expect(splitTopLevelCss(css)).toEqual([
      '@layer a, b;',
      '@property --x { syntax: "<color>"; inherits: true; initial-value: transparent; }',
      '@layer a {\n.foo { color: red; }\n}',
      '@layer b {\n.bar { color: blue; }\n}',
    ]);
  });

  it('keeps nested braces inside a layer body', () => {
    const css = `@layer tokens {
@media (prefers-color-scheme: dark) { .theme { --c: #000; } }
}`;
    expect(splitTopLevelCss(css)).toHaveLength(1);
    expect(splitTopLevelCss(css)[0]).toContain('@media');
  });
});

describe('consolidateCascadeLayers', () => {
  it('returns CSS unchanged when there are no @layer rules', () => {
    const css =
      '.a { color: red; }\n@property --x { syntax: "*"; inherits: true; initial-value: 0; }';
    expect(consolidateCascadeLayers(css)).toBe(css);
  });

  it('merges same-named @layer blocks and hoists @property after the preamble', () => {
    const input = [
      '@layer reset, tokens, components;',
      '@property --vui-color-brand { syntax: "<color>"; inherits: true; initial-value: transparent; }',
      '@property --vui-color-red-10 { syntax: "<color>"; inherits: true; initial-value: transparent; }',
      '@layer tokens {\n:root { --vui-color-brand: red; --vui-color-red-10: #f90; }\n}',
      '@layer tokens {\n.theme-vui-default { color-scheme: light dark; --vui-color-brand: light-dark(red, blue); --vui-color-red-10: #f90; }\n}',
      '@property --vui-button-bg { syntax: "<color>"; inherits: true; initial-value: transparent; }',
      '@layer components {\n.vui-button { --vui-button-bg: var(--vui-color-brand); background: var(--vui-button-bg); }\n}',
      '@layer components {\n.vui-button[data-role="primary"] { background: var(--vui-color-red-10); }\n}',
      '@layer components {\n.vui-button[data-role="secondary"] { border: 1px solid black; }\n}',
    ].join('\n');

    expect(consolidateCascadeLayers(input)).toMatchInlineSnapshot(`
      "@layer reset, tokens, components;
      @property --vui-color-brand { syntax: "<color>"; inherits: true; initial-value: transparent; }
      @property --vui-color-red-10 { syntax: "<color>"; inherits: true; initial-value: transparent; }
      @property --vui-button-bg { syntax: "<color>"; inherits: true; initial-value: transparent; }
      @layer tokens {
      :root { --vui-color-brand: red; --vui-color-red-10: #f90; }
      .theme-vui-default { color-scheme: light dark; --vui-color-brand: light-dark(red, blue); --vui-color-red-10: #f90; }
      }
      @layer components {
      .vui-button { --vui-button-bg: var(--vui-color-brand); background: var(--vui-button-bg); }
      .vui-button[data-role="primary"] { background: var(--vui-color-red-10); }
      .vui-button[data-role="secondary"] { border: 1px solid black; }
      }"
    `);
  });

  it('preserves within-layer rule order across merged blocks', () => {
    const css = `@layer c {
.a { order: 1; }
}
@layer c {
.b { order: 2; }
}
@layer c {
.c { order: 3; }
}`;
    const out = consolidateCascadeLayers(css);
    expect(out.indexOf('.a')).toBeLessThan(out.indexOf('.b'));
    expect(out.indexOf('.b')).toBeLessThan(out.indexOf('.c'));
    expect(out.match(/@layer c \{/g)?.length).toBe(1);
  });

  it('leaves unlayered rules in place relative to first layer sightings', () => {
    const css = `@layer a, b;
@layer a {
.a { color: red; }
}
@keyframes spin { from { opacity: 0; } to { opacity: 1; } }
@layer b {
.b { color: blue; }
}
@layer a {
.a2 { color: green; }
}`;
    expect(consolidateCascadeLayers(css)).toMatchInlineSnapshot(`
      "@layer a, b;
      @layer a {
      .a { color: red; }
      .a2 { color: green; }
      }
      @keyframes spin { from { opacity: 0; } to { opacity: 1; } }
      @layer b {
      .b { color: blue; }
      }"
    `);
  });
});
