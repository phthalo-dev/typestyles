import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import { buildTypestylesForNext } from './build';

describe('buildTypestylesForNext route CSS', () => {
  it('emits manifest v2 with per-route CSS files', async () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-next-build-routes-'));
    mkdirSync(join(root, 'styles'), { recursive: true });
    mkdirSync(join(root, 'app/about'), { recursive: true });

    writeFileSync(
      join(root, 'styles/typestyles-entry.ts'),
      `import { createTypeStyles } from 'typestyles';\nconst { style } = createTypeStyles();\nstyle('shared', { margin: '0' });\n`,
    );
    writeFileSync(
      join(root, 'app/layout.tsx'),
      `export default function Layout() { return null; }\n`,
    );
    writeFileSync(
      join(root, 'app/page.tsx'),
      `import { createStyles } from 'typestyles';\nconst styles = createStyles();\nstyles.class('home', { color: 'red' });\nexport default function Home() { return null; }\n`,
    );
    writeFileSync(
      join(root, 'app/about/page.tsx'),
      `import { createStyles } from 'typestyles';\nconst styles = createStyles();\nstyles.class('about', { color: 'blue' });\nexport default function About() { return null; }\n`,
    );

    try {
      await buildTypestylesForNext({ root });

      const manifest = JSON.parse(readFileSync(join(root, 'app/typestyles.manifest.json'), 'utf8'));
      expect(manifest.version).toBe(2);
      expect(manifest.routes['/']).toBeDefined();
      expect(manifest.routes['/about']).toBeDefined();
      expect(existsSync(join(root, manifest.routes['/'].css))).toBe(true);
      expect(existsSync(join(root, manifest.routes['/about'].css))).toBe(true);

      const homeCss = readFileSync(join(root, manifest.routes['/'].css), 'utf8');
      const aboutCss = readFileSync(join(root, manifest.routes['/about'].css), 'utf8');
      expect(homeCss).toContain('.home {');
      expect(aboutCss).toContain('.about {');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
