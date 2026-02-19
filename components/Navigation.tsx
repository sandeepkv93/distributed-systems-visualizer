'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import ProgressDashboard from './ProgressDashboard';
import { TrendingUp } from 'lucide-react';

const concepts = [
  { name: 'Home', path: '/' },
  { name: 'CAP Theorem', path: '/cap-theorem' },
  { name: 'Lamport Clocks', path: '/lamport-clocks' },
  { name: 'Vector Clocks', path: '/vector-clocks' },
  { name: 'Chandy-Lamport Snapshot', path: '/chandy-lamport' },
  { name: 'Eventual Consistency', path: '/eventual-consistency' },
  { name: 'CRDTs', path: '/crdts' },
  { name: 'Gossip & Anti-Entropy', path: '/gossip-anti-entropy' },
  { name: 'Merkle Anti-Entropy', path: '/merkle-anti-entropy' },
  { name: 'Quorum Replication', path: '/quorum-replication' },
  { name: 'Replication Log', path: '/replication-log' },
  { name: 'Failure Detectors', path: '/failure-detectors' },
  { name: 'Consistent Hashing', path: '/consistent-hashing' },
  { name: 'Sharding + Rebalancing', path: '/sharding-rebalancing' },
  { name: 'Load Balancing', path: '/load-balancing' },
  { name: 'Distributed Locking', path: '/distributed-locking' },
  { name: '2PC', path: '/two-phase-commit' },
  { name: 'Distributed Transactions', path: '/distributed-transactions' },
  { name: 'Network Partitions', path: '/network-partitions' },
  { name: 'Paxos', path: '/paxos' },
  { name: 'Raft Consensus', path: '/raft' },
  { name: 'Consensus Variants', path: '/consensus-variants' },
  { name: 'PBFT', path: '/pbft' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDesktopMore, setShowDesktopMore] = useState(false);

  const topicConcepts = concepts.filter((concept) => concept.path !== '/');

  return (
    <>
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/"
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  pathname === '/'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Home
              </Link>
              <div className="relative">
                <button
                  onClick={() => setShowDesktopMore((open) => !open)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Topics
                </button>
                {showDesktopMore && (
                  <div className="absolute left-0 mt-2 w-60 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                    <div className="py-2 max-h-80 overflow-y-auto">
                      {topicConcepts.map((concept) => {
                        const isActive = pathname === concept.path;
                        return (
                          <Link
                            key={`topic-${concept.path}`}
                            href={concept.path}
                            onClick={() => setShowDesktopMore(false)}
                            className={`block px-4 py-2 text-sm transition-colors ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            {concept.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="md:hidden">
              <button
                onClick={() => setShowMobileMenu((open) => !open)}
                className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                Topics
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowProgressDashboard(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <TrendingUp className="w-4 h-4" />
                Progress
              </button>
            </div>
          </div>
        </div>
      </nav>
      {showMobileMenu && (
        <div className="md:hidden bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-2">
            {concepts.map((concept) => {
              const isActive = pathname === concept.path;
              return (
                <Link
                  key={`mobile-${concept.path}`}
                  href={concept.path}
                  onClick={() => setShowMobileMenu(false)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {concept.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Dashboard */}
      {showProgressDashboard && <ProgressDashboard onClose={() => setShowProgressDashboard(false)} />}
    </>
  );
}
