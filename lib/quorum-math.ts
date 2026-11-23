export interface DynamoQuorumAnalysis {
  n: number;
  w: number;
  r: number;
  crashed: number;
  healthy: number;
  stronglyConsistent: boolean;
  minOverlap: number;
  writeFaultTolerance: number;
  readFaultTolerance: number;
  canWriteNow: boolean;
  canReadNow: boolean;
  writeAvailability: number;
  readAvailability: number;
}

export interface CrashConsensusAnalysis {
  n: number;
  crashed: number;
  healthy: number;
  majorityQuorum: number;
  maxFaults: number;
  wastedEvenNode: boolean;
  hasQuorumNow: boolean;
  clusterAvailability: number;
}

export interface ByzantineConsensusAnalysis {
  n: number;
  crashed: number;
  healthy: number;
  maxByzantineFaults: number;
  quorumSize: number;
  minNodesRequiredForCurrentF: number;
  minNodesForNextF: number;
  intersectionSize: number;
  honestOverlap: number;
  hasQuorumNow: boolean;
  clusterAvailability: number;
}

export type BenchNodeRole = 'failed' | 'overlap' | 'write-only' | 'read-only' | 'idle';

export interface BenchNodeState {
  index: number;
  id: string;
  inWriteSet: boolean;
  inReadSet: boolean;
  failed: boolean;
  role: BenchNodeRole;
}

/**
 * Exact binomial coefficient C(n, k) for non-negative integers.
 */
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  const r = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= r; i++) {
    result = (result * (n - r + i)) / i;
  }
  return Math.round(result);
}

/**
 * Probability that at least `quorum` of `n` independent replicas are reachable
 * when each replica has uptime probability `nodeAvailability` in [0, 1].
 */
export function binomialTailAvailability(
  n: number,
  quorum: number,
  nodeAvailability: number
): number {
  const p = Math.max(0, Math.min(1, nodeAvailability));
  if (quorum <= 0) return 1;
  if (quorum > n) return 0;

  let total = 0;
  for (let k = quorum; k <= n; k++) {
    total += combinations(n, k) * p ** k * (1 - p) ** (n - k);
  }
  return Math.max(0, Math.min(1, total));
}

export function minByzantineNodesForF(f: number): number {
  const safeF = Math.max(0, Math.floor(f));
  return 3 * safeF + 1;
}

export function analyzeDynamoQuorum(
  n: number,
  w: number,
  r: number,
  crashed: number = 0,
  nodeAvailability: number = 0.99
): DynamoQuorumAnalysis {
  const safeN = Math.max(1, Math.floor(n));
  const safeW = Math.max(1, Math.min(safeN, Math.floor(w)));
  const safeR = Math.max(1, Math.min(safeN, Math.floor(r)));
  const safeCrashed = Math.max(0, Math.min(safeN, Math.floor(crashed)));
  const healthy = safeN - safeCrashed;

  const minOverlap = Math.max(0, safeW + safeR - safeN);
  const stronglyConsistent = safeW + safeR > safeN;

  return {
    n: safeN,
    w: safeW,
    r: safeR,
    crashed: safeCrashed,
    healthy,
    stronglyConsistent,
    minOverlap,
    writeFaultTolerance: safeN - safeW,
    readFaultTolerance: safeN - safeR,
    canWriteNow: healthy >= safeW,
    canReadNow: healthy >= safeR,
    writeAvailability: binomialTailAvailability(safeN, safeW, nodeAvailability),
    readAvailability: binomialTailAvailability(safeN, safeR, nodeAvailability),
  };
}

export function analyzeCrashConsensus(
  n: number,
  crashed: number = 0,
  nodeAvailability: number = 0.99
): CrashConsensusAnalysis {
  const safeN = Math.max(1, Math.floor(n));
  const safeCrashed = Math.max(0, Math.min(safeN, Math.floor(crashed)));
  const healthy = safeN - safeCrashed;
  const majorityQuorum = Math.floor(safeN / 2) + 1;
  const maxFaults = Math.floor((safeN - 1) / 2);

  return {
    n: safeN,
    crashed: safeCrashed,
    healthy,
    majorityQuorum,
    maxFaults,
    wastedEvenNode: safeN >= 2 && safeN % 2 === 0,
    hasQuorumNow: healthy >= majorityQuorum,
    clusterAvailability: binomialTailAvailability(safeN, majorityQuorum, nodeAvailability),
  };
}

export function analyzeByzantineConsensus(
  n: number,
  crashed: number = 0,
  nodeAvailability: number = 0.99
): ByzantineConsensusAnalysis {
  const safeN = Math.max(1, Math.floor(n));
  const safeCrashed = Math.max(0, Math.min(safeN, Math.floor(crashed)));
  const healthy = safeN - safeCrashed;

  const maxByzantineFaults = Math.floor((safeN - 1) / 3);
  const quorumSize = safeN - maxByzantineFaults;
  const intersectionSize = Math.max(0, 2 * quorumSize - safeN);
  const honestOverlap = Math.max(0, intersectionSize - maxByzantineFaults);

  return {
    n: safeN,
    crashed: safeCrashed,
    healthy,
    maxByzantineFaults,
    quorumSize,
    minNodesRequiredForCurrentF: minByzantineNodesForF(maxByzantineFaults),
    minNodesForNextF: minByzantineNodesForF(maxByzantineFaults + 1),
    intersectionSize,
    honestOverlap,
    hasQuorumNow: healthy >= quorumSize,
    clusterAvailability: binomialTailAvailability(safeN, quorumSize, nodeAvailability),
  };
}

/**
 * Places Write set at indices [0 .. w-1] and Read set at [n-r .. n-1] so the
 * worst-case overlap is rendered directly:
 * - When W + R <= N, Write and Read sets are completely disjoint (proving stale reads!).
 * - When W + R > N, indices [n-r .. w-1] form the exact guaranteed intersection of size W + R - N.
 * Simulated crashes are applied from the right-most indices backward or tracked independently.
 */
export function assignBenchNodeRoles(
  n: number,
  w: number,
  r: number,
  crashed: number = 0
): BenchNodeState[] {
  const safeN = Math.max(1, Math.floor(n));
  const safeW = Math.max(1, Math.min(safeN, Math.floor(w)));
  const safeR = Math.max(1, Math.min(safeN, Math.floor(r)));
  const safeCrashed = Math.max(0, Math.min(safeN, Math.floor(crashed)));

  const nodes: BenchNodeState[] = [];
  for (let i = 0; i < safeN; i++) {
    const failed = i >= safeN - safeCrashed;
    const inWriteSet = i < safeW;
    const inReadSet = i >= safeN - safeR;

    let role: BenchNodeRole = 'idle';
    if (failed) {
      role = 'failed';
    } else if (inWriteSet && inReadSet) {
      role = 'overlap';
    } else if (inWriteSet) {
      role = 'write-only';
    } else if (inReadSet) {
      role = 'read-only';
    }

    nodes.push({
      index: i,
      id: `N${i}`,
      inWriteSet,
      inReadSet,
      failed,
      role,
    });
  }
  return nodes;
}

export function formatAvailabilityPercent(probability: number): string {
  const pct = Math.max(0, Math.min(1, probability)) * 100;
  if (pct >= 99.9999) return '99.9999%+';
  if (pct >= 99.99) return `${pct.toFixed(4)}%`;
  if (pct >= 99) return `${pct.toFixed(3)}%`;
  return `${pct.toFixed(2)}%`;
}
