/**
 * Merge same-named top-level `@layer name { … }` blocks and hoist `@property`
 * after layer-order preambles so extracted / SSR CSS is easier to read.
 *
 * Runtime CSSOM insertion still registers one wrapped rule at a time; this only
 * rewrites the string returned by `getRegisteredCss()` / SSR collection.
 */

type CssChunk =
  | { kind: 'preamble'; css: string }
  | { kind: 'property'; css: string }
  | { kind: 'layer'; name: string; body: string }
  | { kind: 'other'; css: string };

const LAYER_ORDER_PREAMBLE_RE = /^@layer\s+[^;{]+;$/;
const LAYER_BLOCK_START_RE = /^@layer\s+([\w.-]+)\s*\{/;
const PROPERTY_START_RE = /^@property\s/;

/** Split a CSS string into top-level rules, respecting nested `{ … }`. */
export function splitTopLevelCss(css: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  const len = css.length;

  while (i < len) {
    while (i < len && /\s/.test(css[i]!)) i++;
    if (i >= len) break;

    const start = i;
    let depth = 0;
    let inString: '"' | "'" | null = null;
    let sawBrace = false;

    while (i < len) {
      const ch = css[i]!;

      if (inString) {
        if (ch === '\\' && i + 1 < len) {
          i += 2;
          continue;
        }
        if (ch === inString) inString = null;
        i++;
        continue;
      }

      if (ch === '/' && css[i + 1] === '*') {
        const end = css.indexOf('*/', i + 2);
        i = end === -1 ? len : end + 2;
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = ch;
        i++;
        continue;
      }

      if (ch === '{') {
        depth++;
        sawBrace = true;
        i++;
        continue;
      }

      if (ch === '}') {
        depth--;
        i++;
        if (sawBrace && depth === 0) break;
        continue;
      }

      // Bare at-rule / statement terminated by `;` at depth 0 (e.g. `@layer a, b;`)
      if (ch === ';' && depth === 0 && !sawBrace) {
        i++;
        break;
      }

      i++;
    }

    const chunk = css.slice(start, i).trim();
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}

const LEADING_COMMENTS_RE = /^(?:\/\*[\s\S]*?\*\/\s*)+/;

function parseChunk(chunk: string): CssChunk {
  const whole = chunk.trim();
  // Source comments (`/* path:line */`) lead the rule they describe; keep them with it.
  const comment = LEADING_COMMENTS_RE.exec(whole)?.[0].trim() ?? '';
  const trimmed = whole.slice(comment.length).trim();
  const withComment = (css: string) => (comment ? `${comment}\n${css}` : css);

  if (LAYER_ORDER_PREAMBLE_RE.test(trimmed)) {
    return { kind: 'preamble', css: withComment(trimmed) };
  }

  const layerMatch = trimmed.match(LAYER_BLOCK_START_RE);
  if (layerMatch) {
    const name = layerMatch[1]!;
    const openIdx = trimmed.indexOf('{');
    const closeIdx = trimmed.lastIndexOf('}');
    if (openIdx !== -1 && closeIdx > openIdx) {
      const body = trimmed.slice(openIdx + 1, closeIdx).trim();
      return { kind: 'layer', name, body: withComment(body) };
    }
  }

  if (PROPERTY_START_RE.test(trimmed)) {
    return { kind: 'property', css: withComment(trimmed) };
  }

  return { kind: 'other', css: whole };
}

/**
 * Consolidate duplicate top-level `@layer` wrappers and hoist `@property` rules
 * immediately after any `@layer a, b;` order preambles.
 */
export function consolidateCascadeLayers(css: string): string {
  if (!css || !css.includes('@layer')) return css;

  const chunks = splitTopLevelCss(css).map(parseChunk);
  if (chunks.length === 0) return css;

  const preambles: string[] = [];
  const properties: string[] = [];
  const layerBodies = new Map<string, string[]>();
  const rest: Array<{ kind: 'layer'; name: string } | { kind: 'other'; css: string }> = [];

  for (const chunk of chunks) {
    switch (chunk.kind) {
      case 'preamble':
        preambles.push(chunk.css);
        break;
      case 'property':
        properties.push(chunk.css);
        break;
      case 'layer': {
        if (!layerBodies.has(chunk.name)) {
          layerBodies.set(chunk.name, []);
          rest.push({ kind: 'layer', name: chunk.name });
        }
        if (chunk.body) layerBodies.get(chunk.name)!.push(chunk.body);
        break;
      }
      case 'other':
        rest.push({ kind: 'other', css: chunk.css });
        break;
    }
  }

  const out: string[] = [...preambles, ...properties];

  for (const item of rest) {
    if (item.kind === 'other') {
      out.push(item.css);
      continue;
    }
    const bodies = layerBodies.get(item.name) ?? [];
    out.push(`@layer ${item.name} {\n${bodies.join('\n')}\n}`);
  }

  return out.join('\n');
}
