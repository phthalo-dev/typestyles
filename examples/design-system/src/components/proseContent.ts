import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

const bp = '@media (max-width: 768px)';

/**
 * Long-form / markdown prose primitives: blockquote, kbd, inline badges, tables, dividers,
 * heading permalink anchors, lists, and a responsive vertical rhythm.
 *
 * Apply `proseContent.root` on the wrapper around rendered markdown HTML.
 */
export const proseContent = recipe({
  name: 'docs-prose',
  layer: 'utilities',
  slots: ['root', 'tableWrap', 'headingAnchor'] as const,
  styles: {
    base: {
      root: {
        fontFamily: t.fontFamily.sans,
        fontSize: t.fontSize.md,
        lineHeight: 1.75,
        'html[data-mode="dark"] &': {
          lineHeight: 1.82,
        },
        '@media (prefers-color-scheme: dark)': {
          'html:not([data-mode="light"]) &': {
            lineHeight: 1.82,
          },
        },
        color: t.color.text.primary,
        '& h1': {
          fontFamily: t.fontFamily.display,
          fontStyle: 'italic',
          fontSize: '28px',
          fontWeight: t.fontWeight.bold,
          letterSpacing: '-0.015em',
          lineHeight: 1.25,
          marginTop: 0,
          marginBottom: t.space[3],
          color: t.color.text.primary,
          [bp]: {
            fontSize: '24px',
            marginBottom: t.space[2],
          },
        },
        /**
         * H2 as editorial section break — italic Fraunces with a full-width hairline rule above it.
         * First H2 after an intro gets no rule (description block already provides one).
         */
        '& h2': {
          fontFamily: t.fontFamily.display,
          fontStyle: 'italic',
          fontSize: '24px',
          fontWeight: t.fontWeight.bold,
          letterSpacing: '-0.015em',
          lineHeight: 1.25,
          marginTop: t.space[8],
          marginBottom: t.space[3],
          paddingTop: t.space[5],
          borderTop: t.stroke.strong,
          color: t.color.text.primary,
          [bp]: {
            fontSize: '21px',
            marginTop: t.space[6],
            paddingTop: t.space[4],
          },
        },
        '& > h2:first-of-type, & > h2:first-child': {
          marginTop: t.space[4],
          paddingTop: 0,
          borderTop: 'none',
        },
        '& h2:first-child': {
          marginTop: 0,
        },
        '& h3': {
          fontSize: '17px',
          fontWeight: t.fontWeight.semibold,
          lineHeight: 1.35,
          marginTop: t.space[5],
          marginBottom: t.space[2],
          color: t.color.text.primary,
          [bp]: {
            marginTop: t.space[4],
          },
        },
        '& h4, & h5, & h6': {
          fontSize: t.fontSize.md,
          fontWeight: t.fontWeight.semibold,
          marginTop: t.space[4],
          marginBottom: t.space[1],
          color: t.color.text.primary,
          [bp]: {
            marginTop: t.space[3],
          },
        },
        '& h2, & h3, & h4, & h5, & h6': {
          position: 'relative',
        },
        '& p': {
          marginBottom: t.space[4],
          [bp]: {
            marginBottom: t.space[3],
          },
        },
        '& ul, & ol': {
          marginBottom: t.space[3],
          paddingLeft: t.space[4],
          [bp]: {
            marginBottom: t.space[2],
            paddingLeft: t.space[3],
          },
        },
        '& li': {
          marginBottom: t.space[1],
        },
        /**
         * Links carry an always-on tinted underline so they're distinguishable from inline `code`
         * (which is mono + color only). On hover the underline snaps to full accent.
         */
        '& a': {
          color: t.color.accent.default,
          textDecoration: 'underline',
          textDecorationThickness: '1px',
          textUnderlineOffset: '3px',
          textDecorationColor: `color-mix(in srgb, ${t.color.accent.default} 40%, transparent)`,
          fontWeight: t.fontWeight.medium,
          transition: t.transition.colorShift,
          '&:hover': {
            color: t.color.accent.hover,
            textDecorationColor: 'currentColor',
          },
          '&:focus-visible': {
            outline: `2px solid ${t.color.border.focus}`,
            outlineOffset: '2px',
            borderRadius: t.radius.sm,
          },
        },
        /**
         * Inline `code` — typographic treatment (mono + tinted color), no box, no underline.
         * Color and font change alone mark it as code; the absence of an underline differentiates it
         * from anchors.
         */
        '& code': {
          fontFamily: t.fontFamily.mono,
          fontSize: '0.92em',
          fontWeight: t.fontWeight.medium,
          color: t.color.accent.hover,
          whiteSpace: 'nowrap',
        },
        '& a code': {
          color: 'inherit',
        },
        /**
         * Alert / callout anchor links inherit the callout's color and invert the underline behavior
         * (always present, removed on hover) so they read as integrated copy, not detached CTAs.
         */
        '& a[data-alert-action]': {
          color: 'inherit',
          fontWeight: 'inherit',
          textDecoration: 'underline',
          textDecorationColor: 'currentColor',
          '&:hover': {
            color: 'inherit',
            textDecoration: 'none',
          },
        },
        '& pre:not([data-codeblock-pre])': {
          fontFamily: t.fontFamily.mono,
          fontSize: t.fontSize.sm,
          lineHeight: 1.6,
          backgroundColor: t.color.background.subtle,
          padding: t.space[3],
          borderRadius: t.radius.md,
          border: `1px solid ${t.color.border.default}`,
          overflow: 'auto',
          marginBottom: t.space[3],
          [bp]: {
            padding: t.space[2],
            marginBottom: t.space[2],
          },
        },
        '& pre code': {
          backgroundColor: 'transparent',
          padding: 0,
          border: 'none',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          color: 'inherit',
          whiteSpace: 'pre',
        },
        /**
         * Fenced code blocks (rendered via `markdownCodeBlockHtml`) sit as siblings of prose.
         * Give them generous breathing room from surrounding prose, but collapse the gap when two
         * blocks sit adjacent — consecutive examples should read as a pair, not two islands.
         */
        '& [data-codeblock]': {
          marginBlock: t.space[5],
          [bp]: {
            marginBlock: t.space[4],
          },
        },
        '& [data-codeblock] + [data-codeblock]': {
          marginTop: t.space[3],
        },
        '& [data-codeblock]:first-child': {
          marginTop: 0,
        },
        '& [data-codeblock]:last-child': {
          marginBottom: 0,
        },
        /** Brutalist callout — full ink border + hard shadow offset, no side stripe. */
        '& blockquote': {
          margin: `${t.space[5]} 0`,
          padding: `${t.space[4]} ${t.space[5]}`,
          border: `${t.borderWidth.default} solid ${t.color.border.strong}`,
          backgroundColor: t.color.background.subtle,
          boxShadow: t.shadow.sm,
          color: t.color.text.primary,
          fontStyle: 'normal',
          [bp]: {
            margin: `${t.space[4]} 0`,
            padding: `${t.space[3]} ${t.space[4]}`,
          },
        },
        '& blockquote p': {
          marginBottom: t.space[2],
        },
        '& blockquote p:last-child': {
          marginBottom: 0,
        },
        '& kbd': {
          fontFamily: t.fontFamily.mono,
          fontSize: t.fontSize.sm,
          fontWeight: t.fontWeight.medium,
          padding: `2px ${t.space[2]}`,
          borderRadius: t.radius.sm,
          border: `1px solid ${t.color.border.strong}`,
          backgroundColor: t.color.background.surface,
          boxShadow: `0 1px 0 ${t.color.border.default}`,
          whiteSpace: 'nowrap',
        },
        '& [data-docs-badge]': {
          display: 'inline-flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          fontSize: t.fontSize.sm,
          fontWeight: t.fontWeight.medium,
          lineHeight: 1.2,
          padding: `2px ${t.space[2]}`,
          borderRadius: t.radius.full,
          border: `1px solid ${t.color.border.default}`,
          backgroundColor: t.color.background.subtle,
          color: t.color.text.primary,
          verticalAlign: '0.08em',
        },
        '& [data-docs-badge][data-docs-badge-tone="success"]': {
          borderColor: `color-mix(in srgb, ${t.color.success.default} 45%, ${t.color.border.default})`,
          backgroundColor: `color-mix(in srgb, ${t.color.success.default} 14%, ${t.color.background.surface})`,
          color: `color-mix(in srgb, ${t.color.success.default} 85%, ${t.color.text.primary})`,
        },
        '& [data-docs-badge][data-docs-badge-tone="warning"]': {
          borderColor: `color-mix(in srgb, ${t.color.warning.default} 45%, ${t.color.border.default})`,
          backgroundColor: `color-mix(in srgb, ${t.color.warning.default} 16%, ${t.color.background.surface})`,
          color: `color-mix(in srgb, ${t.color.warning.default} 75%, ${t.color.text.primary})`,
        },
        '& [data-docs-badge][data-docs-badge-tone="danger"]': {
          borderColor: `color-mix(in srgb, ${t.color.danger.default} 45%, ${t.color.border.default})`,
          backgroundColor: `color-mix(in srgb, ${t.color.danger.default} 12%, ${t.color.background.surface})`,
          color: `color-mix(in srgb, ${t.color.danger.default} 80%, ${t.color.text.primary})`,
        },
        '& [data-docs-badge][data-docs-badge-tone="info"]': {
          borderColor: `color-mix(in srgb, ${t.color.accent.default} 45%, ${t.color.border.default})`,
          backgroundColor: `color-mix(in srgb, ${t.color.accent.default} 12%, ${t.color.background.surface})`,
          color: `color-mix(in srgb, ${t.color.accent.default} 75%, ${t.color.text.primary})`,
        },
        '& hr': {
          borderTop: `1px solid ${t.color.border.default}`,
          borderRight: 'none',
          borderBottom: 'none',
          borderLeft: 'none',
          margin: `${t.space[5]} 0`,
          [bp]: {
            margin: `${t.space[4]} 0`,
          },
        },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          marginBlock: `${t.space[4]} ${t.space[5]}`,
          fontSize: t.fontSize.sm,
          border: `${t.borderWidth.default} solid ${t.color.border.strong}`,
        },
        '& thead': {
          backgroundColor: t.color.background.subtle,
          borderBottom: `${t.borderWidth.thick} solid ${t.color.border.strong}`,
        },
        '& th, & td': {
          textAlign: 'left',
          padding: `${t.space[2]} ${t.space[3]}`,
          borderBottom: `1px solid ${t.color.border.default}`,
          verticalAlign: 'top',
        },
        '& th': {
          fontWeight: t.fontWeight.bold,
          fontSize: t.fontSize.xs,
          color: t.color.text.primary,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: t.fontFamily.mono,
        },
        '& tr:last-child td': {
          borderBottom: 'none',
        },
        '& caption': {
          captionSide: 'bottom',
          paddingTop: t.space[2],
          fontSize: t.fontSize.sm,
          color: t.color.text.secondary,
          textAlign: 'left',
        },
        '& [data-prose-heading-anchor]': {
          marginLeft: t.space[2],
          fontWeight: t.fontWeight.medium,
          color: t.color.text.secondary,
          textDecoration: 'none',
          opacity: 0,
          transition: `opacity var(--duration-medium) var(--easing-standard), color var(--duration-medium) var(--easing-standard)`,
        },
        '& [data-prose-heading-anchor]::before': {
          content: '"#"',
          fontSize: '0.85em',
        },
        '& :is(h1, h2, h3, h4, h5, h6):hover [data-prose-heading-anchor]': {
          opacity: 1,
        },
        '& [data-prose-heading-anchor]:focus-visible': {
          opacity: 1,
          outline: `2px solid ${t.color.border.focus}`,
          outlineOffset: '2px',
          borderRadius: t.radius.sm,
        },
      },
      tableWrap: {
        overflowX: 'auto',
        marginBottom: t.space[3],
        WebkitOverflowScrolling: 'touch',
      },
      headingAnchor: {},
    },
  },
});
