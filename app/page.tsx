import Link from 'next/link';

const concepts = [
  {
    name: 'Raft Consensus',
    path: '/raft',
    description:
      'Leader election and log replication in distributed systems. Visualize how Raft achieves consensus.',
    color: 'bg-blue-600',
  },
  {
    name: 'Paxos',
    path: '/paxos',
    description:
      'Classic consensus algorithm with proposers, acceptors, and learners. Understand the two-phase protocol.',
    color: 'bg-purple-600',
  },
  {
    name: 'Two-Phase Commit',
    path: '/two-phase-commit',
    description:
      'Atomic transaction protocol for distributed databases. Learn about coordinator and participant roles.',
    color: 'bg-green-600',
  },
  {
    name: 'Eventual Consistency',
    path: '/eventual-consistency',
    description:
      'Explore how data eventually becomes consistent across replicas in distributed systems.',
    color: 'bg-yellow-600',
  },
  {
    name: 'Gossip & Anti-Entropy',
    path: '/gossip-anti-entropy',
    description:
      'See how nodes exchange state periodically to converge without a coordinator.',
    color: 'bg-emerald-600',
  },
  {
    name: 'Chandy-Lamport Snapshot',
    path: '/chandy-lamport',
    description:
      'Capture a consistent global state using marker messages and channel recording.',
    color: 'bg-cyan-600',
  },
  {
    name: 'Lamport Clocks',
    path: '/lamport-clocks',
    description:
      'See how logical clocks and acknowledgements enforce total order broadcast.',
    color: 'bg-teal-600',
  },
  {
    name: 'Quorum Replication',
    path: '/quorum-replication',
    description:
      'Quorum reads/writes with automatic read repair for stale replicas.',
    color: 'bg-orange-600',
  },
  {
    name: 'PBFT',
    path: '/pbft',
    description:
      'Byzantine fault tolerance with pre-prepare, prepare, commit, and view changes.',
    color: 'bg-rose-600',
  },
  {
    name: 'Distributed Locking',
    path: '/distributed-locking',
    description:
      'Lease-based locking with heartbeats and timeout recovery.',
    color: 'bg-lime-600',
  },
  {
    name: 'Sharding + Rebalancing',
    path: '/sharding-rebalancing',
    description:
      'Compare range vs hash sharding and see how rebalancing moves data.',
    color: 'bg-cyan-700',
  },
  {
    name: 'Merkle Anti-Entropy',
    path: '/merkle-anti-entropy',
    description:
      'Compare Merkle trees to locate divergence and sync minimal data.',
    color: 'bg-sky-600',
  },
  {
    name: 'CRDTs',
    path: '/crdts',
    description:
      'Explore G-Counter, OR-Set, and RGA convergence across replicas.',
    color: 'bg-emerald-700',
  },
  {
    name: 'Replication Log',
    path: '/replication-log',
    description:
      'Kafka-style partition replication with ISR and high-watermarks.',
    color: 'bg-slate-600',
  },
  {
    name: 'Failure Detectors',
    path: '/failure-detectors',
    description:
      'Phi accrual and SWIM probes for suspicion and failure detection.',
    color: 'bg-orange-700',
  },
  {
    name: 'Vector Clocks',
    path: '/vector-clocks',
    description:
      'Track causality and detect concurrent events in distributed systems using vector clocks.',
    color: 'bg-red-600',
  },
  {
    name: 'Consistent Hashing',
    path: '/consistent-hashing',
    description:
      'Distribute data across nodes efficiently. Visualize the hash ring and virtual nodes.',
    color: 'bg-indigo-600',
  },
  {
    name: 'CAP Theorem',
    path: '/cap-theorem',
    description:
      'Understand the trade-offs between Consistency, Availability, and Partition Tolerance.',
    color: 'bg-pink-600',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
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

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="text-3xl mb-3">🎮</div>
            <h3 className="text-lg font-semibold mb-2">Interactive Simulations</h3>
            <p className="text-slate-400 text-sm">
              Play, pause, and step through algorithms. Interact with nodes and inject failures.
            </p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold mb-2">AI Explanations</h3>
            <p className="text-slate-400 text-sm">
              Get instant explanations powered by Claude AI. Ask questions about what you see.
            </p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="text-lg font-semibold mb-2">Learn by Doing</h3>
            <p className="text-slate-400 text-sm">
              Pre-built scenarios, quizzes, and edge cases to test your understanding.
            </p>
          </div>
        </div>

        {/* Concepts Grid */}
        <div>
          <h2 className="text-3xl font-bold mb-8 text-center">Explore Concepts</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {concepts.map((concept) => (
              <Link
                key={concept.path}
                href={concept.path}
                className="group bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20"
              >
                <div className={`h-2 ${concept.color}`} />
                <div className="p-6">
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

        {/* Getting Started */}
        <div className="mt-16 bg-slate-800 rounded-lg border border-slate-700 p-8">
          <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
          <ol className="space-y-3 text-slate-300">
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                1
              </span>
              <span>
                <strong>(Optional)</strong> Set your Claude API key in the top-right corner to
                enable AI-powered explanations and quizzes.
              </span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                2
              </span>
              <span>Choose a concept from the grid above to start learning.</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                3
              </span>
              <span>
                Use the control panel to play simulations, step through events, and explore
                different scenarios.
              </span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                4
              </span>
              <span>
                Interact with nodes, inject failures, and see how the system responds in real-time.
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
