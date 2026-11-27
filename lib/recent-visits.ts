const STORAGE_KEY = 'ds-atlas:recent-visits:v1';
const MAX_RECENT = 5;

export interface RecentVisit {
  path: string;
  badge: string;
  title: string;
}

const EMPTY_VISITS: readonly RecentVisit[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedVisits: readonly RecentVisit[] = EMPTY_VISITS;

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeRecentVisits(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getServerRecentVisits(): readonly RecentVisit[] {
  return EMPTY_VISITS;
}

export function getClientRecentVisits(): readonly RecentVisit[] {
  if (typeof window === 'undefined') return EMPTY_VISITS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedVisits;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedVisits = EMPTY_VISITS;
      return cachedVisits;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedVisits = EMPTY_VISITS;
      return cachedVisits;
    }
    cachedVisits = parsed
      .filter(
        (item): item is RecentVisit =>
          Boolean(item) &&
          typeof item.path === 'string' &&
          typeof item.badge === 'string' &&
          typeof item.title === 'string'
      )
      .slice(0, MAX_RECENT);
    return cachedVisits;
  } catch {
    return EMPTY_VISITS;
  }
}

export function recordRecentVisit(visit: RecentVisit): void {
  if (typeof window === 'undefined' || !visit.path || visit.path === '/') return;
  const current = getClientRecentVisits();
  const next = [visit, ...current.filter((item) => item.path !== visit.path)].slice(0, MAX_RECENT);
  try {
    const serialized = JSON.stringify(next);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    cachedRaw = serialized;
    cachedVisits = next;
    notify();
  } catch {
    // Ignore storage quota or private-browsing errors
  }
}
