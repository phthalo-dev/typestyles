import astro from 'shiki/langs/astro.mjs';
import bash from 'shiki/langs/bash.mjs';
import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import jsx from 'shiki/langs/jsx.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import { createDocHighlighter, escapeHtml } from './shikiTokens';

/** Fence language to registered grammar id. */
const ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
};

// Built once per process (module scope): ~10 grammars, no WASM.
const highlighter = createDocHighlighter(
  [typescript, tsx, javascript, jsx, css, html, json, yaml, bash, astro].flat(),
  ALIASES,
);

/**
 * Highlight fenced doc code with the VarUI design-token Shiki theme (`@var-ui/docs/shiki`).
 * Used by the marked pipeline, install tabs, `Code.astro`, `LiveDemo` and the MCP content
 * generator. Never throws: unknown languages and failures fall back to escaped plain text.
 *
 * The `safeLang` returned is the fence language (lower-cased) when a grammar exists, else `plaintext`.
 */
export function highlightDocCode(
  code: string,
  lang?: string,
): { safeLang: string; highlighted: string } {
  const raw = (lang ?? '').trim().toLowerCase();
  if (raw && raw !== 'plaintext' && raw !== 'text') {
    try {
      const highlighted = highlighter.highlight(code, raw);
      if (highlighted !== null) return { safeLang: raw, highlighted };
    } catch {
      // fall through to plain text
    }
  }
  return { safeLang: 'plaintext', highlighted: escapeHtml(code) };
}
