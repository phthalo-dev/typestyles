/**
 * TODO(var-ui#337): replace with a kit markup helper and an exported initPackageInstall.
 *
 * Install tabs from `expandInstallTabGroups` (kit `PackageInstall` structure). Delegated so View
 * Transitions keep working. Behaviour mirrors the kit's `initPackageInstall`: the chosen manager is
 * shared by every install block and remembered across visits (same storage key), and the tablist
 * is keyboard operable (arrows, Home, End; automatic activation).
 */
import { PACKAGE_MANAGER_STORAGE_KEY as STORAGE_KEY } from '../lib/packageManagerStorage';

let delegated = false;

function readPreferred(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writePreferred(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage can be unavailable (private mode); the choice just isn't remembered.
  }
}

function select(root: HTMLElement, id: string): void {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  if (!tabs.some((tab) => tab.dataset.packageManager === id)) return;
  for (const tab of tabs) {
    const selected = tab.dataset.packageManager === id;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
    if (panel) panel.hidden = !selected;
  }
}

function selectEverywhere(id: string): void {
  document
    .querySelectorAll<HTMLElement>('[data-package-install]')
    .forEach((root) => select(root, id));
}

function applyPreferred(): void {
  const preferred = readPreferred();
  if (preferred) selectEverywhere(preferred);
}

export function attachDocInstallTabs(): void {
  if (typeof document === 'undefined') return;
  // The stored preference is applied on every page load (View Transitions swap new blocks in).
  applyPreferred();
  document.addEventListener('astro:page-load', applyPreferred);
  if (delegated) return;
  delegated = true;

  document.addEventListener('click', (e) => {
    const tab = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '[data-package-install] [role="tab"]',
    );
    const id = tab?.dataset.packageManager;
    if (!tab || !id) return;
    writePreferred(id);
    selectEverywhere(id);
  });

  document.addEventListener('keydown', (e) => {
    const tab = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '[data-package-install] [role="tab"]',
    );
    if (!tab) return;
    const tabs = Array.from(
      tab.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    const index = tabs.indexOf(tab);
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  });
}
