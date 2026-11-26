export type CompactionStrategy = 'leveled' | 'size-tiered';

export interface StorageParams {
  writePct: number;
  datasetGb: number;
  bloomBitsPerKey: number;
  compactionStrategy: CompactionStrategy;
  bufferPoolHitPct: number;
  recordBytes: number;
}

export interface EngineRumMetrics {
  writeAmplification: number;
  readAmplification: number;
  spaceAmplification: number;
  p99ReadIops: number;
  writeThroughputIndex: number;
  readThroughputIndex: number;
  compositeScore: number;
}

export interface StorageComparisonResult {
  lsmLevels: number;
  btreeHeight: number;
  bloomFalsePositivePct: number;
  lsm: EngineRumMetrics;
  btree: EngineRumMetrics;
  recommended: 'lsm' | 'btree';
  rationale: string;
}

export interface StoragePreset {
  id: 'write-heavy-telemetry' | 'oltp-point-reads' | 'no-bloom-trap' | 'size-tiered-ingest';
  name: string;
  tagline: string;
  params: StorageParams;
}

export interface StorageSimState {
  writesApplied: number;
  memtableFillPct: number;
  l0Tables: number;
  l1Tables: number;
  l2Tables: number;
  compactionsRun: number;
  btreeLeafPages: number;
  btreeAvgFillPct: number;
  btreeSplits: number;
  lastLookupLsmProbes: number;
  lastLookupBtreePages: number;
}

export const STORAGE_PRESETS: readonly StoragePreset[] = [
  {
    id: 'write-heavy-telemetry',
    name: 'Write-Heavy Telemetry (85% W)',
    tagline: 'RocksDB / Cassandra sweet spot: sequential WAL + MemTable absorption',
    params: {
      writePct: 85,
      datasetGb: 250,
      bloomBitsPerKey: 10,
      compactionStrategy: 'leveled',
      bufferPoolHitPct: 45,
      recordBytes: 128,
    },
  },
  {
    id: 'oltp-point-reads',
    name: 'Read-Heavy OLTP (15% W)',
    tagline: 'PostgreSQL / InnoDB sweet spot: hot buffer pool + single-leaf reads',
    params: {
      writePct: 15,
      datasetGb: 100,
      bloomBitsPerKey: 10,
      compactionStrategy: 'leveled',
      bufferPoolHitPct: 88,
      recordBytes: 512,
    },
  },
  {
    id: 'no-bloom-trap',
    name: 'Disabled Bloom Filters (0 b/k)',
    tagline: 'Shows why LSM point lookups degrade across every SSTable without Bloom filters',
    params: {
      writePct: 25,
      datasetGb: 400,
      bloomBitsPerKey: 0,
      compactionStrategy: 'size-tiered',
      bufferPoolHitPct: 60,
      recordBytes: 256,
    },
  },
  {
    id: 'size-tiered-ingest',
    name: 'Size-Tiered Bulk Ingest (90% W)',
    tagline: 'Lowest write amplification in exchange for 2.0× temporary space overhead',
    params: {
      writePct: 90,
      datasetGb: 500,
      bloomBitsPerKey: 8,
      compactionStrategy: 'size-tiered',
      bufferPoolHitPct: 35,
      recordBytes: 128,
    },
  },
];

export const STORAGE_ENGINE_SYSTEMS: ReadonlyArray<{
  name: string;
  engine: 'LSM-Tree' | 'B+Tree';
  implementation: string;
  compactionOrPage: string;
  conceptId: string;
}> = [
  {
    name: 'CockroachDB',
    engine: 'LSM-Tree',
    implementation: 'Pebble (Go RocksDB)',
    compactionOrPage: 'Leveled + Bloom filters',
    conceptId: 'raft',
  },
  {
    name: 'Apache Cassandra',
    engine: 'LSM-Tree',
    implementation: 'JVM SSTables + CommitLog',
    compactionOrPage: 'Size-Tiered / Leveled / TWCS',
    conceptId: 'quorum-replication',
  },
  {
    name: 'TiKV / ScyllaDB',
    engine: 'LSM-Tree',
    implementation: 'RocksDB / Seastar SSTables',
    compactionOrPage: 'Leveled + Partitioned Raft',
    conceptId: 'sharding-rebalancing',
  },
  {
    name: 'PostgreSQL / MySQL InnoDB',
    engine: 'B+Tree',
    implementation: '8KB / 16KB Slotted Pages + WAL',
    compactionOrPage: 'Buffer Pool + MVCC Vacuum',
    conceptId: 'replication-log',
  },
  {
    name: 'etcd (bbolt)',
    engine: 'B+Tree',
    implementation: 'Copy-on-Write 4KB B+Tree',
    compactionOrPage: 'mmap Pages + Raft WAL',
    conceptId: 'distributed-locking',
  },
];

export function computeBloomFpr(bitsPerKey: number): number {
  const b = Math.max(0, Math.min(20, bitsPerKey));
  if (b === 0) return 1;
  const ln2 = Math.LN2;
  return Math.exp(-b * ln2 * ln2);
}

export function evaluateStorageEngines(params: StorageParams): StorageComparisonResult {
  const writeFrac = Math.max(0, Math.min(1, params.writePct / 100));
  const readFrac = 1 - writeFrac;
  const datasetGb = Math.max(1, Math.min(2000, params.datasetGb));
  const recordBytes = Math.max(64, Math.min(2048, params.recordBytes));
  const bufferHit = Math.max(0.05, Math.min(0.98, params.bufferPoolHitPct / 100));

  const bloomFpr = computeBloomFpr(params.bloomBitsPerKey);
  const fanoutT = 10;
  const memtableGb = 0.064;
  const lsmLevels = Math.max(2, Math.min(6, Math.ceil(Math.log(datasetGb / memtableGb) / Math.log(fanoutT))));

  // B+Tree height for 8KB pages (~128 keys per internal node)
  const totalRecords = (datasetGb * 1e9) / recordBytes;
  const btreeHeight = Math.max(3, Math.min(6, Math.ceil(Math.log(totalRecords) / Math.log(128))));

  // LSM RUM metrics
  // Sequential compaction bytes rewritten: Leveled ~ 1 + L*(T/2) / sequential-efficiency, Size-Tiered ~ 1 + L*1.5
  const lsmWriteAmp =
    params.compactionStrategy === 'leveled'
      ? Number((1 + lsmLevels * 3.2).toFixed(1))
      : Number((1 + lsmLevels * 1.4).toFixed(1));

  // Uncached SSTables probed on a point lookup:
  // LSM must check MemTable + L0 runs + level index/filter blocks even with Bloom filters
  const overlappingRuns =
    params.compactionStrategy === 'leveled'
      ? 4 + Math.max(0, lsmLevels - 1)
      : 4 + Math.max(0, lsmLevels - 1) * 3;
  const lsmLevelOverhead = 0.28 + (lsmLevels - 2) * 0.08;
  const lsmReadAmp = Number(
    (1 + lsmLevelOverhead + overlappingRuns * bloomFpr * (1 - bufferHit * 0.35)).toFixed(2)
  );
  const lsmSpaceAmp = params.compactionStrategy === 'leveled' ? 1.12 : 2.05;

  // B+Tree RUM metrics
  // Random 8KB in-place dirty page write + WAL = 1 + (8192 / recordBytes) * 0.62 (amortized checkpointing)
  const pageSize = 8192;
  const btreeWriteAmp = Number((1 + (pageSize / recordBytes) * 0.62).toFixed(1));
  // Single deterministic root-to-leaf path; internal nodes stay resident in buffer pool
  const btreeReadAmp = Number(
    (1 + (1 - bufferHit) * (0.85 + (btreeHeight - 2) * 0.25)).toFixed(2)
  );
  const btreeSpaceAmp = 1.42;

  // Relative throughput indices (higher is better)
  const lsmWriteThroughput = Math.round(1000 / (lsmWriteAmp * 0.35)); // sequential I/O advantage
  const btreeWriteThroughput = Math.round(1000 / (btreeWriteAmp * 1.0)); // random 8KB page penalty

  const lsmReadThroughput = Math.round(1000 / (lsmReadAmp * 1.1));
  const btreeReadThroughput = Math.round(1000 / (btreeReadAmp * 0.85));

  const lsmComposite = Math.round(writeFrac * lsmWriteThroughput + readFrac * lsmReadThroughput);
  const btreeComposite = Math.round(
    writeFrac * btreeWriteThroughput + readFrac * btreeReadThroughput
  );

  const recommended: 'lsm' | 'btree' = lsmComposite >= btreeComposite ? 'lsm' : 'btree';
  const rationale =
    recommended === 'lsm'
      ? `At ${params.writePct}% writes with ${recordBytes}B records, LSM sequential WAL + MemTable absorption avoids B+Tree 8KB random-page write amplification (${btreeWriteAmp}× vs ${lsmWriteAmp}× sequential).`
      : `At ${Math.round(readFrac * 100)}% point reads and ${params.bufferPoolHitPct}% buffer-pool hit rate, B+Tree single-leaf lookups (${btreeReadAmp}×) outperform multi-level SSTable probes (${lsmReadAmp}×).`;

  return {
    lsmLevels,
    btreeHeight,
    bloomFalsePositivePct: Number((bloomFpr * 100).toFixed(2)),
    lsm: {
      writeAmplification: lsmWriteAmp,
      readAmplification: lsmReadAmp,
      spaceAmplification: lsmSpaceAmp,
      p99ReadIops: Number((lsmReadAmp * 1.6).toFixed(1)),
      writeThroughputIndex: lsmWriteThroughput,
      readThroughputIndex: lsmReadThroughput,
      compositeScore: lsmComposite,
    },
    btree: {
      writeAmplification: btreeWriteAmp,
      readAmplification: btreeReadAmp,
      spaceAmplification: btreeSpaceAmp,
      p99ReadIops: Number((btreeReadAmp * 1.2).toFixed(1)),
      writeThroughputIndex: btreeWriteThroughput,
      readThroughputIndex: btreeReadThroughput,
      compositeScore: btreeComposite,
    },
    recommended,
    rationale,
  };
}

export function createInitialStorageSim(): StorageSimState {
  return {
    writesApplied: 0,
    memtableFillPct: 20,
    l0Tables: 1,
    l1Tables: 2,
    l2Tables: 4,
    compactionsRun: 0,
    btreeLeafPages: 4,
    btreeAvgFillPct: 68,
    btreeSplits: 0,
    lastLookupLsmProbes: 1,
    lastLookupBtreePages: 1,
  };
}

export function applyWriteBatch(state: StorageSimState): StorageSimState {
  let mem = state.memtableFillPct + 45;
  let l0 = state.l0Tables;
  let l1 = state.l1Tables;
  let l2 = state.l2Tables;
  let compactions = state.compactionsRun;

  if (mem >= 100) {
    mem -= 100;
    l0 += 1;
  }
  // Auto-trigger compaction if L0 crosses 4 SSTables
  if (l0 >= 5) {
    l0 = 1;
    l1 += 2;
    compactions += 1;
    if (l1 >= 8) {
      l1 = 3;
      l2 += 4;
    }
  }

  let fill = state.btreeAvgFillPct + 14;
  let leaves = state.btreeLeafPages;
  let splits = state.btreeSplits;
  if (fill >= 95) {
    fill = 55;
    leaves += 2;
    splits += 1;
  }

  return {
    ...state,
    writesApplied: state.writesApplied + 1000,
    memtableFillPct: mem,
    l0Tables: l0,
    l1Tables: l1,
    l2Tables: l2,
    compactionsRun: compactions,
    btreeLeafPages: leaves,
    btreeAvgFillPct: fill,
    btreeSplits: splits,
  };
}

export function triggerManualCompaction(state: StorageSimState): StorageSimState {
  if (state.l0Tables === 0 && state.l1Tables <= 2) return state;
  const mergedL1 = Math.max(2, Math.min(8, state.l1Tables + Math.max(1, Math.ceil(state.l0Tables / 2))));
  return {
    ...state,
    l0Tables: 0,
    l1Tables: mergedL1 >= 6 ? 3 : mergedL1,
    l2Tables: mergedL1 >= 6 ? state.l2Tables + 3 : state.l2Tables,
    compactionsRun: state.compactionsRun + 1,
  };
}

export function simulatePointLookup(
  state: StorageSimState,
  bloomBitsPerKey: number
): StorageSimState {
  const fpr = computeBloomFpr(bloomBitsPerKey);
  const candidateTables = state.l0Tables + 2;
  const lsmProbes = Math.max(1, Math.round(1 + candidateTables * fpr));
  return {
    ...state,
    lastLookupLsmProbes: lsmProbes,
    lastLookupBtreePages: 1,
  };
}
