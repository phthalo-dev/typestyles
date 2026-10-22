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
        /** Install tab group (`expandInstallTabGroups`) — tab rail + stacked code blocks */
        '& [data-doc-install-tabs]': {
          marginBlock: t.space[6],
        },
        '& .doc-install-tabs-tablist': {
          display: 'flex',
          flexWrap: 'wrap',
          gap: t.space[1],
          paddingTop: t.space[2],
          paddingRight: t.space[2],
          paddingLeft: t.space[2],
          borderTop: `${t.borderWidth.default} solid ${t.color.border.default}`,
          borderRight: `${t.borderWidth.default} solid ${t.color.border.default}`,
          borderLeft: `${t.borderWidth.default} solid ${t.color.border.default}`,
          borderBottom: 'none',
          borderTopLeftRadius: t.radius.lg,
          borderTopRightRadius: t.radius.lg,
          backgroundColor: t.codeBlock.backgroundHeader,
        },
        '& .doc-install-tabs-tab': {
          appearance: 'none',
          margin: 0,
          border: 'none',
          borderRadius: t.radius.md,
          paddingBlock: t.space[1],
          paddingInline: t.space[3],
          fontFamily: t.fontFamily.mono,
          fontSize: t.fontSize.xs,
          fontWeight: t.fontWeight.semibold,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: t.color.text.secondary,
          backgroundColor: 'transparent',
          cursor: 'pointer',
          transition: t.transition.colorShift,
          '&:hover': {
            color: t.color.text.primary,
            backgroundColor: t.color.background.subtle,
          },
        },
        '& .doc-install-tabs-tab[aria-selected="true"]': {
          color: t.color.text.primary,
          backgroundColor: t.color.background.default,
          boxShadow: t.shadow.sm,
        },
        '& [data-doc-install-tabs] [data-codeblock]': {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        },
        '& .doc-install-tabs-panels': {
          position: 'relative',
        },
        '& .doc-install-tabs-panelwrap[hidden]': {
          display: 'none',
        },
      },
    },
  },
});
