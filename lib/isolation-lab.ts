import { CONCEPTS_CATALOG } from './catalog';

export type IsolationLevelId =
  | 'read-uncommitted'
  | 'read-committed'
  | 'repeatable-read'
  | 'snapshot-isolation'
  | 'serializable';

export type IsolationAnomalyId =
  | 'dirty-read'
  | 'dirty-write'
  | 'non-repeatable-read'
  | 'lost-update'
  | 'phantom-read'
  | 'write-skew';

export interface IsolationLevelSpec {
  id: IsolationLevelId;
  rank: number;
  name: string;
  shortName: string;
  mechanism: string;
  databases: string;
  summary: string;
}

export interface TxStep {
  t: number;
  tx: 'T1' | 'T2';
  op: string;
  detail: string;
  kind: 'read' | 'write' | 'commit' | 'abort' | 'conflict';
}

export interface MvccVersion {
  key: string;
  version: string;
  value: string;
  tx: 'Init' | 'T1' | 'T2';
  state: 'committed' | 'uncommitted' | 'aborted';
}

export interface AdyaEdge {
  from: 'T1' | 'T2';
  to: 'T1' | 'T2';
  dep: 'wr' | 'ww' | 'rw';
  label: string;
}

export interface IsolationAnomaly {
  id: IsolationAnomalyId;
  adyaCode: string;
  name: string;
  subtitle: string;
  invariantViolated: string;
  preventedBy: readonly IsolationLevelId[];
  hasCycle: boolean;
  steps: readonly TxStep[];
  mvccVersions: readonly MvccVersion[];
  adyaEdges: readonly AdyaEdge[];
  mitigation: string;
  conceptIds: readonly string[];
}

export const ISOLATION_LEVELS: readonly IsolationLevelSpec[] = [
  {
    id: 'read-uncommitted',
    rank: 0,
    name: 'Read Uncommitted',
    shortName: 'RU',
    mechanism: 'No read locks; reads latest in-flight dirty buffer',
    databases: 'SQL Server NOLOCK, MySQL RU',
    summary: 'Permits dirty reads and every higher anomaly; almost never safe for transactional state.',
  },
  {
    id: 'read-committed',
    rank: 1,
    name: 'Read Committed',
    shortName: 'RC',
    mechanism: 'Row write locks + read only latest committed MVCC version per statement',
    databases: 'PostgreSQL (default), Oracle, SQL Server',
    summary: 'Prevents dirty reads and dirty writes, but each statement sees a fresh snapshot—allowing fuzzy reads and lost updates.',
  },
  {
    id: 'repeatable-read',
    rank: 2,
    name: 'Repeatable Read (Locking)',
    shortName: 'RR',
    mechanism: 'Shared row locks held until commit or per-row read stabilization',
    databases: 'ANSI Locking RR, MySQL InnoDB (non-gap)',
    summary: 'Stabilizes repeated reads of existing rows, but newly inserted range rows (phantoms) and write skew can still slip through.',
  },
  {
    id: 'snapshot-isolation',
    rank: 3,
    name: 'Snapshot Isolation (MVCC)',
    shortName: 'SI',
    mechanism: 'Transaction-start MVCC snapshot + First-Committer-Wins write-write conflict check',
    databases: 'PostgreSQL RR, Oracle SERIALIZABLE, CockroachDB SI',
    summary: 'Readers never block writers and lost updates are aborted, yet disjoint-row Write Skew (rw-antidependency cycle) remains possible!',
  },
  {
    id: 'serializable',
    rank: 4,
    name: 'Serializable (SSI / 2PL)',
    shortName: 'SER',
    mechanism: 'Serializable Snapshot Isolation (SIREAD rw-cycle detection) or Strict 2PL + predicate locks',
    databases: 'CockroachDB (default), PostgreSQL SSI, Google Spanner',
    summary: 'Guarantees execution is equivalent to some serial order of transactions—eliminating Write Skew and all Adya anomalies.',
  },
];

export const ISOLATION_ANOMALIES: readonly IsolationAnomaly[] = [
  {
    id: 'dirty-read',
    adyaCode: 'G1a',
    name: 'Dirty Read (Aborted Read)',
    subtitle: 'T2 reads an uncommitted transfer balance from T1 right before T1 rolls back',
    invariantViolated: 'Transactions must never observe uncommitted intermediate state.',
    preventedBy: ['read-committed', 'repeatable-read', 'snapshot-isolation', 'serializable'],
    hasCycle: false,
    steps: [
      { t: 1, tx: 'T1', op: 'BEGIN', detail: 'Start transfer T1', kind: 'read' },
      { t: 2, tx: 'T1', op: 'WRITE x = 900', detail: 'Debit $100 (uncommitted)', kind: 'write' },
      { t: 3, tx: 'T2', op: 'READ x → 900', detail: 'Observes uncommitted $900!', kind: 'conflict' },
      { t: 4, tx: 'T1', op: 'ABORT', detail: 'T1 fails & rolls back x → 1000', kind: 'abort' },
      { t: 5, tx: 'T2', op: 'COMMIT', detail: 'T2 acted on phantom $900', kind: 'commit' },
    ],
    mvccVersions: [
      { key: 'x', version: 'v1', value: '$1000', tx: 'Init', state: 'committed' },
      { key: 'x', version: 'v2', value: '$900', tx: 'T1', state: 'aborted' },
    ],
    adyaEdges: [{ from: 'T1', to: 'T2', dep: 'wr', label: 'T2 reads T1 aborted write (G1a)' }],
    mitigation: 'Read Committed MVCC filters out any version whose creator transaction has not committed.',
    conceptIds: ['two-phase-commit', 'replication-log'],
  },
  {
    id: 'dirty-write',
    adyaCode: 'G0',
    name: 'Dirty Write (Torn Interleaved Commit)',
    subtitle: 'Two concurrent writers interleave updates to keys x and y, leaving half of each transaction',
    invariantViolated: 'Multi-key atomic writes must not interleave across concurrent transactions.',
    preventedBy: ['read-committed', 'repeatable-read', 'snapshot-isolation', 'serializable'],
    hasCycle: true,
    steps: [
      { t: 1, tx: 'T1', op: 'WRITE owner=Alice', detail: 'Uncommitted lockless write', kind: 'write' },
      { t: 2, tx: 'T2', op: 'WRITE owner=Bob', detail: 'Overwrites T1 uncommitted owner', kind: 'conflict' },
      { t: 3, tx: 'T2', op: 'WRITE invoice=Bob', detail: 'T2 updates invoice & commits', kind: 'commit' },
      { t: 4, tx: 'T1', op: 'WRITE invoice=Alice', detail: 'T1 overwrites invoice & commits!', kind: 'conflict' },
      { t: 5, tx: 'T1', op: 'COMMIT', detail: 'Result: owner=Bob, invoice=Alice', kind: 'commit' },
    ],
    mvccVersions: [
      { key: 'owner', version: 'v2', value: 'Bob', tx: 'T2', state: 'committed' },
      { key: 'invoice', version: 'v2', value: 'Alice', tx: 'T1', state: 'committed' },
    ],
    adyaEdges: [
      { from: 'T1', to: 'T2', dep: 'ww', label: 'ww(owner)' },
      { from: 'T2', to: 'T1', dep: 'ww', label: 'ww(invoice)' },
    ],
    mitigation: 'Hold row-level exclusive write locks until transaction commit/abort (standard in Read Committed and above).',
    conceptIds: ['two-phase-commit', 'distributed-locking'],
  },
  {
    id: 'non-repeatable-read',
    adyaCode: 'P2',
    name: 'Non-Repeatable Read (Read Skew)',
    subtitle: 'T1 reads balance A ($500), T2 transfers $100 A→B and commits, T1 reads B ($600) seeing $1,100 total',
    invariantViolated: 'A single read-only audit transaction must observe a point-in-time consistent snapshot.',
    preventedBy: ['repeatable-read', 'snapshot-isolation', 'serializable'],
    hasCycle: true,
    steps: [
      { t: 1, tx: 'T1', op: 'READ A → 500', detail: 'Audit reads Account A', kind: 'read' },
      { t: 2, tx: 'T2', op: 'WRITE A=400, B=600', detail: 'Transfer $100 from A to B', kind: 'write' },
      { t: 3, tx: 'T2', op: 'COMMIT', detail: 'Transfer commits atomically', kind: 'commit' },
      { t: 4, tx: 'T1', op: 'READ B → 600', detail: 'Audit sees new B → sum $1100!', kind: 'conflict' },
      { t: 5, tx: 'T1', op: 'COMMIT', detail: 'Torn backup / audit discrepancy', kind: 'commit' },
    ],
    mvccVersions: [
      { key: 'A', version: 'v1 → v2', value: '$500 → $400', tx: 'T2', state: 'committed' },
      { key: 'B', version: 'v1 → v2', value: '$500 → $600', tx: 'T2', state: 'committed' },
    ],
    adyaEdges: [
      { from: 'T1', to: 'T2', dep: 'rw', label: 'T1 read A before T2 wrote A' },
      { from: 'T2', to: 'T1', dep: 'wr', label: 'T1 read B written by T2' },
    ],
    mitigation: 'Pin reads to a single transaction-start MVCC snapshot (Snapshot Isolation / Repeatable Read).',
    conceptIds: ['chandy-lamport', 'raft'],
  },
  {
    id: 'lost-update',
    adyaCode: 'P4',
    name: 'Lost Update (Read-Modify-Write Race)',
    subtitle: 'T1 and T2 both read counter=10, add +1 in application memory, and write 11—silently losing one increment',
    invariantViolated: 'Two concurrent +1 increments on 10 must yield 12, never 11.',
    preventedBy: ['snapshot-isolation', 'serializable'],
    hasCycle: true,
    steps: [
      { t: 1, tx: 'T1', op: 'READ cnt → 10', detail: 'T1 reads initial counter 10', kind: 'read' },
      { t: 2, tx: 'T2', op: 'READ cnt → 10', detail: 'T2 also reads 10', kind: 'read' },
      { t: 3, tx: 'T1', op: 'WRITE cnt = 11', detail: 'T1 commits cnt = 11', kind: 'commit' },
      { t: 4, tx: 'T2', op: 'WRITE cnt = 11', detail: 'T2 overwrites T1 increment!', kind: 'conflict' },
      { t: 5, tx: 'T2', op: 'COMMIT', detail: 'Final cnt = 11 (1 update lost)', kind: 'commit' },
    ],
    mvccVersions: [
      { key: 'cnt', version: 'v1', value: '10', tx: 'Init', state: 'committed' },
      { key: 'cnt', version: 'v2', value: '11', tx: 'T1', state: 'committed' },
      { key: 'cnt', version: 'v3', value: '11 (clobbered)', tx: 'T2', state: 'committed' },
    ],
    adyaEdges: [
      { from: 'T1', to: 'T2', dep: 'rw', label: 'T1 read v1 before T2 wrote v3' },
      { from: 'T2', to: 'T1', dep: 'rw', label: 'T2 read v1 before T1 wrote v2' },
    ],
    mitigation: 'Snapshot Isolation First-Committer-Wins aborts T2 on concurrent write-write conflict, or use atomic UPDATE cnt = cnt + 1 / SELECT FOR UPDATE.',
    conceptIds: ['distributed-locking', 'quorum-replication'],
  },
  {
    id: 'phantom-read',
    adyaCode: 'P3',
    name: 'Phantom Read (Predicate Range Insertion)',
    subtitle: 'T1 checks room bookings for 14:00 (0 rows), T2 inserts a booking and commits, T1 sees a phantom conflict',
    invariantViolated: 'A range predicate search must remain stable against concurrent matching inserts.',
    preventedBy: ['snapshot-isolation', 'serializable'],
    hasCycle: true,
    steps: [
      { t: 1, tx: 'T1', op: 'SCAN room=4 → 0 rows', detail: 'T1 checks availability', kind: 'read' },
      { t: 2, tx: 'T2', op: 'INSERT booking(room=4)', detail: 'T2 inserts new matching row', kind: 'write' },
      { t: 3, tx: 'T2', op: 'COMMIT', detail: 'New row becomes visible', kind: 'commit' },
      { t: 4, tx: 'T1', op: 'SCAN room=4 → 1 row', detail: 'Phantom row appears mid-tx!', kind: 'conflict' },
      { t: 5, tx: 'T1', op: 'COMMIT', detail: 'Predicate invariant changed', kind: 'commit' },
    ],
    mvccVersions: [
      { key: 'room=4', version: 'v1', value: '∅ (0 rows)', tx: 'Init', state: 'committed' },
      { key: 'room=4', version: 'v2', value: '{booking#9}', tx: 'T2', state: 'committed' },
    ],
    adyaEdges: [
      { from: 'T1', to: 'T2', dep: 'rw', label: 'T1 range scan missed T2 insert' },
      { from: 'T2', to: 'T1', dep: 'wr', label: 'T1 second scan observed T2 row' },
    ],
    mitigation: 'MVCC Snapshot Isolation stabilizes read-only scans; Serializable (2PL gap locks or SSI predicate SIREAD locks) prevents write phantoms too.',
    conceptIds: ['distributed-transactions', 'sharding-rebalancing'],
  },
  {
    id: 'write-skew',
    adyaCode: 'G2-item',
    name: 'Write Skew (On-Call Doctors Under MVCC SI)',
    subtitle: 'Alice & Bob both see 2 doctors on call under Snapshot Isolation and update disjoint rows—leaving 0 on call!',
    invariantViolated: 'Global invariant COUNT(on_call = true) ≥ 1 broken despite zero write-write row overlap.',
    preventedBy: ['serializable'],
    hasCycle: true,
    steps: [
      { t: 1, tx: 'T1', op: 'READ on_call → {Alice, Bob}', detail: 'Snapshot shows 2 on call', kind: 'read' },
      { t: 2, tx: 'T2', op: 'READ on_call → {Alice, Bob}', detail: 'Same snapshot shows 2 on call', kind: 'read' },
      { t: 3, tx: 'T1', op: 'UPDATE Alice=off', detail: 'T1 writes row Alice & commits', kind: 'commit' },
      { t: 4, tx: 'T2', op: 'UPDATE Bob=off', detail: 'Disjoint row! SI allows commit!', kind: 'conflict' },
      { t: 5, tx: 'T2', op: 'COMMIT', detail: '0 doctors on call — invariant broken!', kind: 'conflict' },
    ],
    mvccVersions: [
      { key: 'Alice', version: 'v1 → v2', value: 'on → off', tx: 'T1', state: 'committed' },
      { key: 'Bob', version: 'v1 → v2', value: 'on → off', tx: 'T2', state: 'committed' },
    ],
    adyaEdges: [
      { from: 'T1', to: 'T2', dep: 'rw', label: 'T1 read Bob before T2 updated Bob' },
      { from: 'T2', to: 'T1', dep: 'rw', label: 'T2 read Alice before T1 updated Alice' },
    ],
    mitigation: 'Upgrade to Serializable (SSI detects the dangerous rw-antidependency cycle T1 ⇄ T2 and aborts T2), or materialize a conflict with SELECT ... FOR UPDATE.',
    conceptIds: ['raft', 'two-phase-commit', 'distributed-locking'],
  },
];

export function isAnomalyPrevented(
  levelId: IsolationLevelId,
  anomalyId: IsolationAnomalyId
): boolean {
  const anomaly = ISOLATION_ANOMALIES.find((a) => a.id === anomalyId);
  if (!anomaly) return false;
  return anomaly.preventedBy.includes(levelId);
}

export function evaluateIsolationLevel(levelId: IsolationLevelId) {
  const level = ISOLATION_LEVELS.find((l) => l.id === levelId) ?? ISOLATION_LEVELS[0];
  const results = ISOLATION_ANOMALIES.map((anomaly) => ({
    anomaly,
    prevented: anomaly.preventedBy.includes(level.id),
  }));
  const preventedCount = results.filter((r) => r.prevented).length;
  return {
    level,
    preventedCount,
    totalAnomalies: ISOLATION_ANOMALIES.length,
    results,
  };
}

export function getIsolationAnomalyById(id: string): IsolationAnomaly {
  return ISOLATION_ANOMALIES.find((a) => a.id === id) ?? ISOLATION_ANOMALIES[5];
}

export function getIsolationConcept(conceptId: string) {
  return CONCEPTS_CATALOG.find((c) => c.id === conceptId) ?? null;
}
