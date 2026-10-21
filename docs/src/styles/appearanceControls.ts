import { designTokens as t } from '@examples/design-system';
import { recipe } from './typestyles';

const bp = '@media (max-width: 768px)';
/** Matches fixed `siteHeader` chrome (viewport breakpoints; duplicate mount is `display: none`). */
const desktop = '@media (min-width: 769px)';

/** Aligned to fixed `siteHeader` height — square tool slots in the right rail. */
const headerToolSlot = `calc(${t.space[8]} + ${t.space[2]})`;
const compactControl = `calc(${t.space[6]} + ${t.space[1]})`;

export const appearanceControls = recipe({
  name: 'docs-appearance-controls',
  slots: ['cluster', 'iconButton', 'styleHost', 'modeIcon', 'dropdown', 'menuItem'] as const,
  styles: {
    base: {
      cluster: {
        display: 'flex',
        alignItems: 'stretch',
        flexShrink: 0,
        height: '100%',
        gap: 0,
      },
      iconButton: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        boxSizing: 'border-box',
        width: headerToolSlot,
        minWidth: headerToolSlot,
        padding: 0,
        backgroundColor: 'transparent',
        color: t.color.text.primary,
        cursor: 'pointer',
        flexShrink: 0,
        alignSelf: 'stretch',
        border: 'none',
        borderInlineStart: t.stroke.strong,
        transition: t.transition.colorShift,
        '&:hover': {
          backgroundColor: t.color.background.subtle,
          color: t.color.accent.default,
        },
        '&:active': {
          backgroundColor: t.color.accent.subtle,
        },
        'html[data-style="ai-glow"] &': {
          borderInlineStartColor: t.color.border.default,
        },
        'html[data-style="windows-95"] &': {
          backgroundColor: t.color.background.surface,
          borderInlineStart: `${t.borderWidth.default} solid ${t.color.border.default}`,
          boxShadow: t.shadow.xs,
        },
        'html[data-style="classic-system"] &': {
          borderInlineStart: t.stroke.strong,
        },
        'html[data-style="new-wave"] &': {
          textTransform: 'uppercase',
        },
        '&:focus-visible': {
          outline: `${t.borderWidth.thin} solid ${t.color.accent.default}`,
          outlineOffset: '2px',
          zIndex: 1,
        },
        [bp]: {
          width: compactControl,
          minWidth: compactControl,
        },
      },
      styleHost: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        [desktop]: {
          alignItems: 'stretch',
          alignSelf: 'stretch',
        },
      },
      modeIcon: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
        '&[hidden]': {
          display: 'none',
        },
      },
      dropdown: {
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: t.space[2],
        minWidth: '13rem',
        maxHeight: 'min(50vh, 16rem)',
        overflowY: 'auto',
        padding: t.space[1],
        backgroundColor: t.color.background.surface,
        border: `${t.borderWidth.thick} solid ${t.color.border.strong}`,
        boxShadow: t.shadow.md,
        zIndex: 400,
        'html[data-style="ai-glow"] &': {
          backgroundColor: `color-mix(in oklch, ${t.color.background.surface} 92%, transparent)`,
          backgroundImage: `radial-gradient(circle at 18% 18%, color-mix(in oklch, #F0ABFC 24%, transparent) 0 3rem, transparent 7rem),
          radial-gradient(circle at 86% 12%, color-mix(in oklch, #67E8F9 22%, transparent) 0 2rem, transparent 6rem)`,
          backdropFilter: 'blur(16px) saturate(1.25)',
        },
        'html[data-style="windows-95"] &': {
          borderColor: t.color.border.default,
          boxShadow: t.shadow.md,
        },
        'html[data-style="classic-system"] &': {
          backgroundImage: `repeating-linear-gradient(45deg, transparent 0 2px, ${t.color.background.subtle} 2px 4px)`,
        },
        'html[data-style="new-wave"] &': {
          transform: 'rotate(-1deg)',
        },
      },
      menuItem: {
        display: 'block',
        width: '100%',
        margin: 0,
        padding: `${t.space[2]} ${t.space[3]}`,
        fontSize: t.fontSize.sm,
        fontFamily: t.fontFamily.sans,
        textAlign: 'left',
        color: t.color.text.primary,
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        borderRadius: t.radius.none,
        '&:hover': {
          backgroundColor: t.color.background.subtle,
        },
        '&[aria-selected="true"]': {
          backgroundColor: t.color.accent.subtle,
          fontWeight: t.fontWeight.medium,
        },
        'html[data-style="ai-glow"] &[aria-selected="true"]': {
          boxShadow: 'inset 0 0 0 1px color-mix(in oklch, #7C3AED 34%, transparent)',
        },
        'html[data-style="windows-95"] &[aria-selected="true"]': {
          color: t.color.text.onAccent,
          backgroundColor: t.color.accent.default,
        },
        'html[data-style="classic-system"] &[aria-selected="true"]': {
          color: t.color.text.onAccent,
          backgroundColor: t.color.accent.default,
        },
      },
    },
  },
});
