import { getScenarioKey } from './catalog';

export interface PredictionCheckpoint {
  id: string;
  conceptId: string;
  scenarioId: string;
  prompt: string;
  options: readonly [string, string, string];
  correctIndex: 0 | 1 | 2;
  explanation: string;
}

export const PREDICTION_CHECKPOINTS: readonly PredictionCheckpoint[] = [
  {
    id: 'raft:split-brain',
    conceptId: 'raft',
    scenarioId: 'split-brain',
    prompt: 'The 5-node cluster splits into a 2-node minority and a 3-node majority. What happens to writes?',
    options: [
      'Both partitions elect leaders and commit writes independently.',
      'Only the 3-node majority elects a leader and commits; the minority stalls.',
      'The entire cluster halts until all 5 nodes can communicate again.',
    ],
    correctIndex: 1,
    explanation:
      'Raft requires a strict majority (⌊N/2⌋ + 1 = 3) for both elections and log commits. The minority cannot form a quorum, preventing split-brain divergence.',
  },
  {
    id: 'raft:leader-failure',
    conceptId: 'raft',
    scenarioId: 'leader-failure',
    prompt: 'When the Term 1 leader crashes mid-run, how does Raft guarantee no committed entry is lost?',
    options: [
      'Any follower with the lowest node ID immediately becomes leader.',
      'Candidates can only win votes from peers whose logs are no more up-to-date than theirs.',
      'Clients must re-submit all historical commands to the new leader.',
    ],
    correctIndex: 1,
    explanation:
      'Raft’s Election Restriction ensures a candidate’s log is at least as up-to-date as a majority of nodes, guaranteeing every committed entry survives leader failure.',
  },
  {
    id: 'raft:follower-lag',
    conceptId: 'raft',
    scenarioId: 'follower-lag',
    prompt: 'After a crashed follower recovers with a stale log, how does it catch up to the leader?',
    options: [
      'The follower broadcasts a new election to overwrite the leader’s log.',
      'The leader decrements nextIndex until logs match, then streams missing entries via AppendEntries.',
      'The follower discards its identity and joins as a brand-new cluster member.',
    ],
    correctIndex: 1,
    explanation:
      'Raft’s Log Matching Property lets the leader back up nextIndex to the last matching (index, term) and overwrite/append missing entries cleanly.',
  },
  {
    id: 'paxos:dueling-proposers',
    conceptId: 'paxos',
    scenarioId: 'dueling-proposers',
    prompt: 'Proposer 1 sends Prepare(#2) while Proposer 0 is still in Phase 2 with #1. What do acceptors do?',
    options: [
      'Acceptors reject #1’s Accept because they promised not to accept proposals lower than #2.',
      'Acceptors accept both #1 and #2 and let learners pick the first one.',
      'Acceptors ignore #2 until #1 finishes committing.',
    ],
    correctIndex: 0,
    explanation:
      'An acceptor’s Phase 1 Promise forbids accepting any proposal numbered lower than its highest promised ballot, preserving safety even when proposers duel.',
  },
  {
    id: 'paxos:late-proposer',
    conceptId: 'paxos',
    scenarioId: 'late-proposer',
    prompt: 'A late proposer sends a higher ballot #N after a value V was already accepted by a majority. What value must it propose in Phase 2?',
    options: [
      'Its own new value, because its ballot number is strictly higher.',
      'The highest-numbered previously accepted value V returned in the Promise quorum.',
      'Null, forcing the cluster to abort and restart.',
    ],
    correctIndex: 1,
    explanation:
      'Paxos safety hinges on Phase 2 adopting the value with the highest accepted ballot from the Promise quorum—ensuring a chosen value can never be overwritten.',
  },
  {
    id: 'pbft:leader-change',
    conceptId: 'pbft',
    scenarioId: 'leader-change',
    prompt: 'In a 4-replica PBFT cluster (f = 1), how many matching Prepare/Commit messages are required to tolerate 1 Byzantine fault?',
    options: [
      '2 matching messages (simple half).',
      '2f + 1 = 3 matching messages (Byzantine quorum).',
      'All 4 replicas must agree unanimously.',
    ],
    correctIndex: 1,
    explanation:
      'With N = 3f + 1 = 4, any two quorums of 2f + 1 = 3 intersect in at least f + 1 = 2 nodes, guaranteeing at least one honest replica in every intersection.',
  },
  {
    id: 'consistent-hashing:add-server',
    conceptId: 'consistent-hashing',
    scenarioId: 'add-server',
    prompt: 'When a new server joins a consistent hash ring of N servers with K keys, roughly how many keys must move?',
    options: [
      'Nearly all K keys, because hash(key) mod N changes for almost every key.',
      'Only ~K / (N + 1) keys falling directly before the new server’s ring positions.',
      'Zero keys move until the next manual rebalance.',
    ],
    correctIndex: 1,
    explanation:
      'Consistent hashing localizes remapping to the predecessor intervals of the newly placed virtual nodes, moving only ~1/(N+1) of total keys.',
  },
  {
    id: 'two-phase-commit:participant-failure',
    conceptId: 'two-phase-commit',
    scenarioId: 'participant-failure',
    prompt: 'One participant fails to reply during Phase 1 (Prepare) while all other participants voted YES. What must the coordinator decide?',
    options: [
      'Commit on the healthy majority and reconcile the failed participant later.',
      'Abort the entire transaction across all participants.',
      'Promote a participant to commit locally without the coordinator.',
    ],
    correctIndex: 1,
    explanation:
      '2PC enforces strict all-or-nothing atomicity: every single participant must vote YES in Phase 1, or the coordinator must broadcast ABORT.',
  },
  {
    id: 'distributed-transactions:saga-compensation',
    conceptId: 'distributed-transactions',
    scenarioId: 'saga-compensation',
    prompt: 'When Step 3 of a Saga fails after Steps 1 and 2 already committed locally, how is consistency restored?',
    options: [
      'The database holds global locks until Step 3 recovers.',
      'Compensating transactions run in reverse order (Step 2, then Step 1) to semantically undo prior work.',
      'Steps 1 and 2 automatically roll back via an ACID undo log.',
    ],
    correctIndex: 1,
    explanation:
      'Because each Saga step commits locally without distributed locks, failures are undone by executing compensating actions in reverse sequence.',
  },
  {
    id: 'vector-clocks:concurrent-events',
    conceptId: 'vector-clocks',
    scenarioId: 'concurrent-events',
    prompt: 'Event A has vector clock [2, 0, 0] and Event B has [0, 1, 0]. What is their causal relationship?',
    options: [
      'Event A happened before Event B because 2 > 1.',
      'Events A and B are concurrent (neither vector is component-wise ≤ the other).',
      'Event B happened before Event A.',
    ],
    correctIndex: 1,
    explanation:
      'V(A) has a larger entry at P0 (2 > 0) while V(B) is larger at P1 (1 > 0), proving neither causally precedes the other: A ∥ B.',
  },
  {
    id: 'chandy-lamport:in-transit-capture',
    conceptId: 'chandy-lamport',
    scenarioId: 'in-transit-capture',
    prompt: 'A process has recorded its local state upon seeing a Marker on channel 1, then receives an application message on channel 2 before channel 2’s Marker arrives. What happens to that message?',
    options: [
      'It is dropped because the snapshot already started.',
      'It is recorded as part of channel 2’s in-transit state in the global snapshot.',
      'The process re-snapshots its local state to include it.',
    ],
    correctIndex: 1,
    explanation:
      'Chandy-Lamport captures FIFO channel state by recording every message arriving on an incoming channel after the local snapshot until that channel’s Marker arrives.',
  },
  {
    id: 'quorum-replication:read-repair',
    conceptId: 'quorum-replication',
    scenarioId: 'read-repair',
    prompt: 'With N = 5 replicas, W = 3, and R = 3, why does a read always observe the latest write even if 1 replica missed it?',
    options: [
      'Because W + R > N guarantees the read quorum overlaps the write quorum in at least one up-to-date replica.',
      'Because all reads always route through a single primary leader.',
      'Because stale replicas refuse to respond to read queries.',
    ],
    correctIndex: 0,
    explanation:
      'By the pigeonhole principle, W + R > N forces ≥ 1 overlapping replica carrying the newest version; read-repair then updates any stale replicas seen during the read.',
  },
  {
    id: 'replication-log:isr-shrink',
    conceptId: 'replication-log',
    scenarioId: 'isr-shrink',
    prompt: 'When a slow follower falls behind and is removed from the In-Sync Replicas (ISR), what happens to the High-Watermark (HWM)?',
    options: [
      'The HWM freezes permanently until the slow follower recovers.',
      'The HWM continues advancing based on the remaining active ISR members.',
      'The leader drops all uncommitted log entries.',
    ],
    correctIndex: 1,
    explanation:
      'Removing a lagging follower from the ISR lets the leader advance the High-Watermark using only the remaining in-sync followers, preserving availability.',
  },
  {
    id: 'distributed-locking:lease-expiry',
    conceptId: 'distributed-locking',
    scenarioId: 'lease-expiry',
    prompt: 'Client A’s lease expires during a GC pause and Client B acquires the lock. How does storage prevent a delayed write from Client A corrupting state?',
    options: [
      'Storage trusts Client A because it held the lock first.',
      'Each lease carries a monotonically increasing fencing token; storage rejects writes with stale tokens.',
      'Client B waits indefinitely until Client A explicitly unlocks.',
    ],
    correctIndex: 1,
    explanation:
      'Fencing tokens (monotonically increasing lease epochs) allow the storage layer to reject late requests from zombie lock holders cleanly.',
  },
  {
    id: 'network-partitions:split-brain',
    conceptId: 'network-partitions',
    scenarioId: 'split-brain',
    prompt: 'If both sides of a network partition elect a leader and accept writes without quorum checks, what occurs when the partition heals?',
    options: [
      'Divergent conflicting histories exist (split-brain) and require conflict resolution or data loss.',
      'Both logs merge automatically with zero conflicts for arbitrary SQL updates.',
      'The minority partition’s writes are always preserved over the majority.',
    ],
    correctIndex: 0,
    explanation:
      'Without majority quorum enforcement (or conflict-free CRDT semantics), dual leaders create conflicting histories that cannot both remain canonical on heal.',
  },
] as const;

export const CHECKPOINTS_BY_SCENARIO_KEY: ReadonlyMap<string, PredictionCheckpoint> = new Map(
  PREDICTION_CHECKPOINTS.map((cp) => [getScenarioKey(cp.conceptId, cp.scenarioId), cp])
);

export const TOTAL_CHECKPOINTS = PREDICTION_CHECKPOINTS.length;

export function getCheckpointForScenario(
  conceptId: string,
  scenarioId: string
): PredictionCheckpoint | null {
  return CHECKPOINTS_BY_SCENARIO_KEY.get(getScenarioKey(conceptId, scenarioId)) ?? null;
}
