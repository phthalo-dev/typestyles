import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { proseContent } from '@examples/design-system';
import { docNavigation } from '../navigation';
import { highlightDocCode } from './highlightDocCode';
import { markdownCodeBlockHtml } from './markdownCodeBlockHtml';
import { prepareDocMarkdown } from './expandInstallTabGroups';

export type DocHeading = {
  depth: number;
  id: string;
  text: string;
};

export type DocMeta = {
  slug: string;
  title: string;
  description?: string;
  /** Source file mtime at build time — for “last updated” display. */
  lastModified?: string;
};

export type DocEntry = DocMeta & {
  content: string;
  html: string;
};

const docsDir = new URL('../../content/docs', import.meta.url);

const marked = new Marked(
  markedHighlight({
    langPrefix: 'language-',
    highlight(code, lang) {
      return highlightDocCode(code, lang).highlighted;
    },
  }),
);

function wrapCodeBlocks(html: string): string {
  // Marked emits <pre><code class="language-xyz">…</code></pre> for fenced blocks.
  // We wrap that structure so the docs site can share framework-agnostic code block styles.
  return html.replace(
    /<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/g,
    (_match, lang: string, highlighted: string) => {
      const safeLang = (lang || 'text').toLowerCase();
      return markdownCodeBlockHtml(safeLang, highlighted);
    },
  );
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

/** H2–H6 headings with `id` (matches pipeline after `withHeadingAnchors`). */
export function extractDocHeadings(html: string): DocHeading[] {
  const headings: DocHeading[] = [];
  const re = /<h([2-6])\s+[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const depth = Number.parseInt(m[1], 10);
    const id = m[2];
    const inner = m[3];
    const text = stripHtmlTags(inner).replace(/\s+/g, ' ').trim();
    if (text) headings.push({ depth, id, text });
  }
  return headings;
}

function slugifyHeading(text: string): string {
  const s = stripHtmlTags(text)
    .toLowerCase()
    .replace(/[^\w\u00C0-\u024f]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'section';
}

/** Permalink control for h1–h6; pairs with `proseContent` heading anchor styles. */
function withHeadingAnchors(html: string): string {
  const slugCounts = new Map<string, number>();
  const anchorClass = proseContent.headingAnchor;

  return html.replace(
    /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_full, level: string, attrs: string, inner: string) => {
      if (inner.includes('data-prose-heading-anchor')) {
        return `<h${level}${attrs}>${inner}</h${level}>`;
      }
      const idExisting = /\sid\s*=\s*["']([^"']+)["']/.exec(attrs);
      let id = idExisting?.[1];
      let openAttrs = attrs;
      if (!id) {
        const base = slugifyHeading(inner);
        id = base;
        const n = slugCounts.get(base) ?? 0;
        slugCounts.set(base, n + 1);
        if (n > 0) id = `${base}-${n + 1}`;
        openAttrs = attrs.trim() ? `${attrs} id="${id}"` : ` id="${id}"`;
      }
      const anchor = `<a href="#${id}" class="${anchorClass}" data-prose-heading-anchor="true" aria-label="Link to this heading"></a>`;
      return `<h${level}${openAttrs}>${inner}${anchor}</h${level}>`;
    },
  );
}

/** Markdown body (no frontmatter) through the same pipeline as documentation pages. */
export function renderDocBodyToHtml(markdown: string): string {
  return withHeadingAnchors(wrapCodeBlocks(marked.parse(prepareDocMarkdown(markdown)) as string));
}

function parseFrontmatter(markdown: string): { data: Record<string, string>; body: string } {
  if (!markdown.startsWith('---\n')) {
    return { data: {}, body: markdown };
  }

  const end = markdown.indexOf('\n---\n', 4);
  if (end === -1) {
    return { data: {}, body: markdown };
  }

  const raw = markdown.slice(4, end);
  const body = markdown.slice(end + 5);
  const data: Record<string, string> = {};

  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (key) data[key] = value;
  }

  return { data, body };
}

async function listMarkdownFiles(dirPath: URL, acc: string[] = []): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath.pathname, entry.name);
    if (entry.isDirectory()) {
      await listMarkdownFiles(new URL(`${entry.name}/`, dirPath), acc);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function slugFromAbsolutePath(filePath: string): string {
  return relative(docsDir.pathname, filePath).replace(/\\/g, '/').replace(/\.md$/, '');
}

async function loadDocByPath(filePath: string): Promise<DocEntry> {
  const markdown = await readFile(filePath, 'utf8');
  const { data, body } = parseFrontmatter(markdown);
  const slug = slugFromAbsolutePath(filePath);
  const html = withHeadingAnchors(wrapCodeBlocks(marked.parse(prepareDocMarkdown(body)) as string));
  let lastModified: string | undefined;
  try {
    const st = await stat(filePath);
    lastModified = st.mtime.toISOString();
  } catch {
    /* ignore */
  }

  return {
    slug,
    title: data.title ?? slug,
    description: data.description,
    lastModified,
    content: body,
    html,
  };
}

export async function getAllDocs(): Promise<DocEntry[]> {
  const files = await listMarkdownFiles(docsDir);
  const docs = await Promise.all(files.map((filePath) => loadDocByPath(filePath)));
  return docs.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getDocBySlug(slug: string): Promise<DocEntry | null> {
  const path = join(docsDir.pathname, `${slug}.md`);
  try {
    return await loadDocByPath(path);
  } catch {
    return null;
  }
}

export function getDocNeighbors(slug: string): { prev: DocMeta | null; next: DocMeta | null } {
  const allDocs = docNavigation.categories
    .flatMap((cat) => cat.items)
    .filter((item): item is { slug: string; title: string } => Boolean(item.slug));
  const index = allDocs.findIndex((doc) => doc.slug === slug);

  const toMeta = (item: (typeof allDocs)[number] | undefined): DocMeta | null =>
    item ? { slug: item.slug, title: item.title } : null;

  return {
    prev: toMeta(index > 0 ? allDocs[index - 1] : undefined),
    next: toMeta(index >= 0 && index < allDocs.length - 1 ? allDocs[index + 1] : undefined),
  };
}
