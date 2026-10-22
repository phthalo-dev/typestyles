import { designTokens as t } from '@examples/design-system';
import { docsNavLinkInteraction } from './docsNavLink';
import { recipe } from './typestyles';

const bp = '@media (max-width: 768px)';
const desktop = '@media (min-width: 769px)';

const siteHeaderHeight = `calc(${t.space[8]} + ${t.space[2]})`;

const sidebarBase = recipe({
  name: 'docs-sidebar',
  slots: [
    'root',
    'rootOpen',
    'backdrop',
    'backdropVisible',
    'header',
    'logo',
    'logoAccent',
    'searchWrapper',
    'searchIcon',
    'searchKbd',
    'searchTrigger',
    'nav',
    'section',
    'sectionTitle',
    'sectionTitleFirst',
    'link',
    'linkActive',
    'footer',
    'themeFieldLabel',
    'themeSelect',
    'themeToggle',
  ] as const,
  styles: {
    base: {
      root: {
        width: '280px',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: `${t.borderWidth.thick} solid ${t.color.border.strong}`,
        'html[data-style="ai-glow"] &': {
          backgroundColor: `color-mix(in oklch, ${t.color.background.surface} 78%, transparent)`,
          backgroundImage: `radial-gradient(circle at 20% 10%, color-mix(in oklch, #F0ABFC 18%, transparent) 0 4rem, transparent 10rem),
          radial-gradient(circle at 90% 70%, color-mix(in oklch, #67E8F9 14%, transparent) 0 4rem, transparent 10rem)`,
          backdropFilter: 'blur(18px) saturate(1.25)',
          boxShadow: '8px 0 36px color-mix(in oklch, #7C3AED 10%, transparent)',
        },
        'html[data-style="windows-95"] &': {
          backgroundColor: t.color.background.surface,
          borderRight: `${t.borderWidth.default} solid ${t.color.shadow.offset}`,
          boxShadow: `inset 1px 0 0 ${t.color.background.elevated}`,
        },
        'html[data-style="classic-system"] &': {
          backgroundColor: t.color.background.surface,
          backgroundImage: `repeating-linear-gradient(45deg, transparent 0 2px, ${t.color.background.subtle} 2px 4px)`,
        },
        'html[data-style="new-wave"] &': {
          borderRightWidth: '3px',
        },
        [desktop]: {
          top: siteHeaderHeight,
          height: `calc(100vh - ${siteHeaderHeight})`,
          alignSelf: 'flex-start',
        },
        [bp]: {
          position: 'fixed',
          height: 'auto',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 200,
          transform: 'translateX(-100%)',
          visibility: 'hidden',
          backgroundColor: t.color.background.app,
        },
      },
      rootOpen: {
        [bp]: {
          transform: 'translateX(0)',
          visibility: 'visible',
        },
      },
      backdrop: {
        display: 'none',
        [bp]: {
          display: 'block',
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          backgroundColor: t.color.overlay.default,
          opacity: 0,
          visibility: 'hidden',
        },
      },
      backdropVisible: {
        [bp]: {
          opacity: 1,
          visibility: 'visible',
        },
      },
      header: {
        display: 'flex',
        alignItems: 'center',
        padding: `${t.space[5]} ${t.space[5]} ${t.space[4]}`,
        [desktop]: {
          display: 'none',
        },
      },
      logo: {
        fontSize: t.fontSize.xl,
        fontWeight: t.fontWeight.bold,
        color: t.color.text.primary,
        textDecoration: 'none',
        letterSpacing: '-0.03em',
        textTransform: 'uppercase',
        '&:hover': { color: t.color.accent.default },
      },
      logoAccent: {
        color: t.color.accent.default,
      },
      searchWrapper: {
        position: 'relative',
        borderTop: `${t.borderWidth.thick} solid ${t.color.border.strong}`,
        borderBottom: `${t.borderWidth.thick} solid ${t.color.border.strong}`,
        [desktop]: {
          display: 'none',
        },
      },
      searchIcon: {
        position: 'absolute',
        left: `calc(${t.space[2]} + 2px)`,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: t.color.text.placeholder,
        pointerEvents: 'none',
        lineHeight: 0,
      },
      searchKbd: {
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        aspectRatio: 1,
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: t.fontSize.xs,
        color: t.color.text.placeholder,
        backgroundColor: t.color.accent.subtle,
        paddingInline: t.space[2],
        fontFamily: t.fontFamily.sans,
        lineHeight: 1,
        pointerEvents: 'none',
      },
      searchTrigger: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        margin: 0,
        padding: `${t.space[2]} ${t.space[4]} ${t.space[2]} 32px`,
        fontSize: t.fontSize.sm,
        fontFamily: t.fontFamily.sans,
        textAlign: 'left',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        border: 'none',
        color: t.color.text.secondary,
        outline: 'none',
        '&:hover': {
          backgroundColor: t.color.background.subtle,
          color: t.color.text.primary,
        },
        '&:focus-visible': {
          outline: `${t.borderWidth.thin} solid ${t.color.accent.default}`,
          outlineOffset: '-2px',
        },
      },
      nav: {
        flex: 1,
        overflowY: 'auto',
        paddingBlock: t.space[2],
      },
      section: {
        /**
         * Use the parent flex gap + section dividers to create the spine feeling; no bottom margin
         * needed because we put the separator on the section title itself.
         */
      },
      sectionTitle: {
        fontFamily: t.fontFamily.mono,
        fontSize: t.fontSize.xs,
        fontWeight: t.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: t.color.text.secondary,
        padding: `${t.space[4]} ${t.space[5]} ${t.space[2]}`,
        marginTop: t.space[3],
        borderTop: t.stroke.default,
      },
      sectionTitleFirst: {
        borderTop: 'none',
        marginTop: 0,
      },
      link: {
        display: 'block',
        boxSizing: 'border-box',
        fontSize: t.fontSize.md,
        color: t.color.text.secondary,
        textDecoration: 'none',
        padding: `6px ${t.space[5]}`,
        zIndex: 2,
        '&:hover': { ...docsNavLinkInteraction.hover },
      },
      linkActive: {
        position: 'relative',
        zIndex: 1,
        ...docsNavLinkInteraction.current,
        '&:hover': { ...docsNavLinkInteraction.hover },
      },
      footer: {
        padding: `${t.space[4]} ${t.space[5]}`,
        borderTop: `${t.borderWidth.thick} solid ${t.color.border.strong}`,
        display: 'flex',
        flexDirection: 'column',
        gap: t.space[2],
      },
      themeFieldLabel: {
        fontSize: t.fontSize.xs,
        fontWeight: t.fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: t.color.text.placeholder,
      },
      themeSelect: {
        width: '100%',
        padding: `${t.space[2]} ${t.space[4]}`,
        fontSize: t.fontSize.sm,
        fontFamily: t.fontFamily.sans,
        backgroundColor: t.color.background.surface,
        border: `${t.borderWidth.default} solid ${t.color.border.strong}`,
        color: t.color.text.primary,
        cursor: 'pointer',
        outline: 'none',
        boxShadow: t.shadow.xs,
        '&:focus': {
          outline: `${t.borderWidth.thin} solid ${t.color.accent.default}`,
          outlineOffset: 0,
        },
        /**
         * Chromium+: fully style the closed control + dropdown via customizable `<select>`.
         * Other engines keep the classic native picker (footer control stays usable).
         */
        '@supports (appearance: base-select)': {
          appearance: 'base-select',
          borderRadius: t.radius.none,
          border: `${t.borderWidth.thick} solid ${t.color.border.strong}`,
          boxShadow: t.shadow.sm,
          '&::picker(select)': {
            appearance: 'base-select',
            backgroundColor: t.color.background.surface,
            color: t.color.text.primary,
            border: `${t.borderWidth.thick} solid ${t.color.border.strong}`,
            borderRadius: t.radius.none,
            boxShadow: t.shadow.md,
            padding: t.space[1],
            marginBlockStart: t.space[2],
          },
          '& option': {
            padding: `${t.space[2]} ${t.space[3]}`,
            fontSize: t.fontSize.sm,
            fontFamily: t.fontFamily.sans,
            borderRadius: t.radius.none,
            cursor: 'pointer',
          },
          '& option:hover': {
            backgroundColor: t.color.background.subtle,
          },
          '& option:focus': {
            backgroundColor: t.color.background.subtle,
            outline: 'none',
          },
          '& option:checked': {
            backgroundColor: t.color.accent.subtle,
            color: t.color.text.primary,
            fontWeight: t.fontWeight.medium,
          },
          '&:open::picker-icon': {
            transform: 'rotate(180deg)',
          },
        },
      },
      themeToggle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.space[2],
        width: '100%',
        padding: `7px ${t.space[4]}`,
        fontSize: t.fontSize.sm,
        color: t.color.text.primary,
        backgroundColor: t.color.background.surface,
        border: `${t.borderWidth.default} solid ${t.color.border.strong}`,
        cursor: 'pointer',
        fontFamily: t.fontFamily.sans,
        boxShadow: t.shadow.xs,
        '&:hover': {
          backgroundColor: t.color.background.subtle,
        },
      },
    },
  },
});

export const sidebar = sidebarBase;
