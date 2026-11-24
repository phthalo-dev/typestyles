import demoSourceCode from './getting-started-button.source.txt?raw';
import type { LiveDemoModule } from './registry';

/**
 * Vite-facing facade for the getting-started demo. Style registration lives in
 * `getting-started-button.impl.ts` (build-runner only) so the logical namespace
 * `button` does not clash with other `button` recipes on the site.
 */
export { demoSourceCode };

export const demoVariants = [
  {
    id: 'primary',
    label: 'Primary',
    className: 'app-button app-button--intent-primary',
    usageCode: `<button type="button" className={button({ intent: 'primary' })}>
  Example button
</button>`,
    usageLang: 'tsx',
  },
  {
    id: 'ghost',
    label: 'Ghost',
    className: 'app-button app-button--intent-ghost',
    usageCode: `<button type="button" className={button({ intent: 'ghost' })}>
  Example button
</button>`,
    usageLang: 'tsx',
  },
] as const satisfies LiveDemoModule['demoVariants'];
