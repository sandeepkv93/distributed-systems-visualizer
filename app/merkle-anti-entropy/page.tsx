'use client';

import { useState, useEffect, useCallback } from 'react';
import { MerkleAntiEntropyAlgorithm } from '@/lib/algorithms/merkleAntiEntropy';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import { merkleAntiEntropyScenarios } from '@/visualizers/merkle-anti-entropy/scenarios';
import { MerkleMessage, MerkleReplica } from '@/lib/types';
import { motion } from 'framer-motion';

export default function MerkleAntiEntropyPage() {
  const [merkle] = useState(() => new MerkleAntiEntropyAlgorithm(2));
  const [replicas, setReplicas] = useState<MerkleReplica[]>(merkle.getReplicas());
  const [messages, setMessages] = useState<MerkleMessage[]>(merkle.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);

  const updateVisualization = useCallback(() => {
    setReplicas([...merkle.getReplicas()]);
    setMessages([...merkle.getMessages()]);

    const inFlight = merkle.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => merkle.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [merkle]);

  useEffect(() => {
    simulation.onEvent('compare_roots', () => {
      merkle.compareRoots();
      updateVisualization();
    });

    simulation.onEvent('compare_nodes', () => {
      merkle.compareRoots();
      updateVisualization();
    });

    simulation.onEvent('sync_leaf', () => {
      merkle.compareRoots();
      updateVisualization();
    });
  }, [merkle, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = merkleAntiEntropyScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      merkle.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const compareRoots = () => {
    merkle.compareRoots();
    updateVisualization();
  };

  const mutateKey = () => {
    const key = `k${Math.floor(Math.random() * 12) + 1}`;
    merkle.mutateReplica('R0', key, `${key}-v${Math.floor(Math.random() * 5) + 2}`);
    updateVisualization();
  };

  const getMessageColor = (message: MerkleMessage): string => {
    switch (message.type) {
      case 'CompareRoot':
        return '#3B82F6';
      case 'CompareNode':
        return '#F59E0B';
      case 'SyncLeaf':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const stats = merkle.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={merkleAntiEntropyScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          merkle.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Merkle Tree Anti-Entropy</h1>
          <p className="text-slate-400 text-sm mt-1">
            Compare hashed subtrees to locate and sync divergent keys
          </p>
          <div className="mt-3">
            <button
              onClick={() => setShowArticle(true)}
              className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
            >
              Read the theory
            </button>
          </div>
          <div className="flex gap-6 mt-3 text-sm">
            <span className="text-slate-300">
              Replicas: <span className="font-semibold text-white">{stats.replicaCount}</span>
            </span>
            <span className="text-slate-300">
              Divergent Keys:{' '}
              <span className={`font-semibold ${stats.mismatchedKeys > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {stats.mismatchedKeys}
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg className="w-full h-full">
            {replicas.map((replica, index) => (
              <motion.g
                key={replica.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <circle
                  cx={200 + index * 440}
                  cy={200}
                  r="55"
                  fill="#1E293B"
                  stroke="#334155"
                  strokeWidth="3"
                />
                <text
                  x={200 + index * 440}
                  y={190}
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {replica.id}
                </text>
                <text
                  x={200 + index * 440}
                  y={212}
                  textAnchor="middle"
                  fill="#CBD5E1"
                  fontSize="10"
                >
                  root {replica.root?.hash?.slice(0, 6) || 'n/a'}
                </text>
              </motion.g>
            ))}

            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => (
                <g key={message.id}>
                  <motion.line
                    x1={200}
                    y1={200}
                    x2={640}
                    y2={200}
                    stroke={getMessageColor(message)}
                    strokeWidth="2"
                    strokeDasharray="6,6"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                  <motion.circle
                    cx={420}
                    cy={200}
                    r="6"
                    fill={getMessageColor(message)}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </g>
              ))}
          </svg>

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={compareRoots}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Compare Roots
            </button>
            <button
              onClick={mutateKey}
              className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
            >
              Mutate Replica R0
            </button>
            <p className="text-xs text-slate-400">Compare triggers subtree checks and leaf syncs.</p>
          </div>

          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Replica Data</h3>
            <div className="space-y-2">
              {replicas.map((replica) => (
                <div key={`data-${replica.id}`} className="text-xs">
                  <div className="font-semibold text-white mb-1">{replica.id}</div>
                  <div className="pl-2 space-y-1 text-slate-300">
                    {Array.from(replica.data.entries()).map(([key, value]) => (
                      <div key={`${replica.id}-${key}`}>
                        {key}: <span className="text-green-400">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Legend</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600" />
                <span className="text-slate-400">Root compare</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-600" />
                <span className="text-slate-400">Node compare</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-slate-400">Leaf sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['merkle-anti-entropy'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['merkle-anti-entropy'].sections.map((section) => (
          <div key={section.heading} className="mb-5">
            <h3 className="text-base font-semibold text-white mb-2">{section.heading}</h3>
            {section.body.map((para) => (
              <p key={para} className="text-sm text-slate-300 mb-2">
                {para}
              </p>
            ))}
          </div>
        ))}
      </TopicArticleDrawer>
    </div>
  );
}
