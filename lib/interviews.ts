import { CONCEPTS_CATALOG } from './catalog';

export type InterviewPromptId =
  | 'payment-ledger'
  | 'rate-limiter'
  | 'multi-region-chat'
  | 'log-pipeline'
  | 'geo-kv-store'
  | 'collab-editor';

export type DecisionTier = 'principal' | 'viable' | 'antipattern';

export interface DecisionOption {
  id: string;
  label: string;
  summary: string;
  tier: DecisionTier;
  points: number;
  critique: string;
  warning?: string;
  conceptId: string;
}

export interface InterviewStage {
  id: string;
  dimension: string;
  question: string;
  options: [DecisionOption, DecisionOption, DecisionOption];
}

export interface InterviewPrompt {
  id: InterviewPromptId;
  code: string;
  title: string;
  level: 'Staff (L6)' | 'Principal (L7)';
  scale: string;
  brief: string;
  hardConstraints: string[];
  relatedLabHref: string;
  relatedLabLabel: string;
  stages: [InterviewStage, InterviewStage, InterviewStage, InterviewStage, InterviewStage];
}

export interface StageCritique {
  stageId: string;
  dimension: string;
  chosenOption: DecisionOption;
  bestOption: DecisionOption;
  isOptimal: boolean;
}

export interface InterviewEvaluation {
  promptId: InterviewPromptId;
  score: number;
  maxScore: number;
  band: 'Principal Ready' | 'Staff Solid' | 'Needs Refinement';
  stageCritiques: StageCritique[];
  warnings: string[];
  reviewConceptIds: string[];
}

export const INTERVIEW_PROMPTS: readonly InterviewPrompt[] = [
  {
    id: 'payment-ledger',
    code: 'CASE-01',
    title: 'Global Double-Entry Payment Ledger',
    level: 'Principal (L7)',
    scale: '100k TPS · Multi-Region · Zero Double-Spend',
    brief:
      'Design a global ledger processing real-money transfers between accounts across 3 continents with strict balance invariants and cryptographic idempotency.',
    hardConstraints: [
      'No account may ever overdraft concurrently (non-monotonic invariant)',
      'Idempotent retries under client/network timeouts',
      'Survive full single-region outage with RPO = 0',
    ],
    relatedLabHref: '/studio',
    relatedLabLabel: 'Open Stack Composer →',
    stages: [
      {
        id: 'partitioning',
        dimension: '01 · Partitioning & Routing',
        question: 'How do you shard account ledgers to localize balance updates?',
        options: [
          {
            id: 'acct-range-raft',
            label: 'Range/Hash Shard by account_id with Multi-Raft Groups',
            summary: 'Each range owns a disjoint set of accounts backed by an independent Raft quorum.',
            tier: 'principal',
            points: 20,
            critique: 'Clean horizontal write scaling while keeping single-account debits inside one Raft group.',
            conceptId: 'sharding-rebalancing',
          },
          {
            id: 'single-primary',
            label: 'Single Global Primary Database + Read Replicas',
            summary: 'Serialize all ledger writes on one primary Postgres instance.',
            tier: 'viable',
            points: 12,
            critique: 'Simple ACID semantics, but hits a hard single-machine write ceiling well below 100k TPS.',
            conceptId: 'replication-log',
          },
          {
            id: 'timestamp-shard',
            label: 'Shard by Transaction Timestamp',
            summary: 'Route all current writes to the newest time-bucket shard.',
            tier: 'antipattern',
            points: 4,
            critique: 'Creates an extreme hot shard where 100% of live traffic hammers one node, and scatters one account’s history across every shard.',
            warning: 'Hot-shard collapse: timestamp partitioning destroys write parallelism and balance locality.',
            conceptId: 'sharding-rebalancing',
          },
        ],
      },
      {
        id: 'replication',
        dimension: '02 · Consensus & Cross-Shard Transfers',
        question: 'How do you coordinate debit(A) + credit(B) across two different shards?',
        options: [
          {
            id: 'raft-2pc-intent',
            label: 'Raft-Replicated 2PC with Persistent Transaction Record & Write Intents',
            summary: 'Each shard is Raft-replicated; a durable coordinator record drives atomic 2PC without coordinator SPOF.',
            tier: 'principal',
            points: 20,
            critique: 'Spanner/CockroachDB pattern: eliminates 2PC blocking by replicating the coordinator state via Raft/Paxos.',
            conceptId: 'two-phase-commit',
          },
          {
            id: 'saga-outbox',
            label: 'Transactional Outbox + Saga Compensation',
            summary: 'Debit A with pending hold, asynchronously credit B, refund A on permanent failure.',
            tier: 'viable',
            points: 12,
            critique: 'Great throughput and decoupling, though balances appear temporarily in-flight and require explicit reservation accounting.',
            conceptId: 'distributed-transactions',
          },
          {
            id: 'async-dual-write',
            label: 'Application-Level Dual Writes Without Coordination',
            summary: 'Send debit RPC to Shard A and credit RPC to Shard B independently.',
            tier: 'antipattern',
            points: 4,
            critique: 'A crash between RPCs permanently mints or destroys money—violating double-entry conservation.',
            warning: 'Conservation violation: uncoordinated dual writes create phantom money on partial failure.',
            conceptId: 'two-phase-commit',
          },
        ],
      },
      {
        id: 'consistency',
        dimension: '03 · Consistency & Clocks',
        question: 'Which consistency and timestamp strategy guards external audit ordering?',
        options: [
          {
            id: 'strict-serializable-hlc',
            label: 'Strict Serializability / SSI with HLC or Bounded TrueTime',
            summary: 'Linearizable reads/writes with monotonic commit timestamps across shards.',
            tier: 'principal',
            points: 20,
            critique: 'Prevents write skew, lost updates, and stale overdrafts while preserving causal/real-time audit ordering.',
            conceptId: 'raft',
          },
          {
            id: 'read-committed',
            label: 'Read Committed with Pessimistic Row Locks',
            summary: 'Lock account rows with SELECT FOR UPDATE during each transfer.',
            tier: 'viable',
            points: 12,
            critique: 'Protects single-row balances if carefully ordered to avoid deadlocks, but cross-shard snapshot audits can see torn states.',
            conceptId: 'distributed-locking',
          },
          {
            id: 'lww-wall-clock',
            label: 'Eventual Consistency + Wall-Clock LWW',
            summary: 'Accept debits on any replica and resolve conflicts by NTP timestamp.',
            tier: 'antipattern',
            points: 4,
            critique: 'Concurrent debits both pass balance checks and LWW silently drops one write—direct double-spend vulnerability.',
            warning: 'Double-spend risk: non-monotonic balance invariants cannot be safely enforced with LWW.',
            conceptId: 'cap-theorem',
          },
        ],
      },
      {
        id: 'resilience',
        dimension: '04 · Failure & Idempotency',
        question: 'How do you prevent duplicate charges when clients retry timed-out requests?',
        options: [
          {
            id: 'idempotency-key-fencing',
            label: 'Client Idempotency Key Stored Atomically in Ledger Tx + Fencing Tokens',
            summary: 'Deduplicate in the same ACID transaction and fence stale lease holders at the storage layer.',
            tier: 'principal',
            points: 20,
            critique: 'Guarantees exactly-once financial effect even across network retries, GC pauses, and leader failovers.',
            conceptId: 'distributed-locking',
          },
          {
            id: 'redis-dedup-ttl',
            label: 'Best-Effort Redis Cache Deduplication (5-min TTL)',
            summary: 'Check a separate cache before executing the ledger debit.',
            tier: 'viable',
            points: 12,
            critique: 'Catches common rapid retries, but cache eviction or failover opens a duplicate-charge window.',
            conceptId: 'eventual-consistency',
          },
          {
            id: 'client-no-retry',
            label: 'Disable Retries and Ask Users to Refresh',
            summary: 'Fail open or leave indeterminate transactions unretried.',
            tier: 'antipattern',
            points: 4,
            critique: 'Users manually click Pay twice anyway, causing uncontrolled duplicate debits.',
            warning: 'Missing idempotency contract: timeouts leave clients unable to distinguish committed vs lost writes.',
            conceptId: 'network-partitions',
          },
        ],
      },
      {
        id: 'slo-observability',
        dimension: '05 · Overload & Observability',
        question: 'How do you keep tail latency bounded and verify zero money leakage continuously?',
        options: [
          {
            id: 'retry-budget-invariant',
            label: 'Adaptive Load Shedding + Retry Budgets + Continuous Double-Entry Sum Check',
            summary: 'Shed excess load with jittered backoff and verify Σ(debits) == Σ(credits) continuously.',
            tier: 'principal',
            points: 20,
            critique: 'Prevents metastable retry collapse while proving conservation invariants continuously in production.',
            conceptId: 'load-balancing',
          },
          {
            id: 'nightly-reconcile',
            label: 'Nightly Batch Reconciliation Job',
            summary: 'Audit totals once every 24 hours from cold backups.',
            tier: 'viable',
            points: 12,
            critique: 'Useful as a secondary check, but leaves a 24-hour blast radius before catching a ledger bug.',
            conceptId: 'chandy-lamport',
          },
          {
            id: 'unlimited-retries',
            label: 'Unlimited Immediate Client Retries',
            summary: 'Retry every 500/timeout instantly until the ledger replies.',
            tier: 'antipattern',
            points: 4,
            critique: 'Triggers a textbook metastable retry storm during any brief leader election.',
            warning: 'Metastable overload risk: unbudgeted retries amplify transient elections into full outages.',
            conceptId: 'load-balancing',
          },
        ],
      },
    ],
  },
  {
    id: 'rate-limiter',
    code: 'CASE-02',
    title: 'Multi-Region Distributed API Rate Limiter',
    level: 'Staff (L6)',
    scale: '2M RPS · <5ms p99 Overhead · Global PoPs',
    brief:
      'Protect public APIs across 15 edge regions with per-tenant quotas while adding less than 5ms p99 latency and surviving cross-region partitions.',
    hardConstraints: [
      'Sub-5ms p99 decision path at edge PoPs',
      'Bounded slight over-admission allowed during WAN partition (AP-leaning)',
      'Must protect origin services from hot-key celebrity bursts',
    ],
    relatedLabHref: '/queueing',
    relatedLabLabel: 'Open Queueing Lab →',
    stages: [
      {
        id: 'partitioning',
        dimension: '01 · Routing & State Placement',
        question: 'Where should rate-limit counters live relative to edge gateways?',
        options: [
          {
            id: 'local-edge-ring',
            label: 'Consistent-Hashed Regional Counter Ring + Local Token Batching',
            summary: 'Gateways lease small token batches locally and sync asynchronously with regional counter shards.',
            tier: 'principal',
            points: 20,
            critique: 'Keeps p99 well under 1ms on the hot path while amortizing cross-node counter RPCs by 10–50×.',
            conceptId: 'consistent-hashing',
          },
          {
            id: 'regional-redis-every-req',
            label: 'Synchronous Regional Redis Increment on Every Request',
            summary: 'Every API call performs a 1-RTT Lua sliding-window script against regional Redis.',
            tier: 'viable',
            points: 12,
            critique: 'Accurate within a region, but hot tenant keys saturate single Redis shards at 2M RPS.',
            conceptId: 'load-balancing',
          },
          {
            id: 'global-raft-counter',
            label: 'Single Global Raft Group for All Counters',
            summary: 'Commit every API increment through a cross-continent Raft leader.',
            tier: 'antipattern',
            points: 4,
            critique: 'Adds 120–250ms WAN RTT to every request—violating the <5ms budget by 30×.',
            warning: 'Latency SLO breach: global synchronous consensus violates PACELC EL edge latency budgets.',
            conceptId: 'raft',
          },
        ],
      },
      {
        id: 'replication',
        dimension: '02 · Cross-Region Synchronization',
        question: 'How do 15 edge regions converge on a tenant’s global quota?',
        options: [
          {
            id: 'gossip-pn-counter',
            label: 'Gossip-Synchronized G-Counter / CRDT Quota Windows',
            summary: 'Each region increments its own slot in a monotonic CRDT counter and gossips deltas every 100–250ms.',
            tier: 'principal',
            points: 20,
            critique: 'CALM-compliant monotonic counters converge without locks or WAN blocking, bounding drift to one gossip interval.',
            conceptId: 'crdts',
          },
          {
            id: 'periodic-db-flush',
            label: '30-Second Periodic Sync via Central SQL Database',
            summary: 'Flush counters to a central DB twice a minute.',
            tier: 'viable',
            points: 12,
            critique: 'Simple, but a 30-second convergence lag lets attackers burst 10× over quota before detection.',
            conceptId: 'eventual-consistency',
          },
          {
            id: '2pc-all-regions',
            label: 'Two-Phase Commit Across All 15 Regions',
            summary: 'Lock and increment every edge PoP atomically.',
            tier: 'antipattern',
            points: 4,
            critique: 'One unreachable region stalls global API traffic—violating availability and latency.',
            warning: 'Availability collapse: 2PC blocks all edge traffic on any single-region partition.',
            conceptId: 'two-phase-commit',
          },
        ],
      },
      {
        id: 'consistency',
        dimension: '03 · Algorithm & Boundary Accuracy',
        question: 'Which windowing model prevents boundary double-burst spikes?',
        options: [
          {
            id: 'gcra-sliding',
            label: 'GCRA (Generic Cell Rate Algorithm) / Sliding Window Counter',
            summary: 'Tracks theoretical arrival time (TAT) in O(1) state per key with smooth burst control.',
            tier: 'principal',
            points: 20,
            critique: 'Zero boundary burst spike, tiny O(1) memory footprint, and deterministic atomic updates.',
            conceptId: 'load-balancing',
          },
          {
            id: 'fixed-window',
            label: 'Fixed 1-Minute Bucket Counters',
            summary: 'Increment key:{minute} and reject above limit.',
            tier: 'viable',
            points: 12,
            critique: 'Very fast, but allows 2× limit bursts across minute boundaries (:59 and :00).',
            conceptId: 'eventual-consistency',
          },
          {
            id: 'unbounded-log',
            label: 'Store Every Request Timestamp in a List per Tenant',
            summary: 'Keep exact arrays of all timestamps over the past hour.',
            tier: 'antipattern',
            points: 4,
            critique: 'Memory explodes linearly with traffic (O(RPS × window))—OOMs during DDoS spikes.',
            warning: 'Memory exhaustion: per-request timestamp logs fail catastrophically under abuse traffic.',
            conceptId: 'load-balancing',
          },
        ],
      },
      {
        id: 'resilience',
        dimension: '04 · Partition & Store Failure Policy',
        question: 'What happens when a regional counter store becomes unreachable?',
        options: [
          {
            id: 'fallback-local-conservative',
            label: 'Fail-Over to Local In-Memory Conservative Quota + Circuit Breaker',
            summary: 'Enforce per-gateway fraction of tenant quota locally until counter store recovers.',
            tier: 'principal',
            points: 20,
            critique: 'Preserves API availability while still shielding origins from runaway traffic during outages.',
            conceptId: 'failure-detectors',
          },
          {
            id: 'fail-open',
            label: 'Fail-Open Unlimited Pass-Through',
            summary: 'Allow 100% of traffic when the counter cluster times out.',
            tier: 'viable',
            points: 12,
            critique: 'Avoids false 429s, but an outage during a bot attack immediately overwhelms backend origins.',
            conceptId: 'network-partitions',
          },
          {
            id: 'fail-closed-500',
            label: 'Block 100% of API Traffic (Fail-Closed)',
            summary: 'Return 503 on every API request if Redis misses a heartbeat.',
            tier: 'antipattern',
            points: 4,
            critique: 'Turns a minor rate-limiter blip into a total company-wide outage.',
            warning: 'Blast-radius amplification: failing closed makes the rate limiter a global single point of failure.',
            conceptId: 'cap-theorem',
          },
        ],
      },
      {
        id: 'slo-observability',
        dimension: '05 · Client Feedback & Overload Hygiene',
        question: 'How should rejected callers behave so 429s do not trigger retry storms?',
        options: [
          {
            id: 'retry-after-jitter',
            label: 'Return 429 + Jittered Retry-After Header + Token Bucket Shadow Mode',
            summary: 'Spread client retries smoothly and validate new policies in shadow mode before enforcing.',
            tier: 'principal',
            points: 20,
            critique: 'Prevents synchronized retry cliffs while letting SREs verify policy impact safely.',
            conceptId: 'load-balancing',
          },
          {
            id: 'plain-429',
            label: 'Return Bare HTTP 429 Without Retry Guidance',
            summary: 'Drop excess requests immediately with empty body.',
            tier: 'viable',
            points: 12,
            critique: 'Works for polite SDKs, but naive clients immediately hammer the edge in tight loops.',
            conceptId: 'load-balancing',
          },
          {
            id: 'tarpit-sleep',
            label: 'Hold Rejected Connections Open for 10 Seconds (Tarpit)',
            summary: 'Sleep on the gateway worker thread to slow down abusive callers.',
            tier: 'antipattern',
            points: 4,
            critique: 'Little’s Law (L = λW) explodes open sockets and exhausts gateway worker pools immediately.',
            warning: 'Resource exhaustion via Little’s Law: holding rejected connections destroys edge capacity.',
            conceptId: 'load-balancing',
          },
        ],
      },
    ],
  },
  {
    id: 'multi-region-chat',
    code: 'CASE-03',
    title: 'Global Low-Latency Chat & Presence Mesh',
    level: 'Staff (L6)',
    scale: '50M Concurrent Sockets · Causal Ordering · Offline Sync',
    brief:
      'Build a Slack/WhatsApp-grade messaging system delivering 1:1 and channel messages globally with causal reply ordering and instant reconnection catch-up.',
    hardConstraints: [
      'Replies must never appear before the message they reply to (causal consistency)',
      'Offline clients must catch up cleanly without missing gaps',
      'Presence heartbeats must not overwhelm core message storage',
    ],
    relatedLabHref: '/consistency',
    relatedLabLabel: 'Open Consistency Lab →',
    stages: [
      {
        id: 'partitioning',
        dimension: '01 · Channel Sharding & Socket Routing',
        question: 'How do you partition message timelines and route live WebSockets?',
        options: [
          {
            id: 'channel-id-log',
            label: 'Partition Storage by channel_id + Consistent-Hashed Edge Socket Routers',
            summary: 'All messages for a channel append to one ordered partition; stateless routing maps user_id → edge gateway.',
            tier: 'principal',
            points: 20,
            critique: 'Gives per-channel sequential ordering and single-partition range scans for instant history pagination.',
            conceptId: 'sharding-rebalancing',
          },
          {
            id: 'user-id-shard',
            label: 'Partition Channel Messages by sender user_id',
            summary: 'Store each user’s sent messages on their own shard and scatter-gather on channel load.',
            tier: 'viable',
            points: 12,
            critique: 'Easy writes, but reading a 500-person channel requires fan-out scatter-gather across hundreds of shards.',
            conceptId: 'sharding-rebalancing',
          },
          {
            id: 'broadcast-all-edges',
            label: 'Broadcast Every Message to Every Edge Gateway',
            summary: 'Let each gateway filter locally for connected users.',
            tier: 'antipattern',
            points: 4,
            critique: 'O(N²) cluster bandwidth explosion—collapses well before 50M users.',
            warning: 'Bandwidth explosion: global edge broadcast scales quadratically with cluster size.',
            conceptId: 'gossip-anti-entropy',
          },
        ],
      },
      {
        id: 'replication',
        dimension: '02 · Message Durability & Replication',
        question: 'How are channel messages persisted and replicated across AZs?',
        options: [
          {
            id: 'isr-replicated-log',
            label: 'Append-Only Replicated Log (ISR / Raft) + LSM-Tree Message Store',
            summary: 'Acknowledge once persisted to quorum ISR; compact into LSM SSTables keyed by (channel_id, seq_id).',
            tier: 'principal',
            points: 20,
            critique: 'Matches Discord/Slack architecture: sequential LSM writes handle massive chat bursts with durable monotonic sequence numbers.',
            conceptId: 'replication-log',
          },
          {
            id: 'async-primary-replica',
            label: 'Single Primary + Asynchronous Replica',
            summary: 'Acknowledge immediately on primary disk write.',
            tier: 'viable',
            points: 12,
            critique: 'Low latency, but primary failover loses recently acknowledged messages.',
            conceptId: 'replication-log',
          },
          {
            id: 'ram-only-pubsub',
            label: 'In-Memory Pub/Sub Without Persistent Log',
            summary: 'Deliver live messages over volatile pub/sub channels.',
            tier: 'antipattern',
            points: 4,
            critique: 'Any mobile user switching from Wi-Fi to LTE permanently loses messages.',
            warning: 'Durability failure: volatile pub/sub violates offline catch-up requirements.',
            conceptId: 'replication-log',
          },
        ],
      },
      {
        id: 'consistency',
        dimension: '03 · Causal Ordering & Clocks',
        question: 'How do you guarantee causal reply ordering across multi-region writers?',
        options: [
          {
            id: 'hlc-channel-seq',
            label: 'Per-Channel Monotonic Sequence IDs + HLC Causal Metadata',
            summary: 'Assign monotonic Snowflake/HLC IDs at the channel partition and carry causal parent references.',
            tier: 'principal',
            points: 20,
            critique: 'Guarantees replies never render before parents without paying global cross-channel linearizability.',
            conceptId: 'vector-clocks',
          },
          {
            id: 'client-wall-clock',
            label: 'Sort Messages by Sender Device Wall Clock',
            summary: 'Trust each phone’s local Date.now() timestamp.',
            tier: 'antipattern',
            points: 4,
            critique: 'Skewed mobile clocks routinely render replies minutes before the question.',
            warning: 'Causal inversion: unsynchronized client wall clocks break conversation order.',
            conceptId: 'lamport-clocks',
          },
          {
            id: 'global-spanner-serial',
            label: 'Global External Consistency Across All Channels',
            summary: 'Run 2ε Commit-Wait across every message globally.',
            tier: 'viable',
            points: 12,
            critique: 'Correct causal order, but over-engineers cross-channel ordering at extra latency and cost.',
            conceptId: 'paxos',
          },
        ],
      },
      {
        id: 'resilience',
        dimension: '04 · Presence & Failure Detection',
        question: 'How do you track online/offline status for 50M sockets without melting the database?',
        options: [
          {
            id: 'ephemeral-phi-gossip',
            label: 'Ephemeral Soft-State Presence Ring with Adaptive Heartbeats (Phi Accrual) + Lazy Fan-Out',
            summary: 'Keep presence in leased RAM with jittered TTLs and push changes only to active watchers.',
            tier: 'principal',
            points: 20,
            critique: 'Isolates high-churn presence traffic from durable chat storage and prevents reconnect storms.',
            conceptId: 'failure-detectors',
          },
          {
            id: 'sql-last-seen',
            label: 'UPDATE users SET last_seen=NOW() Every 10s in Primary DB',
            summary: 'Persist every heartbeat directly to the user table.',
            tier: 'antipattern',
            points: 4,
            critique: '5M writes/sec of ephemeral heartbeat churn destroys the primary database.',
            warning: 'Write amplification collapse: persisting heartbeats to relational storage starves real messages.',
            conceptId: 'failure-detectors',
          },
          {
            id: 'polling-30s',
            label: 'Client HTTP Polling Every 30 Seconds',
            summary: 'Poll presence endpoints periodically from all clients.',
            tier: 'viable',
            points: 12,
            critique: 'Simple to operate, though presence feels sluggish and wastes mobile battery.',
            conceptId: 'gossip-anti-entropy',
          },
        ],
      },
      {
        id: 'slo-observability',
        dimension: '05 · Offline Sync & Reconciliation',
        question: 'How do reconnecting clients catch up after a 2-hour subway outage?',
        options: [
          {
            id: 'cursor-merkle-sync',
            label: 'Per-Channel High-Watermark Cursor Sync + Merkle Unread Summary',
            summary: 'Compare compact channel watermark digests and fetch only delta ranges above last_seen_seq.',
            tier: 'principal',
            points: 20,
            critique: 'O(changed channels) bandwidth on reconnect—eliminates thundering-herd full reloads.',
            conceptId: 'merkle-anti-entropy',
          },
          {
            id: 'refetch-all-channels',
            label: 'Re-Download Last 100 Messages of Every Channel on Reconnect',
            summary: 'Pull full history for all subscribed channels after every disconnect.',
            tier: 'viable',
            points: 12,
            critique: 'Works for small workspaces, but causes massive read amplification after mobile tower handoffs.',
            conceptId: 'merkle-anti-entropy',
          },
          {
            id: 'drop-offline',
            label: 'Deliver Only Live Messages After Reconnect',
            summary: 'Skip gap recovery entirely.',
            tier: 'antipattern',
            points: 4,
            critique: 'Violates core chat correctness—users silently miss hours of messages.',
            warning: 'Silent message loss: lacking watermark catch-up leaves permanent history gaps.',
            conceptId: 'eventual-consistency',
          },
        ],
      },
    ],
  },
  {
    id: 'log-pipeline',
    code: 'CASE-04',
    title: 'High-Throughput Telemetry & Event Log Pipeline',
    level: 'Staff (L6)',
    scale: '10M Events/s · Ordered Partitions · Multi-Consumer Replay',
    brief:
      'Design a Kafka-like distributed commit log ingesting 10M telemetry events/sec with durable replication, consumer group rebalancing, and backpressure.',
    hardConstraints: [
      'Sequential append throughput at disk bandwidth limits',
      'Zero data loss on single broker crash',
      'Slow downstream analytics consumers must not stall real-time alerting consumers',
    ],
    relatedLabHref: '/storage',
    relatedLabLabel: 'Open Storage Internals →',
    stages: [
      {
        id: 'partitioning',
        dimension: '01 · Topic Partitioning',
        question: 'How do you shard an event stream across 100 brokers?',
        options: [
          {
            id: 'keyed-partitions-sticky',
            label: 'Key-Hashed Partitions (with Salting for Hot Keys) + Sticky Batching',
            summary: 'Hash entity_id for per-entity order; batch unkeyed telemetry stickily to maximize compression.',
            tier: 'principal',
            points: 20,
            critique: 'Balances per-entity causal ordering with high-throughput sequential I/O batching.',
            conceptId: 'sharding-rebalancing',
          },
          {
            id: 'single-partition-topic',
            label: 'One Global Partition per Topic for Total Order',
            summary: 'Keep every event strictly totally ordered on one broker.',
            tier: 'antipattern',
            points: 4,
            critique: 'Caps throughput to one broker NIC/disk—100× below 10M events/sec.',
            warning: 'Throughput bottleneck: global total order prevents horizontal scaling across brokers.',
            conceptId: 'replication-log',
          },
          {
            id: 'round-robin-unbatched',
            label: 'Round-Robin Single Events Across All Partitions',
            summary: 'Send each event individually to the next partition.',
            tier: 'viable',
            points: 12,
            critique: 'Spreads load evenly, but destroys per-entity ordering and hurts batch compression ratios.',
            conceptId: 'load-balancing',
          },
        ],
      },
      {
        id: 'replication',
        dimension: '02 · Broker Replication & Commit Rule',
        question: 'How do you replicate partition segments without losing acknowledged events?',
        options: [
          {
            id: 'isr-acks-all-hw',
            label: 'In-Sync Replicas (ISR) with acks=all, min.insync.replicas=2 & High Watermark',
            summary: 'Commit only when ISR quorum appends; advance High Watermark so consumers never read uncommitted data.',
            tier: 'principal',
            points: 20,
            critique: 'Prevents dirty reads and survives broker crash with RPO=0 while preserving sequential page-cache speed.',
            conceptId: 'replication-log',
          },
          {
            id: 'acks-1-leader',
            label: 'acks=1 (Acknowledge Immediately on Leader Append)',
            summary: 'Reply to producer before followers replicate.',
            tier: 'viable',
            points: 12,
            critique: 'Slightly lower latency, but any leader crash silently loses acknowledged tail events.',
            conceptId: 'replication-log',
          },
          {
            id: 'unclean-election',
            label: 'Allow Out-of-Sync Followers to Win Leader Election (Unclean Election)',
            summary: 'Elect any surviving broker immediately regardless of lag.',
            tier: 'antipattern',
            points: 4,
            critique: 'Truncates committed history and causes divergent consumer offsets.',
            warning: 'Data loss & offset divergence: unclean leader election violates committed durability.',
            conceptId: 'replication-log',
          },
        ],
      },
      {
        id: 'consistency',
        dimension: '03 · Delivery Semantics',
        question: 'How do you handle duplicate producer retries cleanly?',
        options: [
          {
            id: 'idempotent-producer-seq',
            label: 'Idempotent Producer (PID + Monotonic Sequence) + Consumer Idempotency',
            summary: 'Brokers deduplicate retried batches via sequence numbers; sinks apply idempotent upserts.',
            tier: 'principal',
            points: 20,
            critique: 'Eliminates network retry duplicates at minimal overhead and pairs cleanly with at-least-once sinks.',
            conceptId: 'replication-log',
          },
          {
            id: 'at-most-once',
            label: 'Fire-and-Forget (acks=0, No Retries)',
            summary: 'Never retry failed batches.',
            tier: 'antipattern',
            points: 4,
            critique: 'Silently drops telemetry during every network blip or broker rollout.',
            warning: 'Unacceptable event loss: acks=0 drops data silently on routine restarts.',
            conceptId: 'network-partitions',
          },
          {
            id: 'global-xa-2pc',
            label: 'Distributed XA 2PC Across Every Downstream Consumer Sink',
            summary: 'Coordinate broker offset and sink DB in one global XA transaction.',
            tier: 'viable',
            points: 12,
            critique: 'Strong semantics when supported, but brittle and dramatically lowers pipeline throughput.',
            conceptId: 'two-phase-commit',
          },
        ],
      },
      {
        id: 'resilience',
        dimension: '04 · Consumer Isolation & Backpressure',
        question: 'How do you keep a slow batch analytics consumer from blocking real-time alerts?',
        options: [
          {
            id: 'pull-offset-log',
            label: 'Pull-Based Independent Consumer Offsets Over Segmented Disk Log',
            summary: 'Each consumer group tracks its own offset; fast consumers read hot page cache while slow ones read disk.',
            tier: 'principal',
            points: 20,
            critique: 'Completely decouples consumer speeds and allows effortless historical replay from any offset.',
            conceptId: 'replication-log',
          },
          {
            id: 'push-broker-ram',
            label: 'Broker Push-Delivery Holding Unacked Messages in Broker RAM',
            summary: 'Push events to consumers and buffer unacknowledged frames in broker heap.',
            tier: 'antipattern',
            points: 4,
            critique: 'One stalled analytics consumer fills broker heap, triggers GC pauses, and stalls real-time alerts.',
            warning: 'Head-of-line & OOM cascade: broker-side RAM queuing couples slow consumers to fast ones.',
            conceptId: 'load-balancing',
          },
          {
            id: 'drop-slow-consumer',
            label: 'Disconnect and Drop Events for Slow Consumers',
            summary: 'Evict any consumer lagging more than 5 seconds.',
            tier: 'viable',
            points: 12,
            critique: 'Protects broker stability, but breaks durable analytics replay guarantees.',
            conceptId: 'load-balancing',
          },
        ],
      },
      {
        id: 'slo-observability',
        dimension: '05 · Rebalancing & Cluster Control Plane',
        question: 'How do you manage cluster metadata and consumer group rebalances safely?',
        options: [
          {
            id: 'raft-metadata-coop',
            label: 'Raft Metadata Quorum (KRaft) + Incremental Cooperative Rebalancing',
            summary: 'Eliminate external metadata SPOFs and revoke only moving partitions without stop-the-world pauses.',
            tier: 'principal',
            points: 20,
            critique: 'Removes stop-the-world consumer rebalance storms and scales cleanly to tens of thousands of partitions.',
            conceptId: 'raft',
          },
          {
            id: 'eager-rebalance',
            label: 'Eager Stop-the-World Consumer Rebalance',
            summary: 'Revoke all partitions from all consumers whenever any worker restarts.',
            tier: 'viable',
            points: 12,
            critique: 'Correct assignment, but causes global lag spikes during rolling deploys.',
            conceptId: 'sharding-rebalancing',
          },
          {
            id: 'static-config-file',
            label: 'Manual Static Broker-to-Consumer Config Files',
            summary: 'Hand-edit partition assignments during broker failures.',
            tier: 'antipattern',
            points: 4,
            critique: 'Unoperable at 100-broker scale—every single node failure requires manual page intervention.',
            warning: 'Operational fragility: manual failover cannot meet automated high-availability SLOs.',
            conceptId: 'failure-detectors',
          },
        ],
      },
    ],
  },
  {
    id: 'geo-kv-store',
    code: 'CASE-05',
    title: 'Geo-Distributed Multi-Tenant Key-Value Store',
    level: 'Principal (L7)',
    scale: '500k Ops/s · Tunable Consistency · 3 Continents',
    brief:
      'Design a Dynamo/Cockroach-class geo-distributed KV store supporting both low-latency regional reads and strongly consistent tenant workloads.',
    hardConstraints: [
      'Even data distribution across heterogeneous nodes with minimal reshuffling on scale-out',
      'Automated anti-entropy repair for temporarily partitioned replicas',
      'Predictable tail latency even when one replica experiences GC or disk stalls',
    ],
    relatedLabHref: '/bench',
    relatedLabLabel: 'Open Quorum Workbench →',
    stages: [
      {
        id: 'partitioning',
        dimension: '01 · Key Distribution',
        question: 'How do you map keys to storage nodes so adding capacity moves minimal data?',
        options: [
          {
            id: 'consistent-hash-vnodes',
            label: 'Consistent Hashing Ring with Virtual Nodes (Vnodes) & Rack Awareness',
            summary: 'Assign 64–256 vnodes per physical node and place replica preference lists across distinct failure zones.',
            tier: 'principal',
            points: 20,
            critique: 'Moves only ~1/N keys on node join/leave, balances heterogeneous hardware, and survives whole-rack loss.',
            conceptId: 'consistent-hashing',
          },
          {
            id: 'modulo-hash',
            label: 'Simple hash(key) % N Partitioning',
            summary: 'Compute target shard directly with modulo N.',
            tier: 'antipattern',
            points: 4,
            critique: 'Adding 1 node remaps nearly (N-1)/N keys—triggering a catastrophic cluster-wide reshuffle storm.',
            warning: 'Reshuffle storm: modulo hashing invalidates almost every key placement when N changes.',
            conceptId: 'consistent-hashing',
          },
          {
            id: 'directory-lookup',
            label: 'Central Directory Mapping Every Key to a Node',
            summary: 'Consult a central metadata table on every single KV operation.',
            tier: 'viable',
            points: 12,
            critique: 'Flexible placement (when done per range rather than per key), but per-key directories cannot fit in RAM.',
            conceptId: 'sharding-rebalancing',
          },
        ],
      },
      {
        id: 'replication',
        dimension: '02 · Quorum & Consistency Model',
        question: 'How do you guarantee read-after-write consistency for strong-consistency tenants?',
        options: [
          {
            id: 'quorum-overlap-raft',
            label: 'Strict Quorum Overlap (W + R > N) with Read Repair / Per-Range Raft for Linearizability',
            summary: 'Use N=3 (W=2, R=2) + version vectors for tunable tenants, or Raft leader leases for strict linearizability.',
            tier: 'principal',
            points: 20,
            critique: 'Correctly distinguishes strict quorum overlap (which still needs read-repair/consensus for linearizability) from sloppy quorums.',
            conceptId: 'quorum-replication',
          },
          {
            id: 'sloppy-w1-r1',
            label: 'Sloppy Quorum W=1, R=1 for All Tenants',
            summary: 'Return after 1 replica responds regardless of tenant tier.',
            tier: 'antipattern',
            points: 4,
            critique: 'W+R=2 ≤ N=3 guarantees stale reads and silent divergence—violating strong-consistency SLAs.',
            warning: 'Quorum overlap violation: W+R ≤ N cannot guarantee reading the latest write.',
            conceptId: 'quorum-replication',
          },
          {
            id: 'w-all-r-1',
            label: 'Write-All (W=N), Read-One (R=1)',
            summary: 'Require all 3 replicas to acknowledge every write.',
            tier: 'viable',
            points: 12,
            critique: 'Fast reads, but any single node reboot blocks 100% of writes.',
            conceptId: 'quorum-replication',
          },
        ],
      },
      {
        id: 'consistency',
        dimension: '03 · Conflict Detection & Anti-Entropy',
        question: 'How do you detect and repair diverged replicas after a 30-minute partition heals?',
        options: [
          {
            id: 'merkle-version-vectors',
            label: 'Merkle Tree Background Anti-Entropy + Dotted Version Vectors',
            summary: 'Exchange compact root hashes to pinpoint only divergent key ranges and detect true concurrent siblings.',
            tier: 'principal',
            points: 20,
            critique: 'O(log K) network transfer to locate differences while preserving causal conflict history.',
            conceptId: 'merkle-anti-entropy',
          },
          {
            id: 'full-range-copy',
            label: 'Stream Full Terabyte Shard Snapshots Between Replicas Hourly',
            summary: 'Diff entire datasets brute-force across the WAN.',
            tier: 'viable',
            points: 12,
            critique: 'Simple to implement, but burns massive cross-AZ bandwidth and disk IOPS.',
            conceptId: 'merkle-anti-entropy',
          },
          {
            id: 'never-repair',
            label: 'Rely Solely on TTL Expiration Without Anti-Entropy',
            summary: 'Let stale keys expire eventually.',
            tier: 'antipattern',
            points: 4,
            critique: 'Long-lived keys stay permanently diverged or resurrected (zombie deletes) forever.',
            warning: 'Permanent entropy drift: without anti-entropy, cold keys never converge after partitions.',
            conceptId: 'eventual-consistency',
          },
        ],
      },
      {
        id: 'resilience',
        dimension: '04 · Tail-Latency Mitigation',
        question: 'How do you protect read p99 when one storage replica hits an LSM compaction pause?',
        options: [
          {
            id: 'hedged-speculative-reads',
            label: 'Quorum Racing + Hedged Speculative Retry After p95 Latency',
            summary: 'Read from the fastest R replicas and fire a hedged request to the backup replica if p95 elapses.',
            tier: 'principal',
            points: 20,
            critique: 'Directly applies Jeff Dean’s Tail-at-Scale hedging—slashes p99 latency spikes for ~5% extra read load.',
            conceptId: 'load-balancing',
          },
          {
            id: 'long-timeout-retry',
            label: 'Wait for Fixed 5-Second RPC Timeout Before Trying Replica 2',
            summary: 'Retry sequentially only after a full 5s timeout.',
            tier: 'viable',
            points: 12,
            critique: 'Recovers eventually, but turns every compaction blip into a 5,000ms p99 spike.',
            conceptId: 'failure-detectors',
          },
          {
            id: 'pin-one-replica',
            label: 'Always Pin Reads to Primary Replica Only Without Failover',
            summary: 'Route all reads for a key strictly to one replica.',
            tier: 'antipattern',
            points: 4,
            critique: 'Every single disk stall or GC pause directly hits 100% of that key’s read traffic.',
            warning: 'Zero tail-latency isolation: single-replica pinning exposes clients to every local pause.',
            conceptId: 'quorum-replication',
          },
        ],
      },
      {
        id: 'slo-observability',
        dimension: '05 · Local Storage Engine Selection',
        question: 'Which local storage engine best matches high-throughput random KV mutations?',
        options: [
          {
            id: 'lsm-leveled-bloom',
            label: 'LSM-Tree (RocksDB/Pebble) with Leveled Compaction & 10-bit Bloom Filters',
            summary: 'Absorb random writes sequentially into WAL + MemTable while Bloom filters keep point reads fast.',
            tier: 'principal',
            points: 20,
            critique: 'Optimal RUM balance for distributed KV nodes: high write throughput, ~1.1× space amp, and bounded point lookups.',
            conceptId: 'replication-log',
          },
          {
            id: 'unindexed-heap',
            label: 'Append-Only Flat Log File Without Index or Compaction',
            summary: 'Scan the log linearly to serve reads.',
            tier: 'antipattern',
            points: 4,
            critique: 'O(N) read latency and unbounded disk growth—unusable beyond megabytes.',
            warning: 'Unbounded read & space amplification: uncompacted logs collapse as data grows.',
            conceptId: 'replication-log',
          },
          {
            id: 'btree-default',
            label: 'Standard B+Tree with Synchronous Per-Key Page Flush',
            summary: 'Update 8KB pages in place and fsync random pages on every write.',
            tier: 'viable',
            points: 12,
            critique: 'Great for read-heavy cached workloads, but high random write amplification limits ingest throughput.',
            conceptId: 'sharding-rebalancing',
          },
        ],
      },
    ],
  },
  {
    id: 'collab-editor',
    code: 'CASE-06',
    title: 'Offline-First Collaborative Document Editor',
    level: 'Principal (L7)',
    scale: '10M Docs · 0-RTT Local Typing · Deterministic Offline Merge',
    brief:
      'Design a Figma/Google-Docs-caliber collaborative editor where users edit on airplanes for hours and merge seamlessly with 50 simultaneous collaborators.',
    hardConstraints: [
      '0-RTT local keystroke rendering (never block typing on network)',
      'Guaranteed Strong Eventual Consistency (SEC): all peers converge to identical document state',
      'Handle arbitrary offline durations and out-of-order sync delivery',
    ],
    relatedLabHref: '/theorems',
    relatedLabLabel: 'Open CALM Theorem Lab →',
    stages: [
      {
        id: 'partitioning',
        dimension: '01 · Document Session Routing',
        question: 'How do you route live collaborative sessions for an active document?',
        options: [
          {
            id: 'doc-id-sticky-relay',
            label: 'Consistent-Hashed Document Sync Relays by doc_id + Compact Snapshot Object Store',
            summary: 'Colocate active collaborators for a document on one stateful relay that broadcasts tiny delta ops.',
            tier: 'principal',
            points: 20,
            critique: 'Minimizes broadcast fan-out hops while keeping hot document state warm in memory.',
            conceptId: 'consistent-hashing',
          },
          {
            id: 'random-stateless-db',
            label: 'Route Every Keystroke to Random Stateless Server → Central SQL Lock',
            summary: 'Lock the document row in Postgres on every character typed.',
            tier: 'antipattern',
            points: 4,
            critique: 'Destroys 0-RTT responsiveness and creates severe lock contention across 50 concurrent typists.',
            warning: 'Latency & lock-contention collapse: central row locks cannot support real-time collaborative editing.',
            conceptId: 'distributed-locking',
          },
          {
            id: 'p2p-full-mesh',
            label: 'Browser-Only WebRTC Full Mesh Without Server Persistence',
            summary: 'Connect every collaborator directly peer-to-peer.',
            tier: 'viable',
            points: 12,
            critique: 'Cool for tiny groups, but breaks when all peers close their laptops or behind corporate NATs.',
            conceptId: 'gossip-anti-entropy',
          },
        ],
      },
      {
        id: 'replication',
        dimension: '02 · Conflict-Free Convergence Engine',
        question: 'Which state replication model guarantees deterministic merge after hours offline?',
        options: [
          {
            id: 'crdt-rga-yjs',
            label: 'Sequence CRDT (RGA / YATA) + Causal Delta-State Sync',
            summary: 'Assign globally unique (replica_id, counter) IDs to characters so concurrent edits commute without central coordination.',
            tier: 'principal',
            points: 20,
            critique: 'Satisfies CALM monotonicity: associative, commutative, idempotent merges guarantee Strong Eventual Consistency even offline.',
            conceptId: 'crdts',
          },
          {
            id: 'central-ot',
            label: 'Centralized Operational Transformation (OT)',
            summary: 'Transform concurrent index offsets strictly through an authoritative server.',
            tier: 'viable',
            points: 12,
            critique: 'Proven for online editing (Google Docs), but multi-hour offline branches require complex server-side rebasing.',
            conceptId: 'eventual-consistency',
          },
          {
            id: 'lww-whole-doc',
            label: 'Last-Write-Wins Over Entire Document Blob',
            summary: 'Overwrite the whole document JSON with whichever client saves last.',
            tier: 'antipattern',
            points: 4,
            critique: 'Reconnecting from an airplane silently wipes out 2 hours of your teammates’ edits.',
            warning: 'Catastrophic data loss: coarse-grained LWW destroys concurrent collaborative edits.',
            conceptId: 'cap-theorem',
          },
        ],
      },
      {
        id: 'consistency',
        dimension: '03 · Causal History & Undo Semantics',
        question: 'How do peers exchange only missing edits when reconnecting after an offline flight?',
        options: [
          {
            id: 'state-vector-delta',
            label: 'State Vector (Version Vector) Exchange + Minimal Missing Op Delta',
            summary: 'Client sends its compact state vector {replica: maxClock}; relay returns only operations causally newer.',
            tier: 'principal',
            points: 20,
            critique: 'Exact causal diff in O(number of contributors) metadata—fast, duplicate-safe, and bandwidth-minimal.',
            conceptId: 'vector-clocks',
          },
          {
            id: 'full-doc-download',
            label: 'Re-Download Full Operation Log from Creation on Every Reconnect',
            summary: 'Replay every keystroke ever typed in the document since day one.',
            tier: 'viable',
            points: 12,
            critique: 'Correct convergence, but large year-old documents take tens of seconds to open.',
            conceptId: 'crdts',
          },
          {
            id: 'ntp-since-timestamp',
            label: 'Fetch Edits Where updated_at > client_local_clock',
            summary: 'Query changes using client wall clock.',
            tier: 'antipattern',
            points: 4,
            critique: 'Clock skew causes clients to permanently skip edits made by peers with slower clocks.',
            warning: 'Silent divergence: wall-clock range queries miss concurrent edits under clock skew.',
            conceptId: 'lamport-clocks',
          },
        ],
      },
      {
        id: 'resilience',
        dimension: '04 · Tombstone Compaction & Snapshot Checkpoints',
        question: 'How do you prevent deleted-character tombstones from growing document size forever?',
        options: [
          {
            id: 'causal-checkpoint-gc',
            label: 'Periodic Compaction Snapshots + Safe Causal Stability Garbage Collection',
            summary: 'Periodically compact verified prefix states into binary snapshots while retaining causal epochs for offline clients.',
            tier: 'principal',
            points: 20,
            critique: 'Bounds memory and load time while preventing zombie resurrections from stale offline clients.',
            conceptId: 'chandy-lamport',
          },
          {
            id: 'keep-all-tombstones',
            label: 'Retain Every Tombstone Forever Without Compaction',
            summary: 'Never garbage collect deleted characters.',
            tier: 'viable',
            points: 12,
            critique: 'Simple and always safe, but heavily edited living docs bloat to tens of megabytes.',
            conceptId: 'crdts',
          },
          {
            id: 'immediate-tombstone-purge',
            label: 'Immediately Delete Tombstones After 60 Seconds',
            summary: 'Purge delete markers on a short wall-clock timer.',
            tier: 'antipattern',
            points: 4,
            critique: 'Offline clients reconnecting after 2 minutes resurrect deleted paragraphs or corrupt CRDT pointers.',
            warning: 'State corruption: premature tombstone eviction breaks CRDT convergence for offline peers.',
            conceptId: 'crdts',
          },
        ],
      },
      {
        id: 'slo-observability',
        dimension: '05 · Authorization & Non-Monotonic Permissions',
        question: 'Where do you enforce "revoked collaborator can no longer sync edits" (non-monotonic)?',
        options: [
          {
            id: 'cp-acl-gateway',
            label: 'Linearizable ACL Service (Raft/Spanner) Gating Sync Relay Tokens + Epoch Rotation',
            summary: 'Apply CALM cleanly: keep document edits coordination-free (CRDT), but guard permission revocations with CP consensus.',
            tier: 'principal',
            points: 20,
            critique: 'Textbook CALM architecture: isolate the small non-monotonic security boundary in CP consensus while keeping editing 0-RTT AP.',
            conceptId: 'cap-theorem',
          },
          {
            id: 'client-honesty-acl',
            label: 'Ask Client Apps to Respect Revocation Flags Locally',
            summary: 'Rely on UI checks to stop revoked users from sending CRDT ops.',
            tier: 'antipattern',
            points: 4,
            critique: 'A modified or stale client can keep injecting ops into the sync stream indefinitely.',
            warning: 'Security invariant breach: permission revocation is non-monotonic and must be server-enforced.',
            conceptId: 'pbft',
          },
          {
            id: '24h-jwt-cache',
            label: 'Stateless 24-Hour JWTs With No Revocation Check',
            summary: 'Trust initial document JWT until expiry.',
            tier: 'viable',
            points: 12,
            critique: 'Fast, but revoked collaborators retain write access for up to 24 hours.',
            conceptId: 'distributed-locking',
          },
        ],
      },
    ],
  },
];

export function getInterviewPrompt(id: string): InterviewPrompt {
  return INTERVIEW_PROMPTS.find((p) => p.id === id) ?? INTERVIEW_PROMPTS[0];
}

export function evaluateInterview(
  prompt: InterviewPrompt,
  selections: Record<string, string>
): InterviewEvaluation {
  const stageCritiques: StageCritique[] = [];
  const warnings: string[] = [];
  const reviewSet = new Set<string>();
  let score = 0;

  for (const stage of prompt.stages) {
    const chosenId = selections[stage.id];
    const chosenOption =
      stage.options.find((opt) => opt.id === chosenId) ?? stage.options[0];
    const bestOption =
      stage.options.find((opt) => opt.tier === 'principal') ?? stage.options[0];

    score += chosenOption.points;
    const isOptimal = chosenOption.id === bestOption.id;

    if (chosenOption.warning) {
      warnings.push(`${stage.dimension}: ${chosenOption.warning}`);
    }
    if (!isOptimal) {
      reviewSet.add(bestOption.conceptId);
      reviewSet.add(chosenOption.conceptId);
    } else {
      reviewSet.add(bestOption.conceptId);
    }

    stageCritiques.push({
      stageId: stage.id,
      dimension: stage.dimension,
      chosenOption,
      bestOption,
      isOptimal,
    });
  }

  const maxScore = prompt.stages.length * 20;
  const band: InterviewEvaluation['band'] =
    score >= 88 ? 'Principal Ready' : score >= 64 ? 'Staff Solid' : 'Needs Refinement';

  return {
    promptId: prompt.id,
    score,
    maxScore,
    band,
    stageCritiques,
    warnings,
    reviewConceptIds: Array.from(reviewSet),
  };
}

const INTERVIEW_STORAGE_KEY = 'dsv_interviews_best_v1';
const EMPTY_SCORES: Record<string, number> = {};
let cachedRawScores: string | null | undefined;
let cachedParsedScores: Record<string, number> = EMPTY_SCORES;
const interviewListeners = new Set<() => void>();

export function subscribeInterviewScores(listener: () => void): () => void {
  interviewListeners.add(listener);
  return () => {
    interviewListeners.delete(listener);
  };
}

export function getServerInterviewScoresSnapshot(): Record<string, number> {
  return EMPTY_SCORES;
}

export function loadInterviewBestScores(): Record<string, number> {
  if (typeof window === 'undefined') return EMPTY_SCORES;
  try {
    const raw = window.localStorage.getItem(INTERVIEW_STORAGE_KEY);
    if (raw === cachedRawScores) {
      return cachedParsedScores;
    }
    cachedRawScores = raw;
    if (!raw) {
      cachedParsedScores = EMPTY_SCORES;
      return cachedParsedScores;
    }
    const parsed = JSON.parse(raw);
    cachedParsedScores =
      parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : EMPTY_SCORES;
    return cachedParsedScores;
  } catch {
    return EMPTY_SCORES;
  }
}

export function saveInterviewBestScore(
  promptId: InterviewPromptId,
  score: number
): Record<string, number> {
  const current = loadInterviewBestScores();
  const next = {
    ...current,
    [promptId]: Math.max(current[promptId] ?? 0, score),
  };
  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(next);
      window.localStorage.setItem(INTERVIEW_STORAGE_KEY, serialized);
      cachedRawScores = serialized;
      cachedParsedScores = next;
    } catch {
      // Ignore storage quota errors
    }
  }
  interviewListeners.forEach((fn) => fn());
  return next;
}

export function getConceptById(conceptId: string) {
  return CONCEPTS_CATALOG.find((c) => c.id === conceptId) ?? null;
}
