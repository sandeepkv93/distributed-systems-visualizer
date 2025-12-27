'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConsensusVariantsAlgorithm } from '@/lib/algorithms/consensusVariants';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import { consensusVariantsScenarios } from '@/visualizers/consensus-variants/scenarios';
import { ConsensusMessage, ConsensusNode, ConsensusVariant } from '@/lib/types';
import { motion } from 'framer-motion';

const variantLabels: Record<ConsensusVariant, string> = {
  'raft-joint': 'Raft Joint Consensus',
  'multi-paxos': 'Multi-Paxos',
  epaxos: 'EPaxos',
};

export default function ConsensusVariantsPage() {
  const [variants] = useState(() => new ConsensusVariantsAlgorithm(5));
  const [variant, setVariant] = useState<ConsensusVariant>('raft-joint');
  const [nodes, setNodes] = useState<ConsensusNode[]>(variants.getNodes('raft-joint'));
  const [messages, setMessages] = useState<ConsensusMessage[]>(variants.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('Consensus Variants');

  const updateVisualization = useCallback(() => {
    setNodes([...variants.getNodes(variant)]);
    setMessages([...variants.getMessages()]);

    const inFlight = variants.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => variants.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [variants, variant]);

  useEffect(() => {
    simulation.onEvent('elect_leader', (event) => {
      variants.electLeader(event.data.variant, event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('joint_start', (event) => {
      variants.startJointConsensus(event.data.newConfigIds);
      updateVisualization();
    });

    simulation.onEvent('joint_end', () => {
      variants.finalizeJointConsensus();
      updateVisualization();
    });

    simulation.onEvent('append', (event) => {
      variants.appendEntry(event.data.variant, event.data.value);
      updateVisualization();
    });

    simulation.onEvent('multi_paxos', (event) => {
      variants.proposeMultiPaxos(event.data.value);
      updateVisualization();
    });

    simulation.onEvent('epaxos', (event) => {
      variants.proposeEPaxos(event.data.value, event.data.path);
      updateVisualization();
    });
  }, [variants, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = consensusVariantsScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      variants.reset();
      setVariant(scenario.initialState.variant as ConsensusVariant);
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const stats = variants.getStats(variant);
    const currentState = {
      variant,
      nodes: nodes.map((n) => ({
        id: n.id,
        role: n.role,
        term: n.term,
        log: n.log.length,
        configPhase: n.configPhase,
        instances: n.instances,
      })),
      stats,
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  const electLeader = () => {
    variants.electLeader(variant, nodes[0].id);
    updateVisualization();
  };

  const appendEntry = () => {
    variants.appendEntry(variant, `val-${Math.floor(Math.random() * 100)}`);
    updateVisualization();
  };

  const startJoint = () => {
    variants.startJointConsensus(['N0', 'N1', 'N2', 'N3']);
    updateVisualization();
  };

  const finalizeJoint = () => {
    variants.finalizeJointConsensus();
    updateVisualization();
  };

  const proposeFast = () => {
    variants.proposeEPaxos('X', 'fast');
    updateVisualization();
  };

  const proposeSlow = () => {
    variants.proposeEPaxos('Y', 'slow');
    updateVisualization();
  };

  const stats = variants.getStats(variant);

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={consensusVariantsScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          variants.reset();
          setVariant('raft-joint');
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
        onAskClaude={handleAskClaude}
        apiKeyExists={claude.apiKeyExists}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Consensus Variants</h1>
          <p className="text-slate-400 text-sm mt-1">
            Compare Raft joint consensus, Multi-Paxos, and EPaxos
          </p>
          <div className="flex gap-2 mt-3">
            {(['raft-joint', 'multi-paxos', 'epaxos'] as ConsensusVariant[]).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setVariant(v);
                  updateVisualization();
                }}
                className={`px-3 py-1 rounded text-sm ${
                  variant === v ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {variantLabels[v]}
              </button>
            ))}
          </div>
          <div className="flex gap-6 mt-2 text-sm">
            <span className="text-slate-300">
              Nodes: <span className="font-semibold text-white">{stats.nodes}</span>
            </span>
            <span className="text-slate-300">
              Committed: <span className="font-semibold text-green-400">{stats.committed}</span>
            </span>
            {stats.configPhase && (
              <span className="text-slate-300">
                Config: <span className="font-semibold text-amber-400">{stats.configPhase}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg className="w-full h-full">
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
                  fill={node.role === 'leader' ? '#3B82F6' : node.role === 'proposer' ? '#F59E0B' : '#6B7280'}
                  stroke="#1F2937"
                  strokeWidth="3"
                />
                <text x={node.position.x} y={node.position.y - 10} textAnchor="middle" fill="#FFF" fontSize="14" fontWeight="bold">
                  {node.id}
                </text>
                <text x={node.position.x} y={node.position.y + 6} textAnchor="middle" fill="#E2E8F0" fontSize="10">
                  {node.role.toUpperCase()}
                </text>
                {variant === 'raft-joint' && (
                  <text x={node.position.x} y={node.position.y + 20} textAnchor="middle" fill="#CBD5E1" fontSize="9">
                    {node.configPhase}
                  </text>
                )}
              </motion.g>
            ))}

            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const fromNode = nodes.find((n) => n.id === message.from);
                const toNode = nodes.find((n) => n.id === message.to);
                if (!fromNode || !toNode) return null;
                return (
                  <g key={message.id}>
                    <motion.line
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeDasharray="6,6"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                    <motion.circle
                      cx={(fromNode.position.x + toNode.position.x) / 2}
                      cy={(fromNode.position.y + toNode.position.y) / 2}
                      r="6"
                      fill="#3B82F6"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </g>
                );
              })}
          </svg>

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button onClick={electLeader} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              Elect Leader
            </button>
            <button onClick={appendEntry} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
              Append Entry
            </button>
            {variant === 'raft-joint' && (
              <>
                <button onClick={startJoint} className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700">
                  Start Joint Config
                </button>
                <button onClick={finalizeJoint} className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
                  Finalize Config
                </button>
              </>
            )}
            {variant === 'epaxos' && (
              <>
                <button onClick={proposeFast} className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                  EPaxos Fast Path
                </button>
                <button onClick={proposeSlow} className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                  EPaxos Slow Path
                </button>
              </>
            )}
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
    </div>
  );
}
