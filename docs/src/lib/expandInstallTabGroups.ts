import { expandLiveDemos } from './expandLiveDemos';
import { highlightDocCode } from './highlightDocCode';
import { codeBlock } from '@var-ui/core';
import { svg as copySvg } from '@var-ui/icons/glyphs/copy';

/**
 * Replace `<!-- doc-install-tabs -->` … `<!-- /doc-install-tabs -->` regions (fenced bash blocks)
 * with a tabbed code-block group. Parsed before `marked.parse` so highlighted HTML matches normal
 * fenced blocks and copy buttons work unchanged.
 */
const REGION_RE = /<!--\s*doc-install-tabs\s*-->\s*([\s\S]*?)\s*<!--\s*\/doc-install-tabs\s*-->/g;

const FENCE_RE = /```(?:bash|sh)\s*\n([\s\S]*?)```/g;

const MANAGERS = ['pnpm', 'npm', 'yarn'];

function inferTabLabel(code: string): string {
  const first = code.trim().split(/\s+/)[0]?.toLowerCase();
  if (first && MANAGERS.includes(first)) return first;
  return 'shell';
}

/**
 * `pnpm add [-D] pkgs` -> `bun add [-d] pkgs` (the kit's `PackageInstall` ships a bun tab).
 * HTML only: the markdown, llms and MCP outputs never see this command. Returns `null` when
 * the first block is not a pnpm `add` command, so no invented command is shown.
 */
function bunCommandFrom(code: string): string | null {
  const m = /^pnpm add(\s+-D)?(\s+.+)$/s.exec(code.trim());
  if (!m) return null;
  return `bun add${m[1] ? ' -d' : ''}${m[2]}`;
}

type Slot = { className: string; attrs?: Record<string, string> };

function attrs(slot: Slot, extra: Record<string, string | boolean | undefined> = {}): string {
  const all: Record<string, string | boolean | undefined> = {
    class: slot.className,
    ...slot.attrs,
    ...extra,
  };
  return Object.entries(all)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true || v === '' ? k : `${k}="${escapeHtml(String(v))}"`))
    .join(' ');
}

/**
 * Tabbed install block in the structure of the kit's `PackageInstall` (`codeBlock` recipe slots:
 * tabs in the header, one copy button, one `pre` per manager). Switching, the shared preference
 * and arrow keys live in `scripts/docInstallTabs.ts`; copy in `scripts/docsCodeBlockCopy.ts`.
 */
function renderTabGroup(blocks: { label: string; html: string }[], index: number): string {
  const gid = `doc-install-tabs-${index}`;
  const cb = codeBlock({ variant: 'default' });
  const buttons = blocks
    .map(
      (b, i) =>
        `<button ${attrs(cb.tab, { type: 'button', role: 'tab', id: `${gid}-tab-${i}`, 'aria-controls': `${gid}-panel-${i}`, 'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1', 'data-package-manager': b.label })}>${escapeHtml(b.label)}</button>`,
    )
    .join('');

  const panels = blocks
    .map(
      (b, i) =>
        `<pre ${attrs(cb.pre, { 'data-codeblock-pre': '', role: 'tabpanel', id: `${gid}-panel-${i}`, 'aria-labelledby': `${gid}-tab-${i}`, hidden: i !== 0 })}><code ${attrs(cb.code)}>${b.html}</code></pre>`,
    )
    .join('');

  const copy = attrs(cb.copyButton, {
    type: 'button',
    'data-codeblock-copy': '',
    'aria-label': 'Copy command',
  });

  return [
    '',
    '',
    `<div ${attrs(cb.root, { 'data-codeblock': '', 'data-package-install': '' })}>`,
    `<div ${attrs(cb.header, { 'data-codeblock-header': '' })}>`,
    `<div ${attrs(cb.tabs, { role: 'tablist', 'aria-label': 'Package manager' })}>${buttons}</div>`,
    `<div ${attrs(cb.actions)}>`,
    `<button ${copy}><span data-codeblock-copy-icon>${copySvg}</span></button>`,
    `<span ${attrs(cb.feedback, { 'data-codeblock-feedback': '', role: 'status', 'aria-live': 'polite' })}></span>`,
    '</div>',
    '</div>',
    `<div ${attrs(cb.body, { 'data-codeblock-body': '' })}>${panels}</div>`,
    '</div>',
    '',
    '',
  ].join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Group ids (`doc-install-tabs-<n>`) count per call, so a page's HTML does not depend on how many
 * pages were rendered before it. Each doc body is one call, so ids stay unique within a page.
 */
export function expandInstallTabGroups(markdown: string): string {
  let groupIndex = 0;
  return markdown.replace(REGION_RE, (_full, inner: string) => {
    const codes: string[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(FENCE_RE.source, FENCE_RE.flags);
    while ((m = re.exec(inner)) !== null) {
      codes.push(m[1].trim());
    }
    if (codes.length === 0) {
      return _full;
    }
    const bun = bunCommandFrom(codes[0]);
    const commands =
      bun && !codes.some((c) => inferTabLabel(c) === 'bun') ? [...codes, bun] : codes;
    const blocks = commands.map((code) => ({
      label: code === bun ? 'bun' : inferTabLabel(code),
      html: highlightDocCode(code, 'bash').highlighted,
    }));
    return renderTabGroup(blocks, groupIndex++);
  });
}

export function prepareDocMarkdown(markdown: string): string {
  return expandLiveDemos(expandInstallTabGroups(markdown));
}
