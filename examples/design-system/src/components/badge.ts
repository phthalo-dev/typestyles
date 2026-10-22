import { variant } from 'typestyles';
import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';
import { badgeTonePaint } from './semanticTone';

/**
 * Flat component: one node, `tone` swaps `c.vars()` assignments on that same element.
 *
 * **Next step:** see `alert.ts` for slots plus a second variant axis (`appearance`) where
 * tone only supplies tokens on `root` and another axis applies recipes—still no compound grid.
 *
 * **Shared:** `semanticTone.ts` holds the semantic palette + subtle `color-mix` recipe (same as alert).
 */
export const badge = recipe({
  name: 'badge',
  variants: {
    tone: variant.enum(['neutral', 'accent', 'success', 'warning', 'danger', 'tip'], {
      default: 'neutral',
    }),
  },
  vars: {
    borderColor: {
      value: `${t.color.border.default}`,
      syntax: '<color>',
      inherits: false,
    },
    backgroundColor: {
      value: `${t.color.background.subtle}`,
      syntax: '<color>',
      inherits: false,
    },
    textColor: {
      value: `${t.color.text.secondary}`,
      syntax: '<color>',
      inherits: false,
    },
  },
  styles: ({ vars: v }) => ({
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: t.fontSize.sm,
      fontWeight: t.fontWeight.semibold,
      lineHeight: 1,
      padding: `${t.space[1]} ${t.space[2]}`,
      borderRadius: t.radius.full,
      border: `1px solid ${v.borderColor.var}`,
      backgroundColor: v.backgroundColor.var,
      color: v.textColor.var,
    },
    variants: {
      tone: {
        neutral: {},
        accent: badgeTonePaint(v, 'accent'),
        success: badgeTonePaint(v, 'success'),
        warning: badgeTonePaint(v, 'warning'),
        danger: badgeTonePaint(v, 'danger'),
        tip: badgeTonePaint(v, 'info'),
      },
    },
  }),
});
