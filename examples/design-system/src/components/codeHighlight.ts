import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

const s = t.syntax;

/** Layout ancestor must include `codeHljsScope.root` so rules match fenced blocks / `Code.astro`. */
const cb = '[data-codeblock]';

function scopeSelectorList(list: string): string {
  return list
    .split(',')
    .map((part) => `& ${cb} ${part.trim()}`)
    .join(', ');
}

/**
 * Maps semantic `codeSyntax` tokens to highlight.js class names (see README).
 * Light values live on `:root`; dark is applied via `darkThemeClass` overrides.
 *
 * Compose **`codeHljsScope.root`** on a page shell (e.g. docs layout root) so selectors apply
 * inside `[data-codeblock]` wrappers.
 */
export const codeHljsScope = recipe({
  name: 'ds-hljs',
  layer: 'utilities',
  slots: ['root'] as const,
  styles: {
    base: {
      root: {
        [`& ${cb} .hljs`]: {
          color: s.base,
          background: 'transparent',
          display: 'block',
          overflowX: 'auto',
        },
        [scopeSelectorList(
          '.hljs-keyword,.hljs-meta .hljs-keyword,.hljs-template-tag,.hljs-template-variable,.hljs-type,.hljs-variable.language_',
        )]: {
          color: s.keyword,
        },
        [scopeSelectorList(
          '.hljs-title,.hljs-title.class_,.hljs-title.class_.inherited__,.hljs-title.function_',
        )]: {
          color: s.title,
        },
        [scopeSelectorList(
          '.hljs-attr,.hljs-attribute,.hljs-literal,.hljs-meta,.hljs-number,.hljs-operator,.hljs-variable,.hljs-selector-attr,.hljs-selector-class,.hljs-selector-id',
        )]: {
          color: s.attr,
        },
        [scopeSelectorList('.hljs-regexp,.hljs-string,.hljs-meta .hljs-string')]: {
          color: s.string,
        },
        [scopeSelectorList('.hljs-built_in,.hljs-symbol')]: {
          color: s.builtIn,
        },
        [scopeSelectorList('.hljs-comment,.hljs-code,.hljs-formula')]: {
          color: s.comment,
        },
        [scopeSelectorList('.hljs-name,.hljs-quote,.hljs-selector-tag,.hljs-selector-pseudo')]: {
          color: s.name,
        },
        [scopeSelectorList('.hljs-subst')]: {
          color: s.base,
        },
        [scopeSelectorList('.hljs-section')]: {
          color: s.section,
          fontWeight: 'bold',
        },
        [scopeSelectorList('.hljs-bullet')]: {
          color: s.bullet,
        },
        [scopeSelectorList('.hljs-emphasis')]: {
          color: s.base,
          fontStyle: 'italic',
        },
        [scopeSelectorList('.hljs-strong')]: {
          color: s.base,
          fontWeight: 'bold',
        },
        [scopeSelectorList('.hljs-addition')]: {
          color: s.addition,
          backgroundColor: s.additionBackground,
        },
        [scopeSelectorList('.hljs-deletion')]: {
          color: s.deletion,
          backgroundColor: s.deletionBackground,
        },
      },
    },
  },
});
