import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSnapshot,
  collectPublicClassNamesSync,
  resolveProjectStylesBindings,
  semanticClassName,
} from './snapshot-classnames';

describe('snapshot-classnames', () => {
  it('computes semantic class names from component configs', () => {
    expect(semanticClassName({ mode: 'semantic', scopeId: '' }, 'button', 'base')).toBe('button');
    expect(
      semanticClassName({ mode: 'semantic', scopeId: '@acme/ui' }, 'button', 'intent-primary'),
    ).toBe('acme-ui-button--intent-primary');
    expect(semanticClassName({ mode: 'semantic', scopeId: '' }, 'button')).toBe('button');
    expect(semanticClassName({ mode: 'bem', scopeId: '' }, 'button', 'primary')).toBe(
      'button--primary',
    );
    expect(semanticClassName({ mode: 'attribute', scopeId: '' }, 'button', 'primary')).toBe(
      'button',
    );
    expect(semanticClassName({ mode: 'hashed', scopeId: '' }, 'button', 'base')).toBeNull();
    expect(semanticClassName({ mode: 'template', scopeId: '' }, 'button', 'base')).toBeNull();
  });

  it('resolves createTypeStyles bindings across files', () => {
    const rootDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../examples/design-system',
    );
    const runtimePath = path.join(rootDir, 'src/runtime.ts');
    const bindings = resolveProjectStylesBindings([runtimePath], rootDir);
    expect([...bindings.keys()]).toEqual(
      expect.arrayContaining(['style', 'recipe', 'tokens', 'global']),
    );
    expect(bindings.get('style')).toEqual({ mode: 'semantic', scopeId: 'example-ds' });
    expect(bindings.get('recipe')).toEqual({ mode: 'semantic', scopeId: 'example-ds' });
  });

  it('collects class names from the design-system button source', () => {
    const rootDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../examples/design-system',
    );
    const entries = collectPublicClassNamesSync({
      rootDir,
      include: ['src/runtime.ts', 'src/components/button.ts'],
    });
    const snapshot = buildSnapshot(entries);
    expect(snapshot.classNames).toContain('example-ds-button');
    expect(snapshot.classNames.some((name) => name.startsWith('example-ds-button--intent-'))).toBe(
      true,
    );
  });

  it('collects class names from typestyles.recipe property access', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typestyles-snapshot-'));
    try {
      fs.writeFileSync(
        path.join(rootDir, 'runtime.ts'),
        `
import { createTypeStyles } from 'typestyles';
export const typestyles = createTypeStyles({ scopeId: 'ds', mode: 'attribute' });
`,
      );
      fs.writeFileSync(
        path.join(rootDir, 'alert.ts'),
        `
import { typestyles } from './runtime';
export const alert = typestyles.recipe('alert', (c) => ({
  slots: ['root', 'body', 'title'],
  base: {
    root: { display: 'flex' },
    body: { flex: 1 },
    title: { fontWeight: 600 },
  },
  variants: {
    tone: {
      accent: { root: { color: 'blue' } },
    },
  },
}));
export const badge = typestyles.style('badge', { display: 'inline-flex' });
`,
      );

      const snapshot = buildSnapshot(
        collectPublicClassNamesSync({
          rootDir,
          include: ['runtime.ts', 'alert.ts'],
        }),
      );

      expect(snapshot.classNames).toEqual(
        expect.arrayContaining(['ds-alert', 'ds-alert__body', 'ds-alert__title', 'ds-badge']),
      );
      expect(snapshot.classNames).not.toContain('ds-alert--tone-accent');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('parses parenthesized arrow recipe configs', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typestyles-snapshot-'));
    try {
      fs.writeFileSync(
        path.join(rootDir, 'card.ts'),
        `
import { createTypeStyles } from 'typestyles';
const { recipe } = createTypeStyles({ mode: 'semantic' });
export const card = recipe('card', () => ({
  slots: ['root', 'body'],
  base: { root: { padding: '8px' }, body: { margin: 0 } },
}));
`,
      );

      const snapshot = buildSnapshot(
        collectPublicClassNamesSync({
          rootDir,
          include: ['card.ts'],
        }),
      );

      expect(snapshot.classNames).toEqual(expect.arrayContaining(['card', 'card__body']));
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('records attribute base classes and skips boolean and template-mode modifier classes', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typestyles-snapshot-'));
    try {
      fs.writeFileSync(
        path.join(rootDir, 'styles.ts'),
        `
import { createStyles } from 'typestyles';
export const attr = createStyles({ mode: 'attribute' });
export const tmpl = createStyles({ mode: 'template', classNameTemplate: (ctx) => ctx.namespace });
`,
      );
      fs.writeFileSync(
        path.join(rootDir, 'card.ts'),
        `
import { attr, tmpl } from './styles';
export const card = attr.component({ name: 'card', variants: { elevated: variant.boolean({ default: false }) }, styles: { base: { padding: '8px' }, variants: { elevated: { true: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }, false: {} } } } });
export const button = attr.component({ name: 'button', variants: { intent: variant.enum(["primary"], { default: "primary" }) }, styles: { base: { padding: '8px' }, variants: { intent: {
      primary: { color: 'white' },
    } } } });
export const custom = tmpl.component({ name: 'custom', variants: { size: variant.enum(["lg"], { default: "lg" }) }, styles: { base: { color: 'red' }, variants: { size: { lg: { fontSize: '18px' } } } } });
`,
      );

      const snapshot = buildSnapshot(
        collectPublicClassNamesSync({
          rootDir,
          include: ['styles.ts', 'card.ts'],
        }),
      );

      expect(snapshot.classNames).toContain('card');
      expect(snapshot.classNames).not.toContain('card--elevated');
      expect(snapshot.classNames).toContain('button');
      expect(snapshot.classNames).not.toContain('button--intent-primary');
      expect(snapshot.classNames).not.toContain('custom');
      expect(snapshot.classNames).not.toContain('custom--size-lg');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('collects class names from a schema-first recipe (definition + callback)', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typestyles-snapshot-'));
    try {
      fs.writeFileSync(
        path.join(rootDir, 'runtime.ts'),
        `
import { createTypeStyles } from 'typestyles';
export const { recipe } = createTypeStyles({ scopeId: 'ds', mode: 'semantic' });
`,
      );
      fs.writeFileSync(
        path.join(rootDir, 'alert.ts'),
        `
import { recipe } from './runtime';
import { variant } from 'typestyles';
export const alert = recipe({
  name: 'alert',
  layer: 'components',
  slots: ['root', 'body', 'title'] as const,
  variants: {
    tone: variant.enum(['info', 'danger'], { default: 'info' }),
    elevated: variant.boolean({ default: false }),
  },
  vars: { accent: { value: 'blue', syntax: '<color>' } },
  styles: ({ vars: v }) => ({
    base: { root: { color: v.accent.var }, body: { flex: 1 }, title: { fontWeight: 600 } },
    variants: {
      tone: {
        info: { root: { color: 'blue' } },
        danger: { root: { color: 'red' } },
      },
      elevated: { true: { root: { boxShadow: '0 1px 2px' } }, false: {} },
    },
  }),
});
`,
      );

      const snapshot = buildSnapshot(
        collectPublicClassNamesSync({
          rootDir,
          include: ['runtime.ts', 'alert.ts'],
        }),
      );

      expect(snapshot.classNames).toEqual(
        expect.arrayContaining([
          'ds-alert',
          'ds-alert__body',
          'ds-alert__title',
          'ds-alert--tone-info',
          'ds-alert--tone-danger',
          'ds-alert--elevated-true',
        ]),
      );
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('collects a schema-first single-target recipe and suppresses attribute dimensions', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typestyles-snapshot-'));
    try {
      fs.writeFileSync(
        path.join(rootDir, 'runtime.ts'),
        `
import { createTypeStyles } from 'typestyles';
export const typestyles = createTypeStyles({ scopeId: 'ds', mode: 'attribute' });
`,
      );
      fs.writeFileSync(
        path.join(rootDir, 'button.ts'),
        `
import { typestyles } from './runtime';
import { variant } from 'typestyles';
export const button = typestyles.recipe(
  { name: 'button', styles: { variants: { size: variant.enum(['sm', 'lg'], { default: 'sm' }) } } },
);
`,
      );

      const snapshot = buildSnapshot(
        collectPublicClassNamesSync({
          rootDir,
          include: ['runtime.ts', 'button.ts'],
        }),
      );

      expect(snapshot.classNames).toContain('ds-button');
      // Dimensioned attribute variants compile to data-* attrs, not public classes.
      expect(snapshot.classNames).not.toContain('ds-button--size-lg');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
