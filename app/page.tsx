import Link from 'next/link';

const concepts = [
  {
    name: 'Raft Consensus',
    path: '/raft',
    description:
      'Pick a leader, replicate logs, and survive failures. See how Raft keeps nodes consistent during elections and recovery.',
    color: 'bg-blue-600',
    emoji: '🧭',
  },
  {
    name: 'Paxos',
    path: '/paxos',
    description:
      'Follow proposers and acceptors through prepare/accept rounds to reach agreement despite competing proposals.',
    color: 'bg-purple-600',
    emoji: '🗳️',
  },
  {
    name: 'Two-Phase Commit',
    path: '/two-phase-commit',
    description:
      'Watch a coordinator drive prepare/commit across participants and see how failures force aborts.',
    color: 'bg-green-600',
    emoji: '🔗',
  },
  {
    name: 'Eventual Consistency',
    path: '/eventual-consistency',
    description:
      'Write with ONE/QUORUM/ALL and observe replication, conflict, and anti-entropy convergence.',
    color: 'bg-yellow-600',
    emoji: '🌐',
  },
  {
    name: 'Gossip & Anti-Entropy',
    path: '/gossip-anti-entropy',
    description:
      'Push, pull, and push-pull rounds spread updates across nodes without a central coordinator.',
    color: 'bg-emerald-600',
    emoji: '🫧',
  },
  {
    name: 'Chandy-Lamport Snapshot',
    path: '/chandy-lamport',
    description:
      'Trace marker messages to record local state and in-flight messages for a global snapshot.',
    color: 'bg-cyan-600',
    emoji: '📸',
  },
  {
    name: 'Lamport Clocks',
    path: '/lamport-clocks',
    description:
      'Understand logical clocks and total-order delivery using broadcasts and acknowledgements.',
    color: 'bg-teal-600',
    emoji: '⏱️',
  },
  {
    name: 'Quorum Replication',
    path: '/quorum-replication',
    description:
      'Tune W/R quorums and watch read-repair fix stale replicas after failures.',
    color: 'bg-orange-600',
    emoji: '⚖️',
  },
  {
    name: 'PBFT',
    path: '/pbft',
    description:
      'Follow pre-prepare, prepare, and commit phases plus view changes under byzantine faults.',
    color: 'bg-rose-600',
    emoji: '🛡️',
  },
  {
    name: 'Distributed Locking',
    path: '/distributed-locking',
    description:
      'Acquire a lease, renew via heartbeats, and see timeouts trigger failover.',
    color: 'bg-lime-600',
    emoji: '🔒',
  },
  {
    name: 'Sharding + Rebalancing',
    path: '/sharding-rebalancing',
    description:
      'Compare range vs hash sharding and watch shard movement as nodes join or leave.',
    color: 'bg-cyan-700',
    emoji: '🧩',
  },
  {
    name: 'Merkle Anti-Entropy',
    path: '/merkle-anti-entropy',
    description:
      'Use Merkle trees to pinpoint divergence and sync only the necessary keys.',
    color: 'bg-sky-600',
    emoji: '🌳',
  },
  {
    name: 'CRDTs',
    path: '/crdts',
    description:
      'Explore G-Counter, OR-Set, and RGA to see conflict-free merges across replicas.',
    color: 'bg-emerald-700',
    emoji: '🧮',
  },
  {
    name: 'Replication Log',
    path: '/replication-log',
    description:
      'Track a leader and ISR followers, see high-watermarks advance, and observe lag.',
    color: 'bg-slate-600',
    emoji: '📜',
  },
  {
    name: 'Failure Detectors',
    path: '/failure-detectors',
    description:
      'Watch phi accrual and SWIM probes move nodes through alive, suspect, and failed.',
    color: 'bg-orange-700',
    emoji: '🚨',
  },
  {
    name: 'Distributed Transactions',
    path: '/distributed-transactions',
    description:
      'Compare 3PC commit flow with saga steps and compensations on failure.',
    color: 'bg-purple-700',
    emoji: '🧾',
  },
  {
    name: 'Load Balancing',
    path: '/load-balancing',
    description:
      'Route requests across workers, trigger backpressure, and see drops under load.',
    color: 'bg-amber-700',
    emoji: '🚦',
  },
  {
    name: 'Network Partitions',
    path: '/network-partitions',
    description:
      'Split the network, elect leaders per partition, then heal and resolve split-brain.',
    color: 'bg-red-700',
    emoji: '🕸️',
  },
  {
    name: 'Consensus Variants',
    path: '/consensus-variants',
    description:
      'Compare reconfiguration in Raft, stable leaders in Multi-Paxos, and EPaxos fast paths.',
    color: 'bg-indigo-700',
    emoji: '🧪',
  },
  {
    name: 'Vector Clocks',
    path: '/vector-clocks',
    description:
      'Track causality, detect concurrency, and compare event orderings with vector clocks.',
    color: 'bg-red-600',
    emoji: '🧭',
  },
  {
    name: 'Consistent Hashing',
    path: '/consistent-hashing',
    description:
      'Distribute keys across a ring and see how virtual nodes minimize reshuffling.',
    color: 'bg-indigo-600',
    emoji: '🧿',
  },
  {
    name: 'CAP Theorem',
    path: '/cap-theorem',
    description:
      'Explore trade-offs among Consistency, Availability, and Partition Tolerance with real systems.',
    color: 'bg-pink-600',
    emoji: '🔺',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-12 text-slate-100">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Distributed Systems Visualizer
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Learn distributed systems concepts through interactive visualizations, step-by-step
            execution, and AI-powered explanations.
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <div className="bg-slate-800/70 border border-slate-700 rounded-lg px-6 py-5">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Pick a topic</h3>
                  <p className="text-slate-400 text-sm">
                    Choose a visualizer and load a scenario or start exploring manually.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Run the simulation</h3>
                  <p className="text-slate-400 text-sm">
                    Play, pause, step, and inject failures to see protocol behavior.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Ask and validate</h3>
                  <p className="text-slate-400 text-sm">
                    Use AI explanations and quizzes to confirm your understanding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Concepts Grid */}
        <div>
          <h2 className="text-3xl font-bold mb-8 text-center text-white">Explore Concepts</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {concepts.map((concept) => (
              <Link
                key={concept.path}
                href={concept.path}
                className="group bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20"
              >
                <div className={`h-2 ${concept.color}`} />
                <div className="p-6">
                  <div className="text-2xl mb-2">{concept.emoji}</div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                    {concept.name}
                  </h3>
                  <p className="text-slate-400 text-sm">{concept.description}</p>
                  <div className="mt-4 text-blue-400 text-sm font-medium">
                    Explore →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
