import { designTokens as t } from '@examples/design-system';
import { recipe } from './typestyles';

export const docPage = recipe({
  name: 'docs-doc-page',
  slots: ['footer', 'editLink', 'pagination', 'paginationLink'] as const,
  styles: {
    base: {
      footer: {
        marginTop: t.space[5],
        paddingTop: t.space[4],
        borderTop: `${t.borderWidth.thick} solid ${t.color.border.strong}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: `${t.space[4]} ${t.space[5]}`,
        fontSize: t.fontSize.sm,
        color: t.color.text.secondary,
      },
      editLink: {
        color: t.color.accent.default,
        textDecoration: 'none',
        fontWeight: t.fontWeight.bold,
        '&:hover': {
          textDecoration: 'underline',
        },
      },
      pagination: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: t.space[6],
        paddingTop: t.space[5],
        borderTop: `${t.borderWidth.thick} solid ${t.color.border.strong}`,
        gap: t.space[4],
      },
      paginationLink: {
        fontSize: t.fontSize.md,
        color: t.color.text.primary,
        textDecoration: 'none',
        padding: `${t.space[2]} ${t.space[4]}`,
        border: `${t.borderWidth.default} solid ${t.color.border.default}`,
        boxShadow: t.shadow.sm,
        fontWeight: t.fontWeight.medium,
        '&:hover': {
          backgroundColor: t.color.accent.default,
          color: t.color.text.onAccent,
          transform: 'translate(2px, 2px)',
          boxShadow: 'none',
        },
      },
    },
  },
});
