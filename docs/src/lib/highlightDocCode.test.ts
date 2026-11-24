import { describe, expect, it } from 'vite-plus/test';
import { highlightDocCode } from './highlightDocCode';
import { markdownCodeBlockHtml } from './markdownCodeBlockHtml';

const samples: Array<[string, string]> = [
  ['ts', 'const a: number = 1; // note\nexport function f() { return "x"; }'],
  ['tsx', 'const el = <div className="a">{x}</div>;'],
  ['css', '.a { color: red; } /* c */'],
  ['bash', 'pnpm add typestyles # install\necho "hi"'],
  ['html', '<div class="a">hi</div>'],
];

describe('highlightDocCode', () => {
  it.each(samples)('colours %s with the design-token theme', (lang, code) => {
    const { highlighted, safeLang } = highlightDocCode(code, lang);
    expect(highlighted).toContain('var(--var-ui-color-code-');
    expect(safeLang).toBe(lang);
    // Highlighting only wraps text: stripping the tags gives the source back.
    expect(decode(highlighted.replace(/<[^>]+>/g, ''))).toBe(code);
  });

  it('escapes markup in the input', () => {
    const { highlighted } = highlightDocCode('<script>alert(1)</script>', 'html');
    expect(highlighted).not.toContain('<script>');
    expect(highlighted).toContain('&lt;');
  });

  it('escapes unknown languages and plain text without throwing', () => {
    const unknown = highlightDocCode('a < b && c', 'not-a-language');
    expect(unknown.safeLang).toBe('plaintext');
    expect(unknown.highlighted).toBe('a &lt; b &amp;&amp; c');
    expect(highlightDocCode('x', undefined).safeLang).toBe('plaintext');
    expect(highlightDocCode('', 'ts').highlighted).toBe('');
  });

  it('keeps a trailing newline (marked passes fenced code with one)', () => {
    expect(highlightDocCode('let a = 1;\n', 'ts').highlighted.endsWith('\n')).toBe(true);
  });
});

describe('markdownCodeBlockHtml', () => {
  it('emits the kit code block structure with the docs copy hooks', () => {
    const html = markdownCodeBlockHtml('ts', '<span>x</span>');
    expect(html).toContain('data-codeblock');
    expect(html).toContain('data-codeblock-copy');
    expect(html).toContain('<span>x</span>');
    expect(html).toMatch(/class="[^"]*var-ui-code-block/);
    expect(html).toContain('>TS<');
  });
});

function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}
