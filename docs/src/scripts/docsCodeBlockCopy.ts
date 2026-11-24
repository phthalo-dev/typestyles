import { svg as checkSvg } from '@var-ui/icons/glyphs/check';
import { svg as copySvg } from '@var-ui/icons/glyphs/copy';
import { svg as errorSvg } from '@var-ui/icons/glyphs/error';

const COPIED_MS = 1200;

type CopyState = 'idle' | 'copied' | 'error';

const ICONS: Record<CopyState, string> = { idle: copySvg, copied: checkSvg, error: errorSvg };
const ICON_LABELS: Record<CopyState, string> = {
  idle: 'Copy code',
  copied: 'Copied',
  error: 'Copy failed',
};

/** Kit `codeBlockMarkup` button (icon + feedback). Mirrors `@var-ui/astro`'s `codeBlockCopy` states. */
function setIconState(button: HTMLButtonElement, icon: Element, state: CopyState): void {
  button.toggleAttribute('data-copied', state === 'copied');
  button.toggleAttribute('data-error', state === 'error');
  button.setAttribute('aria-label', ICON_LABELS[state]);
  icon.innerHTML = ICONS[state];
  const feedback = button.parentElement?.querySelector('[data-var-ui-codeblock-feedback]');
  if (feedback) {
    feedback.textContent = state === 'idle' ? '' : ICON_LABELS[state];
    if (state === 'idle') feedback.removeAttribute('data-tone');
    else feedback.setAttribute('data-tone', state === 'copied' ? 'success' : 'error');
  }
}

function setupCopyButton(button: HTMLButtonElement): void {
  const root = button.closest('[data-codeblock]');
  if (!root) return;
  const codeEl = root.querySelector('pre code');
  if (!codeEl) return;

  const icon = button.querySelector('[data-codeblock-copy-icon]');
  if (icon) {
    const text = codeEl.textContent ?? '';
    const done = (state: CopyState) => {
      setIconState(button, icon, state);
      window.setTimeout(() => setIconState(button, icon, 'idle'), COPIED_MS);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => done('copied'),
        () => done('error'),
      );
    } else {
      done('error');
    }
    return;
  }

  const idleLabel = button.dataset.copyLabel ?? 'Copy code';
  const copiedLabel = button.dataset.copiedLabel ?? 'Copied';

  const reset = () => {
    button.disabled = false;
    button.textContent = 'Copy';
    button.setAttribute('aria-label', idleLabel);
    delete button.dataset.copied;
    delete button.dataset.error;
  };

  if (navigator.clipboard?.writeText) {
    const text = codeEl.textContent ?? '';
    navigator.clipboard.writeText(text).then(
      () => {
        button.textContent = copiedLabel;
        button.disabled = true;
        button.setAttribute('aria-label', copiedLabel);
        button.dataset.copied = 'true';
        delete button.dataset.error;
        window.setTimeout(reset, COPIED_MS);
      },
      () => {
        button.textContent = 'Error';
        button.disabled = true;
        button.setAttribute('aria-label', 'Copy failed');
        button.dataset.error = 'true';
        window.setTimeout(reset, COPIED_MS);
      },
    );
  } else {
    button.textContent = 'Error';
    button.disabled = true;
    button.setAttribute('aria-label', 'Copy failed');
    button.dataset.error = 'true';
    window.setTimeout(reset, COPIED_MS);
  }
}

let delegated = false;

/** Copy buttons work after View Transition swaps (delegated click). */
export function attachDocsCodeBlockCopyListeners(): void {
  if (delegated || typeof document === 'undefined') return;
  delegated = true;
  document.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '[data-codeblock-copy]',
    );
    if (!button) return;
    setupCopyButton(button);
  });
}
