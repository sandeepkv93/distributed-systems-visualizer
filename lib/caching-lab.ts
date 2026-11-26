import { CONCEPTS_CATALOG } from './catalog';

export type CachePatternId = 'cache-aside' | 'write-through' | 'write-behind' | 'read-through';
export type StampedeDefenseId = 'none' | 'singleflight' | 'xfetch' | 'memcache-leases';

export interface CachePatternSpec {
  id: CachePatternId;
  name: string;
  readPath: string;
  writePath: string;
  consistencyRisk: string;
  bestFor: string;
  staleWindow: 'Low' | 'Medium' | 'High';
  writeLatency: 'Low' | 'Medium' | 'High';
  conceptIds: readonly string[];
}

export interface StampedeParams {
  hotKeyRps: number;
  dbQueryMs: number;
  dbCapacityRps: number;
  appInstances: number;
  defense: StampedeDefenseId;
}

export interface StampedeTick {
  tick: number;
  expiredAtTick: boolean;
  unprotectedOriginRps: number;
  defendedOriginRps: number;
  dbCapacityRps: number;
}

export interface StampedeSimulationResult {
  ticks: StampedeTick[];
  peakUnprotectedRps: number;
  peakDefendedRps: number;
  unprotectedMeltedDown: boolean;
  defendedStable: boolean;
  reductionFactor: number;
  preventsStaleSetRace: boolean;
  verdict: string;
}

export interface EvictionPolicySpec {
  id: 'lru' | 'lfu' | 'w-tinylfu';
  name: string;
  structure: string;
  weakness: string;
  strength: string;
  hitRateUnderScanPct: number;
}

export const CACHE_PATTERNS: readonly CachePatternSpec[] = [
  {
    id: 'cache-aside',
    name: 'Cache-Aside (Lazy Loading)',
    readPath: 'App checks Cache → on miss reads DB → populates Cache',
    writePath: 'App writes DB → deletes (invalidates) Cache key',
    consistencyRisk: 'Concurrent miss + update can re-populate a stale value unless guarded by Memcache Leases.',
    bestFor: 'Read-heavy general workloads with unpredictable access skew (Memcached / Redis).',
    staleWindow: 'Medium',
    writeLatency: 'Medium',
    conceptIds: ['consistent-hashing', 'eventual-consistency'],
  },
  {
    id: 'write-through',
    name: 'Write-Through',
    readPath: 'App reads directly from Cache (high freshness)',
    writePath: 'App writes Cache → Cache synchronously writes DB before returning',
    consistencyRisk: 'Cache stays warm and consistent, though cold unqueried writes pollute RAM and add 2-hop write latency.',
    bestFor: 'Low-staleness profiles and sessions where freshly written items are read immediately.',
    staleWindow: 'Low',
    writeLatency: 'High',
    conceptIds: ['replication-log', 'quorum-replication'],
  },
  {
    id: 'write-behind',
    name: 'Write-Behind (Write-Back)',
    readPath: 'App reads from Cache with sub-ms latency',
    writePath: 'App writes Cache (acks immediately) → async batch flush to DB later',
    consistencyRisk: 'Cache node crash before async flush causes permanent data loss (RPO > 0) unless WAL-backed.',
    bestFor: 'High-frequency counters, view counts, and coalesced telemetry updates.',
    staleWindow: 'High',
    writeLatency: 'Low',
    conceptIds: ['replication-log', 'eventual-consistency'],
  },
  {
    id: 'read-through',
    name: 'Read-Through Inline Loader',
    readPath: 'App calls Cache → Cache transparently loads DB on miss',
    writePath: 'Paired with Write-Through or explicit TTL invalidation',
    consistencyRisk: 'Simplifies app logic, but hot-key TTL expiry still triggers thundering herds without coalescing.',
    bestFor: 'CDN edge caches, DAX, and library-managed object caches.',
    staleWindow: 'Medium',
    writeLatency: 'Medium',
    conceptIds: ['consistent-hashing', 'load-balancing'],
  },
];

export const STAMPEDE_DEFENSES: ReadonlyArray<{
  id: StampedeDefenseId;
  name: string;
  mechanism: string;
  paperOrOrigin: string;
}> = [
  {
    id: 'none',
    name: 'Unprotected TTL Expiry',
    mechanism: 'Every concurrent cache miss fires an independent origin database query.',
    paperOrOrigin: 'Baseline anti-pattern',
  },
  {
    id: 'singleflight',
    name: 'Singleflight Coalescing',
    mechanism: 'Deduplicates concurrent in-flight misses per app instance (max 1 query per server).',
    paperOrOrigin: 'Go x/sync/singleflight · Envoy Request Coalescing',
  },
  {
    id: 'xfetch',
    name: 'Probabilistic Early Expiry (XFetch)',
    mechanism: 'Triggers 1 background refresh before TTL=0 using −β·Δ·ln(rand) ≥ TTL_rem.',
    paperOrOrigin: 'Vattani, Chierichetti & Lowenstein (VLDB 2015)',
  },
  {
    id: 'memcache-leases',
    name: 'Memcache Leases (Global Token)',
    mechanism: 'Cache issues 1 global 64-bit lease token per key; peers wait 10ms and stale writes are rejected.',
    paperOrOrigin: 'Nishtala et al., Scaling Memcache at Facebook (NSDI 2013)',
  },
];

export const EVICTION_POLICIES: readonly EvictionPolicySpec[] = [
  {
    id: 'lru',
    name: 'LRU (Least Recently Used)',
    structure: 'HashMap + Doubly Linked List (O(1))',
    weakness: 'A single sequential full-table scan flushes the entire hot working set.',
    strength: 'Simple recency bias for bursty temporal workloads.',
    hitRateUnderScanPct: 54,
  },
  {
    id: 'lfu',
    name: 'LFU (Least Frequently Used)',
    structure: 'Frequency Buckets / Heap',
    weakness: 'Historically popular stale keys cling to cache forever without decay.',
    strength: 'Resists one-off scan pollution.',
    hitRateUnderScanPct: 79,
  },
  {
    id: 'w-tinylfu',
    name: 'W-TinyLFU (Caffeine / Modern)',
    structure: '1% Window LRU + 4-bit Count-Min Sketch Admission Filter + SLRU',
    weakness: 'Slightly higher metadata bookkeeping than bare LRU.',
    strength: 'Near-optimal hit ratio under both Zipfian skew and scan bursts with tiny memory overhead.',
    hitRateUnderScanPct: 93,
  },
];

export function simulateCacheStampede(params: StampedeParams): StampedeSimulationResult {
  const hotKeyRps = Math.max(100, Math.min(20000, params.hotKeyRps));
  const dbQueryMs = Math.max(10, Math.min(1000, params.dbQueryMs));
  const dbCapacityRps = Math.max(20, Math.min(2000, params.dbCapacityRps));
  const appInstances = Math.max(1, Math.min(64, params.appInstances));

  const baselineOrigin = Math.round(dbCapacityRps * 0.28);
  // Number of concurrent misses arriving during the origin refill window (dbQueryMs)
  const concurrentMissSpike = Math.round(hotKeyRps * (dbQueryMs / 1000));

  const ticks: StampedeTick[] = [];
  for (let tick = 0; tick < 16; tick++) {
    const expiredAtTick = tick === 5;
    let unprotected = baselineOrigin;
    let defended = baselineOrigin;

    if (tick === 5) {
      unprotected = baselineOrigin + concurrentMissSpike;
    } else if (tick === 6) {
      // Secondary retry/queueing hangover when unprotected spike exceeded DB capacity
      unprotected =
        baselineOrigin +
        (concurrentMissSpike > dbCapacityRps
          ? Math.round(concurrentMissSpike * 0.72)
          : Math.round(concurrentMissSpike * 0.18));
    } else if (tick === 7 && concurrentMissSpike > dbCapacityRps) {
      unprotected = baselineOrigin + Math.round(concurrentMissSpike * 0.35);
    }

    if (params.defense === 'none') {
      defended = unprotected;
    } else if (params.defense === 'singleflight') {
      // At most 1 origin query per app server instance during the miss window
      if (tick === 5) defended = baselineOrigin + Math.min(concurrentMissSpike, appInstances);
      else if (tick === 6) defended = baselineOrigin + Math.round(appInstances * 0.15);
    } else if (params.defense === 'xfetch') {
      // 1 proactive refresh happens at tick 4 before TTL hits 0 at tick 5
      if (tick === 4) defended = baselineOrigin + 2;
      else if (tick === 5) defended = baselineOrigin + 1;
    } else if (params.defense === 'memcache-leases') {
      // Exactly 1 global lease holder queries origin at tick 5; all other clients get cached result
      if (tick === 5) defended = baselineOrigin + 1;
    }

    ticks.push({
      tick,
      expiredAtTick,
      unprotectedOriginRps: unprotected,
      defendedOriginRps: defended,
      dbCapacityRps,
    });
  }

  const peakUnprotectedRps = Math.max(...ticks.map((t) => t.unprotectedOriginRps));
  const peakDefendedRps = Math.max(...ticks.map((t) => t.defendedOriginRps));
  const unprotectedMeltedDown = peakUnprotectedRps > dbCapacityRps;
  const defendedStable = peakDefendedRps <= dbCapacityRps;
  const reductionFactor = Number((peakUnprotectedRps / Math.max(1, peakDefendedRps)).toFixed(1));
  const preventsStaleSetRace = params.defense === 'memcache-leases';

  const verdict =
    params.defense === 'none'
      ? `Unprotected expiry sends ${peakUnprotectedRps} RPS to a ${dbCapacityRps} RPS origin—triggering a classic thundering herd.`
      : params.defense === 'memcache-leases'
      ? `Memcache Leases collapse the stampede to 1 global refill (${peakDefendedRps} RPS total) AND reject concurrent stale-set races.`
      : params.defense === 'xfetch'
      ? `XFetch triggers 1 proactive background recompute before TTL=0, eliminating the synchronized miss cliff completely.`
      : `Singleflight caps origin surge to ${appInstances} query/queries (1 per app node), cutting peak load by ${reductionFactor}×.`;

  return {
    ticks,
    peakUnprotectedRps,
    peakDefendedRps,
    unprotectedMeltedDown,
    defendedStable,
    reductionFactor,
    preventsStaleSetRace,
    verdict,
  };
}

export function getCacheConcept(conceptId: string) {
  return CONCEPTS_CATALOG.find((c) => c.id === conceptId) ?? null;
}
