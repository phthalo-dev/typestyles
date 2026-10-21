import { designTokens as t } from '@examples/design-system';
import { recipe } from './typestyles';

const bp = '@media (max-width: 768px)';
const desktop = '@media (min-width: 769px)';
const tocBp = '@media (min-width: 1024px)';

/** Offset for fixed docs site header (`space.8` + `space.2` = 56px). */
const siteHeaderHeight = `calc(${t.space[8]} + ${t.space[2]})`;

const layoutBase = recipe({
  name: 'docs-layout',
  slots: [
    'sidebarShell',
    'sidebarShellHiddenDesktop',
    'root',
    'content',
    'main',
    'mainLanding',
    'docPageWrap',
    'docPageWrapWithToc',
    'mainColumn',
    'tocAside',
  ] as const,
  styles: {
    base: {
      sidebarShell: {
        flexShrink: 0,
        alignSelf: 'stretch',
      },
      sidebarShellHiddenDesktop: {
        [desktop]: {
          display: 'none',
        },
      },
      root: {
        display: 'flex',
        minHeight: '100vh',
        color: t.color.text.primary,
        backgroundColor: t.color.background.app,
        paddingTop: siteHeaderHeight,
      },
      content: {
        flex: 1,
        minWidth: 0,
        'html[data-style="ai-glow"] &': {
          backgroundImage: `linear-gradient(115deg, color-mix(in oklch, #F0ABFC 30%, transparent), transparent 24%, color-mix(in oklch, #67E8F9 28%, transparent) 50%, color-mix(in oklch, #FDE68A 20%, transparent) 72%, transparent)`,
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% min(760px, 80vh)',
        },
      },
      main: {
        /** ~68ch of JetBrains Mono body after 48px padding on each side. */
        maxWidth: '720px',
        padding: t.space[8],
        [bp]: {
          padding: `${t.space[5]} ${t.space[4]}`,
        },
      },
      mainLanding: {
        maxWidth: 'min(1120px, 100%)',
        margin: '0 auto',
        width: '100%',
        padding: t.space[8],
        [bp]: {
          padding: `${t.space[5]} ${t.space[4]}`,
        },
      },
      docPageWrap: {
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
      },
      docPageWrapWithToc: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gridTemplateAreas: '"toc" "main"',
        [tocBp]: {
          gridTemplateColumns: 'minmax(0, 1fr) 200px',
          gridTemplateAreas: '"main toc"',
          gap: t.space[8],
          alignItems: 'start',
        },
      },
      mainColumn: {
        gridArea: 'main',
        minWidth: 0,
      },
      tocAside: {
        gridArea: 'toc',
        minWidth: 0,
        [tocBp]: {
          justifySelf: 'end',
          width: '200px',
          position: 'sticky',
          top: `calc(${siteHeaderHeight} + ${t.space[5]})`,
          maxHeight: `calc(100vh - ${siteHeaderHeight} - ${t.space[5]} - ${t.space[2]})`,
          overflowY: 'auto',
          paddingTop: t.space[2],
          paddingRight: t.space[1],
        },
      },
    },
  },
});

export const layout = layoutBase;
