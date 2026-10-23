/** Base URL for “edit this page” links (markdown under `docs/content/docs/`). */
export const DOCS_GITHUB_EDIT_BASE =
  'https://github.com/phthalo-dev/typestyles/edit/main/docs/content/docs';

/** Base for repository files outside `docs/content/docs/` (e.g. package changelogs). */
export const REPO_GITHUB_EDIT_BASE = 'https://github.com/phthalo-dev/typestyles/edit/main';

export function editUrlForDocSlug(slug: string): string {
  return `${DOCS_GITHUB_EDIT_BASE}/${slug}.md`;
}

export function editUrlForChangelogPath(scope: 'packages' | 'examples', name: string): string {
  return `${REPO_GITHUB_EDIT_BASE}/${scope}/${name}/CHANGELOG.md`;
}
