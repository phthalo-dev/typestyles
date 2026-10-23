import { describe, it, expect, beforeEach, vi } from 'vite-plus/test';
import { createComponent } from './component';
import { mergeClassNaming } from './class-naming';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { registeredNamespaces } from './registry';

const bemMode = mergeClassNaming({ mode: 'bem' });

describe('createComponent — bem-mode dimensioned variants', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('base class has no -base suffix', () => {
    const btn = createComponent(bemMode, 'button', {
      base: { padding: '8px' },
      variants: { variant: { primary: { color: 'blue' } } },
    });
    expect(btn.base).toBe('button');
  });

  it('modifier classes have no dimension name', () => {
    const btn = createComponent(bemMode, 'button2', {
      base: { padding: '8px' },
      variants: {
        variant: { primary: { color: 'blue' }, secondary: { color: 'gray' } },
        size: { small: { fontSize: '14px' }, large: { fontSize: '18px' } },
      },
    });
    expect(btn['variant-primary']).toBe('button2--primary');
    expect(btn['size-large']).toBe('button2--large');
  });

  it('call composes block + selected modifier classes', () => {
    const btn = createComponent(bemMode, 'button3', {
      base: { padding: '8px' },
      variants: {
        variant: { primary: { color: 'blue' }, secondary: { color: 'gray' } },
        size: { small: { fontSize: '14px' }, large: { fontSize: '18px' } },
      },
      defaultVariants: { variant: 'primary', size: 'small' },
    });
    expect(btn({ variant: 'primary', size: 'large' })).toBe(
      'button3 button3--primary button3--large',
    );
    expect(btn()).toBe('button3 button3--primary button3--small');
  });

  it('has no block class at all when base is omitted', () => {
    const btn = createComponent(bemMode, 'nobase', {
      variants: { variant: { primary: { color: 'blue' } } },
    });
    expect(btn.base).toBeUndefined();
    expect(btn({ variant: 'primary' })).toBe('nobase--primary');
  });

  it('logs console.error in dev for unknown variant dimension', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const btn = createComponent(bemMode, 'unknowndim', {
      base: { padding: '8px' },
      variants: { variant: { primary: { color: 'blue' } } },
    });
    btn({ bogus: 'x' } as unknown as Record<string, unknown>);
    expect(err).toHaveBeenCalledWith(expect.stringContaining('Unknown variant dimension "bogus"'));
    err.mockRestore();
  });

  it('warns in dev when two dimensions collide on the same modifier class', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    createComponent(bemMode, 'collide', {
      variants: {
        intent: { primary: { color: 'blue' } },
        theme: { primary: { backgroundColor: 'black' } },
      },
    });
    expect(err).toHaveBeenCalledWith(expect.stringContaining('collide--primary'));
    err.mockRestore();
  });

  it('merges colliding dimensions into one rule instead of dropping one', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    createComponent(bemMode, 'collide2', {
      variants: {
        intent: { primary: { color: 'blue' } },
        theme: { primary: { backgroundColor: 'black' } },
      },
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.collide2--primary { color: blue; background-color: black; }');
    err.mockRestore();
  });

  describe('CSS emission', () => {
    it('emits block and modifier classes as independent top-level rules', () => {
      createComponent(bemMode, 'css-basic', {
        base: { padding: '8px' },
        variants: {
          variant: { primary: { color: 'blue' }, secondary: { color: 'gray' } },
        },
      });
      flushSync();
      const css = getRegisteredCss();
      expect(css).toContain('.css-basic { padding: 8px; }');
      expect(css).toContain('.css-basic--primary { color: blue; }');
      expect(css).toContain('.css-basic--secondary { color: gray; }');
    });

    it('compiles a compound variant to a chained modifier selector, no synthetic class', () => {
      const btn = createComponent(bemMode, 'css-compound', {
        variants: {
          variant: { primary: { color: 'blue' }, secondary: { color: 'gray' } },
          size: { small: { fontSize: '14px' }, large: { fontSize: '18px' } },
        },
        compoundVariants: [
          { variants: { variant: 'primary', size: 'large' }, style: { fontWeight: 700 } },
        ],
      });
      flushSync();
      const css = getRegisteredCss();
      expect(css).toContain('.css-compound--primary.css-compound--large { font-weight: 700; }');
      expect(Object.keys(btn)).not.toContain('compound-0');
    });

    it('compiles a compound variant with an array value to :is(...)', () => {
      createComponent(bemMode, 'css-compound-arr', {
        variants: {
          tone: {
            success: { color: 'green' },
            warning: { color: 'orange' },
            danger: { color: 'red' },
          },
          size: { lg: { fontSize: '18px' } },
        },
        compoundVariants: [
          {
            variants: { tone: ['success', 'warning'], size: 'lg' },
            style: { textTransform: 'uppercase' },
          },
        ],
      });
      flushSync();
      const css = getRegisteredCss();
      expect(css).toContain(
        ':is(.css-compound-arr--success, .css-compound-arr--warning).css-compound-arr--lg { text-transform: uppercase; }',
      );
    });
  });
});

describe('createComponent — bem-mode slots', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('root slot maps to the bare block class; other slots map to block__element', () => {
    const dialog = createComponent(bemMode, 'dialog', {
      slots: ['root', 'trigger', 'content'],
      base: { root: { display: 'grid' }, trigger: { cursor: 'pointer' } },
    });
    const classes = dialog();
    expect(classes.root).toBe('dialog');
    expect(classes.trigger).toBe('dialog__trigger');
    expect(classes.content).toBe('dialog__content');
  });

  it('slot variant options compile to block__slot--modifier (or block--modifier for root)', () => {
    const dialog = createComponent(bemMode, 'dialog2', {
      slots: ['root', 'trigger', 'content'],
      base: { root: { display: 'grid' } },
      variants: {
        size: {
          sm: { trigger: { fontSize: '12px' }, content: { padding: '8px' }, root: { gap: '4px' } },
          lg: { trigger: { fontSize: '16px' }, content: { padding: '12px' } },
        },
      },
    });
    const classes = dialog({ size: 'lg' });
    expect(classes.root).toBe('dialog2');
    expect(classes.trigger).toBe('dialog2__trigger dialog2__trigger--lg');
    expect(classes.content).toBe('dialog2__content dialog2__content--lg');
  });

  it('multi-slot config (no variants) maps root/element the same way, no modifier classes', () => {
    const dialog = createComponent(bemMode, 'dialog3', {
      slots: ['root', 'trigger'],
      root: { display: 'grid' },
      trigger: { cursor: 'pointer' },
    });
    const classes = dialog();
    expect(classes.root).toBe('dialog3');
    expect(classes.trigger).toBe('dialog3__trigger');
  });

  it('collision warning is scoped per slot', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dialog = createComponent(bemMode, 'dialog4', {
      slots: ['root', 'trigger', 'content'],
      variants: {
        intent: { primary: { trigger: { color: 'blue' } } },
        theme: { primary: { trigger: { backgroundColor: 'black' } } },
      },
    });
    dialog();
    expect(err).toHaveBeenCalledWith(expect.stringContaining('dialog4__trigger--primary'));
    err.mockRestore();

    const err2 = vi.spyOn(console, 'error').mockImplementation(() => {});
    createComponent(bemMode, 'dialog5', {
      slots: ['root', 'trigger', 'content'],
      variants: {
        intent: { primary: { trigger: { color: 'blue' }, content: { color: 'red' } } },
      },
    });
    // Same option "primary" on two different slots is NOT a collision.
    expect(err2).not.toHaveBeenCalled();
    err2.mockRestore();
  });

  describe('CSS emission', () => {
    it('compiles a slot compound variant to a chained selector scoped to that slot', () => {
      createComponent(bemMode, 'dialog6', {
        slots: ['root', 'trigger'],
        variants: {
          intent: { primary: { trigger: { color: 'blue' } } },
          size: { lg: { trigger: { fontSize: '18px' } } },
        },
        compoundVariants: [
          {
            variants: { intent: 'primary', size: 'lg' },
            style: { trigger: { fontWeight: 700 } },
          },
        ],
      });
      flushSync();
      const css = getRegisteredCss();
      expect(css).toContain(
        '.dialog6__trigger--primary.dialog6__trigger--lg { font-weight: 700; }',
      );
    });
  });
});
