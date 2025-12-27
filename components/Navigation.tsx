'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { saveApiKey, validateApiKey, clearApiKey, hasApiKey } from '@/lib/claude-api';
import ProgressDashboard from './ProgressDashboard';
import { TrendingUp } from 'lucide-react';

const concepts = [
  { name: 'Home', path: '/' },
  { name: 'Raft Consensus', path: '/raft' },
  { name: 'Paxos', path: '/paxos' },
  { name: '2PC', path: '/two-phase-commit' },
  { name: 'Eventual Consistency', path: '/eventual-consistency' },
  { name: 'Gossip & Anti-Entropy', path: '/gossip-anti-entropy' },
  { name: 'Chandy-Lamport Snapshot', path: '/chandy-lamport' },
  { name: 'Lamport Clocks', path: '/lamport-clocks' },
  { name: 'Quorum Replication', path: '/quorum-replication' },
  { name: 'PBFT', path: '/pbft' },
  { name: 'Distributed Locking', path: '/distributed-locking' },
  { name: 'Sharding + Rebalancing', path: '/sharding-rebalancing' },
  { name: 'Merkle Anti-Entropy', path: '/merkle-anti-entropy' },
  { name: 'CRDTs', path: '/crdts' },
  { name: 'Vector Clocks', path: '/vector-clocks' },
  { name: 'Consistent Hashing', path: '/consistent-hashing' },
  { name: 'CAP Theorem', path: '/cap-theorem' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiKeyExists, setApiKeyExists] = useState(hasApiKey());

  const handleSaveApiKey = async () => {
    setIsValidating(true);
    setValidationError(null);

    const isValid = await validateApiKey(apiKey);

    if (isValid) {
      saveApiKey(apiKey);
      setApiKeyExists(true);
      setShowApiKeyModal(false);
      setApiKey('');
    } else {
      setValidationError('Invalid API key. Please check and try again.');
    }

    setIsValidating(false);
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setApiKeyExists(false);
  };

  return (
    <>
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-1 overflow-x-auto">
              {concepts.map((concept) => {
                const isActive = pathname === concept.path;
                return (
                  <Link
                    key={concept.path}
                    href={concept.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
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
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowProgressDashboard(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                <TrendingUp className="w-4 h-4" />
                Progress
              </button>
              {apiKeyExists ? (
                <>
                  <span className="text-sm text-green-400">✓ API Key Set</span>
                  <button
                    onClick={handleClearApiKey}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Clear
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Set API Key
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Set Claude API Key</h2>
            <p className="text-slate-300 text-sm mb-4">
              Enter your Anthropic API key to enable AI-powered explanations and quizzes. Your key
              is stored locally in your browser and never sent to our servers.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:border-blue-500"
            />
            {validationError && <p className="text-red-400 text-sm mt-2">{validationError}</p>}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setApiKey('');
                  setValidationError(null);
                }}
                className="px-4 py-2 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={isValidating || !apiKey}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? 'Validating...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Dashboard */}
      {showProgressDashboard && <ProgressDashboard onClose={() => setShowProgressDashboard(false)} />}
    </>
  );
}
