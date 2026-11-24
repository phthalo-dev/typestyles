import type { DocsSearchItem } from '@var-ui/docs/utils';
import { toKitSearchItems } from './kitNav';
import { buildSearchIndex } from './searchIndex';

let cached: Promise<DocsSearchItem[]> | undefined;

/** Search rows for the kit command palette; built once per build/dev process, not per page. */
export function getKitSearchItems(): Promise<DocsSearchItem[]> {
  cached ??= buildSearchIndex().then(toKitSearchItems);
  return cached;
}
