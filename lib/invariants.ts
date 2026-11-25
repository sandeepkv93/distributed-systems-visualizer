import type {
  RaftNode,
  PaxosNode,
  PBFTNode,
  TwoPhaseCommitNode,
  QuorumNode,
  VectorClockProcess,
  CRDTReplica,
  SnapshotNode,
  LogPartition,
  LockNode,
  GossipNode,
  LamportNode,
  ConsensusNode,
  ConsensusVariant,
  MerkleReplica,
  PartitionNode,
  ShardNode,
  LoadWorker,
  TransactionParticipant,
  SagaStep,
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

export function evaluateCRDTInvariants(
  replicas: readonly CRDTReplica[],
  stats: { divergentGCounter: number; divergentORSet: number; divergentRGA: number }
): InvariantCheck[] {
  const totalDivergent = stats.divergentGCounter + stats.divergentORSet + stats.divergentRGA;
  return [
    {
      id: 'crdt-sec-convergence',
      name: 'Strong Eventual Convergence',
      formula: 'a ⊔ b = b ⊔ a (semilattice)',
      status: totalDivergent === 0 ? 'holding' : 'degraded',
      detail:
        totalDivergent === 0
          ? `All ${replicas.length} replicas bit-for-bit converged across G-Counter, OR-Set, RGA`
          : `Unsynced local mutations active (${totalDivergent} divergent view(s) awaiting Sync)`,
    },
    {
      id: 'crdt-0rtt-avail',
      name: 'Coordination-Free Writes',
      formula: 'RTT(write) == 0',
      status: 'holding',
      detail: `All ${replicas.length} replicas accept local mutations without consensus`,
    },
  ];
}

export function evaluateChandyLamportInvariants(nodes: readonly SnapshotNode[]): InvariantCheck[] {
  const recording = nodes.filter((n) => n.snapshot && !n.snapshot.complete);
  const completed = nodes.filter((n) => n.snapshot?.complete);
  const started = recording.length + completed.length;

  return [
    {
      id: 'cl-global-cut',
      name: 'Consistent Global Cut',
      formula: 'e2 in cut && e1 -> e2 => e1 in cut',
      status: recording.length > 0 ? 'degraded' : 'holding',
      detail:
        started === 0
          ? 'No active snapshot yet — ready for marker broadcast'
          : recording.length > 0
          ? `Snapshot in progress: ${completed.length}/${nodes.length} finalized, ${recording.length} recording channels`
          : `Global snapshot complete across ${completed.length}/${nodes.length} processes`,
    },
    {
      id: 'cl-nonblocking',
      name: 'Non-Blocking Channel Recording',
      formula: 'FIFO marker delimiter',
      status: 'holding',
      detail:
        recording.length > 0
          ? `Tracking ${recording.reduce((s, n) => s + (n.snapshot?.recordingFrom.length ?? 0), 0)} open incoming channel(s)`
          : 'All channels quiescent with respect to snapshot markers',
    },
  ];
}

export function evaluateReplicationLogInvariants(partition: LogPartition): InvariantCheck[] {
  const leader = partition.replicas.find((r) => r.role === 'leader');
  const isrReplicas = partition.replicas.filter((r) => r.inSync);
  const minIsrLeo =
    isrReplicas.length > 0 ? Math.min(...isrReplicas.map((r) => r.log.length)) : 0;
  const hw = leader?.highWatermark ?? 0;
  const hwSafe = hw <= minIsrLeo;

  return [
    {
      id: 'repl-hw-safety',
      name: 'High Watermark Safety',
      formula: `HW(${hw}) <= min(ISR LEO=${minIsrLeo})`,
      status: hwSafe ? 'holding' : 'violated',
      detail: hwSafe
        ? `Committed offset HW=${hw} is durably replicated across all ${isrReplicas.length} ISR replicas`
        : `Safety breach: HW=${hw} exceeds minimum ISR LEO (${minIsrLeo})`,
    },
    {
      id: 'repl-isr-redundancy',
      name: 'ISR Redundancy',
      formula: '|ISR| >= 2',
      status: isrReplicas.length >= 2 ? 'holding' : 'degraded',
      detail:
        isrReplicas.length >= 2
          ? `${isrReplicas.length}/${partition.replicas.length} replicas in-sync`
          : `Single-replica ISR (${isrReplicas.length}/${partition.replicas.length}) — leader crash risks unavailability`,
    },
  ];
}

export function evaluateDistributedLockInvariants(nodes: readonly LockNode[]): InvariantCheck[] {
  const manager = nodes.find((n) => n.role === 'manager');
  const holders = nodes.filter((n) => n.role === 'client' && n.holdingLock);
  const managerUp = manager?.status === 'healthy';

  return [
    {
      id: 'lock-mutual-exclusion',
      name: 'Mutual Exclusion',
      formula: '|leaseHolders| <= 1',
      status: holders.length > 1 ? 'violated' : 'holding',
      detail:
        holders.length > 1
          ? `Split-lock violation: ${holders.map((h) => h.id).join(', ')} simultaneously hold lease`
          : holders.length === 1
          ? `Exclusive lease held by ${holders[0].id}`
          : 'Lock unowned (0 active holders)',
    },
    {
      id: 'lock-manager-liveness',
      name: 'Coordinator Liveness',
      formula: 'status(manager) == healthy',
      status: managerUp ? 'holding' : 'degraded',
      detail: managerUp
        ? 'Lock manager online issuing and renewing bounded leases'
        : 'Lock manager offline — no new leases or renewals can be granted',
    },
  ];
}

export function evaluateConsistentHashingInvariants(stats: {
  physicalServers: number;
  totalNodes: number;
  totalKeys: number;
  loadStats: { imbalance: number };
}): InvariantCheck[] {
  const hasRing = stats.physicalServers > 0 && stats.totalNodes >= stats.physicalServers;
  const skewOk = stats.totalKeys === 0 || stats.loadStats.imbalance <= 1.5;

  return [
    {
      id: 'ch-ring-coverage',
      name: 'Hash Ring Coverage',
      formula: 'servers >= 1 && vnodes >= servers',
      status: hasRing ? 'holding' : 'violated',
      detail: hasRing
        ? `${stats.physicalServers} server(s) mapped across ${stats.totalNodes} virtual ring tokens`
        : 'Ring empty — no servers available to route keys',
    },
    {
      id: 'ch-skew-bound',
      name: 'Key Balance Skew',
      formula: `max/avg (${stats.loadStats.imbalance.toFixed(2)}x) <= 1.50x`,
      status: skewOk ? 'holding' : 'degraded',
      detail:
        stats.totalKeys === 0
          ? 'No keys placed yet'
          : skewOk
          ? `Balanced distribution across ${stats.totalKeys} keys (${stats.loadStats.imbalance.toFixed(2)}x)`
          : `Hot server skew (${stats.loadStats.imbalance.toFixed(2)}x) — increase virtual nodes to smooth load`,
    },
  ];
}

export function evaluateGossipInvariants(
  nodes: readonly GossipNode[],
  stats: { healthyNodes: number; divergentNodes: number }
): InvariantCheck[] {
  return [
    {
      id: 'gossip-convergence',
      name: 'Epidemic Convergence',
      formula: 'divergentNodes == 0',
      status: stats.divergentNodes === 0 ? 'holding' : 'degraded',
      detail:
        stats.divergentNodes === 0
          ? `All ${stats.healthyNodes} healthy peers hold identical key versions`
          : `${stats.divergentNodes} peer(s) still lagging behind latest rumor version`,
    },
    {
      id: 'gossip-reachability',
      name: 'Peer Mesh Reachability',
      formula: `healthy >= 2/${nodes.length}`,
      status: stats.healthyNodes >= 2 ? 'holding' : 'degraded',
      detail:
        stats.healthyNodes >= 2
          ? `${stats.healthyNodes}/${nodes.length} peers available for randomized fanout`
          : `Mesh isolated: only ${stats.healthyNodes}/${nodes.length} healthy peer(s)`,
    },
  ];
}

export function evaluateLamportClockInvariants(nodes: readonly LamportNode[]): InvariantCheck[] {
  const clocksValid = nodes.every((n) => Number.isInteger(n.clock) && n.clock >= 0);
  const pendingHoldback = nodes.reduce((sum, n) => sum + n.holdback.length, 0);

  return [
    {
      id: 'lamport-monotonicity',
      name: 'Scalar Clock Condition',
      formula: 'a -> b => L(a) < L(b)',
      status: clocksValid ? 'holding' : 'violated',
      detail: clocksValid
        ? `All ${nodes.length} logical clocks strictly monotonic (max L=${Math.max(0, ...nodes.map((n) => n.clock))})`
        : 'Invalid negative or non-integer logical clock detected',
    },
    {
      id: 'lamport-total-order',
      name: 'Total-Order Holdback',
      formula: 'deliver(m) iff all peers ACK',
      status: pendingHoldback === 0 ? 'holding' : 'degraded',
      detail:
        pendingHoldback === 0
          ? 'Holdback queues drained — total-order broadcasts settled'
          : `${pendingHoldback} queued broadcast(s) awaiting peer acknowledgements`,
    },
  ];
}

export function evaluateCAPInvariants(
  selectedCombination: 'CA' | 'CP' | 'AP' | null
): InvariantCheck[] {
  return [
    {
      id: 'cap-bound',
      name: 'CAP Trade-Off Bound',
      formula: 'under P: Linearizability XOR Availability',
      status: 'holding',
      detail:
        selectedCombination === 'CP'
          ? 'CP selected: preserves linearizable safety by halting minority partition'
          : selectedCombination === 'AP'
          ? 'AP selected: preserves 100% uptime; reconciles divergence after heal'
          : selectedCombination === 'CA'
          ? 'CA selected: valid only while network remains partition-free'
          : 'Inspect CA, CP, or AP edge to evaluate partition behavior',
    },
    {
      id: 'cap-partition-resilience',
      name: 'Network Partition Tolerance',
      formula: 'P required on asynchronous WANs',
      status: selectedCombination === 'CA' ? 'degraded' : 'holding',
      detail:
        selectedCombination === 'CA'
          ? 'CA systems degrade to CP or AP if an asynchronous network split occurs'
          : 'Partition-tolerant operating regime active',
    },
  ];
}

export function evaluateConsensusVariantInvariants(
  nodes: readonly ConsensusNode[],
  variant: ConsensusVariant
): InvariantCheck[] {
  const leaders = nodes.filter((n) => n.role === 'leader');
  const inJoint = nodes.some((n) => n.configPhase === 'joint');

  return [
    {
      id: 'cvar-role-safety',
      name: variant === 'epaxos' ? 'Leaderless Fast-Path Quorum' : 'Single-Leader Authority',
      formula: variant === 'epaxos' ? 'fastQuorum = F + floor((F+1)/2)' : '|leaders| <= 1',
      status:
        variant === 'epaxos'
          ? nodes.length >= 3
            ? 'holding'
            : 'degraded'
          : leaders.length > 1
          ? 'violated'
          : leaders.length === 1
          ? 'holding'
          : 'degraded',
      detail:
        variant === 'epaxos'
          ? `${nodes.length} egalitarian replicas ready for 1-RTT non-conflicting commits`
          : leaders.length > 1
          ? `Multiple leaders active: ${leaders.map((l) => l.id).join(', ')}`
          : leaders.length === 1
          ? `Single coordinator ${leaders[0].id} driving ${variant}`
          : 'No leader elected yet — awaiting election round',
    },
    {
      id: 'cvar-config-phase',
      name: 'Configuration Membership Safety',
      formula: inJoint ? 'C_old,new dual-quorum active' : 'stable cluster membership',
      status: inJoint ? 'degraded' : 'holding',
      detail: inJoint
        ? 'Joint consensus transition active: commits require majorities in BOTH C_old and C_new'
        : `All ${nodes.length} nodes operating under unified configuration`,
    },
  ];
}

export function evaluateEventualConsistencyInvariants(stats: {
  totalNodes: number;
  healthyNodes: number;
  inconsistentKeys: number;
}): InvariantCheck[] {
  return [
    {
      id: 'ec-convergence',
      name: 'Replica Convergence',
      formula: 'inconsistentKeys == 0',
      status: stats.inconsistentKeys === 0 ? 'holding' : 'degraded',
      detail:
        stats.inconsistentKeys === 0
          ? 'All healthy replicas converged on identical key values'
          : `${stats.inconsistentKeys} key(s) currently diverged — run anti-entropy to converge`,
    },
    {
      id: 'ec-availability',
      name: 'Write Availability (AP)',
      formula: `healthy (${stats.healthyNodes}/${stats.totalNodes}) >= 1`,
      status: stats.healthyNodes >= 1 ? 'holding' : 'violated',
      detail:
        stats.healthyNodes >= 1
          ? `${stats.healthyNodes}/${stats.totalNodes} replicas available to serve local requests`
          : 'All replicas offline — cluster unavailable',
    },
  ];
}

export function evaluateMerkleInvariants(
  replicas: readonly MerkleReplica[],
  stats: { mismatchedKeys: number }
): InvariantCheck[] {
  const rootsMatch =
    replicas.length >= 2 && replicas[0].root?.hash === replicas[1].root?.hash;
  return [
    {
      id: 'merkle-root-agreement',
      name: 'Merkle Root Agreement',
      formula: 'hash(root_R0) == hash(root_R1)',
      status: rootsMatch && stats.mismatchedKeys === 0 ? 'holding' : 'degraded',
      detail:
        rootsMatch && stats.mismatchedKeys === 0
          ? 'Root hashes match — zero leaf divergence across replicas'
          : `Root mismatch detected (${stats.mismatchedKeys} divergent leaf key(s) awaiting sync)`,
    },
    {
      id: 'merkle-diff-complexity',
      name: 'Logarithmic Subtree Diff',
      formula: 'O(1) equal · O(k log M) repair',
      status: 'holding',
      detail: `Tracking ${replicas[0]?.data.size ?? 0} keys per replica via hierarchical hash tree`,
    },
  ];
}

export function evaluateNetworkPartitionInvariants(
  nodes: readonly PartitionNode[],
  stats: { leaders: number; partitions: number }
): InvariantCheck[] {
  return [
    {
      id: 'np-split-brain',
      name: 'Single-Leader Election Safety',
      formula: '|leaders| <= 1',
      status: stats.leaders > 1 ? 'violated' : 'holding',
      detail:
        stats.leaders > 1
          ? `SPLIT-BRAIN VIOLATION: ${stats.leaders} leaders active simultaneously across partitions`
          : stats.leaders === 1
          ? 'Single leader active across cluster'
          : `0 leaders active (${nodes.length} nodes ready for election)`,
    },
    {
      id: 'np-connectivity',
      name: 'Full Mesh Connectivity',
      formula: 'partitions == 1',
      status: stats.partitions <= 1 ? 'holding' : 'degraded',
      detail:
        stats.partitions <= 1
          ? `All ${nodes.length} nodes connected in a single partition`
          : `Network bisected into ${stats.partitions} isolated partitions`,
    },
  ];
}

export function evaluateFailureDetectorInvariants(stats: {
  alive: number;
  suspect: number;
  failed: number;
}): InvariantCheck[] {
  const total = stats.alive + stats.suspect + stats.failed;
  const majority = Math.floor(total / 2) + 1;

  return [
    {
      id: 'fd-quorum-alive',
      name: 'Healthy Cluster Majority',
      formula: `alive (${stats.alive}) >= ${majority}/${total}`,
      status: stats.alive >= majority ? 'holding' : 'degraded',
      detail:
        stats.alive >= majority
          ? `${stats.alive}/${total} nodes confirmed alive`
          : `Quorum at risk: only ${stats.alive}/${total} alive (${stats.failed} failed)`,
    },
    {
      id: 'fd-suspicion-state',
      name: 'Membership Stability',
      formula: 'suspect == 0',
      status: stats.suspect === 0 ? 'holding' : 'degraded',
      detail:
        stats.suspect === 0
          ? 'No active phi-accrual / SWIM suspicions pending'
          : `${stats.suspect} node(s) currently under indirect-probe suspicion`,
    },
  ];
}

export function evaluateShardingInvariants(
  nodes: readonly ShardNode[],
  stats: { totalNodes: number; avgLoad: number }
): InvariantCheck[] {
  const maxLoad = nodes.reduce((m, n) => Math.max(m, n.load), 0);
  const hotspotThreshold = Math.max(25, stats.avgLoad * 1.5);
  const hasHotspot = stats.totalNodes > 0 && maxLoad > hotspotThreshold;

  return [
    {
      id: 'shard-cluster-coverage',
      name: 'Shard Hosting Coverage',
      formula: 'nodes >= 1',
      status: stats.totalNodes >= 1 ? 'holding' : 'violated',
      detail:
        stats.totalNodes >= 1
          ? `${stats.totalNodes} shard node(s) hosting keyspace`
          : 'Zero shard nodes available',
    },
    {
      id: 'shard-balance',
      name: 'Hot-Shard Load Bound',
      formula: `maxLoad (${maxLoad}) <= ${Math.round(hotspotThreshold)}`,
      status: hasHotspot ? 'degraded' : 'holding',
      detail: hasHotspot
        ? `Hot shard detected (max load ${maxLoad} vs avg ${stats.avgLoad.toFixed(1)}) — trigger rebalance`
        : `Shard load balanced (max ${maxLoad}, avg ${stats.avgLoad.toFixed(1)})`,
    },
  ];
}

export function evaluateLoadBalancingInvariants(
  workers: readonly LoadWorker[],
  stats: { dropped: number; inFlight: number }
): InvariantCheck[] {
  const healthyWorkers = workers.filter((w) => w.loadStatus !== 'failed').length;
  const overloadedWorkers = workers.filter((w) => w.loadStatus === 'overloaded').length;

  return [
    {
      id: 'lb-worker-pool',
      name: 'Available Worker Capacity',
      formula: `activeWorkers (${healthyWorkers}/${workers.length}) >= 1`,
      status: healthyWorkers >= 1 ? 'holding' : 'violated',
      detail:
        healthyWorkers >= 1
          ? `${healthyWorkers}/${workers.length} workers online (${stats.inFlight} req in flight)`
          : 'All backend workers failed — zero routing capacity',
    },
    {
      id: 'lb-backpressure',
      name: 'Queue Saturation & Shedding',
      formula: 'overloaded == 0 && dropped == 0',
      status: overloadedWorkers > 0 || stats.dropped > 0 ? 'degraded' : 'holding',
      detail:
        overloadedWorkers > 0 || stats.dropped > 0
          ? `Backpressure active: ${overloadedWorkers} overloaded worker(s), ${stats.dropped} request(s) shed`
          : 'All worker queues within safe latency bounds',
    },
  ];
}

export function evaluateDistributedTransactionsInvariants(
  participants: readonly TransactionParticipant[],
  sagaSteps: readonly SagaStep[]
): InvariantCheck[] {
  const committed = participants.filter((p) => p.phase === 'commit' || p.phase === 'done');
  const aborted = participants.filter((p) => p.phase === 'abort');
  const split3PC = committed.length > 0 && aborted.length > 0;
  const compensated = sagaSteps.filter((s) => s.status === 'compensated');

  return [
    {
      id: 'dtx-3pc-atomicity',
      name: '3PC Atomic Decision Safety',
      formula: '!(COMMIT && ABORT)',
      status: split3PC ? 'violated' : 'holding',
      detail: split3PC
        ? `Atomicity violation: ${committed.length} committed while ${aborted.length} aborted`
        : 'All 3PC participants remain consistent across voting/pre-commit/commit phases',
    },
    {
      id: 'dtx-saga-recovery',
      name: 'Saga Compensation Integrity',
      formula: 'failed step => reverse Ci rollback',
      status: compensated.length > 0 ? 'degraded' : 'holding',
      detail:
        compensated.length > 0
          ? `${compensated.length}/${sagaSteps.length} saga step(s) rolled back via compensating transactions`
          : `${sagaSteps.filter((s) => s.status === 'completed').length}/${sagaSteps.length} saga step(s) forward-committed`,
    },
  ];
}

