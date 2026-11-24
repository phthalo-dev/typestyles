import { createHighlighterCoreSync, type LanguageInput } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { designTokenShikiTheme } from '@var-ui/docs/shiki';

/**
 * Synchronous Shiki highlighter with the kit's design-token theme (`color.code.*`), so code
 * colours follow the active Var UI theme and colour mode through CSS variables (no per-mode HTML).
 *
 * Why sync: `highlightDocCode` is called from `marked`'s synchronous `highlight` hook, from
 * Astro frontmatter, from the MCP content generator and from the browser (LiveDemo). Shiki's
 * `createHighlighterCoreSync` + the JavaScript regex engine need no async WASM init when the
 * grammars are imported statically.
 */
export type DocHighlighter = {
  /** Highlighted inner HTML of a `<code>` element, or `null` if `lang` has no grammar. */
  highlight(code: string, lang: string): string | null;
};

const FONT_ITALIC = 1;
const FONT_BOLD = 2;
const FONT_UNDERLINE = 4;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tokenStyle(color: string | undefined, fontStyle: number | undefined): string {
  const parts: string[] = [];
  if (color) parts.push(`color:${color}`);
  if (fontStyle && fontStyle > 0) {
    if (fontStyle & FONT_ITALIC) parts.push('font-style:italic');
    if (fontStyle & FONT_BOLD) parts.push('font-weight:bold');
    if (fontStyle & FONT_UNDERLINE) parts.push('text-decoration:underline');
  }
  return parts.join(';');
}

/**
 * @param langs grammar modules to register.
 * @param aliases maps a doc fence language (`ts`, `sh`…) to a registered grammar id.
 */
export function createDocHighlighter(
  langs: LanguageInput[],
  aliases: Record<string, string>,
): DocHighlighter {
  const core = createHighlighterCoreSync({
    // Cast: the kit builds its theme from typed CSS variable refs (`colors['editor.foreground']` is a
    // `CSSVarRef` object that stringifies to `var(--…)`) and `readonly` tuples, which Shiki's
    // `ThemeRegistrationRaw` (string colours, mutable arrays) rejects. At runtime they are strings.
    themes: [designTokenShikiTheme as never],
    langs,
    engine: createJavaScriptRegexEngine(),
  });
  const loaded = new Set(core.getLoadedLanguages());
  const theme = designTokenShikiTheme.name;

  return {
    highlight(code, lang) {
      const id = aliases[lang] ?? lang;
      if (!loaded.has(id)) return null;
      const trailing = code.endsWith('\n') ? '\n' : '';
      const body = trailing ? code.slice(0, -1) : code;
      if (body === '') return trailing;
      const { tokens } = core.codeToTokens(body, { lang: id, theme });
      const html = tokens
        .map((line) =>
          line
            .map((tok) => {
              const style = tokenStyle(tok.color, tok.fontStyle);
              const text = escapeHtml(tok.content);
              return style ? `<span style="${style}">${text}</span>` : text;
            })
            .join(''),
        )
        .join('\n');
      return html + trailing;
    },
  };
}
