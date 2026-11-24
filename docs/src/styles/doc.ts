import { designTokens as t } from '@examples/design-system';
import { recipe } from './typestyles';

export const doc = recipe({
  name: 'docs-doc',
  slots: ['root', 'eyebrowRow', 'kicker', 'kickerDot', 'title', 'description', 'content'] as const,
  styles: {
    base: {
      root: {
        flex: 1,
        minWidth: 0,
      },
      eyebrowRow: {
        marginBottom: t.space[2],
      },
      kicker: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space[2],
        marginTop: 0,
        marginRight: 0,
        marginBottom: t.space[3],
        marginLeft: 0,
        fontFamily: t.fontFamily.mono,
        fontSize: t.fontSize.xs,
        fontWeight: t.fontWeight.bold,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: t.color.text.secondary,
      },
      kickerDot: {
        width: '6px',
        height: '6px',
        backgroundColor: t.color.accent.default,
      },
      title: {
        fontFamily: t.fontFamily.display,
        fontStyle: 'italic',
        fontSize: 'clamp(2rem, 2.2vw + 1.25rem, 2.75rem)',
        fontWeight: t.fontWeight.bold,
        marginTop: 0,
        marginBottom: t.space[3],
        color: t.color.text.primary,
        letterSpacing: '-0.025em',
        lineHeight: 1.1,
        textWrap: 'balance',
        'html[data-style="ai-glow"] &': {
          fontStyle: 'normal',
          letterSpacing: '-0.045em',
        },
        'html[data-style="new-wave"] &': {
          fontStyle: 'normal',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        },
        'html[data-style="windows-95"] &': {
          fontStyle: 'normal',
          letterSpacing: 0,
        },
        'html[data-style="classic-system"] &': {
          fontStyle: 'normal',
          letterSpacing: 0,
        },
      },
      description: {
        fontSize: t.fontSize.lg,
        color: t.color.text.secondary,
        marginTop: 0,
        marginBottom: t.space[6],
        lineHeight: t.lineHeight.relaxed,
        maxWidth: '60ch',
        textWrap: 'pretty',
      },
      content: {
        // Long inline code (changelog entries, API signatures) wraps instead of widening the article
        // past a phone viewport. Code blocks scroll on their own. `!important`: the legacy prose
        // (`@examples/design-system`) sets `nowrap` in the later `utilities` layer; drop with it.
        '& :not(pre) > code': {
          whiteSpace: 'normal !important',
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
      },
    },
  },
});
