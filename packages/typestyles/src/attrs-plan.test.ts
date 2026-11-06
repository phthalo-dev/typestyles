import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { createTypeStyles } from './index';
import { getClientPlans } from './index';
import { createAttrsRecipeFromPlan, type AttrsRecipePlan } from './attrs-runtime';
import { reset } from './index';
import { variant } from './variant';

type Call = (selections?: Record<string, unknown>) => unknown;

/** Selections to try for each dimension: unset, every option, and booleans as real booleans. */
function selectionGrid(dimensions: Record<string, string[]>): Array<Record<string, unknown>> {
  let grid: Array<Record<string, unknown>> = [{}];
  for (const [dimension, options] of Object.entries(dimensions)) {
    const values: unknown[] = [undefined, ...options];
    if (options.includes('true')) values.push(true, false);
    grid = grid.flatMap((base) =>
      values.map((value) => (value === undefined ? base : { ...base, [dimension]: value })),
    );
  }
  return grid;
}

type AttrsLike = { className: string; attrs: unknown; props: unknown };

function plain(result: unknown): unknown {
  // `ComponentAttrsResult` carries methods/symbols; compare the observable data.
  const one = (r: AttrsLike) => ({
    className: r.className,
    attrs: r.attrs,
    props: r.props,
    str: `${r}`,
  });
  if (result && typeof result === 'object' && 'className' in (result as object)) return one(result);
  return Object.fromEntries(
    Object.entries(result as Record<string, unknown>).map(([k, v]) => [k, one(v)]),
  );
}

describe('attribute-mode client plans', () => {
  beforeEach(() => reset());

  const { recipe } = createTypeStyles({ scopeId: 'plan', mode: 'attribute' });

  it('records a plan whose lite handle matches a flat recipe for every selection', () => {
    const full = recipe({
      name: 'planbtn',
      variants: {
        tone: variant.enum(['neutral', 'accent', 'danger'], { default: 'neutral' }),
        size: variant.enum(['sm', 'md'], { default: 'md' }),
        loadingState: variant.boolean({ default: false }),
      },
      styles: () => ({
        base: { color: 'red' },
        variants: {
          tone: { neutral: { color: 'gray' }, accent: { color: 'blue' }, danger: { color: 'red' } },
          size: { sm: { padding: 2 }, md: { padding: 4 } },
          loadingState: { true: { opacity: 0.5 }, false: {} },
        },
      }),
    } as never) as unknown as Call & { base: string; defaults: unknown };

    const plan = getClientPlans().find((p) => p.namespace === 'planbtn') as AttrsRecipePlan;
    expect(plan.kind).toBe('attrs');
    const lite = createAttrsRecipeFromPlan(plan) as Call & { base: string; defaults: unknown };

    expect(lite.base).toBe(full.base);
    expect(lite.defaults).toEqual(full.defaults);
    for (const selection of selectionGrid(plan.dimensions)) {
      expect(plain(lite(selection))).toEqual(plain(full(selection)));
    }
    expect(plain(lite())).toEqual(plain(full()));
  });

  it('records a plan whose lite handle matches a slot recipe for every selection', () => {
    const full = recipe({
      name: 'planbox',
      slots: ['root', 'label'],
      variants: {
        tone: variant.enum(['neutral', 'accent'], { default: 'neutral' }),
        dense: variant.boolean({ default: false }),
      },
      styles: () => ({
        base: { root: { color: 'red' }, label: { color: 'blue' } },
        variants: {
          tone: {
            neutral: { root: { color: 'gray' } },
            accent: { root: { color: 'blue' } },
          },
          dense: { true: { root: { padding: 1 } }, false: {} },
        },
      }),
    } as never) as unknown as Call;

    const plan = getClientPlans().find((p) => p.namespace === 'planbox') as AttrsRecipePlan;
    expect(plan.kind).toBe('attrs-slots');
    const lite = createAttrsRecipeFromPlan(plan) as Call;

    for (const selection of selectionGrid(plan.dimensions)) {
      expect(plain(lite(selection))).toEqual(plain(full(selection)));
    }
  });

  it('records plans for flat and multi-slot recipes that match the full runtime', () => {
    const flat = recipe({
      name: 'planflat',
      base: { color: 'red' },
      primary: { color: 'blue' },
      disabled: { opacity: 0.5 },
    } as never) as unknown as Call & { base: string };
    const flatPlan = getClientPlans().find((p) => p.namespace === 'planflat') as AttrsRecipePlan;
    expect(flatPlan.kind).toBe('flat');
    const flatLite = createAttrsRecipeFromPlan(flatPlan) as Call & { base: string };
    expect(flatLite.base).toBe(flat.base);
    for (const sel of [
      {},
      { primary: true },
      { disabled: true },
      { primary: true, disabled: true },
    ]) {
      expect(plain(flatLite(sel))).toEqual(plain(flat(sel)));
    }

    const multi = recipe({
      name: 'planmulti',
      slots: ['root', 'label'],
      root: { color: 'red' },
      label: { color: 'blue' },
    } as never) as unknown as Call & Record<string, string>;
    const multiPlan = getClientPlans().find((p) => p.namespace === 'planmulti') as AttrsRecipePlan;
    expect(multiPlan.kind).toBe('multi-slot');
    const multiLite = createAttrsRecipeFromPlan(multiPlan) as Call & Record<string, string>;
    expect(plain(multiLite())).toEqual(plain(multi()));
    expect(multiLite.root).toBe(multi.root);
    expect(multiLite.label).toBe(multi.label);
  });

  it('does not record plans for shapes it cannot reproduce (slots in hashed mode)', () => {
    const hashed = createTypeStyles({ scopeId: 'plan2', mode: 'hashed' });
    hashed.recipe({
      name: 'planunsupported',
      slots: ['root', 'label'],
      variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
      styles: () => ({
        base: { root: { color: 'red' }, label: { color: 'blue' } },
        variants: {
          tone: { a: { root: { color: 'red' } }, b: { root: { color: 'blue' } } },
        },
      }),
    } as never);
    expect(getClientPlans().some((p) => p.namespace === 'planunsupported')).toBe(false);
  });
});

function templateOptions(mode: string): Record<string, unknown> {
  return mode === 'template'
    ? {
        classNameTemplate: (ctx: {
          namespace: string;
          element?: string;
          dimension?: string;
          modifier?: string;
        }) => [ctx.namespace, ctx.element, ctx.dimension, ctx.modifier].filter(Boolean).join('_'),
      }
    : {};
}

describe.each(['semantic', 'bem', 'template', 'hashed', 'compact', 'atomic'] as const)(
  'class-name mode client plans (%s)',
  (mode) => {
    beforeEach(() => reset());

    it('dimensioned recipes (with compound variants) match the full runtime', () => {
      const { recipe } = createTypeStyles({
        scopeId: `cm-${mode}`,
        mode,
        ...templateOptions(mode),
      });
      const full = recipe({
        name: 'cbtn',
        variants: {
          tone: variant.enum(['neutral', 'accent'], { default: 'neutral' }),
          size: variant.enum(['sm', 'md'], { default: 'md' }),
          busy: variant.boolean({ default: false }),
        },
        styles: () => ({
          base: { display: 'inline-flex' },
          variants: {
            tone: { neutral: { color: 'gray' }, accent: { color: 'blue' } },
            size: { sm: { padding: 2 }, md: { padding: 4 } },
            busy: { true: { opacity: 0.5 }, false: {} },
          },
          compoundVariants: [
            { variants: { tone: 'accent', size: ['sm', 'md'] }, style: { fontWeight: 700 } },
            { variants: { tone: 'accent', busy: true }, style: { cursor: 'wait' } },
          ],
        }),
      } as never) as unknown as Call;
      const plan = getClientPlans().find((p) => p.namespace === 'cbtn') as AttrsRecipePlan;
      expect(plan.kind).toBe('classes');
      const lite = createAttrsRecipeFromPlan(plan) as Call;
      for (const selection of selectionGrid(
        (plan as { dimensions: Record<string, string[]> }).dimensions,
      )) {
        expect(plain(lite(selection))).toEqual(plain(full(selection)));
      }
      expect(plain(lite())).toEqual(plain(full()));
      // Handle props (class map) match too.
      const fullProps = Object.fromEntries(Object.entries(full as object));
      const liteProps = Object.fromEntries(Object.entries(lite as object));
      expect(liteProps).toEqual({ ...fullProps, defaults: liteProps.defaults });
    });
  },
);

describe.each(['semantic', 'bem', 'template'] as const)(
  'class-name mode slot client plans (%s)',
  (mode) => {
    beforeEach(() => reset());

    it('slot recipes match the full runtime', () => {
      const { recipe } = createTypeStyles({
        scopeId: `cs-${mode}`,
        mode,
        ...templateOptions(mode),
      });
      const full = recipe({
        name: 'cbox',
        slots: ['root', 'label'],
        variants: {
          tone: variant.enum(['neutral', 'accent'], { default: 'neutral' }),
          dense: variant.boolean({ default: false }),
        },
        styles: () => ({
          base: { root: { color: 'red' }, label: { color: 'blue' } },
          variants: {
            tone: {
              neutral: { root: { color: 'gray' } },
              accent: { root: { color: 'blue' }, label: { fontWeight: 700 } },
            },
            dense: { true: { root: { padding: 1 } }, false: {} },
          },
        }),
      } as never) as unknown as Call;
      const plan = getClientPlans().find((p) => p.namespace === 'cbox') as AttrsRecipePlan;
      expect(plan.kind).toBe('class-slots');
      const lite = createAttrsRecipeFromPlan(plan) as Call;
      for (const selection of selectionGrid(
        (plan as { dimensions: Record<string, string[]> }).dimensions,
      )) {
        expect(plain(lite(selection))).toEqual(plain(full(selection)));
      }
    });
  },
);
