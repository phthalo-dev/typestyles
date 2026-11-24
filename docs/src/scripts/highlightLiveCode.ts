import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import { createDocHighlighter, escapeHtml } from '../lib/shikiTokens';

// Same theme and renderer as the build-time `highlightDocCode`, with only the grammars LiveDemo
// panels use, so the client chunk stays small and live edits look like the server render.
const highlighter = createDocHighlighter([typescript, tsx, css, html].flat(), {
  ts: 'typescript',
  xml: 'html',
});

export function highlightLiveCode(code: string, lang: string): { safeLang: string; html: string } {
  const language = lang.trim().toLowerCase();
  const out = highlighter.highlight(code, language);
  return out === null
    ? { safeLang: 'plaintext', html: escapeHtml(code) }
    : { safeLang: language, html: out };
}

/** Update a `<pre><code>` (or container holding `code`) with highlighted markup. */
export function applyLiveCodeHighlight(container: Element, code: string, lang: string): void {
  const codeEl = container.querySelector('code');
  if (!codeEl || !(codeEl instanceof HTMLElement)) return;
  const { safeLang, html } = highlightLiveCode(code, lang);
  codeEl.classList.forEach((c) => {
    if (c.startsWith('language-')) codeEl.classList.remove(c);
  });
  codeEl.classList.add(`language-${safeLang}`);
  codeEl.innerHTML = html;
}
