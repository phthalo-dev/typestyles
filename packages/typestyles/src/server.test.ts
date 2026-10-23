import { describe, it, expect, beforeEach } from 'vite-plus/test';
import {
  collectStyles,
  injectStylesIntoHtml,
  streamingDocumentShell,
  typestylesStyleHtml,
  TYPESTYLES_STYLE_ID,
} from './server';
import { defaultClassNamingConfig } from './class-naming';
import { createComponent } from './component';
import { createTokens } from './tokens';
import { insertRule, reset } from './sheet';

describe('collectStyles', () => {
  beforeEach(() => {
    reset();
  });

  it('collects CSS from styles created during render', () => {
    const { html, css } = collectStyles(() => {
      createComponent(defaultClassNamingConfig, 'ssr-btn', {
        base: { color: 'red' },
      });
      return '<button class="ssr-btn">Click</button>';
    });

    expect(html).toBe('<button class="ssr-btn">Click</button>');
    expect(css).toContain('.ssr-btn');
    expect(css).toContain('color: red');
  });

  it('collects CSS from tokens created during render', () => {
    const { css } = collectStyles(() => {
      createTokens().create('ssr-color', { primary: '#0066ff' });
      return '';
    });

    expect(css).toContain('--ssr-color-primary');
    expect(css).toContain('#0066ff');
  });

  it('collects both tokens and styles', () => {
    const { css } = collectStyles(() => {
      const color = createTokens().create('ssr-theme', { bg: '#fff' });
      createComponent(defaultClassNamingConfig, 'ssr-card', {
        root: { backgroundColor: color.bg },
      });
      return '';
    });

    expect(css).toContain('--ssr-theme-bg');
    expect(css).toContain('.ssr-card--root');
  });

  it('supports async render functions', async () => {
    const { html, css } = await collectStyles(async () => {
      await Promise.resolve();
      createComponent(defaultClassNamingConfig, 'async-btn', {
        base: { color: 'green' },
      });
      return '<button>async</button>';
    });

    expect(html).toBe('<button>async</button>');
    expect(css).toContain('.async-btn');
    expect(css).toContain('color: green');
  });

  it('isolates concurrent async collectStyles on Node', async () => {
    const [a, b] = await Promise.all([
      collectStyles(async () => {
        await new Promise((resolve) => setTimeout(resolve, 15));
        insertRule('.iso-a', '.iso-a { color: red; }');
        return 'a';
      }),
      collectStyles(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        insertRule('.iso-b', '.iso-b { color: blue; }');
        return 'b';
      }),
    ]);

    expect(a.html).toBe('a');
    expect(a.css).toContain('.iso-a');
    expect(a.css).not.toContain('.iso-b');

    expect(b.html).toBe('b');
    expect(b.css).toContain('.iso-b');
    expect(b.css).not.toContain('.iso-a');
  });
});

describe('SSR helpers', () => {
  it('exports the stable style element id', () => {
    expect(TYPESTYLES_STYLE_ID).toBe('typestyles');
  });

  it('typestylesStyleHtml returns empty for empty css', () => {
    expect(typestylesStyleHtml('')).toBe('');
  });

  it('typestylesStyleHtml wraps css in a style tag', () => {
    expect(typestylesStyleHtml('.a{color:red}')).toBe(
      '<style id="typestyles">.a{color:red}</style>',
    );
  });

  it('injectStylesIntoHtml inserts before </head>', () => {
    const html = '<html><head><title>x</title></head><body></body></html>';
    expect(injectStylesIntoHtml(html, '.a{color:red}')).toBe(
      '<html><head><title>x</title><style id="typestyles">.a{color:red}</style></head><body></body></html>',
    );
  });

  it('injectStylesIntoHtml prepends when no head', () => {
    expect(injectStylesIntoHtml('<div>hi</div>', '.a{color:red}')).toBe(
      '<style id="typestyles">.a{color:red}</style><div>hi</div>',
    );
  });

  it('streamingDocumentShell opens a document with css in head', () => {
    expect(streamingDocumentShell('.a{color:red}')).toBe(
      '<!DOCTYPE html><html><head><meta charset="utf-8"/><style id="typestyles">.a{color:red}</style></head><body>',
    );
  });
});
