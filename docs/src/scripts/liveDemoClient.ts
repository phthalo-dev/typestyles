export type LiveDemoVariantPayload = {
  id: string;
  label: string;
  className: string;
  themeClass?: string;
  css: string;
  usageCode?: string;
  usageLang?: string;
};

export type LiveDemoBootstrap = {
  variants: LiveDemoVariantPayload[];
};

type LiveDemoState = {
  bootstrap: LiveDemoBootstrap;
  previewKind: string;
};

const demoState = new WeakMap<HTMLElement, LiveDemoState>();

function readBootstrap(root: HTMLElement): LiveDemoBootstrap | null {
  const jsonEl = root.querySelector('[data-live-demo-data]');
  if (!jsonEl?.textContent?.trim()) return null;
  try {
    return JSON.parse(jsonEl.textContent) as LiveDemoBootstrap;
  } catch {
    return null;
  }
}

function formatDomClasses(variant: LiveDemoVariantPayload, previewKind: string): string {
  if (previewKind === 'themed-card') {
    if (variant.themeClass) {
      return `<div class="${variant.themeClass}">\n  <div class="${variant.className}">…</div>\n</div>`;
    }
    return `<div class="${variant.className}">…</div>`;
  }
  return `class="${variant.className}"`;
}

function setPanelHighlight(
  container: Element | null,
  code: string | undefined,
  lang: string,
): void {
  if (!container || !code) return;
  const plain = () => {
    const codeEl = container.querySelector('code');
    if (codeEl) codeEl.textContent = code;
  };
  // The highlighter (Shiki grammars, ~130 KB gzip) loads on the first variant switch, not with the page.
  import('./highlightLiveCode').then(({ applyLiveCodeHighlight }) => {
    try {
      applyLiveCodeHighlight(container, code, lang);
    } catch {
      plain();
    }
  }, plain);
}

function activateVariant(root: HTMLElement, variantId: string): void {
  const state = demoState.get(root);
  if (!state) return;

  const variant =
    state.bootstrap.variants.find((v) => v.id === variantId) ?? state.bootstrap.variants[0];
  if (!variant) return;

  const { previewKind } = state;

  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-live-demo-variant]')) {
    btn.dataset.active = btn.dataset.liveDemoVariant === variant.id ? 'true' : 'false';
  }

  const preview = root.querySelector<HTMLElement>('[data-live-demo-preview]');
  if (preview) {
    const base = preview.dataset.liveDemoPreviewBase?.trim() ?? '';
    preview.className = [base, variant.className].filter(Boolean).join(' ');
  }

  const themeWrap = root.querySelector<HTMLElement>('[data-live-demo-theme-wrap]');
  if (themeWrap) {
    themeWrap.className = variant.themeClass ?? '';
  }

  setPanelHighlight(
    root.querySelector('[data-live-demo-dom]'),
    formatDomClasses(variant, previewKind),
    'xml',
  );
  setPanelHighlight(root.querySelector('[data-live-demo-css]'), variant.css, 'css');

  if (variant.usageCode) {
    setPanelHighlight(
      root.querySelector('[data-live-demo-usage]'),
      variant.usageCode,
      variant.usageLang ?? 'tsx',
    );
  }
}

export function bindLiveDemo(root: HTMLElement): void {
  const bootstrap = readBootstrap(root);
  if (!bootstrap?.variants.length) return;

  const previewKind = root.dataset.liveDemoPreview ?? 'button';
  demoState.set(root, { bootstrap, previewKind });

  if (root.dataset.liveDemoBound !== 'true') {
    root.dataset.liveDemoBound = 'true';
    root.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
        '[data-live-demo-variant]',
      );
      if (!target || !root.contains(target)) return;
      const variantId = target.dataset.liveDemoVariant;
      if (variantId) activateVariant(root, variantId);
    });
  } else {
    // Re-read bootstrap after View Transitions swap in new JSON payload.
    const latest = readBootstrap(root);
    if (latest?.variants.length) {
      demoState.set(root, { bootstrap: latest, previewKind });
    }
  }

  activateVariant(root, bootstrap.variants[0].id);
}

export function initLiveDemos(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-live-demo]')) {
    bindLiveDemo(root);
  }
}
