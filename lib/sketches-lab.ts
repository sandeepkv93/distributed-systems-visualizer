export interface BloomFilterState {
  sizeM: number;
  hashCountK: number;
  bits: boolean[];
  insertedKeys: string[];
}

export interface BloomQueryResult {
  key: string;
  indices: number[];
  probablyPresent: boolean;
  actuallyInserted: boolean;
  isFalsePositive: boolean;
}

export interface CountMinState {
  depthD: number;
  widthW: number;
  matrix: number[][];
  trueCounts: Record<string, number>;
  totalEvents: number;
}

export interface CountMinQueryResult {
  key: string;
  positions: Array<{ row: number; col: number; cellValue: number }>;
  estimatedCount: number;
  trueCount: number;
  overestimation: number;
}

export interface HyperLogLogMetrics {
  precisionP: number;
  registerCountM: number;
  hllMemoryKb: number;
  exactHashSetMb: number;
  compressionRatio: number;
  standardErrorPct: number;
  sampleRegisters: number[];
  harmonicMeanEstimate: number;
}

function fnv1aHash(str: string, seed: number): number {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

export function bloomHashIndices(key: string, sizeM: number, hashCountK: number): number[] {
  const h1 = fnv1aHash(key, 0x811c9dc5);
  const h2 = fnv1aHash(key, 0x9e3779b1) | 1; // ensure odd step
  const indices: number[] = [];
  for (let i = 0; i < hashCountK; i++) {
    indices.push(((h1 + i * h2) >>> 0) % sizeM);
  }
  return indices;
}

export function createBloomFilter(sizeM: number = 32, hashCountK: number = 3): BloomFilterState {
  const m = Math.max(8, Math.min(128, Math.floor(sizeM)));
  const k = Math.max(1, Math.min(7, Math.floor(hashCountK)));
  return {
    sizeM: m,
    hashCountK: k,
    bits: Array.from({ length: m }, () => false),
    insertedKeys: [],
  };
}

export function bloomInsert(state: BloomFilterState, rawKey: string): BloomFilterState {
  const key = rawKey.trim();
  if (!key) return state;
  const bits = [...state.bits];
  const indices = bloomHashIndices(key, state.sizeM, state.hashCountK);
  for (const idx of indices) {
    bits[idx] = true;
  }
  const insertedKeys = state.insertedKeys.includes(key)
    ? state.insertedKeys
    : [...state.insertedKeys, key];
  return { ...state, bits, insertedKeys };
}

export function bloomQuery(state: BloomFilterState, rawKey: string): BloomQueryResult {
  const key = rawKey.trim();
  const indices = bloomHashIndices(key, state.sizeM, state.hashCountK);
  const probablyPresent = indices.every((idx) => state.bits[idx]);
  const actuallyInserted = state.insertedKeys.includes(key);
  return {
    key,
    indices,
    probablyPresent,
    actuallyInserted,
    isFalsePositive: probablyPresent && !actuallyInserted,
  };
}

export function computeBloomTheoreticalFpr(
  sizeM: number,
  hashCountK: number,
  itemCountN: number
): number {
  if (itemCountN <= 0 || sizeM <= 0) return 0;
  const p = Math.pow(1 - Math.exp((-hashCountK * itemCountN) / sizeM), hashCountK);
  return Number((p * 100).toFixed(2));
}

export function createCountMinSketch(depthD: number = 4, widthW: number = 10): CountMinState {
  return {
    depthD,
    widthW,
    matrix: Array.from({ length: depthD }, () => Array.from({ length: widthW }, () => 0)),
    trueCounts: {},
    totalEvents: 0,
  };
}

export function cmsIncrement(
  state: CountMinState,
  rawKey: string,
  delta: number = 1
): CountMinState {
  const key = rawKey.trim();
  if (!key || delta <= 0) return state;
  const matrix = state.matrix.map((row) => [...row]);
  for (let r = 0; r < state.depthD; r++) {
    const col = fnv1aHash(key, 10007 * (r + 1)) % state.widthW;
    matrix[r][col] += delta;
  }
  return {
    ...state,
    matrix,
    trueCounts: {
      ...state.trueCounts,
      [key]: (state.trueCounts[key] ?? 0) + delta,
    },
    totalEvents: state.totalEvents + delta,
  };
}

export function cmsQuery(state: CountMinState, rawKey: string): CountMinQueryResult {
  const key = rawKey.trim();
  const positions: Array<{ row: number; col: number; cellValue: number }> = [];
  let minVal = Number.POSITIVE_INFINITY;
  for (let r = 0; r < state.depthD; r++) {
    const col = fnv1aHash(key, 10007 * (r + 1)) % state.widthW;
    const cellValue = state.matrix[r][col];
    positions.push({ row: r, col, cellValue });
    if (cellValue < minVal) minVal = cellValue;
  }
  const estimatedCount = Number.isFinite(minVal) ? minVal : 0;
  const trueCount = state.trueCounts[key] ?? 0;
  return {
    key,
    positions,
    estimatedCount,
    trueCount,
    overestimation: Math.max(0, estimatedCount - trueCount),
  };
}

export function evaluateHyperLogLog(
  distinctItems: number,
  precisionP: number
): HyperLogLogMetrics {
  const n = Math.max(1000, Math.min(1_000_000_000, distinctItems));
  const p = Math.max(10, Math.min(16, Math.round(precisionP)));
  const registerCountM = Math.pow(2, p);
  // 6 bits per register (Redis HyperLogLog standard)
  const hllMemoryKb = Number(((registerCountM * 6) / 8 / 1024).toFixed(2));
  // Exact HashSet storing 32 bytes/entry (16B UUID/hash + 16B pointer/bucket overhead)
  const exactHashSetMb = Number(((n * 32) / (1024 * 1024)).toFixed(2));
  const compressionRatio = Math.max(1, Math.round((exactHashSetMb * 1024) / hllMemoryKb));
  const standardErrorPct = Number(((1.04 / Math.sqrt(registerCountM)) * 100).toFixed(2));

  // Illustrative 16-bucket leading-zero register profile scaled to log2(n / 16)
  const expectedRho = Math.max(1, Math.round(Math.log2(n / 16)));
  const offsets = [0, 1, -1, 0, 2, 0, -1, 1, 0, 0, 1, -1, 0, 2, 0, -1];
  const sampleRegisters = offsets.map((o) => Math.max(1, Math.min(32, expectedRho + o)));

  // Standard HLL harmonic mean formula on the 16-register demo
  const alpha16 = 0.673;
  const harmonicSum = sampleRegisters.reduce((acc, r) => acc + Math.pow(2, -r), 0);
  const harmonicMeanEstimate = Math.round(alpha16 * 16 * 16 * (1 / harmonicSum));

  return {
    precisionP: p,
    registerCountM,
    hllMemoryKb,
    exactHashSetMb,
    compressionRatio,
    standardErrorPct,
    sampleRegisters,
    harmonicMeanEstimate,
  };
}
