import { variant } from 'typestyles';
import type { StylesApi } from 'typestyles';
import type { ReferenceTokens } from './tokens';

export function createReferenceComponents(styles: StylesApi, t: ReferenceTokens) {
  // 1. Button — dimensioned variants + compound variants
  const button = styles.component({
    name: 'button',
    variants: {
      intent: variant.enum(['primary', 'secondary', 'ghost', 'danger'], { default: 'primary' }),
      size: variant.enum(['sm', 'md', 'lg'], { default: 'md' }),
    },
    styles: {
      base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.space[2],
        padding: `${t.space[2]} ${t.space[4]}`,
        borderRadius: t.radius.md,
        fontSize: t.typography.fontSize.sm,
        fontWeight: t.typography.fontWeight.medium,
        fontFamily: t.typography.fontFamily.sans,
        cursor: 'pointer',
        border: 'none',
        transition: `background-color ${t.duration.fast} ${t.easing.standard}`,
        '&:hover': { opacity: '0.9' },
        '&:focus-visible': { outline: `2px solid ${t.color.borderFocus}`, outlineOffset: '2px' },
        '&:disabled': { opacity: '0.5', cursor: 'not-allowed' },
      },
      compoundVariants: [
        {
          variants: { intent: 'primary', size: 'lg' },
          style: { fontWeight: t.typography.fontWeight.semibold },
        },
      ],
      variants: {
        intent: {
          primary: { backgroundColor: t.color.primary, color: t.color.textOnAccent },
          secondary: {
            backgroundColor: t.color.surfaceOverlay,
            color: t.color.text,
            border: `1px solid ${t.color.border}`,
          },
          ghost: { backgroundColor: 'transparent', color: t.color.text },
          danger: { backgroundColor: t.color.danger, color: t.color.textOnAccent },
        },
        size: {
          sm: { padding: `${t.space[1]} ${t.space[3]}`, fontSize: t.typography.fontSize.xs },
          md: { padding: `${t.space[2]} ${t.space[4]}`, fontSize: t.typography.fontSize.sm },
          lg: { padding: `${t.space[3]} ${t.space[6]}`, fontSize: t.typography.fontSize.md },
        },
      },
    },
  });

  // 2. Card — flat variants
  const card = styles.component({
    name: 'card',
    variants: {
      elevated: variant.boolean({ default: false }),
      interactive: variant.boolean({ default: false }),
      compact: variant.boolean({ default: false }),
    },
    styles: {
      base: {
        backgroundColor: t.color.surface,
        borderRadius: t.radius.lg,
        border: `1px solid ${t.color.border}`,
        padding: t.space[6],
        fontFamily: t.typography.fontFamily.sans,
      },
      variants: {
        elevated: { true: { boxShadow: t.shadow.md }, false: {} },
        interactive: {
          true: {
            cursor: 'pointer',
            '&:hover': { borderColor: t.color.borderStrong, boxShadow: t.shadow.sm },
          },
          false: {},
        },
        compact: { true: { padding: t.space[4] }, false: {} },
      },
    },
  });

  // 3. Input
  const input = styles.component({
    name: 'input',
    variants: {
      size: variant.enum(['sm', 'md', 'lg'], { default: 'md' }),
      state: variant.enum(['error', 'success'], { default: 'error' }),
    },
    styles: {
      base: {
        display: 'block',
        width: '100%',
        padding: `${t.space[2]} ${t.space[3]}`,
        borderRadius: t.radius.md,
        border: `1px solid ${t.color.border}`,
        fontSize: t.typography.fontSize.sm,
        fontFamily: t.typography.fontFamily.sans,
        color: t.color.text,
        backgroundColor: t.color.surface,
        transition: `border-color ${t.duration.fast} ${t.easing.standard}`,
        '&:focus': {
          borderColor: t.color.borderFocus,
          outline: 'none',
          boxShadow: `0 0 0 3px rgba(37,99,235,0.1)`,
        },
        '&::placeholder': { color: t.color.textMuted },
      },
      variants: {
        size: {
          sm: { padding: `${t.space[1]} ${t.space[2]}`, fontSize: t.typography.fontSize.xs },
          md: { padding: `${t.space[2]} ${t.space[3]}`, fontSize: t.typography.fontSize.sm },
          lg: { padding: `${t.space[3]} ${t.space[4]}`, fontSize: t.typography.fontSize.md },
        },
        state: {
          error: {
            borderColor: t.color.danger,
            '&:focus': { boxShadow: '0 0 0 3px rgba(220,38,38,0.1)' },
          },
          success: { borderColor: t.color.success },
        },
      },
    },
  });

  // 4. Badge — dimensioned
  const badge = styles.component({
    name: 'badge',
    variants: {
      tone: variant.enum(['neutral', 'primary', 'danger', 'success', 'warning'], {
        default: 'neutral',
      }),
      size: variant.enum(['sm', 'md'], { default: 'sm' }),
    },
    styles: {
      base: {
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: t.radius.full,
        fontSize: t.typography.fontSize.xs,
        fontWeight: t.typography.fontWeight.medium,
        fontFamily: t.typography.fontFamily.sans,
        lineHeight: '1',
        whiteSpace: 'nowrap',
      },
      variants: {
        tone: {
          neutral: { backgroundColor: t.color.surfaceOverlay, color: t.color.textSecondary },
          primary: { backgroundColor: '#dbeafe', color: t.color.primary },
          danger: { backgroundColor: t.color.dangerSubtle, color: t.color.danger },
          success: { backgroundColor: t.color.successSubtle, color: t.color.success },
          warning: { backgroundColor: t.color.warningSubtle, color: t.color.warning },
        },
        size: {
          sm: { padding: `${t.space[0.5]} ${t.space[2]}` },
          md: { padding: `${t.space[1]} ${t.space[2.5]}` },
        },
      },
    },
  });

  // 5. Avatar
  const avatar = styles.component({
    name: 'avatar',
    variants: { size: variant.enum(['xs', 'sm', 'md', 'lg', 'xl'], { default: 'md' }) },
    styles: {
      base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: t.radius.full,
        backgroundColor: t.color.surfaceOverlay,
        color: t.color.textSecondary,
        fontWeight: t.typography.fontWeight.medium,
        fontFamily: t.typography.fontFamily.sans,
        overflow: 'hidden',
        flexShrink: '0',
        '& img': { width: '100%', height: '100%', objectFit: 'cover' },
      },
      variants: {
        size: {
          xs: { width: '24px', height: '24px', fontSize: t.typography.fontSize.xs },
          sm: { width: '32px', height: '32px', fontSize: t.typography.fontSize.xs },
          md: { width: '40px', height: '40px', fontSize: t.typography.fontSize.sm },
          lg: { width: '48px', height: '48px', fontSize: t.typography.fontSize.md },
          xl: { width: '64px', height: '64px', fontSize: t.typography.fontSize.xl },
        },
      },
    },
  });

  // 6. Checkbox — flat
  const checkbox = styles.component({
    name: 'checkbox',
    variants: { disabled: variant.boolean({ default: false }) },
    styles: {
      base: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space[2],
        cursor: 'pointer',
        fontSize: t.typography.fontSize.sm,
        fontFamily: t.typography.fontFamily.sans,
        '& input': {
          appearance: 'none',
          width: '16px',
          height: '16px',
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.sm,
          cursor: 'pointer',
        },
        '& input:checked': { backgroundColor: t.color.primary, borderColor: t.color.primary },
      },
      variants: { disabled: { true: { opacity: '0.5', cursor: 'not-allowed' }, false: {} } },
    },
  });

  // 7. Radio
  const radio = styles.component({
    name: 'radio',
    variants: { disabled: variant.boolean({ default: false }) },
    styles: {
      base: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space[2],
        cursor: 'pointer',
        fontSize: t.typography.fontSize.sm,
        fontFamily: t.typography.fontFamily.sans,
        '& input': {
          appearance: 'none',
          width: '16px',
          height: '16px',
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.full,
          cursor: 'pointer',
        },
        '& input:checked': { borderColor: t.color.primary, borderWidth: '5px' },
      },
      variants: { disabled: { true: { opacity: '0.5', cursor: 'not-allowed' }, false: {} } },
    },
  });

  // 8. Switch/Toggle
  const toggle = styles.component({
    name: 'toggle',
    variants: { disabled: variant.boolean({ default: false }) },
    styles: {
      base: {
        position: 'relative',
        display: 'inline-block',
        width: '44px',
        height: '24px',
        borderRadius: t.radius.full,
        backgroundColor: t.color.surfaceOverlay,
        border: `1px solid ${t.color.border}`,
        cursor: 'pointer',
        transition: `background-color ${t.duration.fast} ${t.easing.standard}`,
        '&[data-checked]': { backgroundColor: t.color.primary, borderColor: t.color.primary },
      },
      variants: { disabled: { true: { opacity: '0.5', cursor: 'not-allowed' }, false: {} } },
    },
  });

  // 9. Select
  const select = styles.component({
    name: 'select',
    variants: { size: variant.enum(['sm', 'md', 'lg'], { default: 'md' }) },
    styles: {
      base: {
        display: 'block',
        width: '100%',
        padding: `${t.space[2]} ${t.space[3]}`,
        paddingRight: t.space[10],
        borderRadius: t.radius.md,
        border: `1px solid ${t.color.border}`,
        fontSize: t.typography.fontSize.sm,
        fontFamily: t.typography.fontFamily.sans,
        color: t.color.text,
        backgroundColor: t.color.surface,
        appearance: 'none',
        '&:focus': { borderColor: t.color.borderFocus, outline: 'none' },
      },
      variants: {
        size: {
          sm: { padding: `${t.space[1]} ${t.space[2]}`, fontSize: t.typography.fontSize.xs },
          md: { padding: `${t.space[2]} ${t.space[3]}` },
          lg: { padding: `${t.space[3]} ${t.space[4]}`, fontSize: t.typography.fontSize.md },
        },
      },
    },
  });

  // 10. Textarea
  const textarea = styles.component({
    name: 'textarea',
    variants: { error: variant.boolean({ default: false }) },
    styles: {
      base: {
        display: 'block',
        width: '100%',
        minHeight: '80px',
        padding: `${t.space[2]} ${t.space[3]}`,
        borderRadius: t.radius.md,
        border: `1px solid ${t.color.border}`,
        fontSize: t.typography.fontSize.sm,
        fontFamily: t.typography.fontFamily.sans,
        color: t.color.text,
        backgroundColor: t.color.surface,
        resize: 'vertical',
        '&:focus': { borderColor: t.color.borderFocus, outline: 'none' },
      },
      variants: { error: { true: { borderColor: t.color.danger }, false: {} } },
    },
  });

  // 11. Label
  const label = styles.component({
    name: 'label',
    variants: { required: variant.boolean({ default: false }) },
    styles: {
      base: {
        display: 'block',
        fontSize: t.typography.fontSize.sm,
        fontWeight: t.typography.fontWeight.medium,
        fontFamily: t.typography.fontFamily.sans,
        color: t.color.text,
        marginBottom: t.space[1],
      },
      variants: {
        required: { true: { '&::after': { content: '" *"', color: t.color.danger } }, false: {} },
      },
    },
  });

  // 12. Alert — dimensioned
  const alert = styles.component({
    name: 'alert',
    variants: { tone: variant.enum(['info', 'success', 'warning', 'danger'], { default: 'info' }) },
    styles: {
      base: {
        display: 'flex',
        gap: t.space[3],
        padding: t.space[4],
        borderRadius: t.radius.md,
        fontSize: t.typography.fontSize.sm,
        fontFamily: t.typography.fontFamily.sans,
        lineHeight: t.typography.lineHeight.normal,
      },
      variants: {
        tone: {
          info: {
            backgroundColor: t.color.infoSubtle,
            color: t.color.info,
            border: `1px solid ${t.color.info}`,
          },
          success: {
            backgroundColor: t.color.successSubtle,
            color: t.color.success,
            border: `1px solid ${t.color.success}`,
          },
          warning: {
            backgroundColor: t.color.warningSubtle,
            color: t.color.warning,
            border: `1px solid ${t.color.warning}`,
          },
          danger: {
            backgroundColor: t.color.dangerSubtle,
            color: t.color.danger,
            border: `1px solid ${t.color.danger}`,
          },
        },
      },
    },
  });

  // 13. Dialog/Modal
  const dialog = styles.component({
    name: 'dialog',
    variants: { size: variant.enum(['sm', 'md', 'lg', 'fullscreen'], { default: 'md' }) },
    styles: {
      base: {
        position: 'fixed',
        inset: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: t.zIndex.modal,
      },
      variants: {
        size: {
          sm: { '& [data-dialog-content]': { maxWidth: '400px' } },
          md: { '& [data-dialog-content]': { maxWidth: '560px' } },
          lg: { '& [data-dialog-content]': { maxWidth: '720px' } },
          fullscreen: {
            '& [data-dialog-content]': { maxWidth: '100vw', maxHeight: '100vh', borderRadius: '0' },
          },
        },
      },
    },
  });

  // 14. Dialog overlay
  const dialogOverlay = styles.class('dialog-overlay', {
    position: 'fixed',
    inset: '0',
    backgroundColor: t.color.overlay,
    zIndex: t.zIndex.modal,
  });

  // 15. Dialog content
  const dialogContent = styles.class('dialog-content', {
    backgroundColor: t.color.surface,
    borderRadius: t.radius.xl,
    boxShadow: t.shadow.xl,
    padding: t.space[6],
    maxHeight: '85vh',
    overflow: 'auto',
    position: 'relative',
    width: '100%',
  });

  // 16. Dropdown menu
  const dropdown = styles.component({
    name: 'dropdown',
    variants: { align: variant.enum(['start', 'end', 'center'], { default: 'start' }) },
    styles: {
      base: {
        position: 'absolute',
        backgroundColor: t.color.surface,
        borderRadius: t.radius.lg,
        border: `1px solid ${t.color.border}`,
        boxShadow: t.shadow.lg,
        padding: `${t.space[1]} 0`,
        zIndex: t.zIndex.dropdown,
        minWidth: '180px',
      },
      variants: {
        align: {
          start: { left: '0' },
          end: { right: '0' },
          center: { left: '50%', transform: 'translateX(-50%)' },
        },
      },
    },
  });

  // 17. Dropdown item
  const dropdownItem = styles.class('dropdown-item', {
    display: 'flex',
    alignItems: 'center',
    gap: t.space[2],
    padding: `${t.space[2]} ${t.space[3]}`,
    fontSize: t.typography.fontSize.sm,
    fontFamily: t.typography.fontFamily.sans,
    color: t.color.text,
    cursor: 'pointer',
    '&:hover': { backgroundColor: t.color.surfaceOverlay },
    '&[data-disabled]': { opacity: '0.5', cursor: 'not-allowed' },
  });

  // 18. Tabs
  const tabs = styles.component({
    name: 'tabs',
    variants: { variant: variant.enum(['underline', 'pill'], { default: 'underline' }) },
    styles: {
      base: {
        display: 'flex',
        borderBottom: `1px solid ${t.color.border}`,
        gap: t.space[1],
        fontFamily: t.typography.fontFamily.sans,
      },
      variants: {
        variant: {
          underline: {},
          pill: {
            borderBottom: 'none',
            backgroundColor: t.color.surfaceOverlay,
            borderRadius: t.radius.lg,
            padding: t.space[1],
          },
        },
      },
    },
  });

  // 19. Tab trigger
  const tabTrigger = styles.component({
    name: 'tab-trigger',
    variants: { variant: variant.enum(['underline', 'pill'], { default: 'underline' }) },
    styles: {
      base: {
        padding: `${t.space[2]} ${t.space[4]}`,
        fontSize: t.typography.fontSize.sm,
        fontWeight: t.typography.fontWeight.medium,
        color: t.color.textSecondary,
        cursor: 'pointer',
        border: 'none',
        backgroundColor: 'transparent',
        transition: `color ${t.duration.fast} ${t.easing.standard}`,
        '&[data-active]': { color: t.color.primary, borderBottom: `2px solid ${t.color.primary}` },
        '&:hover': { color: t.color.text },
      },
      variants: {
        variant: {
          underline: {},
          pill: {
            borderRadius: t.radius.md,
            '&[data-active]': {
              backgroundColor: t.color.surface,
              borderBottom: 'none',
              boxShadow: t.shadow.sm,
            },
          },
        },
      },
    },
  });

  // 20. Tooltip
  const tooltip = styles.class('tooltip', {
    position: 'absolute',
    backgroundColor: t.color.text,
    color: t.color.surface,
    padding: `${t.space[1]} ${t.space[2]}`,
    borderRadius: t.radius.md,
    fontSize: t.typography.fontSize.xs,
    fontFamily: t.typography.fontFamily.sans,
    whiteSpace: 'nowrap',
    zIndex: t.zIndex.tooltip,
    pointerEvents: 'none',
  });

  // 21. Popover
  const popover = styles.class('popover', {
    position: 'absolute',
    backgroundColor: t.color.surface,
    borderRadius: t.radius.lg,
    border: `1px solid ${t.color.border}`,
    boxShadow: t.shadow.lg,
    padding: t.space[4],
    zIndex: t.zIndex.popover,
  });

  // 22. Table
  const table = styles.class('table', {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: t.typography.fontSize.sm,
    fontFamily: t.typography.fontFamily.sans,
    '& th': {
      textAlign: 'left',
      padding: `${t.space[3]} ${t.space[4]}`,
      fontWeight: t.typography.fontWeight.semibold,
      borderBottom: `2px solid ${t.color.border}`,
      color: t.color.textSecondary,
    },
    '& td': { padding: `${t.space[3]} ${t.space[4]}`, borderBottom: `1px solid ${t.color.border}` },
    '& tbody tr:hover': { backgroundColor: t.color.surfaceRaised },
  });

  // 23. Pagination
  const pagination = styles.class('pagination', {
    display: 'flex',
    alignItems: 'center',
    gap: t.space[1],
    fontFamily: t.typography.fontFamily.sans,
  });

  // 24. Pagination button
  const paginationButton = styles.component({
    name: 'pagination-btn',
    variants: {
      active: variant.boolean({ default: false }),
      disabled: variant.boolean({ default: false }),
    },
    styles: {
      base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: t.radius.md,
        border: `1px solid ${t.color.border}`,
        backgroundColor: t.color.surface,
        fontSize: t.typography.fontSize.sm,
        cursor: 'pointer',
        '&:hover': { backgroundColor: t.color.surfaceOverlay },
      },
      variants: {
        active: {
          true: {
            backgroundColor: t.color.primary,
            color: t.color.textOnAccent,
            borderColor: t.color.primary,
          },
          false: {},
        },
        disabled: { true: { opacity: '0.5', cursor: 'not-allowed' }, false: {} },
      },
    },
  });

  // 25. Breadcrumb
  const breadcrumb = styles.class('breadcrumb', {
    display: 'flex',
    alignItems: 'center',
    gap: t.space[2],
    fontSize: t.typography.fontSize.sm,
    fontFamily: t.typography.fontFamily.sans,
    color: t.color.textSecondary,
    '& a': {
      color: t.color.textSecondary,
      textDecoration: 'none',
      '&:hover': { color: t.color.text },
    },
    '& [data-current]': { color: t.color.text, fontWeight: t.typography.fontWeight.medium },
  });

  // 26. Sidebar nav
  const sidebar = styles.component({
    name: 'sidebar',
    variants: { expanded: variant.boolean({ default: false }) },
    styles: {
      base: {
        display: 'flex',
        flexDirection: 'column',
        width: '240px',
        padding: t.space[4],
        borderRight: `1px solid ${t.color.border}`,
        backgroundColor: t.color.surface,
        fontFamily: t.typography.fontFamily.sans,
        '@media (max-width: 768px)': {
          position: 'fixed',
          left: '0',
          top: '0',
          bottom: '0',
          zIndex: t.zIndex.sticky,
          transform: 'translateX(-100%)',
        },
      },
      variants: {
        expanded: {
          true: { '@media (max-width: 768px)': { transform: 'translateX(0)' } },
          false: {},
        },
      },
    },
  });

  // 27. Nav item
  const navItem = styles.component({
    name: 'nav-item',
    variants: { active: variant.boolean({ default: false }) },
    styles: {
      base: {
        display: 'flex',
        alignItems: 'center',
        gap: t.space[2],
        padding: `${t.space[2]} ${t.space[3]}`,
        borderRadius: t.radius.md,
        fontSize: t.typography.fontSize.sm,
        color: t.color.textSecondary,
        textDecoration: 'none',
        transition: `background-color ${t.duration.fast} ${t.easing.standard}`,
        '&:hover': { backgroundColor: t.color.surfaceOverlay, color: t.color.text },
      },
      variants: {
        active: {
          true: {
            backgroundColor: t.color.surfaceOverlay,
            color: t.color.primary,
            fontWeight: t.typography.fontWeight.medium,
          },
          false: {},
        },
      },
    },
  });

  // 28. Header
  const header = styles.class('header', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${t.space[4]} ${t.space[6]}`,
    borderBottom: `1px solid ${t.color.border}`,
    backgroundColor: t.color.surface,
    fontFamily: t.typography.fontFamily.sans,
    position: 'sticky',
    top: '0',
    zIndex: t.zIndex.sticky,
  });

  // 29. Footer
  const footer = styles.class('footer', {
    padding: `${t.space[8]} ${t.space[6]}`,
    borderTop: `1px solid ${t.color.border}`,
    backgroundColor: t.color.surfaceRaised,
    fontSize: t.typography.fontSize.sm,
    color: t.color.textSecondary,
    fontFamily: t.typography.fontFamily.sans,
  });

  // 30. Text — dimensioned
  const text = styles.component({
    name: 'text',
    variants: {
      size: variant.enum(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'], { default: 'md' }),
      weight: variant.enum(['normal', 'medium', 'semibold', 'bold'], { default: 'normal' }),
      tone: variant.enum(['default', 'secondary', 'muted', 'danger', 'success'], {
        default: 'default',
      }),
      align: variant.enum(['left', 'center', 'right'], { default: 'left' }),
    },
    styles: {
      base: {
        fontFamily: t.typography.fontFamily.sans,
        color: t.color.text,
        lineHeight: t.typography.lineHeight.normal,
      },
      variants: {
        size: {
          xs: { fontSize: t.typography.fontSize.xs },
          sm: { fontSize: t.typography.fontSize.sm },
          md: { fontSize: t.typography.fontSize.md },
          lg: { fontSize: t.typography.fontSize.lg },
          xl: { fontSize: t.typography.fontSize.xl },
          '2xl': { fontSize: t.typography.fontSize['2xl'] },
          '3xl': { fontSize: t.typography.fontSize['3xl'] },
        },
        weight: {
          normal: { fontWeight: t.typography.fontWeight.normal },
          medium: { fontWeight: t.typography.fontWeight.medium },
          semibold: { fontWeight: t.typography.fontWeight.semibold },
          bold: { fontWeight: t.typography.fontWeight.bold },
        },
        tone: {
          default: { color: t.color.text },
          secondary: { color: t.color.textSecondary },
          muted: { color: t.color.textMuted },
          danger: { color: t.color.danger },
          success: { color: t.color.success },
        },
        align: {
          left: { textAlign: 'left' },
          center: { textAlign: 'center' },
          right: { textAlign: 'right' },
        },
      },
    },
  });

  // 31. Heading
  const heading = styles.component({
    name: 'heading',
    variants: { level: variant.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], { default: 'h2' }) },
    styles: {
      base: {
        fontFamily: t.typography.fontFamily.sans,
        fontWeight: t.typography.fontWeight.bold,
        color: t.color.text,
        lineHeight: t.typography.lineHeight.tight,
      },
      variants: {
        level: {
          h1: { fontSize: t.typography.fontSize['4xl'] },
          h2: { fontSize: t.typography.fontSize['3xl'] },
          h3: { fontSize: t.typography.fontSize['2xl'] },
          h4: { fontSize: t.typography.fontSize.xl },
          h5: { fontSize: t.typography.fontSize.lg },
          h6: { fontSize: t.typography.fontSize.md },
        },
      },
    },
  });

  // 32. Link
  const link = styles.component({
    name: 'link',
    variants: { variant: variant.enum(['default', 'subtle'], { default: 'default' }) },
    styles: {
      base: {
        color: t.color.primary,
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
        fontFamily: t.typography.fontFamily.sans,
        '&:hover': { color: t.color.primaryHover },
      },
      variants: {
        variant: {
          default: {},
          subtle: {
            color: t.color.textSecondary,
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline', color: t.color.text },
          },
        },
      },
    },
  });

  // 33. Separator/Divider
  const separator = styles.component({
    name: 'separator',
    variants: { orientation: variant.enum(['horizontal', 'vertical'], { default: 'horizontal' }) },
    styles: {
      base: { border: 'none', borderTop: `1px solid ${t.color.border}`, margin: `${t.space[4]} 0` },
      variants: {
        orientation: {
          horizontal: { width: '100%' },
          vertical: {
            borderTop: 'none',
            borderLeft: `1px solid ${t.color.border}`,
            height: '100%',
            margin: `0 ${t.space[4]}`,
          },
        },
      },
    },
  });

  // 34. Skeleton loader
  const skeleton = styles.component({
    name: 'skeleton',
    variants: { variant: variant.enum(['text', 'circle', 'rect'], { default: 'text' }) },
    styles: {
      base: {
        backgroundColor: t.color.surfaceOverlay,
        borderRadius: t.radius.md,
        overflow: 'hidden',
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: '0',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        },
      },
      variants: {
        variant: {
          text: { height: '1em', width: '100%' },
          circle: { borderRadius: t.radius.full },
          rect: {},
        },
      },
    },
  });

  // 35. Progress bar
  const progress = styles.component({
    name: 'progress',
    variants: {
      tone: variant.enum(['primary', 'success', 'danger', 'warning'], { default: 'primary' }),
      size: variant.enum(['sm', 'md', 'lg'], { default: 'md' }),
    },
    styles: {
      base: {
        width: '100%',
        height: '8px',
        backgroundColor: t.color.surfaceOverlay,
        borderRadius: t.radius.full,
        overflow: 'hidden',
        '& [data-bar]': {
          height: '100%',
          borderRadius: t.radius.full,
          transition: `width ${t.duration.slow} ${t.easing.decelerate}`,
        },
      },
      variants: {
        tone: {
          primary: { '& [data-bar]': { backgroundColor: t.color.primary } },
          success: { '& [data-bar]': { backgroundColor: t.color.success } },
          danger: { '& [data-bar]': { backgroundColor: t.color.danger } },
          warning: { '& [data-bar]': { backgroundColor: t.color.warning } },
        },
        size: {
          sm: { height: '4px' },
          md: { height: '8px' },
          lg: { height: '12px' },
        },
      },
    },
  });

  // 36. Spinner
  const spinner = styles.class('spinner', {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '2px solid transparent',
    borderTopColor: t.color.primary,
    borderRadius: t.radius.full,
  });

  // 37. Tag/Chip
  const tag = styles.component({
    name: 'tag',
    variants: { removable: variant.boolean({ default: false }) },
    styles: {
      base: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space[1],
        padding: `${t.space[0.5]} ${t.space[2]}`,
        borderRadius: t.radius.full,
        fontSize: t.typography.fontSize.xs,
        fontFamily: t.typography.fontFamily.sans,
        border: `1px solid ${t.color.border}`,
        backgroundColor: t.color.surface,
        color: t.color.textSecondary,
      },
      variants: {
        removable: {
          true: {
            paddingRight: t.space[1],
            '& [data-remove]': { cursor: 'pointer', '&:hover': { color: t.color.danger } },
          },
          false: {},
        },
      },
    },
  });

  // 38. Toast notification
  const toast = styles.component({
    name: 'toast',
    variants: { tone: variant.enum(['info', 'success', 'warning', 'danger'], { default: 'info' }) },
    styles: {
      base: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: t.space[3],
        padding: t.space[4],
        borderRadius: t.radius.lg,
        backgroundColor: t.color.surface,
        boxShadow: t.shadow.lg,
        border: `1px solid ${t.color.border}`,
        fontFamily: t.typography.fontFamily.sans,
        fontSize: t.typography.fontSize.sm,
        maxWidth: '420px',
      },
      variants: {
        tone: {
          info: { borderLeftWidth: '4px', borderLeftColor: t.color.info },
          success: { borderLeftWidth: '4px', borderLeftColor: t.color.success },
          warning: { borderLeftWidth: '4px', borderLeftColor: t.color.warning },
          danger: { borderLeftWidth: '4px', borderLeftColor: t.color.danger },
        },
      },
    },
  });

  // 39. Accordion
  const accordion = styles.class('accordion', {
    borderRadius: t.radius.lg,
    border: `1px solid ${t.color.border}`,
    overflow: 'hidden',
    fontFamily: t.typography.fontFamily.sans,
  });

  // 40. Accordion item
  const accordionItem = styles.component({
    name: 'accordion-item',
    variants: { open: variant.boolean({ default: false }) },
    styles: {
      base: {
        borderBottom: `1px solid ${t.color.border}`,
        '&:last-child': { borderBottom: 'none' },
      },
      variants: { open: { true: {}, false: {} } },
    },
  });

  // 41. Accordion trigger
  const accordionTrigger = styles.class('accordion-trigger', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: `${t.space[4]} ${t.space[4]}`,
    fontSize: t.typography.fontSize.sm,
    fontWeight: t.typography.fontWeight.medium,
    color: t.color.text,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    '&:hover': { backgroundColor: t.color.surfaceRaised },
  });

  // 42. Code block
  const codeBlock = styles.class('code-block', {
    display: 'block',
    padding: t.space[4],
    borderRadius: t.radius.lg,
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    fontSize: t.typography.fontSize.sm,
    fontFamily: t.typography.fontFamily.mono,
    lineHeight: t.typography.lineHeight.relaxed,
    overflow: 'auto',
    whiteSpace: 'pre',
    tabSize: '2',
  });

  // 43. Inline code
  const inlineCode = styles.class('inline-code', {
    padding: `${t.space[0.5]} ${t.space[1]}`,
    borderRadius: t.radius.sm,
    backgroundColor: t.color.surfaceOverlay,
    fontFamily: t.typography.fontFamily.mono,
    fontSize: '0.875em',
    color: t.color.danger,
  });

  // 44. Container — responsive layout
  const container = styles.component({
    name: 'container',
    variants: { size: variant.enum(['sm', 'md', 'lg', 'xl'], { default: 'sm' }) },
    styles: {
      base: {
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: t.space[4],
        paddingRight: t.space[4],
        '@media (min-width: 640px)': { maxWidth: '640px' },
        '@media (min-width: 768px)': { maxWidth: '768px' },
        '@media (min-width: 1024px)': { maxWidth: '1024px' },
        '@media (min-width: 1280px)': { maxWidth: '1280px' },
      },
      variants: {
        size: {
          sm: { '@media (min-width: 640px)': { maxWidth: '640px' } },
          md: { '@media (min-width: 768px)': { maxWidth: '768px' } },
          lg: { '@media (min-width: 1024px)': { maxWidth: '1024px' } },
          xl: { '@media (min-width: 1280px)': { maxWidth: '1280px' } },
        },
      },
    },
  });

  // 45. Grid layout
  const grid = styles.component({
    name: 'grid',
    variants: { cols: variant.enum(['1', '2', '3', '4'], { default: '1' }) },
    styles: {
      base: { display: 'grid', gap: t.space[4] },
      variants: {
        cols: {
          '1': { gridTemplateColumns: '1fr' },
          '2': { gridTemplateColumns: 'repeat(2, 1fr)' },
          '3': { gridTemplateColumns: 'repeat(3, 1fr)' },
          '4': { gridTemplateColumns: 'repeat(4, 1fr)' },
        },
      },
    },
  });

  // 46. Stack (flex column)
  const stack = styles.component({
    name: 'stack',
    variants: {
      gap: variant.enum(['xs', 'sm', 'md', 'lg', 'xl'], { default: 'md' }),
      align: variant.enum(['start', 'center', 'end', 'stretch'], { default: 'stretch' }),
    },
    styles: {
      base: { display: 'flex', flexDirection: 'column' },
      variants: {
        gap: {
          xs: { gap: t.space[1] },
          sm: { gap: t.space[2] },
          md: { gap: t.space[4] },
          lg: { gap: t.space[6] },
          xl: { gap: t.space[8] },
        },
        align: {
          start: { alignItems: 'flex-start' },
          center: { alignItems: 'center' },
          end: { alignItems: 'flex-end' },
          stretch: { alignItems: 'stretch' },
        },
      },
    },
  });

  // 47. Inline (flex row)
  const inline = styles.component({
    name: 'inline',
    variants: {
      gap: variant.enum(['xs', 'sm', 'md', 'lg'], { default: 'md' }),
      justify: variant.enum(['start', 'center', 'end', 'between'], { default: 'start' }),
      wrap: variant.enum(['wrap', 'nowrap'], { default: 'wrap' }),
    },
    styles: {
      base: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
      variants: {
        gap: {
          xs: { gap: t.space[1] },
          sm: { gap: t.space[2] },
          md: { gap: t.space[4] },
          lg: { gap: t.space[6] },
        },
        justify: {
          start: { justifyContent: 'flex-start' },
          center: { justifyContent: 'center' },
          end: { justifyContent: 'flex-end' },
          between: { justifyContent: 'space-between' },
        },
        wrap: {
          wrap: { flexWrap: 'wrap' },
          nowrap: { flexWrap: 'nowrap' },
        },
      },
    },
  });

  // 48. Form field wrapper
  const formField = styles.component({
    name: 'form-field',
    variants: { error: variant.boolean({ default: false }) },
    styles: {
      base: {
        display: 'flex',
        flexDirection: 'column',
        gap: t.space[1],
        fontFamily: t.typography.fontFamily.sans,
      },
      variants: {
        error: {
          true: { '& input, & textarea, & select': { borderColor: t.color.danger } },
          false: {},
        },
      },
    },
  });

  // 49. Form helper text
  const helperText = styles.component({
    name: 'helper-text',
    variants: { error: variant.boolean({ default: false }) },
    styles: {
      base: {
        fontSize: t.typography.fontSize.xs,
        fontFamily: t.typography.fontFamily.sans,
        color: t.color.textSecondary,
      },
      variants: { error: { true: { color: t.color.danger }, false: {} } },
    },
  });

  // 50. Visually hidden (accessible utility)
  const visuallyHidden = styles.class('visually-hidden', {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
  });

  return {
    button,
    card,
    input,
    badge,
    avatar,
    checkbox,
    radio,
    toggle,
    select,
    textarea,
    label,
    alert,
    dialog,
    dialogOverlay,
    dialogContent,
    dropdown,
    dropdownItem,
    tabs,
    tabTrigger,
    tooltip,
    popover,
    table,
    pagination,
    paginationButton,
    breadcrumb,
    sidebar,
    navItem,
    header,
    footer,
    text,
    heading,
    link,
    separator,
    skeleton,
    progress,
    spinner,
    tag,
    toast,
    accordion,
    accordionItem,
    accordionTrigger,
    codeBlock,
    inlineCode,
    container,
    grid,
    stack,
    inline,
    formField,
    helperText,
    visuallyHidden,
  };
}

export type ReferenceComponents = ReturnType<typeof createReferenceComponents>;
