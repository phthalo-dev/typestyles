import { describe, expect, it } from 'vite-plus/test';
import { expandInstallTabGroups } from './expandInstallTabGroups';

const source = `Before

<!-- doc-install-tabs -->

\`\`\`bash
pnpm add typestyles @typestyles/vite
\`\`\`

\`\`\`bash
npm install typestyles @typestyles/vite
\`\`\`

\`\`\`bash
yarn add typestyles @typestyles/vite
\`\`\`

<!-- /doc-install-tabs -->

After`;

function panelText(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(
    /<pre[^>]*role="tabpanel"[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
  )) {
    out.push(
      m[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>'),
    );
  }
  return out;
}

describe('expandInstallTabGroups', () => {
  const html = expandInstallTabGroups(source);

  it('renders pnpm, npm, yarn and bun tabs with source commands unchanged', () => {
    const tabs = [...html.matchAll(/data-package-manager="([a-z]+)"/g)].map((m) => m[1]);
    expect(tabs).toEqual(['pnpm', 'npm', 'yarn', 'bun']);
    expect(panelText(html)).toEqual([
      'pnpm add typestyles @typestyles/vite',
      'npm install typestyles @typestyles/vite',
      'yarn add typestyles @typestyles/vite',
      'bun add typestyles @typestyles/vite',
    ]);
  });

  it('uses the kit code block structure (tabs in the header, one copy button)', () => {
    expect(html).toMatch(/class="[^"]*var-ui-code-block/);
    expect(html).toContain('data-package-install');
    expect(html).toContain('role="tablist"');
    expect(html.match(/data-codeblock-copy(?!-)/g)).toHaveLength(1);
    expect(html).not.toContain('class="doc-install-tabs');
    // First panel visible, the rest hidden; roving tabindex.
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/ hidden>/g) ?? html.match(/ hidden/g)).toHaveLength(3);
  });

  it('maps -D to bun -d and leaves unknown first commands without a bun tab', () => {
    const dev = expandInstallTabGroups(
      source.replace(/typestyles @typestyles\/vite/g, '-D style-dictionary'),
    );
    expect(panelText(dev)[3]).toBe('bun add -d style-dictionary');
    const odd = expandInstallTabGroups(
      '<!-- doc-install-tabs -->\n\n```bash\nmake install\n```\n\n<!-- /doc-install-tabs -->',
    );
    expect(odd).not.toContain('data-package-manager="bun"');
  });

  it('numbers groups per call, so ids do not depend on render order', () => {
    const twice = `${source}\n\n${source}`;
    const first = expandInstallTabGroups(twice);
    expect(first).toContain('id="doc-install-tabs-0-tab-0"');
    expect(first).toContain('id="doc-install-tabs-1-tab-0"');
    expect(expandInstallTabGroups(twice)).toBe(first);
  });
});
