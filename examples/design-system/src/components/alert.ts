import { variant } from 'typestyles';
import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';
import {
  semanticChannelAssignments,
  subtleBackgroundColor,
  subtleBorderColor,
} from './semanticTone';

/**
 * Slot component with cross-axis variants using `c.vars()`:
 *
 * - **tone** assigns semantic colors on `root` (custom properties). `title` uses
 *   `color: var(semantic)` in base styles (the var inherits from `root`).
 * - **appearance** chooses how those tokens are *applied* (tinted surface vs solid fill).
 *
 * This avoids a compound-variant grid (`appearance × tone`) while keeping each axis
 * easy to extend independently.
 *
 * **Prior step:** `badge.ts` is the same `c.vars()` idea on a single-slot (flat) component.
 *
 * **Shared:** `semanticTone.ts` — one table for tone channels; subtle mixes match badge.
 */
export const alert = recipe({
  name: 'alert',
  slots: ['root', 'icon', 'body', 'title', 'content', 'action', 'actionLink'] as const,
  variants: {
    tone: variant.enum(['info', 'success', 'warning', 'danger', 'tip'], { default: 'info' }),
    appearance: variant.enum(['subtle', 'solid'], { default: 'subtle' }),
    contentGap: variant.enum(['spaced', 'flush'], { default: 'spaced' }),
  },
  vars: {
    semantic: {
      value: t.color.accent.default,
      syntax: '<color>',
      inherits: true,
    },
    solidBg: {
      value: t.color.accent.default,
      syntax: '<color>',
      inherits: false,
    },
    solidFg: {
      value: t.color.text.onAccent,
      syntax: '<color>',
      inherits: false,
    },
  },
  styles: ({ vars: v }) => ({
    base: {
      root: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: t.space[3],
        padding: t.space[4],
        borderRadius: t.radius.md,
        lineHeight: 1.55,
      },
      icon: {
        flexShrink: 0,
        display: 'inline-flex',
        marginTop: '2px',
        fontSize: t.fontSize.lg,
        lineHeight: 1,
      },
      body: {
        flex: 1,
        minWidth: 0,
      },
      title: {
        fontSize: t.fontSize.md,
        fontWeight: t.fontWeight.semibold,
        margin: 0,
        color: v.semantic.var,
      },
      content: {
        fontSize: t.fontSize.md,
        margin: 0,
        color: 'inherit',
      },
      action: {
        marginTop: t.space[2],
      },
      actionLink: {
        fontSize: t.fontSize.md,
        fontWeight: t.fontWeight.medium,
        color: 'inherit',
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
        '&:hover': {
          textDecoration: 'none',
        },
        '&:focus-visible': {
          outline: `2px solid ${t.color.border.focus}`,
          outlineOffset: '2px',
          borderRadius: t.radius.sm,
        },
      },
    },
    variants: {
      tone: {
        info: { root: semanticChannelAssignments(v, 'accent') },
        success: { root: semanticChannelAssignments(v, 'success') },
        warning: { root: semanticChannelAssignments(v, 'warning') },
        danger: { root: semanticChannelAssignments(v, 'danger') },
        tip: { root: semanticChannelAssignments(v, 'info') },
      },
      appearance: {
        subtle: {
          root: {
            backgroundColor: subtleBackgroundColor(v.semantic.var),
            border: `1px solid ${subtleBorderColor(v.semantic.var)}`,
            color: t.color.text.primary,
          },
        },
        solid: {
          root: {
            backgroundColor: v.solidBg.var,
            border: `1px solid ${v.solidBg.var}`,
            color: v.solidFg.var,
          },
          title: { color: 'inherit' },
        },
      },
      contentGap: {
        spaced: { content: { marginTop: t.space[1] } },
        flush: { content: { marginTop: 0 } },
      },
    },
  }),
});
