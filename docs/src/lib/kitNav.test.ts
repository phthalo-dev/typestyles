import { describe, expect, it } from 'vite-plus/test';
import { docNavigation } from '../navigation';
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
          body: 'long text',
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
