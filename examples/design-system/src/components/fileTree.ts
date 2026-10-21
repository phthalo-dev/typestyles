import { recipe } from '../runtime';
import { designTokens as t } from '../tokens';

export const fileTree = recipe({
  name: 'fileTree',
  slots: ['root', 'list', 'item', 'listNested', 'row', 'folder', 'file'] as const,
  styles: {
    base: {
      root: {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: t.fontSize.sm,
        lineHeight: 1.5,
        color: t.color.text.primary,
        margin: `${t.space[3]} 0`,
        padding: t.space[3],
        borderRadius: t.radius.md,
        border: `1px solid ${t.color.border.default}`,
        backgroundColor: t.color.background.subtle,
        overflowX: 'auto',
      },
      list: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
      },
      item: {
        listStyle: 'none',
        margin: 0,
        padding: 0,
      },
      listNested: {
        listStyle: 'none',
        marginTop: t.space[1],
        marginRight: 0,
        marginBottom: 0,
        marginLeft: 0,
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: t.space[4],
        borderLeft: `1px solid ${t.color.border.default}`,
      },
      row: {
        display: 'block',
        padding: `${t.space[1]} 0`,
        color: t.color.text.primary,
      },
      folder: {
        fontWeight: t.fontWeight.semibold,
        color: t.color.text.primary,
      },
      file: {
        color: t.color.text.secondary,
      },
    },
  },
});
