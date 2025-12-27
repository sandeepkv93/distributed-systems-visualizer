'use client';

import { useState, useEffect, useCallback } from 'react';
import { NetworkPartitionsAlgorithm } from '@/lib/algorithms/networkPartitions';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import { networkPartitionsScenarios } from '@/visualizers/network-partitions/scenarios';
import { PartitionLink, PartitionMessage, PartitionNode } from '@/lib/types';
import { motion } from 'framer-motion';

export default function NetworkPartitionsPage() {
  const [np] = useState(() => new NetworkPartitionsAlgorithm(5));
  const [nodes, setNodes] = useState<PartitionNode[]>(np.getNodes());
  const [links, setLinks] = useState<PartitionLink[]>(np.getLinks());
  const [messages, setMessages] = useState<PartitionMessage[]>(np.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('Network Partitions');

  const updateVisualization = useCallback(() => {
    setNodes([...np.getNodes()]);
    setLinks([...np.getLinks()]);
    setMessages([...np.getMessages()]);

    const inFlight = np.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => np.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [np]);

  useEffect(() => {
    simulation.onEvent('partition', (event) => {
      np.split(event.data.partitionA, event.data.partitionB);
      updateVisualization();
    });

    simulation.onEvent('heal', () => {
      np.heal();
      updateVisualization();
    });

    simulation.onEvent('election', (event) => {
      np.startElection(event.data.partitionId);
      updateVisualization();
    });
  }, [np, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = networkPartitionsScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      np.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const stats = np.getStats();
    const currentState = {
      nodes: nodes.map((n) => ({ id: n.id, role: n.role, term: n.term, partition: n.partitionId })),
      stats,
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  const split = () => {
    np.split(['N0', 'N1', 'N2'], ['N3', 'N4']);
    updateVisualization();
  };

  const heal = () => {
    np.heal();
    updateVisualization();
  };

  const electionA = () => {
    np.startElection('A');
    updateVisualization();
  };

  const electionB = () => {
    np.startElection('B');
    updateVisualization();
  };

  const getNodeColor = (node: PartitionNode): string => {
    if (node.role === 'leader') return '#10B981';
    if (node.role === 'candidate') return '#F59E0B';
    return '#6B7280';
  };

  const getLinkColor = (link: PartitionLink): string => {
    return link.status === 'up' ? '#334155' : '#EF4444';
  };

  const stats = np.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={networkPartitionsScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          np.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
        onAskClaude={handleAskClaude}
        apiKeyExists={claude.apiKeyExists}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Network Partitions + Split-Brain</h1>
          <p className="text-slate-400 text-sm mt-1">
            Partitioned clusters and leader elections across splits
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
              Leaders: <span className="font-semibold text-white">{stats.leaders}</span>
            </span>
            <span className="text-slate-300">
              Partitions: <span className="font-semibold text-white">{stats.partitions}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg className="w-full h-full">
            {links.map((link) => {
              const fromNode = nodes.find((n) => n.id === link.from);
              const toNode = nodes.find((n) => n.id === link.to);
              if (!fromNode || !toNode) return null;
              return (
                <line
                  key={`${link.from}-${link.to}`}
                  x1={fromNode.position.x}
                  y1={fromNode.position.y}
                  x2={toNode.position.x}
                  y2={toNode.position.y}
                  stroke={getLinkColor(link)}
                  strokeWidth="1"
                />
              );
            })}

            {nodes.map((node, index) => (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <circle
                  cx={node.position.x}
                  cy={node.position.y}
                  r="45"
                  fill={getNodeColor(node)}
                  stroke="#1F2937"
                  strokeWidth="3"
                />
                <text x={node.position.x} y={node.position.y - 10} textAnchor="middle" fill="#FFF" fontSize="14" fontWeight="bold">
                  {node.id}
                </text>
                <text x={node.position.x} y={node.position.y + 6} textAnchor="middle" fill="#E2E8F0" fontSize="10">
                  {node.role.toUpperCase()}
                </text>
                <text x={node.position.x} y={node.position.y + 20} textAnchor="middle" fill="#CBD5E1" fontSize="9">
                  partition {node.partitionId}
                </text>
              </motion.g>
            ))}
          </svg>

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button onClick={split} className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">
              Split Network
            </button>
            <button onClick={heal} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
              Heal Network
            </button>
            <button onClick={electionA} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              Election Partition A
            </button>
            <button onClick={electionB} className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
              Election Partition B
            </button>
          </div>
        </div>
      </div>

      {showExplanation && (
        <ExplanationPanel
          explanation={claude.explanation}
          isLoading={claude.isLoading}
          error={claude.error}
          onClose={() => {
            setShowExplanation(false);
            claude.clearExplanation();
          }}
        />
      )}

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['network-partitions'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['network-partitions'].sections.map((section) => (
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
