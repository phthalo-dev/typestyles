import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import { reset } from 'typestyles';
import { runTypestylesBuild } from './index';

async function fixture(tsconfig?: object) {
  const root = await mkdtemp(join(tmpdir(), 'typestyles-jsx-'));
  const react = join(root, 'node_modules', 'react');
  await mkdir(react, { recursive: true });
  await writeFile(
    join(react, 'package.json'),
    JSON.stringify({
      name: 'react',
      exports: { './jsx-runtime': './jsx-runtime.js', '.': './index.js' },
    }),
  );
  await writeFile(
    join(react, 'jsx-runtime.js'),
    'exports.jsx = (t, p) => ({ t, p }); exports.jsxs = exports.jsx;',
  );
  // No `createElement` export: the classic transform would throw "React is not defined".
  await writeFile(join(react, 'index.js'), 'module.exports = {};');
  if (tsconfig) await writeFile(join(root, 'tsconfig.json'), JSON.stringify(tsconfig));
  await writeFile(
    join(root, 'entry.tsx'),
    `import { createStyles } from 'typestyles';
const icon = <span className="x" />;
createStyles().class(icon ? 'with-jsx' : 'none', { padding: '4px' });
`,
  );
  return root;
}

describe('runTypestylesBuild JSX', () => {
  it('evaluates module-level JSX with the automatic runtime by default', async () => {
    const root = await fixture();
    try {
      reset();
      const css = await runTypestylesBuild({ root, modules: ['entry.tsx'] });
      expect(css).toContain('.with-jsx');
    } finally {
      reset();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('defers to the project tsconfig when it sets jsx', async () => {
    const root = await fixture({ compilerOptions: { jsx: 'react-jsx' } });
    try {
      reset();
      const css = await runTypestylesBuild({ root, modules: ['entry.tsx'] });
      expect(css).toContain('.with-jsx');
    } finally {
      reset();
      await rm(root, { recursive: true, force: true });
    }
  });
});
