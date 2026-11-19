import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import { reset } from 'typestyles';
import { runTypestylesBuild } from './index';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'typestyles-conditions-'));
  const pkg = join(root, 'node_modules', 'fixture-ui');
  await mkdir(join(pkg, 'src'), { recursive: true });
  await mkdir(join(pkg, 'dist'), { recursive: true });
  await writeFile(
    join(pkg, 'package.json'),
    JSON.stringify({
      name: 'fixture-ui',
      exports: { '.': { '@fixture/source': './src/index.ts', default: './dist/index.js' } },
    }),
  );
  const comp = (cls: string) =>
    `import { createStyles } from 'typestyles';\ncreateStyles().class('${cls}', { padding: '4px' });\n`;
  await writeFile(join(pkg, 'src', 'index.ts'), comp('from-source'));
  await writeFile(join(pkg, 'dist', 'index.js'), comp('from-dist'));
  await writeFile(join(root, 'entry.ts'), `import 'fixture-ui';\n`);
  await writeFile(join(root, 'aliased.ts'), `import '@fx/ui';\n`);
  return root;
}

describe('runTypestylesBuild resolve options', () => {
  it('resolves default exports without custom conditions', async () => {
    const root = await fixture();
    try {
      reset();
      const css = await runTypestylesBuild({ root, modules: ['entry.ts'] });
      expect(css).toContain('.from-dist');
    } finally {
      reset();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('honours custom export conditions', async () => {
    const root = await fixture();
    try {
      reset();
      const css = await runTypestylesBuild({
        root,
        modules: ['entry.ts'],
        conditions: ['@fixture/source'],
      });
      expect(css).toContain('.from-source');
      expect(css).not.toContain('.from-dist');
    } finally {
      reset();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('honours aliases', async () => {
    const root = await fixture();
    try {
      reset();
      const css = await runTypestylesBuild({
        root,
        modules: ['aliased.ts'],
        alias: { '@fx/ui': join(root, 'node_modules', 'fixture-ui', 'src', 'index.ts') },
        conditions: ['@fixture/source'],
      });
      expect(css).toContain('.from-source');
    } finally {
      reset();
      await rm(root, { recursive: true, force: true });
    }
  });
});
