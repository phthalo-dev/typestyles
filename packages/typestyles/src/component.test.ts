import { describe, it, expect, beforeEach, vi, expectTypeOf } from 'vite-plus/test';
import { createComponent } from './component';
import { defaultClassNamingConfig, mergeClassNaming } from './class-naming';
import { reset, flushSync, getRegisteredCss } from './sheet';
import { registeredNamespaces } from './registry';
import { createStyles } from './styles';

/** Declarations inside the rule whose selector is exactly `selector`. */
function declarationsFor(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|[}\\n])\\s*${escaped}(?![\\w-])\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? '';
}

describe('createComponent — duplicate namespace', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('in development, re-registering the same namespace succeeds (HMR / out-of-order dispose)', () => {
    createComponent(defaultClassNamingConfig, 'dupbtn', { base: { padding: '1px' } });
    expect(() =>
      createComponent(defaultClassNamingConfig, 'dupbtn', { base: { padding: '2px' } }),
    ).not.toThrow();
    const again = createComponent(defaultClassNamingConfig, 'dupbtn', { base: { padding: '3px' } });
    expect(again.base).toBe('dupbtn');
  });

  it('allows the same logical namespace when scopeId differs', () => {
    const a = mergeClassNaming({ scopeId: 'pkg-a' });
    const b = mergeClassNaming({ scopeId: 'pkg-b' });
    createComponent(a, 'shared', { base: { margin: 0 } });
    expect(() => createComponent(b, 'shared', { base: { margin: 0 } })).not.toThrow();
  });

  it('does not throw in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      createComponent(defaultClassNamingConfig, 'prod-dup', { base: { color: 'red' } });
      expect(() =>
        createComponent(defaultClassNamingConfig, 'prod-dup', { base: { color: 'blue' } }),
      ).not.toThrow();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('createComponent — dimensioned variants', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('returns a callable function', () => {
    const btn = createComponent(defaultClassNamingConfig, 'btn', {
      base: { padding: '8px' },
      variants: { intent: { primary: { color: 'blue' } } },
    });
    expect(typeof btn).toBe('function');
  });

  it('includes base class when called with no args', () => {
    const btn = createComponent(defaultClassNamingConfig, 'btn', {
      base: { padding: '8px' },
    });
    expect(btn()).toBe('btn');
    expect(btn({})).toBe('btn');
  });

  it('is destructurable — base property returns the base class string', () => {
    const btn = createComponent(defaultClassNamingConfig, 'btn', {
      base: { padding: '8px' },
      variants: {
        intent: { primary: { color: 'blue' } },
      },
    });
    expect(btn.base).toBe('btn');
  });

  it('is destructurable — variant properties return individual class strings', () => {
    const btn = createComponent(defaultClassNamingConfig, 'btn', {
      base: { padding: '8px' },
      variants: {
        intent: {
          primary: { backgroundColor: 'blue' },
          ghost: { backgroundColor: 'transparent' },
        },
        size: {
          sm: { fontSize: '12px' },
          lg: { fontSize: '18px' },
        },
      },
    });

    expect(btn['intent-primary']).toBe('btn--intent-primary');
    expect(btn['intent-ghost']).toBe('btn--intent-ghost');
    expect(btn['size-sm']).toBe('btn--size-sm');
    expect(btn['size-lg']).toBe('btn--size-lg');
  });

  it('supports Object.keys() for enumeration', () => {
    const btn = createComponent(defaultClassNamingConfig, 'btn', {
      base: { padding: '8px' },
      variants: {
        intent: { primary: { color: 'blue' } },
      },
    });

    const keys = Object.keys(btn);
    expect(keys).toContain('base');
    expect(keys).toContain('intent-primary');
  });

  it('does not include base class when base is not defined', () => {
    const btn = createComponent(defaultClassNamingConfig, 'btn-nobase', {
      variants: {
        intent: { primary: { color: 'blue' } },
      },
    });
    expect(btn({ intent: 'primary' })).toBe('btn-nobase--intent-primary');
  });

  it('applies variant classes from selections', () => {
    const btn = createComponent(defaultClassNamingConfig, 'vbtn', {
      base: { padding: '8px' },
      variants: {
        intent: {
          primary: { backgroundColor: 'blue' },
          ghost: { backgroundColor: 'transparent' },
        },
        size: {
          sm: { fontSize: '12px' },
          lg: { fontSize: '18px' },
        },
      },
    });

    expect(btn({ intent: 'primary', size: 'sm' })).toBe('vbtn vbtn--intent-primary vbtn--size-sm');
    expect(btn({ intent: 'ghost', size: 'lg' })).toBe('vbtn vbtn--intent-ghost vbtn--size-lg');
  });

  it('applies defaultVariants when selection is omitted', () => {
    const btn = createComponent(defaultClassNamingConfig, 'dbtn', {
      base: { padding: '8px' },
      variants: {
        intent: {
          primary: { backgroundColor: 'blue' },
          ghost: { backgroundColor: 'transparent' },
        },
        size: {
          sm: { fontSize: '12px' },
          lg: { fontSize: '18px' },
        },
      },
      defaultVariants: { intent: 'primary', size: 'sm' },
    });

    expect(btn()).toBe('dbtn dbtn--intent-primary dbtn--size-sm');
    expect(btn({})).toBe('dbtn dbtn--intent-primary dbtn--size-sm');
    expect(btn({ size: 'lg' })).toBe('dbtn dbtn--intent-primary dbtn--size-lg');
  });

  it('explicit selection overrides defaultVariants', () => {
    const btn = createComponent(defaultClassNamingConfig, 'obtn', {
      variants: {
        intent: {
          primary: { color: 'blue' },
          ghost: { color: 'black' },
        },
      },
      defaultVariants: { intent: 'primary' },
    });

    expect(btn({ intent: 'ghost' })).toBe('obtn--intent-ghost');
  });

  it('applies compound variant class when all keys match', () => {
    const btn = createComponent(defaultClassNamingConfig, 'cbtn', {
      base: { padding: '8px' },
      variants: {
        intent: {
          primary: { backgroundColor: 'blue' },
          ghost: { backgroundColor: 'transparent' },
        },
        size: {
          sm: { fontSize: '12px' },
          lg: { fontSize: '18px' },
        },
      },
      compoundVariants: [
        {
          variants: { intent: 'primary', size: 'lg' },
          style: { fontWeight: 700 },
        },
      ],
      defaultVariants: { intent: 'primary', size: 'sm' },
    });

    const withCompound = btn({ intent: 'primary', size: 'lg' });
    expect(withCompound).toBe('cbtn cbtn--intent-primary cbtn--size-lg');
    expect(withCompound).not.toContain('compound-0');
  });

  it('does not apply compound variant when only partial match', () => {
    const btn = createComponent(defaultClassNamingConfig, 'pbtn', {
      variants: {
        intent: {
          primary: { color: 'blue' },
          ghost: { color: 'black' },
        },
        size: {
          sm: { fontSize: '12px' },
          lg: { fontSize: '18px' },
        },
      },
      compoundVariants: [
        {
          variants: { intent: 'primary', size: 'lg' },
          style: { fontWeight: 700 },
        },
      ],
    });

    expect(btn({ intent: 'primary', size: 'sm' })).not.toContain('compound-0');
    expect(btn({ intent: 'ghost', size: 'lg' })).not.toContain('compound-0');
  });

  it('injects CSS for base and variants into the stylesheet', () => {
    createComponent(defaultClassNamingConfig, 'style-test', {
      base: { display: 'flex' },
      variants: {
        intent: { primary: { color: 'blue' } },
      },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.style-test');
    expect(css).toContain('.style-test--intent-primary');
  });

  it('injects CSS for compound variants', () => {
    createComponent(defaultClassNamingConfig, 'cv-test', {
      variants: {
        intent: { primary: { color: 'blue' } },
        size: { lg: { fontSize: '18px' } },
      },
      compoundVariants: [
        { variants: { intent: 'primary', size: 'lg' }, style: { fontWeight: 700 } },
      ],
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.cv-test--intent-primary.cv-test--size-lg');
  });

  it('matches compound variants with array values', () => {
    const btn = createComponent(defaultClassNamingConfig, 'arrbtn', {
      variants: {
        intent: {
          primary: { color: 'blue' },
          secondary: { color: 'purple' },
          ghost: { color: 'gray' },
        },
        size: {
          sm: { fontSize: '12px' },
          lg: { fontSize: '18px' },
        },
      },
      compoundVariants: [
        {
          variants: { intent: ['primary', 'secondary'], size: 'lg' },
          style: { textTransform: 'uppercase' },
        },
      ],
    });

    expect(btn({ intent: 'primary', size: 'lg' })).toBe('arrbtn--intent-primary arrbtn--size-lg');
    expect(btn({ intent: 'secondary', size: 'lg' })).toBe(
      'arrbtn--intent-secondary arrbtn--size-lg',
    );
    expect(btn({ intent: 'ghost', size: 'lg' })).not.toContain('compound-0');
  });

  it('supports boolean variant keys in selections and defaults', () => {
    const btn = createComponent(defaultClassNamingConfig, 'boolbtn', {
      variants: {
        outlined: {
          true: { border: '1px solid currentColor' },
          false: { border: 'none' },
        },
      },
      defaultVariants: { outlined: false },
    });

    expect(btn()).toBe('boolbtn--outlined-false');
    expect(btn({ outlined: true })).toBe('boolbtn--outlined-true');
    expect(btn({ outlined: false })).toBe('boolbtn--outlined-false');
  });

  it('names identical options by dimension without a collision warning', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const btn = createComponent(defaultClassNamingConfig, 'distinctdims', {
      variants: {
        intent: { primary: { color: 'blue' } },
        tone: { primary: { backgroundColor: 'navy' } },
      },
    });

    expect(btn({ intent: 'primary', tone: 'primary' })).toBe(
      'distinctdims--intent-primary distinctdims--tone-primary',
    );
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('logs console.error in dev for unknown variant option value', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    const btn = createComponent(defaultClassNamingConfig, 'badopt', {
      base: { padding: '8px' },
      variants: {
        intent: { primary: { color: 'blue' } },
      },
    });

    btn({ intent: 'primry' as 'primary' });

    expect(err).toHaveBeenCalledWith(
      expect.stringContaining('Unknown variant "primry" for dimension "intent"'),
    );
    err.mockRestore();
  });

  it('logs console.error in dev for unknown variant dimension keys', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    const btn = createComponent(defaultClassNamingConfig, 'unkdim', {
      base: { padding: '8px' },
      variants: {
        intent: { primary: { color: 'blue' } },
      },
    });

    btn({ intent: 'primary', typoDim: 'x' } as { intent: 'primary'; typoDim: string });

    expect(err).toHaveBeenCalledWith(
      expect.stringContaining('Unknown variant dimension "typoDim"'),
    );
    err.mockRestore();
  });
});

describe('createComponent — flat variants', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('returns a callable function', () => {
    const card = createComponent(defaultClassNamingConfig, 'card', {
      base: { padding: '16px' },
      elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    });
    expect(typeof card).toBe('function');
  });

  it('base always auto-applied on function call', () => {
    const card = createComponent(defaultClassNamingConfig, 'card', {
      base: { padding: '16px' },
      elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    });
    expect(card()).toBe('card');
  });

  it('applies flat variants via boolean selections', () => {
    const card = createComponent(defaultClassNamingConfig, 'card', {
      base: { padding: '16px' },
      elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
      compact: { padding: '8px' },
    });

    expect(card({ elevated: true })).toBe('card card--elevated');
    expect(card({ elevated: true, compact: true })).toBe('card card--elevated card--compact');
    expect(card({ elevated: false })).toBe('card');
  });

  it('is destructurable', () => {
    const card = createComponent(defaultClassNamingConfig, 'card', {
      base: { padding: '16px' },
      elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    });

    expect(card.base).toBe('card');
    expect(card.elevated).toBe('card--elevated');
  });

  it('supports Object.keys() for enumeration', () => {
    const card = createComponent(defaultClassNamingConfig, 'card', {
      base: { padding: '16px' },
      elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    });

    const keys = Object.keys(card);
    expect(keys).toContain('base');
    expect(keys).toContain('elevated');
  });

  it('injects CSS for all flat variants', () => {
    createComponent(defaultClassNamingConfig, 'flatcss', {
      base: { display: 'block' },
      active: { borderColor: 'blue' },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.flatcss');
    expect(css).toContain('.flatcss--active');
  });

  it('works without base', () => {
    const card = createComponent(defaultClassNamingConfig, 'nobase', {
      elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    });

    expect(card()).toBe('');
    expect(card({ elevated: true })).toBe('nobase--elevated');
  });

  it('bem mode keeps hyphen flat naming', () => {
    const bem = mergeClassNaming({ mode: 'bem' });
    const card = createComponent(bem, 'bemflat', {
      base: { padding: '16px' },
      elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    });

    expect(card.base).toBe('bemflat-base');
    expect(card.elevated).toBe('bemflat-elevated');
    expect(card({ elevated: true })).toBe('bemflat-base bemflat-elevated');
  });

  it('logs console.error in dev for unknown flat variant keys', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    const card = createComponent(defaultClassNamingConfig, 'flatbad', {
      base: { padding: '16px' },
      elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    });

    card({ primry: true } as { primry: boolean });

    expect(err).toHaveBeenCalledWith(
      expect.stringContaining('Unknown variant "primry" for namespace "flatbad"'),
    );
    err.mockRestore();
  });
});

describe('createComponent — semantic flat variants', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('uses block and block--modifier class names', () => {
    const semantic = mergeClassNaming({ mode: 'semantic', scopeId: 'flat-sem' });
    const card = createComponent(semantic, 'card', {
      base: { padding: '16px' },
      elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    });

    expect(card.base).toBe('flat-sem-card');
    expect(card.elevated).toBe('flat-sem-card--elevated');
    expect(card()).toBe('flat-sem-card');
    expect(card({ elevated: true })).toBe('flat-sem-card flat-sem-card--elevated');
  });

  it('injects CSS with block and block--modifier selectors', () => {
    const semantic = mergeClassNaming({ mode: 'semantic', scopeId: 'flat-sem' });
    createComponent(semantic, 'cardcss', {
      base: { display: 'block' },
      active: { borderColor: 'blue' },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.flat-sem-cardcss');
    expect(css).toContain('.flat-sem-cardcss--active');
    expect(css).not.toContain('.flat-sem-cardcss-base');
  });
});

describe('createComponent — attribute flat variants', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('uses semantic block--modifier names and returns plain strings', () => {
    const attribute = mergeClassNaming({ mode: 'attribute', scopeId: 'flat-attr' });
    const card = createComponent(attribute, 'card', {
      base: { padding: '16px' },
      elevated: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    });

    expect(card.base).toBe('flat-attr-card');
    expect(card.elevated).toBe('flat-attr-card--elevated');
    expect(card({ elevated: true })).toBe('flat-attr-card flat-attr-card--elevated');
    expect(typeof card({ elevated: true })).toBe('string');
  });
});

describe('createComponent with slots', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('returns per-slot class maps with defaults', () => {
    const tabs = createComponent(defaultClassNamingConfig, 'tabs', {
      slots: ['root', 'trigger', 'content'],
      base: {
        root: { display: 'grid' },
        trigger: { cursor: 'pointer' },
      },
      variants: {
        size: {
          sm: {
            trigger: { fontSize: '12px' },
            content: { padding: '8px' },
          },
          lg: {
            trigger: { fontSize: '16px' },
            content: { padding: '12px' },
          },
        },
      },
      defaultVariants: { size: 'sm' },
    });

    const defaults = tabs();
    expect(defaults.root).toBe('tabs');
    expect(defaults.trigger).toBe('tabs__trigger tabs__trigger--size-sm');
    expect(defaults.content).toBe('tabs__content tabs__content--size-sm');

    const large = tabs({ size: 'lg' });
    expect(large.trigger).toBe('tabs__trigger tabs__trigger--size-lg');
    expect(large.content).toBe('tabs__content tabs__content--size-lg');
  });

  it('applies slot compound variants to targeted slots', () => {
    const tabs = createComponent(defaultClassNamingConfig, 'tabs-cv', {
      slots: ['root', 'trigger', 'content'],
      variants: {
        intent: {
          primary: { trigger: { color: 'blue' } },
          ghost: { trigger: { color: 'gray' } },
        },
        size: {
          sm: { content: { padding: '8px' } },
          lg: { trigger: {}, content: { padding: '12px' } },
        },
      },
      compoundVariants: [
        {
          variants: { intent: ['primary', 'ghost'], size: 'lg' },
          style: { trigger: { fontWeight: 700 } },
        },
      ],
      defaultVariants: { intent: 'primary', size: 'sm' },
    });

    const withMatch = tabs({ size: 'lg' });
    expect(withMatch.trigger).toBe(
      'tabs-cv__trigger tabs-cv__trigger--intent-primary tabs-cv__trigger--size-lg',
    );
    expect(withMatch.trigger).not.toContain('compound-0');
    expect(withMatch.content).toBe('tabs-cv__content tabs-cv__content--size-lg');
  });

  it('injects per-slot CSS class rules', () => {
    createComponent(defaultClassNamingConfig, 'tabs-css', {
      slots: ['root', 'trigger'],
      base: {
        root: { display: 'grid' },
      },
      variants: {
        intent: {
          primary: { trigger: { color: 'blue' } },
        },
        size: {
          lg: { trigger: { fontSize: '16px' } },
        },
      },
      compoundVariants: [
        {
          variants: { intent: 'primary', size: 'lg' },
          style: { trigger: { fontWeight: 600 } },
        },
      ],
      defaultVariants: { intent: 'primary', size: 'lg' },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.tabs-css');
    expect(css).toContain('.tabs-css__trigger--intent-primary');
    expect(css).toContain(
      '.tabs-css__trigger--intent-primary.tabs-css__trigger--size-lg { font-weight: 600; }',
    );
  });
});

describe('createComponent — multi-slot (no variants)', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('infers slot keys from a plain slots array and rejects unknown properties', () => {
    const dialog = createComponent(defaultClassNamingConfig, 'typed-multislot', {
      slots: ['root', 'trigger', 'content'],
      root: {},
      trigger: {},
      content: {},
    });
    expectTypeOf(dialog.root).toBeString();
    expectTypeOf(dialog()).toEqualTypeOf<{
      root: string;
      trigger: string;
      content: string;
    }>();
    // @ts-expect-error — not a declared slot
    void dialog.missing;
  });

  it('returns a callable function that returns slot classes', () => {
    const checkbox = createComponent(defaultClassNamingConfig, 'checkbox', {
      slots: ['root', 'box', 'label'],
      root: { display: 'flex', gap: '8px' },
      box: { width: '18px', height: '18px' },
      label: { fontSize: '14px' },
    });
    expect(typeof checkbox).toBe('function');
    const classes = checkbox();
    expect(classes.root).toBe('checkbox');
    expect(classes.box).toBe('checkbox__box');
    expect(classes.label).toBe('checkbox__label');
  });

  it('is destructurable — each slot returns its class string', () => {
    const checkbox = createComponent(defaultClassNamingConfig, 'chk', {
      slots: ['root', 'box'],
      root: { display: 'flex' },
      box: { width: '20px' },
    });

    expect(checkbox.root).toBe('chk');
    expect(checkbox.box).toBe('chk__box');
  });

  it('supports optional slots with no styles', () => {
    const dialog = createComponent(defaultClassNamingConfig, 'dialog', {
      slots: ['overlay', 'modal', 'content'],
      overlay: { position: 'fixed' },
      modal: { padding: '16px' },
    });

    const classes = dialog();
    expect(classes.overlay).toBe('dialog__overlay');
    expect(classes.modal).toBe('dialog__modal');
    expect(classes.content).toBe('dialog__content');
  });

  it('supports Object.keys() for enumeration', () => {
    const card = createComponent(defaultClassNamingConfig, 'mscard', {
      slots: ['root', 'title', 'body'],
      root: { padding: '16px' },
      title: { fontWeight: 'bold' },
    });

    const keys = Object.keys(card);
    expect(keys).toContain('root');
    expect(keys).toContain('title');
    expect(keys).toContain('body');
  });

  it('injects CSS for all slots', () => {
    createComponent(defaultClassNamingConfig, 'mscss', {
      slots: ['root', 'box'],
      root: { display: 'flex' },
      box: { width: '24px' },
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.mscss');
    expect(css).toContain('.mscss__box');
  });
});

describe('createComponent — function config & internal vars', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('accepts a callback that returns dimensioned config; vars scope to component', () => {
    const badge = createComponent(defaultClassNamingConfig, 'cb-badge', (c) => {
      const v = c.vars({
        textColor: '#333',
        borderColor: { value: '#ccc', syntax: '<color>', inherits: false },
      });
      return {
        base: {
          color: v.textColor.var,
          borderColor: v.borderColor.var,
          borderWidth: '1px',
        },
        variants: {
          tone: {
            neutral: {},
            danger: {
              [v.textColor.name]: '#900',
              [v.borderColor.name]: '#f00',
            },
          },
        },
        defaultVariants: { tone: 'neutral' },
      };
    });

    expect(badge()).toBe('cb-badge cb-badge--tone-neutral');
    expect(badge({ tone: 'danger' })).toBe('cb-badge cb-badge--tone-danger');

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --cb-badge-bordercolor');
    expect(css).toContain('--cb-badge-textcolor: #333');
    expect(css).toContain('--cb-badge-bordercolor: #ccc');
    expect(css).toContain('color: var(--cb-badge-textcolor)');
    expect(css).toContain('border-color: var(--cb-badge-bordercolor)');
  });

  it('prefixes internal var names with scopeId', () => {
    const scoped = mergeClassNaming({ scopeId: 'acme' });
    createComponent(scoped, 'pill', (c) => {
      const x = c.var('ink', { value: '#111' });
      return {
        base: { color: x.var },
      };
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('--acme-pill-ink: #111');
  });

  it('registers @property when syntax and value are set on ctx.var', () => {
    createComponent(defaultClassNamingConfig, 'prop-chip', (c) => {
      c.var('opacity', {
        value: '1',
        syntax: '<number>',
        inherits: false,
      });
      return { base: { padding: '4px' } };
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --prop-chip-opacity');
    expect(css).toContain('syntax: "<number>"');
    expect(css).toContain('initial-value: 1');
  });

  it('defaults c.vars() @property declarations to inherits: true', () => {
    createComponent(defaultClassNamingConfig, 'inherit-vars', (c) => {
      c.vars({
        accent: { value: '#0066ff', syntax: '<color>' },
      });
      return { base: { padding: '4px' } };
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/@property --inherit-vars-accent \{[^}]*inherits: true;/);
  });

  it('defaults c.var() @property declarations to inherits: true', () => {
    createComponent(defaultClassNamingConfig, 'inherit-var', (c) => {
      c.var('accent', { value: '#0066ff', syntax: '<color>' });
      return { base: { padding: '4px' } };
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/@property --inherit-var-accent \{[^}]*inherits: true;/);
  });

  it('defaults c.vars.declare() @property declarations to inherits: true', () => {
    createComponent(defaultClassNamingConfig, 'inherit-declare', (c) => {
      c.vars.declare({ accent: { syntax: '<color>' } });
      return { base: { padding: '4px' } };
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toMatch(/@property --inherit-declare-accent \{[^}]*inherits: true;/);
  });

  it('uses an explicit initial as the @property placeholder for a var()-dependent ctx.var', () => {
    const badge = createComponent(defaultClassNamingConfig, 'cb-badge2', (c) => {
      const base = c.var('base', { value: '#0066ff' });
      c.var('derived', {
        value: `color-mix(in oklch, ${base.var} 30%, white)`,
        syntax: '<color>',
        inherits: false,
        initial: 'hotpink',
      });
      return { base: { padding: '4px' } };
    });
    badge();
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --cb-badge2-derived');
    expect(css).toContain('initial-value: hotpink');
    expect(css).toContain(
      '--cb-badge2-derived: color-mix(in oklch, var(--cb-badge2-base) 30%, white)',
    );
  });

  it('warns once on duplicate var id in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    createComponent(defaultClassNamingConfig, 'dup-var', (c) => {
      c.var('same');
      c.var('same');
      return { base: { color: c.var('same').var } };
    });

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('supports flat variant config via function', () => {
    const card = createComponent(defaultClassNamingConfig, 'fn-flat', (c) => {
      const e = c.var('elev');
      return {
        base: { boxShadow: e.var },
        elevated: { [e.name]: '0 2px 8px rgba(0,0,0,0.1)' },
      };
    });

    expect(card()).toBe('fn-flat');
    expect(card({ elevated: true })).toBe('fn-flat fn-flat--elevated');
  });

  it('supports multi-slot config via function', () => {
    const ui = createComponent(defaultClassNamingConfig, 'fn-slot', (c) => {
      const gap = c.var('g');
      return {
        slots: ['root', 'item'],
        root: { gap: gap.var },
        item: { padding: '2px' },
      };
    });

    const classes = ui();
    expect(classes.root).toBe('fn-slot');
    expect(classes.item).toBe('fn-slot__item');
    flushSync();
    expect(getRegisteredCss()).toContain('gap: var(--fn-slot-g)');
  });

  it('emits c.vars() defaults on the root slot when values reference other CSS variables', () => {
    const select = createComponent(defaultClassNamingConfig, 'fn-select', (c) => {
      const v = c.vars({
        triggerBackground: {
          value: 'var(--demo-color-surface)',
          syntax: '<color>',
        },
      });
      return {
        slots: ['root', 'trigger'],
        root: { display: 'grid' },
        trigger: {
          backgroundColor: v.triggerBackground.var,
        },
      };
    });

    select();
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --fn-select-triggerbackground');
    expect(css).toContain('.fn-select {');
    expect(css).toContain('--fn-select-triggerbackground: var(--demo-color-surface)');
    expect(css).toContain('.fn-select__trigger');
    expect(css).toContain('background-color: var(--fn-select-triggerbackground)');
  });

  it('emits c.vars() defaults on the first slot when there is no root slot', () => {
    const dialog = createComponent(defaultClassNamingConfig, 'fn-dialog', (c) => {
      const v = c.vars({
        backdrop: {
          value: 'var(--demo-color-overlay)',
          syntax: '<color>',
        },
      });
      return {
        slots: ['overlay', 'modal'],
        overlay: { backgroundColor: v.backdrop.var },
        modal: { padding: '16px' },
      };
    });

    dialog();
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('.fn-dialog__overlay');
    expect(css).toContain('--fn-dialog-backdrop: var(--demo-color-overlay)');
    expect(css).toContain('background-color: var(--fn-dialog-backdrop)');
  });

  it('emits c.vars() defaults on the root slot when slots and variants are combined', () => {
    const select = createComponent(defaultClassNamingConfig, 'fn-slot-var', (c) => {
      const v = c.vars({
        triggerBackground: {
          value: 'var(--demo-color-surface)',
          syntax: '<color>',
        },
      });
      return {
        slots: ['root', 'trigger'],
        base: {
          root: { display: 'grid' },
          trigger: { backgroundColor: v.triggerBackground.var },
        },
        variants: {
          tone: {
            neutral: {},
            danger: {
              trigger: { [v.triggerBackground.name]: '#f00' },
            },
          },
        },
        defaultVariants: { tone: 'neutral' },
      };
    });

    select();
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --fn-slot-var-triggerbackground');
    expect(css).toContain('.fn-slot-var {');
    expect(css).toContain('--fn-slot-var-triggerbackground: var(--demo-color-surface)');
    expect(css).toContain('.fn-slot-var__trigger');
    expect(css).toContain('background-color: var(--fn-slot-var-triggerbackground)');
  });

  it('supports nested vars object like tokens.create', () => {
    createComponent(defaultClassNamingConfig, 'nestv', (c) => {
      const v = c.vars({
        text: { primary: '#222', muted: '#888' },
      });
      return {
        base: { color: v.text.primary.var },
        variants: {
          dim: {
            on: { [v.text.primary.name]: '#fff' },
          },
        },
      };
    });
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('--nestv-text-primary: #222');
    expect(css).toContain('color: var(--nestv-text-primary)');
  });

  it('registers top-level config vars and exposes sideNav.vars on the return', () => {
    const sideNav = createComponent(defaultClassNamingConfig, 'cfg-vars-nav', {
      vars: {
        border: { value: '#ccc', syntax: '<color>' as const },
        headingColor: '#111',
      },
      slots: ['root', 'heading'] as const,
      base: {
        root: { borderColor: 'var(--cfg-vars-nav-border)' },
        heading: { color: 'var(--cfg-vars-nav-headingcolor)' },
      },
    });

    expect(sideNav.vars?.border.var).toBe('var(--cfg-vars-nav-border)');
    expect(sideNav.vars?.headingColor.name).toBe('--cfg-vars-nav-headingcolor');

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('--cfg-vars-nav-border: #ccc');
    expect(css).toContain('--cfg-vars-nav-headingcolor: #111');
  });

  it('registers top-level vars on object configs and exposes refs on the return', () => {
    const button = createComponent(defaultClassNamingConfig, 'cfg-vars-btn', {
      vars: {
        background: { value: 'blue', syntax: '<color>' as const },
        foreground: '#fff',
      },
      base: {
        backgroundColor: 'var(--cfg-vars-btn-background)',
        color: 'var(--cfg-vars-btn-foreground)',
      },
    });

    expect(button.vars?.background.var).toBe('var(--cfg-vars-btn-background)');
    expect(button.vars?.foreground.var).toBe('var(--cfg-vars-btn-foreground)');

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('--cfg-vars-btn-background: blue');
    expect(css).toContain('background-color: var(--cfg-vars-btn-background)');
  });

  it('applies top-level config vars after value-less c.var() in a factory', () => {
    const badge = createComponent(defaultClassNamingConfig, 'cfg-after-var', (c) => {
      c.var('border');
      return {
        vars: {
          border: { value: '#ccc', syntax: '<color>' as const },
        },
        base: { borderColor: 'var(--cfg-after-var-border)' },
      };
    });

    badge();
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('--cfg-after-var-border: #ccc');
    expect(css).toContain('@property --cfg-after-var-border');
  });

  it('exposes c.vars() registrations on the component return when config has no vars key', () => {
    const badge = createComponent(defaultClassNamingConfig, 'ret-vars-only', (c) => {
      const v = c.vars({ ink: '#111', paper: '#fff' });
      return {
        base: { color: v.ink.var, backgroundColor: v.paper.var },
      };
    });

    expect(badge.vars?.ink.var).toBe('var(--ret-vars-only-ink)');
    expect(badge.vars?.paper.name).toBe('--ret-vars-only-paper');
  });

  it('auto-stamps __varDefinitions from c.vars() when recipe omits vars key', () => {
    const defs = {
      border: { value: '#ccc', syntax: '<color>' as const },
      headingColor: '#111',
    } as const;

    const sideNav = createComponent(defaultClassNamingConfig, 'ret-auto-stamp', (c) => {
      const v = c.vars(defs);
      return {
        slots: ['root', 'heading'] as const,
        base: {
          root: { borderColor: v.border.var },
          heading: { color: v.headingColor.var },
        },
      };
    });

    expect((sideNav as { __varDefinitions?: typeof defs }).__varDefinitions).toEqual(defs);
  });

  it('accepts vars: v (ref tree) in recipe config without re-registering paths', () => {
    const badge = createComponent(defaultClassNamingConfig, 'ret-vars-ref-tree', (c) => {
      const v = c.vars({ ink: '#111', paper: '#fff' });
      return {
        vars: v,
        base: { color: v.ink.var, backgroundColor: v.paper.var },
      };
    });

    badge();
    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('--ret-vars-ref-tree-ink: #111');
    expect(css).toContain('--ret-vars-ref-tree-paper: #fff');
    expect(css.match(/--ret-vars-ref-tree-ink: #111/g)?.length).toBe(1);
  });

  it('vars.declare registers @property without base defaults; values set in variants', () => {
    const badge = createComponent(defaultClassNamingConfig, 'cb-declare', (c) => {
      const v = c.vars.declare({
        textColor: { syntax: '<color>', inherits: false },
        borderWidth: true,
      });
      return {
        base: {
          [v.borderWidth.name]: '1px',
          color: v.textColor.var,
          borderStyle: 'solid',
          borderWidth: v.borderWidth.var,
        },
        variants: {
          tone: {
            neutral: { [v.textColor.name]: '#333' },
            danger: { [v.textColor.name]: '#900' },
          },
        },
        defaultVariants: { tone: 'neutral' },
      };
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --cb-declare-textcolor');
    expect(css).not.toMatch(/\.cb-declare \{[^}]*--cb-declare-textcolor:\s*#/); // no default in base for textColor
    expect(badge({ tone: 'danger' })).toContain('cb-declare--tone-danger');
    expect(css).toContain('cb-declare--tone-danger');
  });

  it('var.declare registers @property without merging a base default', () => {
    createComponent(defaultClassNamingConfig, 'cb-var-declare', (c) => {
      const border = c.var.declare('border-color', { syntax: '<color>', inherits: false });
      return {
        base: { borderWidth: '1px', borderStyle: 'solid' },
        variants: {
          tone: {
            hot: { [border.name]: 'red' },
          },
        },
      };
    });

    flushSync();
    const css = getRegisteredCss();
    expect(css).toContain('@property --cb-var-declare-border-color');
    expect(css).not.toMatch(/\.cb-var-declare \{[^}]*--cb-var-declare-border-color: red/);
    expect(css).toContain('cb-var-declare--tone-hot');
  });
});

describe('recipe var slots', () => {
  beforeEach(() => {
    reset();
    registeredNamespaces.clear();
  });

  it('copies a var default onto each named slot and still emits it on the host', () => {
    const styles = createStyles();
    styles.component({
      name: 'menu-slot-vars',
      slots: ['root', 'popover'] as const,
      vars: {
        popoverBackground: {
          value: 'var(--color-surface)',
          syntax: '<color>' as const,
          slots: ['popover'],
        },
        anchorX: { value: '0px', syntax: '<length>' as const },
      },
      styles: ({ vars }) => ({
        base: {
          root: { display: 'inline-flex' },
          popover: { backgroundColor: vars.popoverBackground.var },
        },
      }),
    });
    flushSync();

    const css = getRegisteredCss();
    const root = declarationsFor(css, '.menu-slot-vars');
    const popover = declarationsFor(css, '.menu-slot-vars__popover');

    expect(root).toContain('--menu-slot-vars-popoverbackground: var(--color-surface)');
    expect(root).toContain('--menu-slot-vars-anchorx: 0px');
    expect(popover).toContain('--menu-slot-vars-popoverbackground: var(--color-surface)');
    expect(popover).not.toContain('--menu-slot-vars-anchorx');
  });

  it('warns when a var names a slot the recipe does not declare', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const styles = createStyles();
    styles.component({
      name: 'menu-unknown-slot',
      slots: ['root', 'popover'] as const,
      vars: {
        popoverBackground: {
          value: 'var(--color-surface)',
          syntax: '<color>' as const,
          slots: ['missing'],
        },
      },
      styles: () => ({
        base: { root: { display: 'inline-flex' } },
      }),
    });
    flushSync();

    const css = getRegisteredCss();
    expect(declarationsFor(css, '.menu-unknown-slot')).toContain(
      '--menu-unknown-slot-popoverbackground: var(--color-surface)',
    );
    expect(css).not.toContain('.menu-unknown-slot__missing');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('missing'));
    warn.mockRestore();
  });

  it('warns when a var names slots on a recipe that has none', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const styles = createStyles();
    styles.component({
      name: 'slotless-var',
      vars: {
        ink: { value: '#111', slots: ['popover'] },
      },
      styles: ({ vars }) => ({
        base: { color: vars.ink.var },
      }),
    });
    flushSync();

    expect(declarationsFor(getRegisteredCss(), '.slotless-var')).toContain(
      '--slotless-var-ink: #111',
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no slots'));
    warn.mockRestore();
  });

  it('copies one var onto every named slot', () => {
    const styles = createStyles();
    styles.component({
      name: 'menu-multi-slot',
      slots: ['root', 'popover', 'item'] as const,
      vars: {
        popoverBackground: {
          value: 'var(--color-surface)',
          slots: ['popover', 'item'],
        },
      },
      styles: () => ({
        base: {
          popover: { display: 'flex' },
          item: { display: 'block' },
        },
      }),
    });
    flushSync();

    const css = getRegisteredCss();
    for (const selector of [
      '.menu-multi-slot',
      '.menu-multi-slot__popover',
      '.menu-multi-slot__item',
    ]) {
      expect(declarationsFor(css, selector)).toContain(
        '--menu-multi-slot-popoverbackground: var(--color-surface)',
      );
    }
  });

  it('does not duplicate a default when slots lists the host', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const styles = createStyles();
    styles.component({
      name: 'menu-host-slot',
      slots: ['root', 'popover'] as const,
      vars: {
        ink: { value: '#111', slots: ['root'] },
      },
      styles: () => ({ base: { root: { display: 'flex' } } }),
    });
    flushSync();

    const root = declarationsFor(getRegisteredCss(), '.menu-host-slot');
    expect(root.match(/--menu-host-slot-ink: #111/g)).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('copies a slotted default onto the first slot when the recipe has no root', () => {
    const styles = createStyles();
    styles.component({
      name: 'menu-no-root',
      slots: ['trigger', 'popover'] as const,
      vars: {
        popoverBackground: { value: 'var(--color-surface)', slots: ['popover'] },
        anchorX: '0px',
      },
      styles: () => ({
        base: {
          trigger: { display: 'inline-flex' },
          popover: { display: 'flex' },
        },
      }),
    });
    flushSync();

    const css = getRegisteredCss();
    const trigger = declarationsFor(css, '.menu-no-root__trigger');
    const popover = declarationsFor(css, '.menu-no-root__popover');
    expect(trigger).toContain('--menu-no-root-popoverbackground: var(--color-surface)');
    expect(trigger).toContain('--menu-no-root-anchorx: 0px');
    expect(popover).toContain('--menu-no-root-popoverbackground: var(--color-surface)');
    expect(popover).not.toContain('--menu-no-root-anchorx');
  });
});
