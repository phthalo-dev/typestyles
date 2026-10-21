import { variant } from './variant';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  fileScopeId,
  mergeClassNaming,
  resolveClassNameTemplate,
  buildTemplateClassName,
  emittedComponentClassPrefix,
  type ClassNameTemplate,
} from './class-naming';
import { createStyles } from './styles';
import { reset, flushSync } from './sheet';
import { registeredNamespaces } from './registry';

describe('fileScopeId', () => {
  it('is stable for the same url and differs for different paths', () => {
    const a = fileScopeId({ url: 'file:///app/src/Button.tsx' });
    const b = fileScopeId({ url: 'file:///app/src/Button.tsx' });
    const c = fileScopeId({ url: 'file:///app/src/Input.tsx' });
    expect(a).toMatch(/^file-[a-z0-9]+$/);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('class naming modes', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('semantic mode keeps readable component() class strings', () => {
    const styles = createStyles({ mode: 'semantic' });
    const button = styles.component({
      name: 'btn',
      variants: { primary: variant.boolean({ default: false }) },
      styles: {
        base: { color: 'red' },
        variants: { primary: { true: { backgroundColor: 'blue' }, false: {} } },
      },
    });
    expect(button.base).toBe('btn');
    expect(button['primary-true']).toBe('btn--primary-true');
  });

  it('hashed mode yields stable prefixed class names for component()', () => {
    const styles = createStyles({ mode: 'hashed', prefix: 'app' });
    const a = styles.component({
      name: 'card',
      variants: { root: variant.boolean({ default: false }) },
      styles: { variants: { root: { true: { padding: '8px' }, false: {} } } },
    });
    registeredNamespaces.clear();
    const b = styles.component({
      name: 'card',
      variants: { root: variant.boolean({ default: false }) },
      styles: { variants: { root: { true: { padding: '8px' }, false: {} } } },
    });
    expect(a['root-true']).toMatch(/^app-card-/);
    expect(a['root-true']).toBe(b['root-true']);
  });

  it('scopeId changes hashed output for the same logical component styles', () => {
    const sa = createStyles({ mode: 'hashed', scopeId: 'pkg-a' });
    const x = sa.component({
      name: 'box',
      variants: { main: variant.boolean({ default: false }) },
      styles: { variants: { main: { true: { margin: 0 }, false: {} } } },
    })['main-true'];
    reset();
    registeredNamespaces.clear();
    const sb = createStyles({ mode: 'hashed', scopeId: 'pkg-b' });
    const y = sb.component({
      name: 'box',
      variants: { main: variant.boolean({ default: false }) },
      styles: { variants: { main: { true: { margin: 0 }, false: {} } } },
    })['main-true'];
    expect(x).not.toBe(y);
  });

  it('compact mode omits the namespace slug in class strings', () => {
    const styles = createStyles({ mode: 'compact', prefix: 'x' });
    const button = styles.component({ name: 'btn', styles: { base: { color: 'red' } } });
    expect(button.base).toMatch(/^x-[a-z0-9]+$/);
    expect(button.base).not.toContain('btn');
  });

  it('atomic mode emits one class per declaration', () => {
    const styles = createStyles({ mode: 'atomic', prefix: 'x' });
    const button = styles.component({
      name: 'btn',
      styles: { base: { color: 'red', padding: '8px' } },
    });
    const parts = button.base.split(' ');
    expect(parts).toHaveLength(2);
    for (const p of parts) {
      expect(p).toMatch(/^x-[a-z0-9]+$/);
    }
  });

  it('style respects naming mode', () => {
    const styles = createStyles({ mode: 'hashed', prefix: 't' });
    const cls = styles.class('hero', { display: 'flex' });
    expect(cls).toMatch(/^t-hero-/);
  });

  it('createComponent resolves variant keys to hashed classes', () => {
    const styles = createStyles({ mode: 'hashed', prefix: 'c' });
    const btn = styles.component({
      name: 'cb',
      variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
      styles: {
        base: { padding: '4px' },
        variants: {
          intent: {
            primary: { color: 'blue' },
          },
        },
      },
    });
    const out = btn({ intent: 'primary' }).className;
    expect(out).toMatch(/c-cb-/);
    expect(out).not.toContain('cb-intent-primary');
    flushSync();
    const style = document.getElementById('typestyles') as HTMLStyleElement;
    const parts = out.split(' ');
    for (const p of parts) {
      const found = Array.from(style.sheet?.cssRules ?? []).some(
        (r) => r instanceof CSSStyleRule && r.selectorText === `.${p}`,
      );
      expect(found, `selector .${p}`).toBe(true);
    }
  });

  it('createHashClass uses default prefix when scopeId is empty', () => {
    const styles = createStyles({ scopeId: '' });
    const cls = styles.hashClass({ color: 'red' }, 'lbl');
    expect(cls.startsWith('ts-lbl-')).toBe(true);
  });

  it('createHashClass includes scopeId in the hash when set', () => {
    const sa = createStyles();
    const a = sa.hashClass({ width: 10 }, 'x');
    reset();
    registeredNamespaces.clear();
    const sb = createStyles({ scopeId: 's1' });
    const b = sb.hashClass({ width: 10 }, 'x');
    expect(a).not.toBe(b);
  });
});

describe('semantic mode with scopeId', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('prefixes component class names with the sanitized scope', () => {
    const styles = createStyles({ scopeId: 'my-ui' });
    const button = styles.component({
      name: 'button',
      variants: { intent: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { color: 'red' }, variants: { intent: { primary: { color: 'blue' } } } },
    });
    expect(button.base).toBe('my-ui-button');
    expect(button['intent-primary']).toBe('my-ui-button--intent-primary');
    expect(button({ intent: 'primary' }).className).toBe(
      'my-ui-button my-ui-button--intent-primary',
    );
  });

  it('sanitizes package-style scope ids', () => {
    const styles = createStyles({ scopeId: '@acme/design-system' });
    const cls = styles.class('card', { padding: '1rem' });
    expect(cls).toBe('acme-design-system-card');
  });

  it('keeps unscoped names unchanged', () => {
    const styles = createStyles();
    const cls = styles.class('card', { padding: '1rem' });
    expect(cls).toBe('card');
  });

  it('isolates the same logical namespace across scopes', () => {
    const sa = createStyles({ scopeId: 'pkg-a' });
    const sb = createStyles({ scopeId: 'pkg-b' });
    const a = sa.component({ name: 'button', styles: { base: { color: 'red' } } });
    const b = sb.component({ name: 'button', styles: { base: { color: 'blue' } } });
    expect(a.base).not.toBe(b.base);
  });
});

describe('class name collision detection (dev)', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('errors when two different definitions emit the same class string', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // scope 'docs' + namespace 'button' and no scope + namespace 'docs-button'
    // both emit "docs-button"
    const scoped = createStyles({ scopeId: 'docs' });
    const unscoped = createStyles();
    scoped.component({ name: 'button', styles: { base: { color: 'red' } } });
    unscoped.component({ name: 'docs-button', styles: { base: { color: 'blue' } } });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Class name collision'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('docs-button'));
  });

  it('does not error when the same definition re-registers (HMR)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const styles = createStyles({ scopeId: 'app' });
    styles.component({ name: 'button', styles: { base: { color: 'red' } } });
    // Same scope + namespace re-registered with edited styles — dev HMR path
    styles.component({ name: 'button', styles: { base: { color: 'blue' } } });
    const collisionCalls = errorSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('Class name collision'),
    );
    expect(collisionCalls).toHaveLength(0);
  });

  it('does not error for identical hashClass payloads (intentional dedup)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const styles = createStyles();
    const a = styles.hashClass({ color: 'red' });
    const b = styles.hashClass({ color: 'red' });
    expect(a).toBe(b);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('errors when style and recipe share an emitted base class', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const styles = createStyles();
    styles.class('button', { color: 'red' });
    styles.component({ name: 'button', styles: { base: { color: 'blue' } } });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Class name collision'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('button'));
  });
});

describe('unscoped collision warning (dev)', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns when the same component namespace is registered twice without scopeId', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = createStyles();
    const b = createStyles();
    a.component({ name: 'card', styles: { base: { color: 'red' } } });
    b.component({ name: 'card', styles: { base: { color: 'blue' } } });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("recipe('card'"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('without a scopeId'));
  });

  it('does not warn when scoped components re-register (HMR)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const styles = createStyles({ scopeId: 'app' });
    styles.component({ name: 'button', styles: { base: { color: 'red' } } });
    styles.component({ name: 'button', styles: { base: { color: 'blue' } } });
    const unscopedCalls = warnSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('without a scopeId'),
    );
    expect(unscopedCalls).toHaveLength(0);
  });

  it('warns only once per namespace', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = createStyles();
    const b = createStyles();
    const c = createStyles();
    a.component({ name: 'tag', styles: { base: { color: 'red' } } });
    b.component({ name: 'tag', styles: { base: { color: 'blue' } } });
    c.component({ name: 'tag', styles: { base: { color: 'green' } } });
    const unscopedCalls = warnSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes("recipe('tag'"),
    );
    expect(unscopedCalls).toHaveLength(1);
  });
});

describe('SEMANTIC_TEMPLATE', () => {
  it('emits block, dimensioned modifier, flat modifier, slots, scoped', () => {
    const cfg = mergeClassNaming({ mode: 'semantic' });
    const t = resolveClassNameTemplate(cfg);
    expect(
      t({
        scope: '',
        namespace: 'button',
        element: undefined,
        dimension: undefined,
        modifier: undefined,
      }),
    ).toBe('button');
    expect(
      t({
        scope: '',
        namespace: 'button',
        element: undefined,
        dimension: 'intent',
        modifier: 'primary',
      }),
    ).toBe('button--intent-primary');
    expect(
      t({
        scope: '',
        namespace: 'card',
        element: undefined,
        dimension: undefined,
        modifier: 'elevated',
      }),
    ).toBe('card--elevated');
    expect(
      t({
        scope: '',
        namespace: 'dialog',
        element: undefined,
        dimension: undefined,
        modifier: undefined,
      }),
    ).toBe('dialog');
    expect(
      t({
        scope: '',
        namespace: 'dialog',
        element: 'content',
        dimension: undefined,
        modifier: undefined,
      }),
    ).toBe('dialog__content');
    expect(
      t({ scope: '', namespace: 'dialog', element: 'content', dimension: 'size', modifier: 'lg' }),
    ).toBe('dialog__content--size-lg');
    expect(
      t({
        scope: 'var-ui-',
        namespace: 'button',
        element: undefined,
        dimension: 'intent',
        modifier: 'primary',
      }),
    ).toBe('var-ui-button--intent-primary');
  });

  it('emittedComponentClassPrefix for semantic/attribute is bare block', () => {
    expect(emittedComponentClassPrefix(mergeClassNaming({ mode: 'semantic' }), 'button')).toBe(
      'button',
    );
    expect(emittedComponentClassPrefix(mergeClassNaming({ mode: 'attribute' }), 'button')).toBe(
      'button',
    );
    expect(
      emittedComponentClassPrefix(
        mergeClassNaming({ mode: 'semantic', scopeId: 'var-ui' }),
        'button',
      ),
    ).toBe('var-ui-button');
  });
});

describe('generic classname template engine (buildTemplateClassName / resolveClassNameTemplate)', () => {
  it('resolveClassNameTemplate returns the built-in BEM preset for mode: bem', () => {
    const cfg = mergeClassNaming({ mode: 'bem' });
    const template = resolveClassNameTemplate(cfg);
    expect(
      template({
        scope: '',
        namespace: 'button',
        element: undefined,
        dimension: undefined,
        modifier: undefined,
      }),
    ).toBe('button');
    expect(
      template({
        scope: '',
        namespace: 'button',
        element: undefined,
        dimension: 'variant',
        modifier: 'primary',
      }),
    ).toBe('button--primary');
    expect(
      template({
        scope: '',
        namespace: 'dialog',
        element: 'trigger',
        dimension: undefined,
        modifier: undefined,
      }),
    ).toBe('dialog__trigger');
    expect(
      template({
        scope: '',
        namespace: 'dialog',
        element: 'trigger',
        dimension: 'variant',
        modifier: 'primary',
      }),
    ).toBe('dialog__trigger--primary');
  });

  it('resolveClassNameTemplate returns the user-supplied classNameTemplate for mode: template', () => {
    const custom: ClassNameTemplate = (ctx) => `x-${ctx.namespace}`;
    const cfg = mergeClassNaming({ mode: 'template', classNameTemplate: custom });
    expect(resolveClassNameTemplate(cfg)).toBe(custom);
  });

  it('buildTemplateClassName matches BEM output exactly (block, element, modifier, scoped)', () => {
    const cfg = mergeClassNaming({ mode: 'bem', scopeId: 'My UI' });
    expect(
      buildTemplateClassName(cfg, {
        namespace: 'button',
        element: undefined,
        dimension: undefined,
        modifier: undefined,
      }),
    ).toBe('my-ui-button');
    expect(
      buildTemplateClassName(cfg, {
        namespace: 'dialog',
        element: 'trigger',
        dimension: undefined,
        modifier: undefined,
      }),
    ).toBe('my-ui-dialog__trigger');
    expect(
      buildTemplateClassName(cfg, {
        namespace: 'button',
        element: undefined,
        dimension: 'variant',
        modifier: 'primary',
      }),
    ).toBe('my-ui-button--primary');
  });

  it('buildTemplateClassName calls the user template with a fully-populated ClassNameContext, including scope', () => {
    const seen: unknown[] = [];
    const cfg = mergeClassNaming({
      mode: 'template',
      scopeId: 'acme',
      classNameTemplate: (ctx) => {
        seen.push(ctx);
        return 'ok';
      },
    });
    buildTemplateClassName(cfg, {
      namespace: 'button',
      element: 'icon',
      dimension: 'intent',
      modifier: 'primary',
    });
    expect(seen).toEqual([
      {
        scope: 'acme-',
        namespace: 'button',
        element: 'icon',
        dimension: 'intent',
        modifier: 'primary',
      },
    ]);
  });

  it('throws in dev when the template returns an invalid CSS class name', () => {
    const cfg = mergeClassNaming({
      mode: 'template',
      classNameTemplate: () => '1-not-a-valid-start',
    });
    expect(() =>
      buildTemplateClassName(cfg, {
        namespace: 'button',
        element: undefined,
        dimension: undefined,
        modifier: undefined,
      }),
    ).toThrow(/invalid CSS class name/);
  });

  it('accepts template output starting with a hyphen (valid CSS identifier)', () => {
    const cfg = mergeClassNaming({
      mode: 'template',
      classNameTemplate: () => '-webkit-style-button',
    });
    expect(() =>
      buildTemplateClassName(cfg, {
        namespace: 'button',
        element: undefined,
        dimension: undefined,
        modifier: undefined,
      }),
    ).not.toThrow();
  });
});
