import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { indexPlans, transformRecipeCalls } from './compile-transform';
import { runTypestylesExtract } from './index';

type VarRef = { name: string; var: string };
type Rating = ((selections?: Record<string, unknown>) => { className: string }) & {
  vars: { fill: VarRef; track: { color: VarRef } };
};

const source = (name: string) => `
import { createTypeStyles, variant } from 'typestyles';
const { recipe } = createTypeStyles({ scopeId: 'cvars', mode: 'attribute' });
export const rating = recipe({
  name: ${JSON.stringify(name)},
  vars: { fill: { value: '0%' }, track: { color: 'gray' } },
  variants: { size: variant.enum(['sm', 'md'], { default: 'md' }) },
  styles: ({ vars }) => ({
    base: { width: vars.fill.var },
    variants: { size: { sm: { padding: 2 }, md: { padding: 4 } } },
  }),
});
`;

// #315: extraction (child process) -> plan JSON -> compile transform -> lite handle must keep `.vars`.
describe('compile: true keeps recipe .vars end to end', () => {
  it('inlines a plan whose lite handle exposes the same var refs as the full runtime', async () => {
    const root = process.cwd();
    // Inside the package so the compiled module resolves `typestyles` / `typestyles/lite`.
    const dir = await mkdtemp(join(root, 'tmp-compile-vars-'));
    try {
      const original = join(dir, 'rating.mjs');
      await writeFile(original, source('compile-vars-rating'), 'utf8');

      const { plans } = await runTypestylesExtract({
        root,
        modules: [relative(root, original)],
      });
      const plan = plans.find((p) => p.namespace === 'compile-vars-rating');
      expect(plan && 'vars' in plan ? Object.keys(plan.vars ?? {}) : []).toEqual([
        'fill',
        'track-color',
      ]);

      const compiled = transformRecipeCalls(await readFile(original, 'utf8'), indexPlans(plans));
      expect(compiled?.code).toContain('typestyles/lite');
      const compiledFile = join(dir, 'rating.compiled.mjs');
      await writeFile(compiledFile, compiled!.code, 'utf8');

      const full = ((await import(pathToFileURL(original).href)) as { rating: Rating }).rating;
      const lite = ((await import(pathToFileURL(compiledFile).href)) as { rating: Rating }).rating;

      expect(lite.vars.fill.name).toMatch(/^--/);
      expect(lite.vars.fill.name).toBe(full.vars.fill.name);
      expect(lite.vars.track.color.var).toBe(full.vars.track.color.var);
      expect(`${lite.vars.fill}`).toBe(`${full.vars.fill}`);
      expect(lite({ size: 'sm' }).className).toBe(full({ size: 'sm' }).className);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
