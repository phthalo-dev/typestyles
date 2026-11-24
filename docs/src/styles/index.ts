import { docsArticleProse } from '@var-ui/docs/styles';

/**
 * Classes for a rendered markdown body: the kit's docs reading style (`prose` + `docsProse`).
 * Compose with `doc.content` (heading permalinks, wrapping inline code).
 */
export const docProseRoot = docsArticleProse()
  .map((part) => part.className)
  .join(' ');

export { doc } from './doc';
export { docPage } from './docPage';
export { docAiActions } from './docAiActions';
export { home } from './home';
export { liveDemo } from './liveDemo';
export { playground } from './playground';
export * from './global';
