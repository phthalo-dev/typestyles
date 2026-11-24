/**
 * Maps the site's own navigation (`src/navigation.ts`) and search index onto the shapes the
 * `@var-ui/docs` shell takes (`DocsPage` `sidebarSections` / `topNav` / `searchItems`).
 * `src/navigation.ts` stays the single source of order and titles.
 */
import type { DocsSearchItem, SidebarSection, TopNavItem } from '@var-ui/docs/utils';
import type { docNavigation } from '../navigation';
import type { SearchIndexItem } from './searchIndex';

export const githubUrl = 'https://github.com/phthalo-dev/typestyles';

export function toKitSidebarSections(nav: typeof docNavigation): SidebarSection[] {
  return nav.categories.map((category) => ({
    title: category.title,
    items: category.items.map((item) => ({
      text: item.title,
      link: item.slug ? `/docs/${item.slug}` : (item.href ?? ''),
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

/** Command-palette rows from the `search-index.json` data (body text is not shipped per page). */
export function toKitSearchItems(index: readonly SearchIndexItem[]): DocsSearchItem[] {
  return index.map((entry) => ({
    id: entry.slug,
    title: entry.title,
    ...(entry.description ? { meta: entry.description } : {}),
    keywords: [entry.categoryTitle],
    ...(entry.headings.length ? { headings: entry.headings } : {}),
    group: entry.categoryTitle,
    icon: 'page',
  }));
}
