import { SourceMapGenerator } from 'source-map-js';

export type CssRuleSource = {
  css: string;
  source?: string;
};

export type GeneratedCssWithMap = {
  css: string;
  map: string;
};

/**
 * Build a CSS source map from per-rule source locations.
 *
 * Each rule is assumed to start on its own generated line at column 0. The `source`
 * string is expected to be `path:line`; it is split into a file path and 1-based line
 * number for the source map.
 */
export function buildCssSourceMap(
  rules: CssRuleSource[],
  options: { file?: string; sourceRoot?: string } = {},
): GeneratedCssWithMap {
  const generator = new SourceMapGenerator({
    file: options.file ?? 'typestyles.css',
    sourceRoot: options.sourceRoot,
  });

  const seenSources = new Set<string>();

  for (let generatedLine = 1; generatedLine <= rules.length; generatedLine++) {
    const rule = rules[generatedLine - 1];
    if (!rule) continue;
    const { source } = rule;
    if (!source) continue;

    const lastColon = source.lastIndexOf(':');
    if (lastColon === -1) continue;

    const file = source.slice(0, lastColon);
    const line = Number(source.slice(lastColon + 1));
    if (!file || !Number.isFinite(line) || line <= 0) continue;

    if (!seenSources.has(file)) {
      generator.setSourceContent(file, '');
      seenSources.add(file);
    }

    // Map the start of the generated rule (column 0) to the source line (1-based),
    // column 0. We do not have column-level source information from the stack trace.
    generator.addMapping({
      generated: { line: generatedLine, column: 0 },
      source: file,
      original: { line, column: 0 },
    });
  }

  return {
    css: rules.map((r) => r.css).join('\n'),
    map: generator.toString(),
  };
}
