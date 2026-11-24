/**
 * `localStorage` key for the chosen package manager in install tabs. Same key as the kit's
 * `PackageInstall` (`@var-ui/docs`), so the choice is shared with kit-rendered install blocks.
 * Read by the pre-paint inline script in `KitDocsLayout.astro` and by `scripts/docInstallTabs.ts`.
 */
export const PACKAGE_MANAGER_STORAGE_KEY = 'var-docs-package-manager';
