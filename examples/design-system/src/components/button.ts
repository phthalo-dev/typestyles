import { variant } from 'typestyles';
import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

export const button = recipe({
  name: 'button',
  variants: { intent: variant.enum(['primary', 'secondary', 'ghost'], { default: 'secondary' }) },
  vars: {
    border: {
      value: `${t.color.border.default}`,
      syntax: '<color>',
      inherits: false,
    },
    background: {
      value: `${t.color.background.surface}`,
      syntax: '<color>',
      inherits: false,
    },
    foreground: {
      value: `${t.color.text.primary}`,
      syntax: '<color>',
      inherits: false,
    },
  },
  styles: ({ vars: v }) => ({
    base: {
      appearance: 'none',
      border: `1px solid ${v.border.var}`,
      borderRadius: t.radius.md,
      backgroundColor: v.background.var,
      color: v.foreground.var,
      fontSize: t.fontSize.md,
      fontWeight: t.fontWeight.medium,
      padding: `${t.space[2]} ${t.space[4]}`,
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.space[2],
      transition: 'background-color 140ms ease, border-color 140ms ease, transform 80ms ease',
      '&:hover': {
        borderColor: t.color.border.strong,
        backgroundColor: t.color.background.subtle,
      },
      '&:active': {
        transform: 'translateY(1px)',
      },
      '&:focus-visible': {
        outline: `2px solid ${t.color.border.focus}`,
        outlineOffset: '2px',
      },
    },
    variants: {
      intent: {
        primary: {
          [v.border.name]: t.color.accent.default,
          [v.background.name]: t.color.accent.default,
          [v.foreground.name]: t.color.text.onAccent,
          '&:hover': {
            [v.background.name]: t.color.accent.hover,
            [v.border.name]: t.color.accent.hover,
          },
        },
        secondary: {
          [v.background.name]: t.color.background.surface,
          [v.border.name]: t.color.border.default,
          [v.foreground.name]: t.color.text.primary,
          '&:hover': {
            borderColor: t.color.border.strong,
            backgroundColor: t.color.background.subtle,
          },
        },
        ghost: {
          [v.background.name]: 'transparent',
          [v.border.name]: 'transparent',
          [v.foreground.name]: t.color.text.primary,
          '&:hover': {
            backgroundColor: t.color.background.subtle,
          },
        },
      },
    },
  }),
});

export const linkButton = button;
