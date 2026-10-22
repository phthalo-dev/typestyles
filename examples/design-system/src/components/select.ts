import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

export const select = recipe({
  name: 'select',
  slots: ['root', 'label', 'trigger', 'popover', 'item'] as const,
  styles: {
    base: {
      root: {
        display: 'grid',
        gap: t.space[1],
        minWidth: '240px',
      },
      label: {
        fontSize: t.fontSize.md,
        fontWeight: t.fontWeight.medium,
        color: t.color.text.primary,
      },
      trigger: {
        textAlign: 'left',
        border: `1px solid ${t.color.border.default}`,
        borderRadius: t.radius.md,
        padding: `${t.space[2]} ${t.space[3]}`,
        backgroundColor: t.color.background.surface,
        color: t.color.text.primary,
        fontSize: t.fontSize.md,
        cursor: 'pointer',
        '&:focus-visible': {
          outline: `2px solid ${t.color.border.focus}`,
          outlineOffset: '1px',
          borderColor: t.color.border.focus,
        },
      },
      popover: {
        border: `1px solid ${t.color.border.default}`,
        borderRadius: t.radius.md,
        backgroundColor: t.color.background.surface,
        boxShadow: t.shadow.md,
        padding: t.space[1],
      },
      item: {
        fontSize: t.fontSize.md,
        padding: `${t.space[2]} ${t.space[3]}`,
        borderRadius: t.radius.sm,
        cursor: 'pointer',
        '&[data-focused]': {
          backgroundColor: t.color.background.subtle,
        },
        '&[data-selected]': {
          color: t.color.accent.default,
          fontWeight: t.fontWeight.semibold,
        },
      },
    },
  },
});
