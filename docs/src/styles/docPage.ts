import { designTokens as t } from '@var-ui/core';
import { recipe } from './typestyles';

/** "Last updated / Edit this page" footer and prev/next links under a docs article. */
export const docPage = recipe({
  name: 'docs-doc-page',
  slots: ['footer', 'editLink', 'pagination', 'paginationLink'] as const,
  styles: {
    base: {
      footer: {
        marginTop: t.space.xl.var,
        paddingTop: t.space.md.var,
        borderTop: `${t.borderWidth.default.var} solid ${t.color.border.default.var}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: `${t.space.md.var} ${t.space.lg.var}`,
        fontSize: t.fontSize.sm.var,
        color: t.color.text.secondary.var,
      },
      editLink: {
        color: t.color.link.default.var,
        textDecoration: 'none',
        fontWeight: t.fontWeight.medium.var,
        '&:hover': {
          color: t.color.link.hover.var,
          textDecoration: 'underline',
        },
      },
      pagination: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: t.space.lg.var,
        gap: t.space.md.var,
      },
      paginationLink: {
        fontSize: t.fontSize.md.var,
        fontWeight: t.fontWeight.medium.var,
        color: t.color.text.primary.var,
        textDecoration: 'none',
        padding: `${t.space.sm.var} ${t.space.md.var}`,
        border: `${t.borderWidth.default.var} solid ${t.color.border.default.var}`,
        borderRadius: t.radius.md.var,
        backgroundColor: t.color.background.surface.var,
        transition: t.transition.controlSurface.var,
        '&:hover': {
          borderColor: t.color.border.strong.var,
          backgroundColor: t.color.background.subtle.var,
        },
        '&:focus-visible': {
          outline: `2px solid ${t.color.border.focus.var}`,
          outlineOffset: '2px',
        },
      },
    },
  },
});
