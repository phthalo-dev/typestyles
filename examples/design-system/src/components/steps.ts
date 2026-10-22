import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

export const steps = recipe({
  name: 'steps',
  layer: 'utilities',
  slots: ['root'] as const,
  styles: {
    base: {
      root: {
        listStyle: 'none',
        padding: 0,
        margin: `${t.space[4]} 0`,
        counterReset: 'docs-step',
        '& > li': {
          position: 'relative',
          listStyle: 'none',
          paddingLeft: `calc(${t.space[5]} + ${t.space[3]})`,
          marginBottom: t.space[5],
          counterIncrement: 'docs-step',
          fontSize: t.fontSize.md,
          color: t.color.text.primary,
          lineHeight: 1.6,
          '&:last-child': {
            marginBottom: 0,
          },
          '&::before': {
            content: 'counter(docs-step)',
            position: 'absolute',
            left: 0,
            top: 0,
            width: t.space[5],
            height: t.space[5],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: t.fontSize.sm,
            fontWeight: t.fontWeight.semibold,
            color: t.color.text.onAccent,
            backgroundColor: t.color.accent.default,
            borderRadius: t.radius.full,
            lineHeight: 1,
          },
          '& :first-child': {
            marginTop: 0,
          },
          '& :last-child': {
            marginBottom: 0,
          },
        },
      },
    },
  },
});
