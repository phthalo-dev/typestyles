import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import { collectAndWriteRouteCss } from './route-css';
import { getRouteCss } from './route-css-read';
import { buildManifestV2 } from './route-css';

describe('collectAndWriteRouteCss', () => {
  it('writes per-route CSS files', async () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-route-css-'));
    mkdirSync(join(root, 'styles'), { recursive: true });
    mkdirSync(join(root, 'app/about'), { recursive: true });

    writeFileSync(join(root, 'styles/shared.ts'), `SHARED_MARKER\n`);
    writeFileSync(join(root, 'app/layout.tsx'), `export default function L() { return null; }\n`);
    writeFileSync(
      join(root, 'app/page.tsx'),
      `import '../styles/home';\nexport default function Home() { return null; }\n`,
    );
    writeFileSync(
      join(root, 'styles/home.ts'),
      `import { createTypeStyles } from 'typestyles';\nconst { style } = createTypeStyles();\nstyle('home', { color: 'red' });\n`,
    );
    writeFileSync(
      join(root, 'app/about/page.tsx'),
      `import '../../styles/about';\nexport default function About() { return null; }\n`,
    );
    writeFileSync(
      join(root, 'styles/about.ts'),
      `import { createStyles } from 'typestyles';\nconst styles = createStyles();\nstyles.class('about', { color: 'blue' });\n`,
    );

    const collectCss = async (loaders: Array<() => unknown | Promise<unknown>>) =>
      `/* css for ${loaders.length} modules */`;

    try {
      const { routes } = await collectAndWriteRouteCss({
        root,
        sharedModules: ['styles/shared.ts'],
        collectCss,
      });

      expect(Object.keys(routes)).toEqual(['/', '/about']);
      expect(routes['/'].css).toBe('app/_typestyles/routes/index.css');
      expect(routes['/about'].css).toBe('app/_typestyles/routes/about.css');
      expect(readFileSync(join(root, routes['/'].css), 'utf8')).toContain('css for');

      const manifest = buildManifestV2('app/typestyles.css', routes);
      writeFileSync(join(root, 'app/typestyles.manifest.json'), JSON.stringify(manifest));
      writeFileSync(join(root, 'app/typestyles.css'), '.global { }');

      const homeCss = getRouteCss('/', { root });
      expect(homeCss).toContain('css for');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
