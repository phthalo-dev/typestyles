import { designTokens as t } from '@var-ui/core';
import { recipe } from './typestyles';

/**
 * Page frame for docs articles (kicker, title, description) on Var UI tokens. Markdown bodies use
 * `docProseRoot` (the kit's `docsArticleProse`) composed with `doc.content`, which adds the
 * docs-only pieces: heading permalinks and wrapping inline code.
 */
export const doc = recipe({
  name: 'docs-doc',
  slots: [
    'root',
    'eyebrowRow',
    'kicker',
    'kickerDot',
    'title',
    'description',
    'content',
    'actions',
  ] as const,
  styles: {
    base: {
      root: {
        flex: 1,
        minWidth: 0,
      },
      eyebrowRow: {
        marginBottom: t.space.xs.var,
      },
      kicker: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space.xs.var,
        marginTop: 0,
        marginRight: 0,
        marginBottom: t.space.sm.var,
        marginLeft: 0,
        fontFamily: t.fontFamily.mono.var,
        fontSize: t.fontSize.xs.var,
        fontWeight: t.fontWeight.bold.var,
        letterSpacing: t.letterSpacing.caps.var,
        textTransform: 'uppercase',
        color: t.color.text.secondary.var,
      },
      kickerDot: {
        width: '6px',
        height: '6px',
        borderRadius: t.radius.full.var,
        backgroundColor: t.color.tone.accent.foreground.var,
      },
      title: {
        fontFamily: t.fontFamily.display.var,
        fontSize: 'clamp(2rem, 2.2vw + 1.25rem, 2.75rem)',
        fontWeight: t.fontWeight.bold.var,
        marginTop: 0,
        marginBottom: t.space.sm.var,
        color: t.color.text.primary.var,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        textWrap: 'balance',
      },
      description: {
        fontSize: t.fontSize.prose.lead.var,
        lineHeight: t.lineHeight.prose.lead.var,
        color: t.color.text.secondary.var,
        marginTop: 0,
        marginBottom: t.space.xl.var,
        maxWidth: '60ch',
        textWrap: 'pretty',
      },
      content: {
        // Long inline code (changelog entries, API signatures) wraps instead of widening the
        // article past a phone viewport. Code blocks scroll on their own.
        '& :not(pre) > code': {
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
        },
        '& [data-codeblock] code': {
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          backgroundColor: 'transparent',
          padding: 0,
          borderRadius: 0,
          border: 'none',
        },
        // Heading permalinks emitted by `withHeadingAnchors()` in `lib/docs.ts`.
        '& [data-prose-heading-anchor]': {
          marginInlineStart: t.space.xs.var,
          fontWeight: t.fontWeight.medium.var,
          color: t.color.text.secondary.var,
          textDecoration: 'none',
          opacity: 0,
          transition: `opacity ${t.duration.medium.var} ${t.easing.standard.var}`,
        },
        '& [data-prose-heading-anchor]::before': {
          content: '"#"',
          fontSize: '0.85em',
        },
        '& :is(h1, h2, h3, h4, h5, h6):hover [data-prose-heading-anchor], & [data-prose-heading-anchor]:focus-visible':
          {
            opacity: 1,
          },
        '& [data-prose-heading-anchor]:focus-visible': {
          outline: `2px solid ${t.color.border.focus.var}`,
          outlineOffset: '2px',
          borderRadius: t.radius.sm.var,
        },
      },
      actions: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: t.space.sm.var,
      },
    },
  },
});
