import { reset, selection } from 'typestyles/globals';
import { designTokens as t } from '@var-ui/core';

import { global } from './typestyles';

/**
 * Baseline styles: Josh Comeau’s reset via `typestyles/globals`, then docs-specific body, selection,
 * and layout frame on `html`. Scoped `global` comes from `createTypeStyles` in `./typestyles` and emits
 * into the `reset` layer (`globalLayer` in `typestyles.ts`), below `tokens` and `components`.
 *
 * Josh Comeau’s reset already registers `body` and `html`; `global.style` dedupes by selector per
 * scope, so follow-up rules must use different selectors (`html body`, `html:root`) or they are
 * dropped and base typography (e.g. `font-family`) never applies.
 *
 * @see https://www.joshwcomeau.com/css/custom-css-reset/
 */
global.apply(...reset({ includeAppRootIsolation: false }));

global.rule('html body', {
  background: t.color.background.app.var,
  fontFamily: t.fontFamily.body.var,
  MozOsxFontSmoothing: 'grayscale',
});

global.apply(
  selection({
    backgroundColor: t.color.tone.accent.subtleBackground.var,
    color: t.color.text.primary.var,
  }),
);

global.rule('html:root', {
  scrollBehavior: 'smooth',
});
