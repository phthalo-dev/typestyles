import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

export const layout = recipe({
  name: 'ds-layout',
  layer: 'utilities',
  slots: ['base', 'stack', 'section', 'row'] as const,
  styles: {
    base: {
      base: {
        fontFamily: t.fontFamily.sans,
        color: t.color.text.primary,
      },
      stack: {
        display: 'grid',
        gap: t.space[5],
      },
      section: {
        display: 'grid',
        gap: t.space[3],
        padding: t.space[4],
        border: `1px solid ${t.color.border.default}`,
        borderRadius: t.radius.lg,
        backgroundColor: t.color.background.surface,
        boxShadow: t.shadow.xs,
      },
      row: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: t.space[3],
        alignItems: 'center',
      },
    },
  },
});

export const text = recipe({
  name: 'ds-text',
  layer: 'utilities',
  slots: ['base', 'title', 'subtitle', 'sectionTitle', 'label', 'caption'] as const,
  styles: {
    base: {
      base: {
        margin: 0,
        color: t.color.text.primary,
      },
      title: {
        fontSize: '28px',
        fontWeight: t.fontWeight.semibold,
        letterSpacing: '-0.02em',
      },
      subtitle: {
        fontSize: t.fontSize.lg,
        color: t.color.text.secondary,
      },
      sectionTitle: {
        fontSize: '20px',
        fontWeight: t.fontWeight.semibold,
      },
      label: {
        fontSize: t.fontSize.md,
        fontWeight: t.fontWeight.medium,
      },
      caption: {
        fontSize: t.fontSize.sm,
        color: t.color.text.secondary,
      },
    },
  },
});
