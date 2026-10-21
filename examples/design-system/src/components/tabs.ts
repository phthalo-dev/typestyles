import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

export const tabs = recipe({
  name: 'tabs',
  slots: ['root', 'list', 'tab', 'panel'] as const,
  styles: {
    base: {
      root: {
        display: 'grid',
        gap: t.space[3],
      },
      list: {
        display: 'inline-flex',
        gap: t.space[1],
        borderBottom: `1px solid ${t.color.border.default}`,
      },
      tab: {
        borderTop: 'none',
        borderRight: 'none',
        borderLeft: 'none',
        borderBottom: `${t.borderWidth.default} solid transparent`,
        backgroundColor: 'transparent',
        padding: `${t.space[2]} ${t.space[3]}`,
        color: t.color.text.secondary,
        cursor: 'pointer',
        fontSize: t.fontSize.md,
        '&[data-selected]': {
          color: t.color.text.primary,
          borderBottomColor: t.color.accent.default,
          fontWeight: t.fontWeight.semibold,
        },
      },
      panel: {
        padding: t.space[3],
        backgroundColor: t.color.background.subtle,
        borderRadius: t.radius.md,
        border: `1px solid ${t.color.border.default}`,
      },
    },
  },
});
