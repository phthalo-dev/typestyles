import { designTokens as t } from '@var-ui/core';
import { recipe } from './typestyles';

/**
 * Layout for the live demo frame. Chrome comes from the kit: `SegmentedControl` (variants), `stage`
 * (preview surface, applied in `LiveDemo.astro`) and `codeBlock` markup (every code panel). Only
 * the two preview elements below are demo content: their classes are replaced per variant.
 */
export const liveDemo = recipe({
  name: 'docs-live-demo',
  slots: [
    'root',
    'header',
    'headerText',
    'title',
    'caption',
    'preview',
    'previewButton',
    'previewCard',
    'panels',
    'panel',
    'detailsGrid',
  ] as const,
  styles: {
    base: {
      root: {
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.sm.var,
        marginBlock: `${t.space.lg.var} ${t.space.xl.var}`,
        minWidth: 0,
      },
      header: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: t.space.sm.var,
      },
      headerText: {
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.xxs.var,
        minWidth: 0,
        flex: '1 1 12rem',
      },
      title: {
        margin: 0,
        fontSize: t.fontSize.sm.var,
        fontWeight: t.fontWeight.semibold.var,
        color: t.color.text.primary.var,
      },
      caption: {
        margin: 0,
        fontSize: t.fontSize.xs.var,
        lineHeight: 1.45,
        color: t.color.text.secondary.var,
        maxWidth: '42ch',
      },
      preview: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '7rem',
        padding: `${t.space.lg.var} ${t.space.md.var}`,
        border: `${t.borderWidth.default.var} solid ${t.color.border.default.var}`,
        borderRadius: t.radius.lg.var,
        overflow: 'hidden',
      },
      previewButton: {
        font: 'inherit',
      },
      previewCard: {
        minWidth: '200px',
        textAlign: 'center',
        fontSize: t.fontSize.sm.var,
      },
      panels: {
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.sm.var,
        minWidth: 0,
      },
      panel: {
        minWidth: 0,
        '& [data-codeblock-pre]': {
          maxHeight: '16rem',
          overflow: 'auto',
        },
      },
      detailsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: t.space.sm.var,
        minWidth: 0,
        '@media (max-width: 560px)': {
          gridTemplateColumns: '1fr',
        },
      },
    },
  },
});
