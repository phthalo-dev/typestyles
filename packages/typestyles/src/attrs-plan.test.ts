import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vite-plus/test';
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

// Plans are only recorded during extraction, which sets this flag.
beforeAll(() => {
  globalThis.__TYPESTYLES_RECORD_PLANS__ = true;
});
afterAll(() => {
  globalThis.__TYPESTYLES_RECORD_PLANS__ = undefined;
});

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

  it('records recipe vars so the lite handle exposes the same `.vars` refs', () => {
    type VarRef = { name: string; var: string };
    const full = recipe({
      name: 'planrating',
      vars: {
        fill: { value: '0%' },
        track: { color: 'gray', width: '2px' },
      },
      variants: { size: variant.enum(['sm', 'md'], { default: 'md' }) },
      styles: ({ vars }: { vars: Record<string, never> }) => ({
        base: { width: (vars as { fill: VarRef }).fill.var },
        variants: { size: { sm: { padding: 2 }, md: { padding: 4 } } },
      }),
    } as never) as unknown as Call & {
      vars: { fill: VarRef; track: { color: VarRef; width: VarRef } };
    };

    const plan = getClientPlans().find((p) => p.namespace === 'planrating') as AttrsRecipePlan;
    expect(plan.vars).toBeDefined();
    // Plans are serialized into the client bundle.
    const lite = createAttrsRecipeFromPlan(JSON.parse(JSON.stringify(plan))) as typeof full;

    for (const ref of [full.vars.fill, full.vars.track.color, full.vars.track.width]) {
      expect(ref.name).toMatch(/^--/);
    }
    expect(lite.vars.fill.name).toBe(full.vars.fill.name);
    expect(lite.vars.fill.var).toBe(full.vars.fill.var);
    expect(String(lite.vars.fill)).toBe(String(full.vars.fill));
    expect(lite.vars.track.color.name).toBe(full.vars.track.color.name);
    expect(lite.vars.track.width.var).toBe(full.vars.track.width.var);
    expect(plain(lite({ size: 'sm' }))).toEqual(plain(full({ size: 'sm' })));
  });

  it('records vars for flat and multi-slot recipes too', () => {
    type VarRef = { name: string; var: string };
    const flat = recipe({
      name: 'planflatvars',
      vars: { gap: { value: '4px' } },
      base: { color: 'red' },
      primary: { color: 'blue' },
    } as never) as unknown as { vars: { gap: VarRef } };
    const flatPlan = getClientPlans().find(
      (p) => p.namespace === 'planflatvars',
    ) as AttrsRecipePlan;
    expect((createAttrsRecipeFromPlan(flatPlan) as typeof flat).vars.gap.name).toBe(
      flat.vars.gap.name,
    );

    const multi = recipe({
      name: 'planmultivars',
      slots: ['root', 'label'],
      vars: { size: { value: '1rem' } },
      root: { color: 'red' },
      label: { color: 'blue' },
    } as never) as unknown as { vars: { size: VarRef } };
    const multiPlan = getClientPlans().find(
      (p) => p.namespace === 'planmultivars',
    ) as AttrsRecipePlan;
    expect((createAttrsRecipeFromPlan(multiPlan) as typeof multi).vars.size.var).toBe(
      multi.vars.size.var,
    );
  });

  it('leaves `.vars` off plans and lite handles for recipes without vars', () => {
    recipe({
      name: 'plannovars',
      variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
      styles: () => ({
        base: { color: 'red' },
        variants: { tone: { a: { color: 'red' }, b: { color: 'blue' } } },
      }),
    } as never);
    const plan = getClientPlans().find((p) => p.namespace === 'plannovars') as AttrsRecipePlan;
    expect(plan.vars).toBeUndefined();
    expect('vars' in (createAttrsRecipeFromPlan(plan) as object)).toBe(false);
  });

  it('builds `.vars` as plain objects that iterate the same way in both runtimes', () => {
    type VarRef = { name: string; var: string };
    const full = recipe({
      name: 'planitervars',
      vars: { fill: { value: '0%' }, track: { color: 'gray', width: '2px' } },
      base: { color: 'red' },
    } as never) as unknown as {
      vars: { fill: VarRef; track: { color: VarRef; width: VarRef } };
    };
    const plan = getClientPlans().find((p) => p.namespace === 'planitervars') as AttrsRecipePlan;
    const lite = createAttrsRecipeFromPlan(JSON.parse(JSON.stringify(plan))) as typeof full;

    for (const vars of [full.vars, lite.vars]) {
      expect(Object.keys(vars)).toEqual(['fill', 'track']);
      expect(Object.keys(vars.track)).toEqual(['color', 'width']);
      expect(Object.isFrozen(vars) && Object.isFrozen(vars.track)).toBe(true);
      // A dashed path reads the same ref as the nesting, without showing up when iterating.
      expect((vars as unknown as Record<string, VarRef>)['track-color']).toBe(vars.track.color);
      expect('track-color' in vars).toBe(true);
    }
    expect(JSON.parse(JSON.stringify(lite.vars))).toEqual(JSON.parse(JSON.stringify(full.vars)));
    expect(JSON.parse(JSON.stringify(full.vars)).track.color.name).toBe(full.vars.track.color.name);
  });

  it('records one complete entry per recipe, with that recipe’s own vars', () => {
    const before = getClientPlans().length;
    recipe({ name: 'planonea', vars: { a: { value: '1px' } }, base: { color: 'red' } } as never);
    createTypeStyles({ scopeId: 'plan3', mode: 'hashed' }).recipe({
      name: 'planoneb',
      slots: ['root'],
      vars: { b: { value: '2px' } },
      root: { color: 'red' },
    } as never);
    recipe({ name: 'planonec', vars: { c: { value: '3px' } }, base: { color: 'red' } } as never);

    const added = getClientPlans().slice(before);
    expect(added.map((p) => [p.kind, p.namespace])).toEqual([
      ['flat', 'planonea'],
      ['unplanned', 'planoneb'],
      ['flat', 'planonec'],
    ]);
    expect(Object.keys((added[0] as AttrsRecipePlan).vars!)).toEqual(['a']);
    expect('vars' in added[1]!).toBe(false);
    expect(Object.keys((added[2] as AttrsRecipePlan).vars!)).toEqual(['c']);
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
    // Only an `unplanned` marker, so the transform can't match another scope's plan of the same name.
    expect(getClientPlans().filter((p) => p.namespace === 'planunsupported')).toEqual([
      { kind: 'unplanned', namespace: 'planunsupported' },
    ]);
  });

  it('records nothing unless extraction turned recording on', () => {
    globalThis.__TYPESTYLES_RECORD_PLANS__ = undefined;
    try {
      recipe({
        name: 'plannotrecorded',
        variants: { tone: variant.enum(['a', 'b'], { default: 'a' }) },
        styles: () => ({
          base: { color: 'red' },
          variants: { tone: { a: { color: 'red' }, b: { color: 'blue' } } },
        }),
      } as never);
      expect(getClientPlans()).toEqual([]);
    } finally {
      globalThis.__TYPESTYLES_RECORD_PLANS__ = true;
    }
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
