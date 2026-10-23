import { variant } from './variant';
import { describe, it, expect, beforeEach, vi } from 'vite-plus/test';
import { createComponent } from './component';
import { mergeClassNaming } from './class-naming';
import { createStyles } from './styles';
import { cx } from './cx';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { registeredNamespaces } from './registry';

const attributeMode = mergeClassNaming({ mode: 'attribute' });

describe('createComponent — attribute-mode dimensioned variants', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('returns a callable function', () => {
    const btn = createComponent(attributeMode, 'attrbtn', {
      base: { padding: '8px' },
      variants: { variant: { primary: { color: 'blue' } } },
    });
    expect(typeof btn).toBe('function');
  });

  it('exposes only the base class — no per-option destructurable keys', () => {
    const btn = createComponent(attributeMode, 'noopt', {
      base: { padding: '8px' },
      variants: { variant: { primary: { color: 'blue' } } },
    });
    expect(btn.base).toBe('noopt');
    expect(Object.keys(btn)).toEqual(['base']);
  });

  it('resolves className, attrs, and props for a single dimension', () => {
    const btn = createComponent(attributeMode, 'sbtn', {
      base: { padding: '8px' },
      variants: {
        variant: {
          primary: { backgroundColor: 'blue' },
          secondary: { backgroundColor: 'gray' },
        },
      },
    });

    const b = btn({ variant: 'primary' });
    expect(b.className).toBe('sbtn');
    expect(b.attrs).toEqual({ 'data-variant': 'primary' });
    expect(b.props).toEqual({ className: 'sbtn', 'data-variant': 'primary' });
  });

  it('resolves className, attrs, and props for multiple dimensions', () => {
    const btn = createComponent(attributeMode, 'mbtn', {
      base: { padding: '8px' },
      variants: {
        variant: {
          primary: { backgroundColor: 'blue' },
          secondary: { backgroundColor: 'gray' },
        },
        size: {
          small: { fontSize: '14px' },
          large: { fontSize: '18px' },
        },
      },
    });

    const b = btn({ variant: 'primary', size: 'small' });
    expect(b.className).toBe('mbtn');
    expect(b.attrs).toEqual({ 'data-variant': 'primary', 'data-size': 'small' });
    expect(b.props).toEqual({
      className: 'mbtn',
      'data-variant': 'primary',
      'data-size': 'small',
    });
  });

  it('applies defaultVariants when selection is omitted', () => {
    const btn = createComponent(attributeMode, 'dbtn', {
      base: { padding: '8px' },
      variants: {
        variant: {
          primary: { backgroundColor: 'blue' },
          secondary: { backgroundColor: 'gray' },
        },
      },
      defaultVariants: { variant: 'primary' },
    });

    expect(btn().attrs).toEqual({ 'data-variant': 'primary' });
    expect(btn({}).attrs).toEqual({ 'data-variant': 'primary' });
    expect(btn({ variant: 'secondary' }).attrs).toEqual({ 'data-variant': 'secondary' });
  });

  it('boolean dimension is presence-based: true -> empty-string attr, false -> omitted', () => {
    const btn = createComponent(attributeMode, 'boolbtn', {
      base: { padding: '8px' },
      variants: {
        disabled: {
          true: { opacity: 0.5 },
          false: {},
        },
      },
    });

    expect(btn({ disabled: true }).attrs).toEqual({ 'data-disabled': '' });
    expect(btn({ disabled: false }).attrs).toEqual({});
    expect(btn().attrs).toEqual({});
  });

  it('String(result) and template coercion return the base class name', () => {
    const btn = createComponent(attributeMode, 'strbtn', {
      base: { padding: '8px' },
      variants: { variant: { primary: { color: 'blue' } } },
    });

    const b = btn({ variant: 'primary' });
    expect(String(b)).toBe('strbtn');
    expect(`${b}`).toBe('strbtn');
  });

  it('interops with cx()', () => {
    const btn = createComponent(attributeMode, 'cxbtn', {
      base: { padding: '8px' },
      variants: { variant: { primary: { color: 'blue' } } },
    });

    const b = btn({ variant: 'primary' });
    expect(cx(b, 'extra')).toBe('cxbtn extra');
  });

  it('logs console.error in dev for unknown variant dimension', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    const btn = createComponent(attributeMode, 'unknowndim', {
      base: { padding: '8px' },
      variants: { variant: { primary: { color: 'blue' } } },
    });

    btn({ bogus: 'x' } as unknown as Record<string, unknown>);

    expect(err).toHaveBeenCalledWith(expect.stringContaining('Unknown variant dimension "bogus"'));
    err.mockRestore();
  });

  it('logs console.error in dev for unknown variant option', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    const btn = createComponent(attributeMode, 'unknownopt', {
      base: { padding: '8px' },
      variants: { variant: { primary: { color: 'blue' } } },
    });

    btn({ variant: 'nope' as 'primary' });

    expect(err).toHaveBeenCalledWith(expect.stringContaining('Unknown variant "nope"'));
    err.mockRestore();
  });

  it('returns attrs results for every slot and compiles slot-local selectors', () => {
    const dialog = createComponent(attributeMode, 'dialog', {
      slots: ['root', 'trigger', 'content'] as const,
      base: {
        root: { display: 'grid' },
        trigger: { cursor: 'pointer' },
        content: { padding: '8px' },
      },
      variants: {
        size: {
          sm: { content: { padding: '4px' } },
          lg: { content: { padding: '16px' }, trigger: { fontSize: '16px' } },
        },
      },
      compoundVariants: [
        {
          variants: { size: ['sm', 'lg'] },
          style: { content: { fontWeight: 700 } },
        },
      ],
      defaultVariants: { size: 'sm' },
    });

    const result = dialog({ size: 'lg' });
    expect(result.root).toMatchObject({
      className: 'dialog',
      attrs: { 'data-size': 'lg' },
      props: { className: 'dialog', 'data-size': 'lg' },
    });
    expect(result.trigger.className).toBe('dialog__trigger');
    expect(result.content.className).toBe('dialog__content');

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.dialog__content[data-size="lg"] { padding: 16px; }');
    expect(css).toContain('.dialog__trigger[data-size="lg"] { font-size: 16px; }');
    expect(css).toContain(
      '.dialog__content:is([data-size="sm"], [data-size="lg"]) { font-weight: 700; }',
    );
  });

  it('returns a string slot map without variants', () => {
    const dialog = createComponent(attributeMode, 'plain-dialog', {
      slots: ['root', 'content'] as const,
      root: { display: 'grid' },
      content: { padding: '8px' },
    });

    expect(dialog()).toEqual({ root: 'plain-dialog', content: 'plain-dialog__content' });
    expect(dialog.root).toBe('plain-dialog');
  });

  it('expands utilities in slot base, variant, and compound styles', () => {
    const styles = createStyles({
      mode: 'attribute',
      utils: {
        insetX: (value: string | number) => ({ paddingLeft: value, paddingRight: value }),
      },
    });
    styles.component({
      name: 'utility-dialog',
      slots: ['root', 'content'] as const,
      variants: {
        size: variant.enum(['lg'], { default: 'lg' }),
        tone: variant.enum(['emphasis'], { default: 'emphasis' }),
      },
      styles: {
        base: { content: { insetX: '4px' } },
        compoundVariants: [
          {
            variants: { size: 'lg', tone: 'emphasis' },
            style: { content: { insetX: '12px' } },
          },
        ],
        variants: { size: { lg: { content: { insetX: '8px' } } }, tone: { emphasis: {} } },
      },
    });

    flushSync();
    expect(getRegisteredCss()).toContain(
      '.utility-dialog__content { padding-left: 4px; padding-right: 4px; }',
    );
    expect(getRegisteredCss()).toContain(
      '.utility-dialog__content[data-size="lg"] { padding-left: 8px; padding-right: 8px; }',
    );
    expect(getRegisteredCss()).toContain(
      '.utility-dialog__content[data-size="lg"][data-tone="emphasis"] { padding-left: 12px; padding-right: 12px; }',
    );
  });

  describe('CSS emission', () => {
    it('compiles each option to a &[data-dimension="option"] selector scoped under one base class', () => {
      createComponent(attributeMode, 'css-basic', {
        base: { padding: '8px' },
        variants: {
          variant: {
            primary: { backgroundColor: 'blue' },
            secondary: { backgroundColor: 'gray' },
          },
        },
      });

      flushSync();
      const css = getRegisteredCss();
      expect(css).toContain('.css-basic { padding: 8px; }');
      expect(css).toContain('.css-basic[data-variant="primary"] { background-color: blue; }');
      expect(css).toContain('.css-basic[data-variant="secondary"] { background-color: gray; }');
      expect(css).not.toContain('.css-basic-variant-primary');
    });

    it('compiles a boolean dimension to presence / :not() selectors', () => {
      createComponent(attributeMode, 'css-bool', {
        variants: {
          disabled: {
            true: { opacity: 0.5 },
            false: { opacity: 1 },
          },
        },
      });

      flushSync();
      const css = getRegisteredCss();
      expect(css).toContain('.css-bool[data-disabled] { opacity: 0.5; }');
      expect(css).toContain('.css-bool:not([data-disabled]) { opacity: 1; }');
    });

    it('skips CSS emission entirely for an empty option style block', () => {
      createComponent(attributeMode, 'css-empty-opt', {
        base: { padding: '8px' },
        variants: {
          disabled: {
            true: { opacity: 0.5 },
            false: {},
          },
        },
      });

      flushSync();
      const css = getRegisteredCss();
      expect(css).not.toContain(':not([data-disabled])');
    });

    it('compiles a compound variant to a single combined attribute selector, no compound class', () => {
      createComponent(attributeMode, 'css-compound', {
        variants: {
          variant: {
            primary: { color: 'blue' },
            secondary: { color: 'gray' },
          },
          size: {
            small: { fontSize: '14px' },
            large: { fontSize: '18px' },
          },
        },
        compoundVariants: [
          {
            variants: { variant: 'primary', size: 'large' },
            style: { fontWeight: 700 },
          },
        ],
      });

      flushSync();
      const css = getRegisteredCss();
      expect(css).toContain(
        '.css-compound[data-variant="primary"][data-size="large"] { font-weight: 700; }',
      );
      expect(css).not.toContain('compound-0');
    });

    it('compiles a compound variant with an array value to :is(...)', () => {
      createComponent(attributeMode, 'css-compound-arr', {
        variants: {
          tone: {
            success: { color: 'green' },
            warning: { color: 'orange' },
            danger: { color: 'red' },
          },
          size: {
            lg: { fontSize: '18px' },
          },
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
        '.css-compound-arr:is([data-tone="success"], [data-tone="warning"])[data-size="lg"] { text-transform: uppercase; }',
      );
    });

    it('kebab-cases camelCase dimension names in selectors, attrs, and props', () => {
      const btn = createComponent(attributeMode, 'fontbtn', {
        variants: { fontWeight: { bold: { fontWeight: 700 } } },
      });

      expect(btn({ fontWeight: 'bold' }).attrs).toEqual({ 'data-font-weight': 'bold' });
      expect(btn({ fontWeight: 'bold' }).props).toEqual({
        className: 'fontbtn',
        'data-font-weight': 'bold',
      });

      flushSync();
      expect(getRegisteredCss()).toContain(
        '.fontbtn[data-font-weight="bold"] { font-weight: 700; }',
      );
    });

    it('uses kebab-cased presence selectors for camelCase boolean dimensions', () => {
      const btn = createComponent(attributeMode, 'camelbool', {
        variants: { isDisabled: { true: { opacity: 0.5 }, false: { opacity: 1 } } },
      });

      expect(btn({ isDisabled: true }).attrs).toEqual({ 'data-is-disabled': '' });
      flushSync();
      expect(getRegisteredCss()).toContain('.camelbool[data-is-disabled] { opacity: 0.5; }');
      expect(getRegisteredCss()).toContain('.camelbool:not([data-is-disabled]) { opacity: 1; }');
    });
  });

  it('always emits the semantic block class when base is omitted', () => {
    const btn = createComponent(attributeMode, 'nobase', {
      variants: { variant: { primary: { color: 'blue' } } },
    });

    expect(btn({ variant: 'primary' }).className).toBe('nobase');
  });

  it('warns when dimensions collide after kebab-casing', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    createComponent(attributeMode, 'collision', {
      variants: {
        fontWeight: { regular: { fontWeight: 400 } },
        'font-weight': { bold: { fontWeight: 700 } },
      },
    });

    expect(err).toHaveBeenCalledWith(
      '[typestyles] Dimensions "fontWeight" and "font-weight" both map to "data-font-weight" in "collision".',
    );
    err.mockRestore();
  });
});

describe('createStyles({ mode: "attribute" })', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('every dimensioned component from the instance compiles in attribute mode', () => {
    const styles = createStyles({ mode: 'attribute', scopeId: 'ds-a' });
    const btn = styles.component({
      name: 'gbtn',
      variants: { variant: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { padding: '8px' }, variants: { variant: { primary: { color: 'blue' } } } },
    });

    const b = btn({ variant: 'primary' });
    expect(b.attrs).toEqual({ 'data-variant': 'primary' });
  });

  it('a plain (non-attribute-mode) instance compiles class-based variants as before', () => {
    const styles = createStyles({ scopeId: 'ds-c' });
    const btn = styles.component({
      name: 'plainbtn',
      variants: { variant: variant.enum(['primary'], { default: 'primary' }) },
      styles: { base: { padding: '8px' }, variants: { variant: { primary: { color: 'blue' } } } },
    });

    expect(btn({ variant: 'primary' }).className).toBe(
      'ds-c-plainbtn ds-c-plainbtn--variant-primary',
    );
  });
});
