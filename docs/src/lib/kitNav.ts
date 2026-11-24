/**
 * Maps the site's own navigation (`src/navigation.ts`) and search index onto the shapes the
 * `@var-ui/docs` shell takes (`DocsPage` `sidebarSections` / `topNav` / `searchItems`).
 * `src/navigation.ts` stays the single source of order and titles.
 */
import type { DocsSearchItem, SidebarSection, TopNavItem } from '@var-ui/docs/utils';
import type { DocNavItem, docNavigation } from '../navigation';
import type { SearchIndexItem } from './searchIndex';

export const githubUrl = 'https://github.com/phthalo-dev/typestyles';

function itemLink(item: DocNavItem): string {
  if (item.slug) return `/docs/${item.slug}`;
  if (item.href) return item.href;
  throw new Error(`navigation item "${item.title}" has neither slug nor href`);
}

export function toKitSidebarSections(nav: typeof docNavigation): SidebarSection[] {
  return nav.categories.map((category) => ({
    title: category.title,
    items: category.items.map((item) => ({
      text: item.title,
      link: itemLink(item),
    })),
  }));
}

/**
 * Header links. The kit selects every item whose `match` prefixes the path, so Docs is also
 * selected on changelog pages; GitHub's match is its own URL, which no site path starts with.
 */
export function toKitTopNav(): TopNavItem[] {
  return [
    { text: 'Docs', link: '/docs', match: '/docs' },
    { text: 'Playground', link: '/playground', match: '/playground' },
    { text: 'Changelog', link: '/docs/changelog', match: '/docs/changelog' },
    { text: 'GitHub', link: githubUrl, match: githubUrl },
  ];
}

/** Words of a page body, lower-cased; keeps identifiers like `getRegisteredCss` or `font-face` whole. */
function bodyWords(body: string): Set<string> {
  return new Set(body.toLowerCase().match(/[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*/g) ?? []);
}

/** Shorter words are mostly stop words; they add size, not recall. */
const MIN_BODY_WORD_LENGTH = 4;
/** Words found in more than this share of pages do not tell pages apart. */
const MAX_BODY_WORD_PAGE_SHARE = 0.5;
/** Longer tokens are generated identifiers or encoded data, not search terms. */
const MAX_BODY_WORD_LENGTH = 24;
/**
 * Body terms kept per page, rarest first. Every page inlines every page's terms (the kit has no
 * lazy index), so this bounds the per-page HTML cost.
 */
export const MAX_BODY_TERMS_PER_PAGE = 40;

function isSearchTerm(word: string): boolean {
  return (
    word.length >= MIN_BODY_WORD_LENGTH &&
    word.length <= MAX_BODY_WORD_LENGTH &&
    // hashes, base64 and hex-ish junk
    (word.match(/[0-9]/g)?.length ?? 0) < 3
  );
}

/**
 * Command-palette rows from the `search-index.json` data. The kit palette searches `title`,
 * `meta`, `keywords` and `headings` only (no body field, TODO(var-ui#334)), so
 * each page's distinctive body words go into `keywords` after its category: its rarest words
 * (capped per page) still find the page. Multi-word phrases match only within title, description
 * or headings.
 */
export function toKitSearchItems(index: readonly SearchIndexItem[]): DocsSearchItem[] {
  const words = index.map((entry) => bodyWords(entry.body));
  const pageCount = new Map<string, number>();
  for (const set of words)
    for (const word of set) pageCount.set(word, (pageCount.get(word) ?? 0) + 1);
  const maxPages = Math.max(1, Math.floor(index.length * MAX_BODY_WORD_PAGE_SHARE));

  return index.map((entry, i) => {
    const own = [entry.title, entry.description ?? '', ...entry.headings].join(' ').toLowerCase();
    const bodyTerms = [...words[i]]
      .filter(
        (word) =>
          isSearchTerm(word) && (pageCount.get(word) ?? 0) <= maxPages && !own.includes(word),
      )
      // Rarest first (stable: ties keep first-occurrence order), then cap.
      .sort((a, b) => (pageCount.get(a) ?? 0) - (pageCount.get(b) ?? 0))
      .slice(0, MAX_BODY_TERMS_PER_PAGE);
    return {
      id: entry.slug,
      title: entry.title,
      ...(entry.description ? { meta: entry.description } : {}),
      keywords: [entry.categoryTitle, ...bodyTerms],
      ...(entry.headings.length ? { headings: entry.headings } : {}),
      group: entry.categoryTitle,
      icon: 'page',
    };
  });
}
