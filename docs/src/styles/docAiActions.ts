import { designTokens as t } from '@var-ui/core';
import { recipe } from './typestyles';

/** Layout only: the buttons and the menu are kit components (`Button`, `Menu` from `@var-ui/astro`). */
export const docAiActions = recipe({
  name: 'docs-doc-ai-actions',
  slots: ['root'] as const,
  styles: {
    base: {
      root: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: t.space.xs.var,
        marginTop: t.space.xs.var,
        marginBottom: t.space.md.var,
      },
    },
  },
});
