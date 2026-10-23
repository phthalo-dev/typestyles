import { describe, it, expect, beforeEach, vi } from 'vite-plus/test';
import { createComponent } from './component';
import { mergeClassNaming } from './class-naming';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { registeredNamespaces } from './registry';

const bemEquivalentTemplate = ({
  scope,
  namespace,
  element,
  modifier,
}: {
  scope: string;
  namespace: string;
  element: string | undefined;
  dimension: string | undefined;
  modifier: string | undefined;
}) => {
  const base = element ? `${scope}${namespace}__${element}` : `${scope}${namespace}`;
  return modifier ? `${base}--${modifier}` : base;
};

const suitTemplate = ({
  scope,
  namespace,
  element,
  modifier,
}: {
  scope: string;
  namespace: string;
  element: string | undefined;
  dimension: string | undefined;
  modifier: string | undefined;
}) => {
  const Block = `${scope}${namespace[0].toUpperCase()}${namespace.slice(1)}`;
  if (element) return modifier ? `${Block}-${element}--${modifier}` : `${Block}-${element}`;
  return modifier ? `${Block}--${modifier}` : Block;
};

const templateMode = mergeClassNaming({
  mode: 'template',
  classNameTemplate: bemEquivalentTemplate,
});
const suitMode = mergeClassNaming({ mode: 'template', classNameTemplate: suitTemplate });

describe('createComponent — template-mode dimensioned variants (BEM-equivalent template)', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('produces identical output to mode: bem for the same shape', () => {
    const btn = createComponent(templateMode, 'button', {
      base: { padding: '8px' },
      variants: {
        variant: { primary: { color: 'blue' }, secondary: { color: 'gray' } },
        size: { small: { fontSize: '14px' }, large: { fontSize: '18px' } },
      },
      defaultVariants: { variant: 'primary', size: 'small' },
    });
    expect(btn({ variant: 'primary', size: 'large' })).toBe('button button--primary button--large');
    expect(btn()).toBe('button button--primary button--small');
  });

  it('compound variants compile to a chained selector, no synthetic class', () => {
    const btn = createComponent(templateMode, 'compound-btn', {
      variants: {
        variant: { primary: { color: 'blue' } },
        size: { large: { fontSize: '18px' } },
      },
      compoundVariants: [
        { variants: { variant: 'primary', size: 'large' }, style: { fontWeight: 700 } },
      ],
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.compound-btn--primary.compound-btn--large { font-weight: 700; }');
    expect(Object.keys(btn)).not.toContain('compound-0');
  });

  it('warns in dev when two dimensions collide on the same modifier class', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    createComponent(templateMode, 'collide-template', {
      variants: {
        intent: { primary: { color: 'blue' } },
        theme: { primary: { backgroundColor: 'black' } },
      },
    });
    expect(err).toHaveBeenCalledWith(expect.stringContaining('collide-template--primary'));
    err.mockRestore();
  });

  it('throws in dev when the template returns an invalid class name', () => {
    const invalidMode = mergeClassNaming({
      mode: 'template',
      classNameTemplate: () => '1invalid',
    });
    expect(() =>
      createComponent(invalidMode, 'bad', {
        variants: { intent: { primary: { color: 'blue' } } },
      }),
    ).toThrow(/invalid CSS class name/);
  });
});

describe('createComponent — template-mode slots (BEM-equivalent template)', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('root slot maps to the bare block class; other slots map to block__element', () => {
    const dialog = createComponent(templateMode, 'dialog', {
      slots: ['root', 'trigger', 'content'],
      base: { root: { display: 'grid' }, trigger: { cursor: 'pointer' } },
    });
    const classes = dialog();
    expect(classes.root).toBe('dialog');
    expect(classes.trigger).toBe('dialog__trigger');
    expect(classes.content).toBe('dialog__content');
  });

  it('multi-slot config (no variants) maps root/element the same way', () => {
    const dialog = createComponent(templateMode, 'dialog-multi', {
      slots: ['root', 'trigger'],
      root: { display: 'grid' },
      trigger: { cursor: 'pointer' },
    });
    const classes = dialog();
    expect(classes.root).toBe('dialog-multi');
    expect(classes.trigger).toBe('dialog-multi__trigger');
  });
});

describe('createComponent — template-mode with a SUIT CSS template (proves genericity beyond BEM)', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('produces PascalCase blocks with SUIT-style modifiers and descendants', () => {
    const btn = createComponent(suitMode, 'button', {
      base: { padding: '8px' },
      variants: { intent: { primary: { color: 'blue' } } },
    });
    expect(btn.base).toBe('Button');
    expect(btn['intent-primary']).toBe('Button--primary');
  });

  it('slot elements use SUIT descendant naming (Block-descendant--modifier)', () => {
    const dialog = createComponent(suitMode, 'dialog', {
      slots: ['root', 'trigger'],
      base: { root: { display: 'grid' } },
      variants: {
        size: { lg: { trigger: { fontSize: '16px' } } },
      },
    });
    const classes = dialog({ size: 'lg' });
    expect(classes.root).toBe('Dialog');
    expect(classes.trigger).toBe('Dialog-trigger Dialog-trigger--lg');
  });
});
