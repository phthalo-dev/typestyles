import { designTokens as t } from '@examples/design-system';
import { recipe } from './typestyles';

export const docAiActions = recipe({
  name: 'docs-doc-ai-actions',
  slots: ['root', 'button', 'menu', 'menuSummary', 'menuPanel', 'menuItem'] as const,
  styles: {
    base: {
      root: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: t.space[2],
        marginTop: `calc(-1 * ${t.space[2]})`,
        marginBottom: t.space[4],
      },
      button: {
        fontSize: t.fontSize.sm,
        padding: `${t.space[1]} ${t.space[3]}`,
      },
      menu: {
        position: 'relative',
      },
      menuSummary: {
        listStyle: 'none',
        cursor: 'pointer',
        '&::-webkit-details-marker': { display: 'none' },
      },
      menuPanel: {
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 20,
        marginTop: t.space[1],
        minWidth: '12rem',
        padding: t.space[1],
        backgroundColor: t.color.background.surface,
        border: `${t.borderWidth.default} solid ${t.color.border.default}`,
        boxShadow: t.shadow.md,
        display: 'flex',
        flexDirection: 'column',
        gap: t.space[1],
      },
      menuItem: {
        display: 'block',
        padding: `${t.space[2]} ${t.space[3]}`,
        fontSize: t.fontSize.sm,
        color: t.color.text.primary,
        textDecoration: 'none',
        '&:hover': {
          backgroundColor: t.color.background.subtle,
        },
      },
    },
  },
});
