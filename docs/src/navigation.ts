// Documentation navigation configuration
// This defines the structure and organization of the documentation

export type DocNavItem = {
  slug?: string;
  title: string;
  href?: string;
};

export type DocNavCategory = {
  title: string;
  slug: string;
  items: DocNavItem[];
};

export const docNavigation: { categories: DocNavCategory[] } = {
  categories: [
    {
      title: 'Getting Started',
      slug: 'getting-started',
      items: [
        { slug: 'getting-started', title: 'Getting Started' },
        { href: '/playground', title: 'Playground' },
        { slug: 'zero-runtime', title: 'Zero-runtime extraction' },
        { slug: 'vite-plugin', title: 'Vite Plugin' },
        { slug: 'framework-comparison', title: 'Framework comparison' },
        { slug: 'api-reference', title: 'API Reference' },
        { slug: 'ai-tools', title: 'Use with AI tools' },
        { href: '/docs/changelog', title: 'Changelog' },
      ],
    },
    {
      title: 'Core Concepts',
      slug: 'core-concepts',
      items: [
        { slug: 'styles', title: 'Styles' },
        { slug: 'components', title: 'Components' },
        { slug: 'schema-recipes', title: 'Schema-first recipes' },
        { slug: 'compose', title: 'Style Composition' },
        { slug: 'dynamic-styles', title: 'Dynamic styling' },
        { slug: 'atomic-css', title: 'Atomic CSS Utilities' },
        { slug: 'tokens', title: 'Tokens' },
        { slug: 'css-primitives', title: 'CSS primitives' },
        { slug: 'open-props', title: 'Open Props' },
        { slug: 'fonts', title: 'Fonts' },
        { slug: 'keyframes', title: 'Keyframes' },
        { slug: 'color', title: 'Color Helpers' },
      ],
    },
    {
      title: 'Advanced Features',
      slug: 'advanced-features',
      items: [
        { slug: 'ssr', title: 'Server-Side Rendering' },
        { slug: 'class-naming', title: 'Class naming' },
        { slug: 'cascade-layers', title: 'Cascade layers (@layer)' },
        { slug: 'custom-at-rules', title: 'Custom Selectors & At-Rules' },
        { slug: 'theming-end-to-end', title: 'End-to-end theming' },
        { slug: 'theming-patterns', title: 'Theming Patterns' },
      ],
    },
    {
      title: 'Guides',
      slug: 'guides',
      items: [
        { slug: 'migration', title: 'Migration Guide' },
        { slug: 'style-dictionary', title: 'Style Dictionary & W3C tokens' },
        { slug: 'publishing-packages', title: 'Publishing Packages' },
        { slug: 'best-practices', title: 'Best Practices' },
        { slug: 'testing', title: 'Testing' },
        { slug: 'testing-design-systems', title: 'Testing Design Systems' },
        { slug: 'performance', title: 'Performance' },
        { slug: 'benchmarks', title: 'Benchmarks' },
        { slug: 'typescript-tips', title: 'TypeScript Tips' },
        { slug: 'troubleshooting', title: 'Troubleshooting' },
      ],
    },
    {
      title: 'Examples',
      slug: 'examples',
      items: [
        { slug: 'react-integration', title: 'React Integration' },
        { slug: 'attribute-mode-react', title: 'Attribute mode (React & Astro)' },
        { slug: 'component-library', title: 'Component Library' },
        { slug: 'design-system', title: 'Design System' },
        { slug: 'animation-patterns', title: 'Animation Patterns' },
      ],
    },
  ],
};

// Helper to find a category by slug
export function getCategory(slug: string) {
  return docNavigation.categories.find((cat) => cat.slug === slug);
}

// Helper to find a doc by slug
export function findDoc(slug: string) {
  for (const category of docNavigation.categories) {
    const doc = category.items.find((item) => item.slug === slug);
    if (doc) {
      return { ...doc, category };
    }
  }
  return null;
}

// Helper to get next/previous docs for pagination
export function getDocNeighbors(slug: string) {
  const allDocs = docNavigation.categories
    .flatMap((cat) => cat.items)
    .filter((item): item is Required<Pick<DocNavItem, 'slug' | 'title'>> => Boolean(item.slug));
  const index = allDocs.findIndex((doc) => doc.slug === slug);

  return {
    prev: index > 0 ? allDocs[index - 1] : null,
    next: index < allDocs.length - 1 ? allDocs[index + 1] : null,
  };
}
