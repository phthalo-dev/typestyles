import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

export const radio = recipe({
  name: 'radio',
  slots: ['group', 'item', 'control', 'label', 'groupLabel'] as const,
  styles: {
    base: {
      group: {
        display: 'grid',
        gap: t.space[1],
      },
      item: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space[2],
        cursor: 'pointer',
      },
      control: {
        width: '18px',
        height: '18px',
        borderRadius: t.radius.full,
        border: `1px solid ${t.color.border.strong}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&::before': {
          content: '""',
          width: '8px',
          height: '8px',
          borderRadius: t.radius.full,
          backgroundColor: 'transparent',
          transition: 'background-color 120ms ease',
        },
        '&[data-selected]::before': {
          backgroundColor: t.color.accent.default,
        },
      },
      label: {
        fontSize: t.fontSize.md,
      },
      groupLabel: {
        fontSize: t.fontSize.md,
        fontWeight: t.fontWeight.medium,
        color: t.color.text.primary,
      },
    },
  },
});
