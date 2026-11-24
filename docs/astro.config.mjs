import AstroTypestyles from '@typestyles/astro';
import sitemap from '@astrojs/sitemap';
import { defaultThemeClassName } from '@var-ui/core';
import varDocs from '@var-ui/docs';
import { defineConfig } from 'astro/config';
import tsConfigPaths from 'vite-tsconfig-paths';
import { buildPlaygroundAssetsIntegration } from './integrations/buildPlaygroundAssets.ts';
import { generateMcpContentIntegration } from './integrations/generateMcpContent.ts';

/**
 * `varDocs()` registers its own `@typestyles/vite` extractor for the same entry and the same
 * `typestyles.css`. We keep `AstroTypestyles` below (explicit `mode: 'build'`) as the only
 * extractor, so drop the kit's copy. See specs/varui-docs-site-issues.md.
 */
function keepSingleTypestylesExtractor() {
  return {
    name: 'docs:single-typestyles-extractor',
    hooks: {
      'astro:config:setup': ({ config, logger }) => {
        const plugins = config.vite?.plugins;
        if (!Array.isArray(plugins)) return;
        // The kit's copy is registered first (`varDocs` precedes `AstroTypestyles`); keep the last.
        const indexes = plugins.flatMap((p, i) => (p && p.name === 'typestyles' ? [i] : []));
        // Exactly the kit's extractor + ours is expected. Anything else means the kit (or
        // @typestyles/astro) changed how it registers plugins; re-check before trusting the strip.
        if (indexes.length !== 2) {
          logger.warn(
            `expected 2 vite plugins named "typestyles" (varDocs + AstroTypestyles), found ${indexes.length}; ` +
              'review keepSingleTypestylesExtractor() in astro.config.mjs',
          );
        }
        for (const i of indexes.slice(0, -1).reverse()) plugins.splice(i, 1);
      },
    },
  };
}

export default defineConfig({
  site: 'https://typestyles.dev',
  integrations: [
    varDocs({
      title: 'typestyles',
      favicon: '/favicon.svg',
      // No `presets`: @var-ui/core ships only its default theme, and the old design styles
      // (@examples/design-system) are not createDesignTheme() themes. The appearance menu shows
      // colour mode only. See "Design styles changed" in specs/varui-docs-site-issues.md.
      theme: { defaultClassName: defaultThemeClassName },
      typestyles: { entry: 'src/typestyles-entry.ts' },
      routes: { docs: { prefix: '/docs', collection: 'docs' } },
      // Docs keep their own routes, middleware, .md views and llms outputs.
      disableGuideRoutes: true,
      disableMiddleware: true,
      markdownViews: false,
    }),
    sitemap(),
    buildPlaygroundAssetsIntegration(),
    generateMcpContentIntegration(),
    AstroTypestyles({
      mode: 'build',
      extract: {
        modules: ['src/typestyles-entry.ts'],
        fileName: 'typestyles.css',
      },
    }),
    keepSingleTypestylesExtractor(),
  ],
  vite: {
    plugins: [tsConfigPaths({ projects: ['./tsconfig.json'] })],
    worker: {
      format: 'es',
    },
    ssr: {
      // LiveDemo CSS extraction runs esbuild in Node; must not be bundled into Astro SSR.
      external: ['@typestyles/build-runner', 'esbuild'],
      // The kit ships raw .astro/.ts sources.
      noExternal: ['@var-ui/docs', '@var-ui/astro', '@var-ui/core', '@var-ui/icons'],
    },
  },
});
