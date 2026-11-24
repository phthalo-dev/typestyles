import { describe, expect, it } from 'vite-plus/test';
import { docNavigation } from '../navigation';
import { matchCommandItem } from '@var-ui/core/shared/commandSearch';
import { toKitSearchItems, toKitSidebarSections, toKitTopNav } from './kitNav';

describe('toKitSidebarSections', () => {
  const sections = toKitSidebarSections(docNavigation);
  const items = docNavigation.categories.flatMap((category) => category.items);
  const kitItems = sections.flatMap((section) => section.items);

  it('keeps category order and count', () => {
    expect(sections.map((section) => section.title)).toEqual(
      docNavigation.categories.map((category) => category.title),
    );
  });

  it('drops no item', () => {
    expect(kitItems).toHaveLength(items.length);
    sections.forEach((section, i) => {
      expect(section.items).toHaveLength(docNavigation.categories[i].items.length);
    });
  });

  it('maps slug items to /docs/<slug> with the nav title', () => {
    items.forEach((item, i) => {
      if (!item.slug) return;
      expect(kitItems[i]).toEqual({ text: item.title, link: `/docs/${item.slug}` });
    });
  });

  it('keeps the href of href-only items', () => {
    const hrefOnly = items.filter((item) => !item.slug && item.href);
    expect(hrefOnly.map((item) => item.href)).toEqual(['/playground', '/docs/changelog']);
    items.forEach((item, i) => {
      if (item.slug) return;
      expect(kitItems[i]).toEqual({ text: item.title, link: item.href });
    });
  });
});

describe('toKitTopNav', () => {
  it('lists Docs, Playground, Changelog and GitHub', () => {
    expect(toKitTopNav()).toEqual([
      { text: 'Docs', link: '/docs', match: '/docs' },
      { text: 'Playground', link: '/playground', match: '/playground' },
      { text: 'Changelog', link: '/docs/changelog', match: '/docs/changelog' },
      {
        text: 'GitHub',
        link: 'https://github.com/phthalo-dev/typestyles',
        match: 'https://github.com/phthalo-dev/typestyles',
      },
    ]);
  });
});

describe('toKitSearchItems', () => {
  it('maps search index rows to command-palette items', () => {
    expect(
      toKitSearchItems([
        {
          slug: '/docs/tokens',
          title: 'Tokens',
          categoryTitle: 'Core Concepts',
          description: 'Design tokens',
          headings: ['Create', 'Use'],
          body: 'Create and use tokens.',
        },
        {
          slug: '/docs/fonts',
          title: 'Fonts',
          categoryTitle: 'Core Concepts',
          headings: [],
          body: '',
        },
      ]),
    ).toEqual([
      {
        id: '/docs/tokens',
        title: 'Tokens',
        meta: 'Design tokens',
        keywords: ['Core Concepts'],
        headings: ['Create', 'Use'],
        group: 'Core Concepts',
        icon: 'page',
      },
      {
        id: '/docs/fonts',
        title: 'Fonts',
        keywords: ['Core Concepts'],
        group: 'Core Concepts',
        icon: 'page',
      },
    ]);
  });
});

describe('toKitSearchItems body search', () => {
  const row = (slug: string, body: string, title = slug) => ({
    slug: `/docs/${slug}`,
    title,
    categoryTitle: 'Guides',
    headings: ['Setup'],
    body,
  });
  const items = toKitSearchItems([
    row('ssr', 'Collect styles with getRegisteredCss during hydration of the setup.'),
    row('fonts', 'Load fonts with fontFace and preload them; styles stay readable.'),
    row('keyframes', 'Animate with keyframes; styles again.'),
  ]);
  const find = (query: string) =>
    items.filter((item) => matchCommandItem(item, query)).map((item) => item.id);

  it('finds a page by a word that only appears in its body', () => {
    expect(find('hydration')).toEqual(['/docs/ssr']);
    expect(find('getregisteredcss')).toEqual(['/docs/ssr']);
    expect(find('preload')).toEqual(['/docs/fonts']);
  });

  it('skips short words, words in most pages and words already in title or headings', () => {
    const ssr = items[0].keywords ?? [];
    expect(ssr).not.toContain('with'); // in every page
    expect(ssr).not.toContain('styles'); // in every page
    expect(ssr).not.toContain('the'); // short
    expect(ssr).not.toContain('setup'); // a heading
    expect(ssr[0]).toBe('Guides');
  });
});

describe('toKitSidebarSections guards', () => {
  it('throws on an item with neither slug nor href', () => {
    expect(() =>
      toKitSidebarSections({
        categories: [{ title: 'X', slug: 'x', items: [{ title: 'Broken' }] }],
      }),
    ).toThrow(/Broken/);
  });
});
