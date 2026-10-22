import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

export const textField = recipe({
  name: 'text-field',
  slots: ['root', 'label', 'input', 'description', 'error'] as const,
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
      input: {
        border: `1px solid ${t.color.border.default}`,
        borderRadius: t.radius.md,
        padding: `${t.space[2]} ${t.space[3]}`,
        fontSize: t.fontSize.md,
        backgroundColor: t.color.background.surface,
        color: t.color.text.primary,
        '&:focus': {
          outline: `2px solid ${t.color.border.focus}`,
          outlineOffset: '1px',
          borderColor: t.color.border.focus,
        },
        '&::placeholder': {
          color: t.color.text.secondary,
        },
      },
      description: {
        fontSize: t.fontSize.sm,
        color: t.color.text.secondary,
      },
      error: {
        fontSize: t.fontSize.sm,
        color: t.color.danger.default,
      },
    },
  },
});
