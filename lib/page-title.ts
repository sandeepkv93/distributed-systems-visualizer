import { CONCEPTS_BY_ID } from './catalog';
import { getLabByPath, TOTAL_LABS } from './labs-catalog';

export const DEFAULT_PAGE_TITLE =
  'Distributed Systems Atlas — Interactive Protocol Monograph';

/**
 * Resolves a concise, tab-friendly document title for any Atlas route.
 */
export function getPageTitleForPath(pathname: string): string {
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  if (normalizedPath === '/') {
    return DEFAULT_PAGE_TITLE;
  }

  if (normalizedPath === '/labs') {
    return `Workbenches Directory (${TOTAL_LABS}) — DS Atlas`;
  }

  const slug = normalizedPath.replace(/^\/+/, '');
  const concept = CONCEPTS_BY_ID.get(slug);
  if (concept) {
    return `Plate ${concept.plateNumber} · ${concept.name} — DS Atlas`;
  }

  const lab = getLabByPath(normalizedPath);
  if (lab) {
    return `${lab.navTitle} — DS Atlas`;
  }

  return DEFAULT_PAGE_TITLE;
}
