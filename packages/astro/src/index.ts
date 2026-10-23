import type { AstroIntegration } from 'astro';
import typestylesVite, { type TypestylesPluginOptions } from '@typestyles/vite';

export type { TypestylesPluginOptions } from '@typestyles/vite';

/**
 * Astro integration for typestyles.
 *
 * - **Dev** (`astro dev`): uses the Vite plugin in runtime mode so styles update via HMR.
 * - **Production** (`astro build`): set `mode: 'build'` and `extract.modules` so CSS is
 *   emitted at build time and `__TYPESTYLES_RUNTIME_DISABLED__` strips client `<style>` injection.
 *
 * Point `extract.modules` at one or more side-effect entry files (relative to the Astro project
 * root) that import every module registering typestyles for the site.
 *
 * **HMR:** `.astro` frontmatter runs only on the server, so the Vite plugin cannot hot-replace
 * styles until those modules also run in the browser. In dev, add a client `<script>` that
 * dynamically imports the same entry (e.g. `if (import.meta.env.DEV) void import('./typestyles-entry')`)
 * and avoid inlining `getRegisteredCss()` in dev, or updates will appear stuck until a full reload.
 */
export default function typestyles(options: TypestylesPluginOptions = {}): AstroIntegration {
  return {
    name: 'typestyles',
    hooks: {
      'astro:config:setup'({ updateConfig }) {
        updateConfig({
          vite: {
            // Types only: this workspace builds @typestyles/vite against Vite+'s Vite while Astro ships its own
            // Vite 6, so the two Plugin types differ. The runtime shape is identical.
            plugins: [typestylesVite(options) as never],
          },
        });
      },
    },
  };
}
