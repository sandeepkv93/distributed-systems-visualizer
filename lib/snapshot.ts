export interface Snapshotable<TSnapshot = unknown> {
  serialize(): TSnapshot;
  restore(snapshot: TSnapshot): void;
}

export interface SnapshotAdapter<TSnapshot = unknown> {
  capture: () => TSnapshot;
  restore: (snapshot: TSnapshot) => void;
}

/**
 * Deeply clones plain values, arrays, Dates, Maps, and Sets so algorithm
 * snapshots remain completely immutable across forward and backward steps.
 */
export function cloneSnapshot<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneSnapshot(item)) as unknown as T;
  }

  if (value instanceof Map) {
    const clonedMap = new Map();
    value.forEach((entryValue, entryKey) => {
      clonedMap.set(cloneSnapshot(entryKey), cloneSnapshot(entryValue));
    });
    return clonedMap as unknown as T;
  }

  if (value instanceof Set) {
    const clonedSet = new Set();
    value.forEach((entryValue) => {
      clonedSet.add(cloneSnapshot(entryValue));
    });
    return clonedSet as unknown as T;
  }

  const clonedObj: Record<string, unknown> = {};
  for (const [key, propValue] of Object.entries(value as Record<string, unknown>)) {
    clonedObj[key] = cloneSnapshot(propValue);
  }
  return clonedObj as T;
}
