import { codeBlockMarkup } from '@var-ui/core';
import { svg as copySvg } from '@var-ui/icons/glyphs/copy';
import { escapeHtml } from './shikiTokens';

function attrs(map: Record<string, string | undefined>): string {
  return Object.entries(map)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => (v === '' ? k : `${k}="${escapeHtml(v as string)}"`))
    .join(' ');
}

/**
 * HTML for a fenced markdown code block (highlighted inner HTML only), in the structure of the
 * kit's `CodeBlock` (`codeBlockMarkup` from `@var-ui/core`, styled by its `codeBlock` recipe):
 * header with language label and copy button, then `pre > code`.
 *
 * Copy: the kit's own script (`data-var-ui-code-copy`) is not loaded on doc pages, because it needs
 * the raw source in a `data-var-ui-code` attribute. Docs copy `pre code` text instead, through
 * `data-codeblock-copy` handled by `scripts/docsCodeBlockCopy.ts` (one delegated listener,
 * survives view transitions). The kit's `data-var-ui-*` hooks are therefore left off.
 */
export function markdownCodeBlockHtml(safeLang: string, highlighted: string): string {
  const m = codeBlockMarkup({ code: '', language: safeLang });
  const copyButton = m.copyButton as Record<string, string>;
  const button = {
    class: copyButton.class,
    type: 'button',
    'data-codeblock-copy': '',
    'aria-label': copyButton['aria-label'],
  };
  const lang = m.language!;
  return [
    `<div ${attrs({ ...m.root, 'data-codeblock': '' })}>`,
    `<div ${attrs(m.header)}>`,
    `<div ${attrs(m.title)}><span ${attrs(lang.attributes)}>${escapeHtml(lang.text)}</span></div>`,
    `<div ${attrs(m.actions!)}>`,
    `<button ${attrs(button)}><span ${attrs(m.copyIcon)}>${copySvg}</span></button>`,
    `<span ${attrs(m.feedback!)}></span>`,
    `</div>`,
    `</div>`,
    `<div ${attrs(m.body)}><pre ${attrs(m.pre)}><code ${attrs(m.code)}>${highlighted}</code></pre></div>`,
    `</div>`,
  ].join('\n');
}
