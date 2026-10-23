import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import { traceTypestylesModules } from './trace-imports';

describe('traceTypestylesModules', () => {
  it('returns modules in the import graph that import typestyles', async () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-trace-'));
    mkdirSync(join(root, 'app'), { recursive: true });
    mkdirSync(join(root, 'styles'), { recursive: true });
    writeFileSync(
      join(root, 'styles/tokens.ts'),
      `import { createTypeStyles } from 'typestyles';\nconst { tokens } = createTypeStyles();\ntokens.create('trace-root', { color: { primary: '#000' } });\n`,
    );
    writeFileSync(
      join(root, 'app/page.tsx'),
      `import '../styles/tokens';\nexport default function Page() { return null; }\n`,
    );
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@/*': ['./*'] },
        },
      }),
    );

    try {
      const modules = await traceTypestylesModules(root, ['app/page.tsx']);
      expect(modules).toContain('styles/tokens.ts');
      expect(modules).not.toContain('app/page.tsx');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('resolves tsconfig path aliases', async () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-trace-alias-'));
    mkdirSync(join(root, 'app'), { recursive: true });
    mkdirSync(join(root, 'styles'), { recursive: true });
    writeFileSync(
      join(root, 'styles/site.ts'),
      `import { createStyles } from 'typestyles';\nconst styles = createStyles();\nstyles.class('site-page', { padding: '1rem' });\n`,
    );
    writeFileSync(
      join(root, 'app/page.tsx'),
      `import '@/styles/site';\nexport default function Page() { return null; }\n`,
    );
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          baseUrl: '.',
          paths: { '@/*': ['./*'] },
        },
      }),
    );

    try {
      const modules = await traceTypestylesModules(root, ['app/page.tsx']);
      expect(modules).toContain('styles/site.ts');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('externalizes layout CSS imports with site-root asset URLs', async () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-trace-css-'));
    mkdirSync(join(root, 'app'), { recursive: true });
    writeFileSync(
      join(root, 'app/typestyles.css'),
      `@font-face { src: url('/fonts/space-grotesk-latin.woff2') format('woff2'); }\n`,
    );
    writeFileSync(
      join(root, 'app/layout.tsx'),
      `import './typestyles.css';\nexport default function Layout() { return null; }\n`,
    );
    writeFileSync(join(root, 'app/page.tsx'), `export default function Page() { return null; }\n`);

    try {
      const modules = await traceTypestylesModules(root, ['app/layout.tsx', 'app/page.tsx']);
      expect(modules).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
