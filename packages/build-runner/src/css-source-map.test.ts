import { describe, expect, it } from 'vite-plus/test';
import { buildCssSourceMap } from './css-source-map';

describe('buildCssSourceMap', () => {
  it('maps each rule to its source file and line', () => {
    const { css, map } = buildCssSourceMap(
      [
        { css: '.button { color: red; }', source: 'src/Button.ts:12' },
        { css: '.card { padding: 8px; }', source: 'src/Card.ts:5' },
      ],
      { file: 'typestyles.css' },
    );

    expect(css).toBe('.button { color: red; }\n.card { padding: 8px; }');

    const parsed = JSON.parse(map);
    expect(parsed.version).toBe(3);
    expect(parsed.file).toBe('typestyles.css');
    expect(parsed.sources).toContain('src/Button.ts');
    expect(parsed.sources).toContain('src/Card.ts');
    expect(parsed.mappings).toBeTruthy();
  });

  it('skips rules without a source', () => {
    const { map } = buildCssSourceMap(
      [{ css: '.a { color: red; }' }, { css: '.b { color: blue; }', source: 'src/B.ts:1' }],
      { file: 'typestyles.css' },
    );

    const parsed = JSON.parse(map);
    expect(parsed.sources).toEqual(['src/B.ts']);
  });

  it('ignores malformed source strings', () => {
    const { map } = buildCssSourceMap([{ css: '.a { color: red; }', source: 'no-colon-here' }], {
      file: 'typestyles.css',
    });

    const parsed = JSON.parse(map);
    expect(parsed.sources).toEqual([]);
  });
});
