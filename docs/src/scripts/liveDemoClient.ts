import { SEGMENTED_CONTROL_CHANGE_EVENT } from '@var-ui/astro';

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

function activateVariant(root: HTMLElement, variantId: string, rehighlight = true): void {
  const state = demoState.get(root);
  if (!state) return;

  const variant =
    state.bootstrap.variants.find((v) => v.id === variantId) ?? state.bootstrap.variants[0];
  if (!variant) return;

  const { previewKind } = state;

  const preview = root.querySelector<HTMLElement>('[data-live-demo-preview]');
  if (preview) {
    const base = preview.dataset.liveDemoPreviewBase?.trim() ?? '';
    preview.className = [base, variant.className].filter(Boolean).join(' ');
  }

  const themeWrap = root.querySelector<HTMLElement>('[data-live-demo-theme-wrap]');
  if (themeWrap) {
    themeWrap.className = variant.themeClass ?? '';
  }

  // The server already rendered the default variant's panels, highlighted.
  if (!rehighlight) return;

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
    // Kit `SegmentedControl` (native radios): arrows move and check, the change event carries the id.
    // Warm the lazy highlighter when the reader reaches for a demo, so the first switch is not laggy.
    const preload = () => void import('./highlightLiveCode').catch(() => {});
    root.addEventListener('pointerenter', preload, { once: true });
    root.addEventListener('focusin', preload, { once: true });
    root.addEventListener(SEGMENTED_CONTROL_CHANGE_EVENT, (event) => {
      const id = (event as CustomEvent<{ id: string | null }>).detail?.id;
      if (id) activateVariant(root, id);
    });
  } else {
    // Re-read bootstrap after View Transitions swap in new JSON payload.
    const latest = readBootstrap(root);
    if (latest?.variants.length) {
      demoState.set(root, { bootstrap: latest, previewKind });
    }
  }

  activateVariant(root, bootstrap.variants[0].id, false);
}

export function initLiveDemos(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-live-demo]')) {
    bindLiveDemo(root);
  }
}
