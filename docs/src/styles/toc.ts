import { designTokens as t } from '@examples/design-system';
import { recipe } from './typestyles';

const belowTocBp = '@media (max-width: 1023px)';
const tocBp = '@media (min-width: 1024px)';

export const toc = recipe({
  name: 'docs-toc',
  slots: ['nav', 'title', 'list', 'item', 'link', 'root', 'details', 'summary', 'panel'] as const,
  styles: {
    base: {
      nav: {
        fontFamily: t.fontFamily.sans,
      },
      title: {
        marginBlock: `0 ${t.space[3]}`,
        marginInline: t.space[4],
        fontFamily: t.fontFamily.mono,
        fontSize: t.fontSize.xs,
        fontWeight: t.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: t.color.text.secondary,
        [belowTocBp]: {
          display: 'none',
        },
      },
      list: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        /**
         * Desktop TOC grows a left ink rail so active state reads against a visible spine
         * rather than floating in the gap.
         */
        [tocBp]: {
          borderLeft: t.stroke.strong,
        },
      },
      item: {
        margin: 0,
      },
      link: {
        display: 'block',
        position: 'relative',
        fontSize: t.fontSize.sm,
        lineHeight: 1.4,
        color: t.color.text.secondary,
        textDecoration: 'none',
        paddingTop: t.space[1],
        paddingRight: t.space[4],
        paddingBottom: t.space[1],
        paddingLeft: `calc(${t.space[4]} + var(--docs-toc-depth, 0px))`,
        transition: 'color 120ms ease',
        '&:hover': {
          color: t.color.accent.default,
        },
        /**
         * Active item: accent color + semibold + a small square marker on the rail.
         * Much less jumpy than stacking border-top/bottom strips on every scroll tick.
         */
        '&[aria-current="location"]': {
          color: t.color.accent.default,
          fontWeight: t.fontWeight.semibold,
          [tocBp]: {
            '&::before': {
              content: '""',
              position: 'absolute',
              left: '-5px',
              top: '50%',
              width: '8px',
              height: '8px',
              backgroundColor: t.color.accent.default,
              transform: 'translateY(-50%)',
            },
          },
        },
      },
      root: {
        marginBottom: t.space[5],
        backgroundColor: t.color.background.subtle,
        overflow: 'hidden',
        position: 'sticky',
        top: t.space[12],
        zIndex: 20,
        [tocBp]: {
          marginBottom: 0,
          backgroundColor: 'transparent',
          overflow: 'visible',
          position: 'static',
          top: 'auto',
          zIndex: 'auto',
        },
      },
      details: {
        margin: 0,
      },
      summary: {
        listStyle: 'none',
        cursor: 'pointer',
        fontFamily: t.fontFamily.mono,
        fontSize: t.fontSize.sm,
        fontWeight: t.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: t.color.text.primary,
        padding: `${t.space[2]} ${t.space[4]}`,
        '&::-webkit-details-marker': {
          display: 'none',
        },
        [tocBp]: {
          display: 'none',
        },
      },
      panel: {
        padding: `0 ${t.space[4]} ${t.space[4]}`,
        borderTop: `${t.borderWidth.default} solid ${t.color.border.default}`,
        [tocBp]: {
          padding: 0,
          borderTop: 'none',
        },
      },
    },
  },
});
