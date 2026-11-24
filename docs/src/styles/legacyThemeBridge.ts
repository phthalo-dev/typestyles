import { defaultTheme as legacyTheme } from '@examples/design-system';
import { global } from './typestyles';

/**
 * Temporary bridge while the shell is `@var-ui/docs` but some page components (prose, LiveDemo,
 * PageFooter, Pagination, Alert…) still read `@examples/design-system` colour tokens. Point those
 * tokens at the matching Var UI tokens so both follow the kit's colour mode and stay legible.
 * Several legacy colour tokens resolve empty in the current build, so this also avoids invisible
 * text. Remove together with the legacy components.
 */
const v = (name: string) => `var(--var-ui-color-${name})`;
const tone = (kind: string) => ({
  [`--example-ds-color-${kind}-default`]: v(`tone-${kind}-foreground`),
  [`--example-ds-color-${kind}-subtle`]: v(`tone-${kind}-subtleBackground`),
  [`--example-ds-color-${kind}-border`]: v(`tone-${kind}-border`),
});

global.rule(
  `html.${legacyTheme.className}`,
  {
    '--example-ds-color-background-app': v('background-app'),
    '--example-ds-color-background-surface': v('background-surface'),
    '--example-ds-color-background-subtle': v('background-subtle'),
    '--example-ds-color-background-elevated': v('background-elevated'),
    '--example-ds-color-text-primary': v('text-primary'),
    '--example-ds-color-text-secondary': v('text-secondary'),
    '--example-ds-color-text-onAccent': v('background-app'),
    '--example-ds-color-text-onDanger': v('tone-danger-foregroundOnBackground'),
    '--example-ds-color-accent-default': v('tone-accent-foreground'),
    '--example-ds-color-accent-hover': v('link-hover'),
    '--example-ds-color-accent-subtle': v('tone-accent-subtleBackground'),
    '--example-ds-color-border-default': v('border-default'),
    '--example-ds-color-border-strong': v('border-strong'),
    '--example-ds-color-border-focus': v('border-focus'),
    ...tone('danger'),
    ...tone('success'),
    ...tone('warning'),
    ...tone('info'),
    '--example-ds-color-danger-solid': v('tone-danger-background'),
    '--example-ds-color-success-solid': v('tone-success-background'),
    '--example-ds-color-warning-onSolid': v('tone-warning-foregroundOnBackground'),
    '--example-ds-color-info-onSolid': v('tone-info-foregroundOnBackground'),
  },
  { layer: 'tokens' },
);
