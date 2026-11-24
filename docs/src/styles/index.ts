import { proseContent } from '@examples/design-system';

/** Compose with `doc.content` on markdown bodies — registers prose CSS before doc overrides. */
export const docProseRoot = proseContent.root;

export { layout } from './layout';
export { sidebar } from './sidebar';
export { siteHeader } from './siteHeader';
export { appearanceControls } from './appearanceControls';
export { doc } from './doc';
export { skipLink } from './skipLink';
export { toc } from './toc';
export { docPage } from './docPage';
export { docAiActions } from './docAiActions';
export { home } from './home';
export { liveDemo } from './liveDemo';
export { playground } from './playground';
export * from './global';
import './legacyThemeBridge';
