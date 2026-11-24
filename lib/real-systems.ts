import type { DuelId } from './duels';

export interface SystemLayer {
  id: string;
  tier: string;
  name: string;
  problemSolved: string;
  keyInvariant: string;
  conceptIds: readonly string[];
}

export interface SystemBlueprint {
  id: string;
  number: string;
  name: string;
  category: string;
  capProfile: string;
  faultModel: string;
  summary: string;
  writePathSteps: readonly string[];
  failureStory: string;
  layers: readonly SystemLayer[];
  relatedDuelId?: DuelId;
  relatedIncidentId?: string;
}

export const REAL_SYSTEMS: readonly SystemBlueprint[] = [
  {
    id: 'cockroachdb-etcd',
    number: '01',
    name: 'CockroachDB & etcd',
    category: 'Linearizable SQL / Control Plane',
    capProfile: 'CP · Serializable & Linearizable',
    faultModel: 'Crash Fault Tolerant (2f + 1 per range)',
    summary:
      'Divides a single sorted keyspace into 64–512 MiB contiguous ranges, replicating every range independently through its own Raft consensus group while coordinating cross-range transactions atomically.',
    writePathSteps: [
      'Router locates target range via lexicographic range metadata.',
      'Range Leaseholder accepts write and appends command to its Raft log.',
      'Raft leader replicates AppendEntries to majority (⌊N/2⌋ + 1) replicas.',
      'Multi-range transactions finalize via parallel atomic commit protocol.',
    ],
    failureStory:
      'If a datacenter rack loses power, minority ranges lose their leader and automatically elect a surviving follower in < 2s while preserving zero committed data loss.',
    layers: [
      {
        id: 'crdb-sharding',
        tier: 'LAYER 01 · PARTITIONING',
        name: 'Contiguous Range Splits',
        problemSolved: 'Enables fast SQL ORDER BY / BETWEEN range scans across petabytes.',
        keyInvariant: 'Every key belongs to exactly one contiguous range [start, end).',
        conceptIds: ['sharding-rebalancing'],
      },
      {
        id: 'crdb-raft',
        tier: 'LAYER 02 · CONSENSUS',
        name: 'Multi-Raft Replication Groups',
        problemSolved: 'Prevents split-brain and guarantees identical replicated state per range.',
        keyInvariant: 'Election Safety: at most one leader per Raft term.',
        conceptIds: ['raft'],
      },
      {
        id: 'crdb-leases',
        tier: 'LAYER 03 · READ OPTIMIZATION',
        name: 'Range Leaseholder (Time-Bounded Lease)',
        problemSolved: 'Serves linearizable local reads in 0 extra Raft RTTs while lease holds.',
        keyInvariant: 'At most one valid leaseholder per range at any physical instant.',
        conceptIds: ['distributed-locking'],
      },
      {
        id: 'crdb-2pc',
        tier: 'LAYER 04 · TRANSACTIONS',
        name: 'Atomic Cross-Range Commit',
        problemSolved: 'Guarantees ACID all-or-nothing commits spanning multiple Raft groups.',
        keyInvariant: 'Transaction record flips atomically inside its own Raft group (non-blocking 2PC).',
        conceptIds: ['two-phase-commit'],
      },
    ],
    relatedDuelId: 'raft-vs-paxos',
    relatedIncidentId: 'split-brain-stale-read',
  },
  {
    id: 'dynamo-cassandra',
    number: '02',
    name: 'Amazon Dynamo & Cassandra',
    category: 'Leaderless High-Availability KV',
    capProfile: 'AP · Tunable W + R > N Quorums',
    faultModel: 'Node churn, slow links & sloppy quorums',
    summary:
      'Eliminates single-leader bottlenecks by routing every key around a consistent-hashing ring, letting clients tune write/read quorums while gossip and Merkle trees heal stale replicas asynchronously.',
    writePathSteps: [
      'Coordinator hashes key onto the 32-bit virtual-node ring to find N preference-list replicas.',
      'Coordinator fans out Write RPCs and returns success as soon as W replicas acknowledge.',
      'Reads query R replicas, merge divergent siblings via vector clocks, and queue Read Repair.',
      'Background gossip + Merkle tree comparisons reconcile cold divergent ranges.',
    ],
    failureStory:
      'When 1 of 3 replicas drops offline, writes still succeed under W=2 (or hinted handoff) with zero leader election pause; upon recovery, Merkle tree diffs sync only the missing keys.',
    layers: [
      {
        id: 'dyn-ring',
        tier: 'LAYER 01 · ROUTING',
        name: 'Virtual-Node Consistent Hashing',
        problemSolved: 'Spreads keys evenly across heterogeneous nodes with minimal K/N migration.',
        keyInvariant: 'Adding or removing a server moves only ~K/N keys.',
        conceptIds: ['consistent-hashing'],
      },
      {
        id: 'dyn-quorum',
        tier: 'LAYER 02 · REPLICATION',
        name: 'Tunable Quorums & Read Repair',
        problemSolved: 'Lets each query choose between strong overlap (W+R>N) and sub-millisecond speed.',
        keyInvariant: 'Strict read-after-write overlap whenever W + R > N.',
        conceptIds: ['quorum-replication'],
      },
      {
        id: 'dyn-vc',
        tier: 'LAYER 03 · VERSIONING',
        name: 'Vector Clocks (Causal Conflict Detection)',
        problemSolved: 'Distinguishes true overwrites from concurrent conflicting writes.',
        keyInvariant: 'a -> b <=> V(a) < V(b); incomparable vectors surface siblings.',
        conceptIds: ['vector-clocks'],
      },
      {
        id: 'dyn-gossip',
        tier: 'LAYER 04 · MEMBERSHIP & REPAIR',
        name: 'Gossip, Phi Accrual & Merkle Anti-Entropy',
        problemSolved: 'Detects dead peers without a central master and repairs cold data in O(log K).',
        keyInvariant: 'Epidemic dissemination reaches N nodes in O(log N) rounds.',
        conceptIds: ['gossip-anti-entropy', 'failure-detectors', 'merkle-anti-entropy'],
      },
    ],
    relatedDuelId: 'quorum-vs-crdts',
    relatedIncidentId: 'quorum-stale-overlap',
  },
  {
    id: 'apache-kafka',
    number: '03',
    name: 'Apache Kafka (KRaft)',
    category: 'Distributed Commit Log & Streaming',
    capProfile: 'CP (acks=all + min.insync.replicas)',
    faultModel: 'Broker crashes & slow follower ejection',
    summary:
      'Models every topic partition as an immutable append-only log replicated to an In-Sync Replica (ISR) set, with KRaft replacing ZooKeeper for cluster controller consensus.',
    writePathSteps: [
      'Producer hashes record key to select target partition and sends batch to partition leader.',
      'Leader appends record locally (advancing Log End Offset) while followers issue Fetch RPCs.',
      'Once every replica in the ISR fetches the offset, leader advances the High Watermark (HW).',
      'Consumers only read committed offsets <= HW, preventing dirty reads after leader crash.',
    ],
    failureStory:
      'If a follower stalls on GC pause, the leader evicts it from the ISR so writes stay fast; if the leader crashes, KRaft elects an ISR member guaranteeing zero committed messages are lost.',
    layers: [
      {
        id: 'kafka-log',
        tier: 'LAYER 01 · STORAGE ENGINE',
        name: 'Partitioned Replication Log & ISR',
        problemSolved: 'Provides sequential disk throughput with strict committed High Watermark.',
        keyInvariant: 'High Watermark <= min(Log End Offset across all ISR replicas).',
        conceptIds: ['replication-log'],
      },
      {
        id: 'kafka-kraft',
        tier: 'LAYER 02 · METADATA CONSENSUS',
        name: 'KRaft Controller Quorum',
        problemSolved: 'Elects partition leaders and maintains authoritative cluster metadata.',
        keyInvariant: 'Single active controller term backed by majority Raft quorum.',
        conceptIds: ['raft'],
      },
      {
        id: 'kafka-part',
        tier: 'LAYER 03 · PARTITION ROUTING',
        name: 'Key-Hashed Partitioning',
        problemSolved: 'Preserves per-key ordering while scaling write throughput horizontally.',
        keyInvariant: 'Identical partition keys deterministically route to the same log.',
        conceptIds: ['consistent-hashing'],
      },
      {
        id: 'kafka-lb',
        tier: 'LAYER 04 · CONSUMER SCALING',
        name: 'Balanced Partition Assignment',
        problemSolved: 'Distributes partition ownership evenly across live consumer instances.',
        keyInvariant: 'Each partition is consumed by at most one worker per consumer group.',
        conceptIds: ['load-balancing'],
      },
    ],
    relatedDuelId: 'hashing-vs-sharding',
    relatedIncidentId: 'range-shard-hotspot',
  },
  {
    id: 'google-spanner',
    number: '04',
    name: 'Google Spanner',
    category: 'Globally Distributed Relational DB',
    capProfile: 'CP · External Consistency',
    faultModel: 'Multi-region datacenter outages (2f + 1)',
    summary:
      'Combines Multi-Paxos replication per split tablet with Two-Phase Commit across tablets and bounded clock uncertainty to deliver globally linearizable SQL transactions.',
    writePathSteps: [
      'Client coordinates multi-tablet write via a designated 2PC coordinator Paxos group.',
      'Each participant group acquires locks and logs Prepare durably via Multi-Paxos.',
      'Coordinator commits atomically through its own Paxos group so coordinator failure never blocks.',
      'Commit-wait ensures real-time causal ordering across continents.',
    ],
    failureStory:
      'Classic 2PC blocks when a coordinator machine crashes, but Spanner runs the 2PC coordinator inside a Multi-Paxos group—so a surviving replica seamlessly finishes every in-flight transaction.',
    layers: [
      {
        id: 'span-paxos',
        tier: 'LAYER 01 · REPLICATION',
        name: 'Multi-Paxos Leader Groups',
        problemSolved: 'Replicates each tablet state across regions with 1-RTT steady-state writes.',
        keyInvariant: 'Every committed slot survives f < N/2 regional failures.',
        conceptIds: ['paxos', 'consensus-variants'],
      },
      {
        id: 'span-2pc',
        tier: 'LAYER 02 · ATOMICITY',
        name: 'Non-Blocking 2PC over Consensus',
        problemSolved: 'Eliminates 2PC single-coordinator blocking via Paxos-replicated coordinators.',
        keyInvariant: 'Cross-shard transactions commit or abort atomically everywhere.',
        conceptIds: ['two-phase-commit'],
      },
      {
        id: 'span-shards',
        tier: 'LAYER 03 · SHARDING',
        name: 'Dynamic Lexicographic Splits',
        problemSolved: 'Auto-splits hot key ranges and migrates tablets across zones.',
        keyInvariant: 'Ordered key splits preserve SQL index locality.',
        conceptIds: ['sharding-rebalancing'],
      },
      {
        id: 'span-cap',
        tier: 'LAYER 04 · CONSISTENCY BOUND',
        name: 'CAP Trade-off Engineering',
        problemSolved: 'Explicitly favors CP external consistency backed by redundant fiber networks.',
        keyInvariant: 'Never serves stale reads from a partitioned minority tablet.',
        conceptIds: ['cap-theorem', 'network-partitions'],
      },
    ],
    relatedDuelId: '2pc-vs-saga',
    relatedIncidentId: '2pc-coordinator-crash',
  },
  {
    id: 'crdt-edge-sync',
    number: '05',
    name: 'Local-First & Multi-Region CRDT Stores',
    category: 'Collaborative State / Riak / Edge KV',
    capProfile: 'AP · Strong Eventual Consistency',
    faultModel: 'Offline clients & long network partitions',
    summary:
      'Accepts 0-RTT local writes on every edge node or browser tab without asking a leader, relying on commutative, associative, idempotent lattice merges to converge once links reconnect.',
    writePathSteps: [
      'Local replica mutates G-Counter, OR-Set, or RGA sequence immediately in 0 RTT.',
      'Background gossip or delta-state sync streams updates whenever peers are reachable.',
      'Receiving replicas apply join-semilattice merge regardless of packet order or duplicates.',
      'Every replica that receives the same set of updates arrives at the exact same bit-for-bit state.',
    ],
    failureStory:
      'Even if two continents are severed for hours, both sides keep editing seamlessly—upon reconnection, all concurrent increments and set additions merge with zero lost updates.',
    layers: [
      {
        id: 'crdt-types',
        tier: 'LAYER 01 · DATA MODEL',
        name: 'Join-Semilattice CRDTs',
        problemSolved: 'Guarantees conflict-free convergence without distributed locks or consensus.',
        keyInvariant: 'Merge is commutative, associative, and idempotent (a ⊔ b = b ⊔ a).',
        conceptIds: ['crdts'],
      },
      {
        id: 'crdt-gossip',
        tier: 'LAYER 02 · PROPAGATION',
        name: 'Asynchronous Anti-Entropy Gossip',
        problemSolved: 'Disseminates state deltas resiliently across intermittent links.',
        keyInvariant: 'Duplicate or reordered sync packets remain safe.',
        conceptIds: ['gossip-anti-entropy'],
      },
      {
        id: 'crdt-ec',
        tier: 'LAYER 03 · CONVERGENCE',
        name: 'Strong Eventual Consistency',
        problemSolved: 'Eliminates manual conflict resolution UIs for counters, sets, and lists.',
        keyInvariant: 'Replicas with identical update sets hold identical state immediately.',
        conceptIds: ['eventual-consistency'],
      },
      {
        id: 'crdt-part',
        tier: 'LAYER 04 · RESILIENCE',
        name: 'Partition-Tolerant Availability',
        problemSolved: 'Keeps writes 100% available on every isolated side of a split.',
        keyInvariant: 'Zero coordination required on the critical write path.',
        conceptIds: ['network-partitions'],
      },
    ],
    relatedDuelId: 'quorum-vs-crdts',
    relatedIncidentId: 'lamport-false-causality',
  },
  {
    id: 'tendermint-bft',
    number: '06',
    name: 'Tendermint / BFT Financial Ledgers',
    category: 'Byzantine-Tolerant State Machine',
    capProfile: 'CP · Instant Deterministic Finality',
    faultModel: 'Malicious / Equivocating Validators (3f + 1)',
    summary:
      'Reaches deterministic agreement across untrusted organizations where up to one-third of validators may collude, lie, or broadcast conflicting proposals simultaneously.',
    writePathSteps: [
      'Round proposer broadcasts signed PrePrepare block proposal to validator committee.',
      'Honest validators validate signatures and broadcast all-to-all Prepare votes (O(N²)).',
      'Collecting 2f + 1 matching Prepares locks the block and triggers all-to-all Commit votes.',
      'Collecting 2f + 1 Commits finalizes the block irreversibly; stalls trigger View Change.',
    ],
    failureStory:
      'If a compromised validator signs two conflicting blocks at the same height, the 2f + 1 quorum intersection contains at least f + 1 honest witnesses—exposing cryptographic equivocation proof.',
    layers: [
      {
        id: 'bft-core',
        tier: 'LAYER 01 · BYZANTINE AGREEMENT',
        name: 'PBFT Three-Phase Consensus (3f + 1)',
        problemSolved: 'Guarantees safety and liveness even when f < N/3 nodes act maliciously.',
        keyInvariant: 'Any two 2f + 1 quorums intersect in >= f + 1 nodes (>= 1 honest).',
        conceptIds: ['pbft'],
      },
      {
        id: 'bft-view',
        tier: 'LAYER 02 · LIVENESS',
        name: 'Deterministic View / Leader Rotation',
        problemSolved: 'Replaces a silent or equivocating primary without forfeiting committed locks.',
        keyInvariant: 'View change certificates carry locked Prepare proofs into view v+1.',
        conceptIds: ['consensus-variants'],
      },
      {
        id: 'bft-gossip',
        tier: 'LAYER 03 · P2P DISSEMINATION',
        name: 'Validator Gossip Overlay',
        problemSolved: 'Relays signed votes and proposals across geo-distributed committees.',
        keyInvariant: 'Signed digests remain verifiable regardless of relay path.',
        conceptIds: ['gossip-anti-entropy'],
      },
      {
        id: 'bft-snap',
        tier: 'LAYER 04 · CHECKPOINTING',
        name: 'Consistent State Snapshots',
        problemSolved: 'Bounds log growth and accelerates catch-up for newly joining validators.',
        keyInvariant: 'Signed checkpoint cuts capture consistent global state.',
        conceptIds: ['chandy-lamport'],
      },
    ],
    relatedDuelId: 'raft-vs-pbft',
    relatedIncidentId: 'pbft-undersized-cluster',
  },
];

export function getRealSystemById(id: string | null | undefined): SystemBlueprint {
  return REAL_SYSTEMS.find((s) => s.id === id) ?? REAL_SYSTEMS[0];
}
