import { variant } from 'typestyles';
import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

/**
 * Command / search palette overlay (⌘K-style).
 *
 * Multi-part UI: use the **slots** API (`commandPalette().dialog`) rather than flat
 * `component({ key: true })`, which is meant for optional style toggles on one surface.
 *
 * Pass `{ open: true }` when the overlay is visible; default is closed.
 */
export const commandPalette = recipe({
  name: 'command-palette',
  slots: [
    'root',
    'backdrop',
    'dialog',
    'inputRow',
    'inputIcon',
    'input',
    'results',
    'result',
    'resultLink',
    'resultLinkActive',
    'resultTitle',
    'resultMeta',
    'mark',
    'empty',
  ] as const,
  variants: { open: variant.boolean({ default: false }) },
  styles: {
    base: {
      root: {
        position: 'fixed',
        inset: 0,
        zIndex: 450,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: `max(12vh, 72px) ${t.space[4]} ${t.space[5]}`,
        pointerEvents: 'none',
        opacity: 0,
        visibility: 'hidden',
        transition: t.transition.overlayFade,
      },
      backdrop: {
        position: 'absolute',
        inset: 0,
        backgroundColor: t.color.overlay.backdrop,
        transition: t.transition.backdrop,
        '@supports (backdrop-filter: blur(1px))': {
          backdropFilter: 'blur(10px)',
        },
      },
      dialog: {
        position: 'relative',
        zIndex: 1,
        width: 'min(560px, 100%)',
        maxHeight: 'min(72vh, 640px)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: t.fontFamily.sans,
        backgroundColor: t.color.background.surface,
        borderRadius: t.radius.lg,
        border: `${t.borderWidth.default} solid ${t.color.border.default}`,
        boxShadow: t.shadow.xl,
        overflow: 'hidden',
        opacity: 0,
        transition: t.transition.panelEnter,
      },
      inputRow: {
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: t.space[2],
        padding: `${t.space[3]} ${t.space[4]}`,
        borderBottom: `${t.borderWidth.default} solid ${t.color.border.default}`,
      },
      inputIcon: {
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        color: t.color.text.placeholder,
        lineHeight: 0,
      },
      input: {
        flex: 1,
        minWidth: 0,
        border: 'none',
        margin: 0,
        padding: 0,
        backgroundColor: 'transparent',
        fontSize: t.fontSize.lg,
        fontFamily: t.fontFamily.sans,
        color: t.color.text.primary,
        outline: 'none',
        '&::placeholder': { color: t.color.text.placeholder },
      },
      results: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        margin: 0,
        padding: `${t.space[1]} 0 ${t.space[2]}`,
        listStyle: 'none',
      },
      result: {
        margin: 0,
      },
      resultLink: {
        display: 'block',
        padding: `${t.space[2]} ${t.space[4]}`,
        textDecoration: 'none',
        color: t.color.text.primary,
        transition: t.transition.surfaceFast,
        '&:hover': {
          backgroundColor: t.color.accent.subtle,
        },
      },
      resultLinkActive: {
        backgroundColor: t.color.accent.subtle,
      },
      resultTitle: {
        display: 'block',
        fontSize: t.fontSize.md,
        fontWeight: t.fontWeight.semibold,
        lineHeight: 1.35,
        marginBottom: t.space[1],
      },
      resultMeta: {
        display: 'block',
        fontSize: t.fontSize.sm,
        color: t.color.text.secondary,
        lineHeight: 1.35,
      },
      mark: {
        fontFamily: 'inherit',
        backgroundColor: t.color.accent.subtle,
        color: t.color.text.primary,
        borderRadius: t.radius.sm,
        padding: `0 ${t.space[1]}`,
      },
      empty: {
        padding: `${t.space[4]} ${t.space[4]}`,
        fontSize: t.fontSize.sm,
        color: t.color.text.secondary,
        lineHeight: 1.5,
      },
    },
    variants: {
      open: {
        false: {},
        true: {
          root: {
            pointerEvents: 'auto',
            opacity: 1,
            visibility: 'visible',
          },
          dialog: {
            opacity: 1,
          },
        },
      },
    },
  },
});
