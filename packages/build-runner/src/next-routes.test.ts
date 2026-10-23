import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vite-plus/test';
import { discoverNextAppRoutes, pageRelPathToRoutePath } from './next-routes';

describe('pageRelPathToRoutePath', () => {
  it('maps root page to /', () => {
    expect(pageRelPathToRoutePath('page.tsx')).toBe('/');
  });

  it('maps nested pages and omits route groups', () => {
    expect(pageRelPathToRoutePath('about/page.tsx')).toBe('/about');
    expect(pageRelPathToRoutePath('(marketing)/pricing/page.tsx')).toBe('/pricing');
    expect(pageRelPathToRoutePath('blog/[slug]/page.tsx')).toBe('/blog/[slug]');
  });
});

describe('discoverNextAppRoutes', () => {
  it('discovers pages and layout chains', () => {
    const root = mkdtempSync(join(tmpdir(), 'typestyles-next-routes-'));
    mkdirSync(join(root, 'app/about'), { recursive: true });
    writeFileSync(
      join(root, 'app/layout.tsx'),
      'export default function Layout() { return null; }',
    );
    writeFileSync(join(root, 'app/page.tsx'), 'export default function Home() { return null; }');
    writeFileSync(
      join(root, 'app/about/layout.tsx'),
      'export default function AboutLayout() { return null; }',
    );
    writeFileSync(
      join(root, 'app/about/page.tsx'),
      'export default function About() { return null; }',
    );

    try {
      const routes = discoverNextAppRoutes(root);
      expect(routes).toEqual([
        {
          routePath: '/',
          pageFile: 'app/page.tsx',
          layoutFiles: ['app/layout.tsx'],
        },
        {
          routePath: '/about',
          pageFile: 'app/about/page.tsx',
          layoutFiles: ['app/layout.tsx', 'app/about/layout.tsx'],
        },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
