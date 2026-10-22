import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

export const card = recipe({
  name: 'card',
  slots: [
    'root',
    'title',
    'body',
    'grid',
    'linkRoot',
    'linkTitle',
    'linkDescription',
    'linkHint',
  ] as const,
  styles: {
    base: {
      root: {
        display: 'flex',
        flexDirection: 'column',
        gap: t.space[2],
        padding: t.space[4],
        borderRadius: t.radius.md,
        border: `1px solid ${t.color.border.default}`,
        backgroundColor: t.color.background.surface,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      },
      title: {
        margin: 0,
        fontSize: t.fontSize.lg,
        fontWeight: t.fontWeight.semibold,
        color: t.color.text.primary,
        lineHeight: 1.3,
      },
      body: {
        margin: 0,
        fontSize: t.fontSize.md,
        color: t.color.text.secondary,
        lineHeight: 1.55,
      },
      grid: {
        display: 'grid',
        gap: t.space[4],
        gridTemplateColumns: '1fr',
        '@media (min-width: 640px)': {
          gridTemplateColumns: 'repeat(2, 1fr)',
        },
      },
      linkRoot: {
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        '&:hover': {
          borderColor: t.color.border.strong,
          boxShadow: t.shadow.xs,
        },
        '&:focus-visible': {
          outline: `2px solid ${t.color.border.focus}`,
          outlineOffset: '2px',
        },
      },
      linkTitle: {
        color: t.color.accent.default,
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'underline',
        },
      },
      linkDescription: {
        margin: 0,
        fontSize: t.fontSize.md,
        color: t.color.text.secondary,
        lineHeight: 1.55,
      },
      linkHint: {
        marginTop: 'auto',
        paddingTop: t.space[2],
        fontSize: t.fontSize.sm,
        fontWeight: t.fontWeight.medium,
        color: t.color.text.secondary,
      },
    },
  },
});
