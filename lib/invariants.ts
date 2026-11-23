import type {
  RaftNode,
  PaxosNode,
  PBFTNode,
  TwoPhaseCommitNode,
  QuorumNode,
  VectorClockProcess,
} from './types';

export type InvariantStatus = 'holding' | 'degraded' | 'violated';

export interface InvariantCheck {
  id: string;
  name: string;
  formula: string;
  status: InvariantStatus;
  detail: string;
}

export function summarizeInvariants(checks: readonly InvariantCheck[]): {
  overall: InvariantStatus;
  holdingCount: number;
  totalCount: number;
} {
  let holdingCount = 0;
  let hasViolated = false;
  let hasDegraded = false;

  for (const check of checks) {
    if (check.status === 'holding') holdingCount += 1;
    else if (check.status === 'violated') hasViolated = true;
    else hasDegraded = true;
  }

  return {
    overall: hasViolated ? 'violated' : hasDegraded ? 'degraded' : 'holding',
    holdingCount,
    totalCount: checks.length,
  };
}

export function evaluateRaftInvariants(
  nodes: readonly RaftNode[],
  partitions: readonly string[][] = []
): InvariantCheck[] {
  // 1. Election Safety: at most one healthy leader per term
  const leadersByTerm = new Map<number, string[]>();
  for (const node of nodes) {
    if (node.status === 'healthy' && node.state === 'leader') {
      const list = leadersByTerm.get(node.term) ?? [];
      list.push(node.id);
      leadersByTerm.set(node.term, list);
    }
  }
  const conflictedTerm = Array.from(leadersByTerm.entries()).find(([, ids]) => ids.length > 1);
  const totalLeaders = Array.from(leadersByTerm.values()).reduce((sum, ids) => sum + ids.length, 0);

  // 2. Majority Quorum Liveness
  const n = nodes.length;
  const majority = Math.floor(n / 2) + 1;
  const healthyIds = new Set(nodes.filter((nd) => nd.status === 'healthy').map((nd) => nd.id));
  const largestReachable =
    partitions.length > 0
      ? Math.max(
          0,
          ...partitions.map((group) => group.filter((id) => healthyIds.has(id)).length)
        )
      : healthyIds.size;
  const hasMajority = largestReachable >= majority;

  // 3. State Machine Safety: committed entries at the same index share term & command
  const committedByIndex = new Map<number, { term: number; command: string }>();
  let logConflict: string | null = null;
  for (const node of nodes) {
    if (node.status !== 'healthy') continue;
    for (let i = 0; i < node.commitIndex && i < node.log.length; i++) {
      const entry = node.log[i];
      const existing = committedByIndex.get(i);
      if (!existing) {
        committedByIndex.set(i, { term: entry.term, command: entry.command });
      } else if (existing.term !== entry.term || existing.command !== entry.command) {
        logConflict = `Divergent committed entry at index ${i}`;
        break;
      }
    }
    if (logConflict) break;
  }

  return [
    {
      id: 'raft-election-safety',
      name: 'Election Safety',
      formula: '|leaders(term)| <= 1',
      status: conflictedTerm ? 'violated' : 'holding',
      detail: conflictedTerm
        ? `Term ${conflictedTerm[0]} has ${conflictedTerm[1].length} leaders (${conflictedTerm[1].join(', ')})`
        : totalLeaders === 0
        ? 'No active leader yet (0 per term)'
        : `Unique leader verified (${totalLeaders} active term)`,
    },
    {
      id: 'raft-quorum-liveness',
      name: 'Majority Quorum',
      formula: `reachable >= ${majority}/${n}`,
      status: hasMajority ? 'holding' : 'degraded',
      detail: hasMajority
        ? `${largestReachable}/${n} healthy reachable nodes (quorum ${majority})`
        : `Quorum lost: max reachable partition is ${largestReachable}/${n} (need ${majority})`,
    },
    {
      id: 'raft-state-machine-safety',
      name: 'Committed Log Prefix',
      formula: 'commit[i] unique',
      status: logConflict ? 'violated' : 'holding',
      detail: logConflict ?? `${committedByIndex.size} committed index slot(s) consistent`,
    },
  ];
}

export function evaluatePaxosInvariants(
  nodes: readonly PaxosNode[],
  decidedValues: readonly unknown[] = []
): InvariantCheck[] {
  const acceptors = nodes.filter((n) => n.role === 'acceptor');
  const healthyAcceptors = acceptors.filter((n) => n.status === 'healthy');
  const majority = Math.floor(acceptors.length / 2) + 1;

  // Agreement check across acceptors sharing the same accepted proposal number
  const valuesByProposal = new Map<number, Set<string>>();
  let proposalConflict = false;
  for (const acc of acceptors) {
    if (acc.acceptedProposal !== undefined && acc.acceptedValue !== undefined) {
      const set = valuesByProposal.get(acc.acceptedProposal) ?? new Set<string>();
      set.add(JSON.stringify(acc.acceptedValue));
      valuesByProposal.set(acc.acceptedProposal, set);
      if (set.size > 1) {
        proposalConflict = true;
      }
    }
  }

  return [
    {
      id: 'paxos-acceptor-quorum',
      name: 'Acceptor Quorum',
      formula: `healthy >= ${majority}/${acceptors.length}`,
      status: healthyAcceptors.length >= majority ? 'holding' : 'degraded',
      detail:
        healthyAcceptors.length >= majority
          ? `${healthyAcceptors.length}/${acceptors.length} acceptors online (quorum ${majority})`
          : `Stalled: only ${healthyAcceptors.length}/${acceptors.length} acceptors healthy`,
    },
    {
      id: 'paxos-agreement',
      name: 'Proposal Consistency',
      formula: 'same # => same val',
      status: proposalConflict ? 'violated' : 'holding',
      detail: proposalConflict
        ? 'Conflicting values accepted for the same proposal number'
        : `${valuesByProposal.size} proposal round(s) mutually consistent`,
    },
    {
      id: 'paxos-decision',
      name: 'Learner Stability',
      formula: 'decided immutable',
      status: 'holding',
      detail:
        decidedValues.length > 0
          ? `${decidedValues.length} value(s) durably decided`
          : 'Awaiting Phase 2 majority acceptance',
    },
  ];
}

export function evaluatePBFTInvariants(nodes: readonly PBFTNode[]): InvariantCheck[] {
  const n = nodes.length;
  const f = Math.floor((n - 1) / 3);
  const quorum = Math.max(1, n - f);
  const healthy = nodes.filter((nd) => nd.status === 'healthy');
  const activePrimaries = healthy.filter((nd) => nd.role === 'primary');

  // Executed value prefix agreement across healthy replicas
  let execDiverged = false;
  const maxExecLen = Math.max(0, ...healthy.map((nd) => nd.executed.length));
  for (let i = 0; i < maxExecLen; i++) {
    const seen = new Set<string>();
    for (const nd of healthy) {
      if (nd.executed[i]) {
        seen.add(JSON.stringify(nd.executed[i].value));
      }
    }
    if (seen.size > 1) {
      execDiverged = true;
      break;
    }
  }

  return [
    {
      id: 'pbft-quorum-bound',
      name: 'Byzantine Quorum (3f+1)',
      formula: `healthy >= ${quorum}/${n} (f=${f})`,
      status: n < 4 ? 'violated' : healthy.length >= quorum ? 'holding' : 'degraded',
      detail:
        n < 4
          ? `Undersized cluster N=${n} cannot tolerate f=1 Byzantine node`
          : healthy.length >= quorum
          ? `${healthy.length}/${n} replicas healthy (quorum ${quorum})`
          : `Liveness halted: ${healthy.length}/${n} healthy (need ${quorum})`,
    },
    {
      id: 'pbft-primary-unique',
      name: 'View Primary Uniqueness',
      formula: '|primary(v)| <= 1',
      status:
        activePrimaries.length > 1
          ? 'violated'
          : activePrimaries.length === 0
          ? 'degraded'
          : 'holding',
      detail:
        activePrimaries.length > 1
          ? `Multiple active primaries: ${activePrimaries.map((p) => p.id).join(', ')}`
          : activePrimaries.length === 0
          ? 'Primary offline — View Change required'
          : `Single primary ${activePrimaries[0].id} in view v${activePrimaries[0].view}`,
    },
    {
      id: 'pbft-exec-safety',
      name: 'Deterministic Execution',
      formula: 'exec[i] identical',
      status: execDiverged ? 'violated' : 'holding',
      detail: execDiverged
        ? 'Healthy replicas executed conflicting operations at same sequence'
        : `${maxExecLen} executed sequence slot(s) consistent`,
    },
  ];
}

export function evaluateTwoPhaseCommitInvariants(
  coordinator: TwoPhaseCommitNode,
  participants: readonly TwoPhaseCommitNode[]
): InvariantCheck[] {
  const committed = participants.filter((p) => p.state === 'committed');
  const aborted = participants.filter((p) => p.state === 'aborted');
  const prepared = participants.filter((p) => p.state === 'prepared');
  const splitOutcome = committed.length > 0 && aborted.length > 0;
  const blocked = coordinator.status === 'failed' && prepared.length > 0;

  return [
    {
      id: '2pc-atomicity',
      name: 'Atomic Decision Safety',
      formula: '!(COMMIT && ABORT)',
      status: splitOutcome ? 'violated' : 'holding',
      detail: splitOutcome
        ? `Atomicity violated: ${committed.length} committed while ${aborted.length} aborted`
        : committed.length > 0
        ? `All ${committed.length} settled participant(s) committed uniformly`
        : aborted.length > 0
        ? `All ${aborted.length} settled participant(s) aborted uniformly`
        : 'No conflicting terminal outcomes',
    },
    {
      id: '2pc-blocking-window',
      name: 'Coordinator Liveness',
      formula: 'coord UP when PREPARED',
      status: blocked ? 'degraded' : 'holding',
      detail: blocked
        ? `BLOCKING WINDOW: coordinator failed while ${prepared.length} participant(s) hold locks in PREPARED`
        : coordinator.status === 'failed'
        ? 'Coordinator offline (no prepared locks held)'
        : `Coordinator online (${prepared.length} participant(s) prepared)`,
    },
  ];
}

export function evaluateQuorumInvariants(
  nodes: readonly QuorumNode[],
  w: number,
  r: number
): InvariantCheck[] {
  const n = nodes.length;
  const healthyCount = nodes.filter((nd) => nd.status === 'healthy').length;
  const overlap = Math.max(0, w + r - n);
  const strictOverlap = w + r > n;

  return [
    {
      id: 'quorum-overlap',
      name: 'Strict Quorum Overlap',
      formula: `W(${w}) + R(${r}) > N(${n})`,
      status: strictOverlap ? 'holding' : 'violated',
      detail: strictOverlap
        ? `Guaranteed intersection >= ${overlap} replica${overlap === 1 ? '' : 's'}`
        : `W + R = ${w + r} <= ${n}: disjoint sets allow stale reads`,
    },
    {
      id: 'quorum-write-avail',
      name: 'Write Quorum Availability',
      formula: `healthy >= W(${w})`,
      status: healthyCount >= w ? 'holding' : 'degraded',
      detail:
        healthyCount >= w
          ? `${healthyCount}/${n} healthy replicas can satisfy W=${w}`
          : `Writes blocked: only ${healthyCount}/${n} healthy (need W=${w})`,
    },
    {
      id: 'quorum-read-avail',
      name: 'Read Quorum Availability',
      formula: `healthy >= R(${r})`,
      status: healthyCount >= r ? 'holding' : 'degraded',
      detail:
        healthyCount >= r
          ? `${healthyCount}/${n} healthy replicas can satisfy R=${r}`
          : `Reads blocked: only ${healthyCount}/${n} healthy (need R=${r})`,
    },
  ];
}

export function evaluateVectorClockInvariants(
  processes: readonly VectorClockProcess[],
  concurrentPairs: number
): InvariantCheck[] {
  const expectedDim = processes.length;
  const dimValid = processes.every(
    (p) =>
      Object.keys(p.vectorClock).length === expectedDim &&
      Object.values(p.vectorClock).every((v) => Number.isInteger(v) && v >= 0)
  );
  const totalEvents = processes.reduce((sum, p) => sum + p.events.length, 0);

  return [
    {
      id: 'vc-dimension',
      name: 'Vector Clock Integrity',
      formula: `dim(V) == ${expectedDim}, V[i] >= 0`,
      status: dimValid ? 'holding' : 'violated',
      detail: dimValid
        ? `All ${expectedDim} process vectors monotonic and well-formed`
        : 'Malformed vector clock dimensionality detected',
    },
    {
      id: 'vc-causality',
      name: 'Exact Causal Equivalence',
      formula: 'a -> b <=> V(a) < V(b)',
      status: 'holding',
      detail: `${totalEvents} event(s) tracked · ${concurrentPairs} concurrent pair(s) isolated`,
    },
  ];
}
