'use client';

import { useState, useEffect, useCallback } from 'react';
import { PaxosAlgorithm } from '@/lib/algorithms/paxos';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import { paxosScenarios } from '@/visualizers/paxos/scenarios';
import { PaxosNode, PaxosMessage } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function PaxosPage() {
  const [paxos] = useState(() => new PaxosAlgorithm(2, 5, 2));
  const [nodes, setNodes] = useState<PaxosNode[]>(paxos.getAllNodes());
  const [messages, setMessages] = useState<PaxosMessage[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [decidedValue, setDecidedValue] = useState<any>(null);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('Paxos Consensus');

  // Update visualization
  const updateVisualization = useCallback(() => {
    setNodes([...paxos.getAllNodes()]);
    setMessages([...paxos.getMessages()]);
    setDecidedValue(paxos.getDecidedValue());
  }, [paxos]);

  // Handle events
  useEffect(() => {
    simulation.onEvent('start_proposal', (event) => {
      paxos.startProposal(event.data.proposerId, event.data.value);
      updateVisualization();
    });

    simulation.onEvent('handle_prepare', () => {
      // Process all Prepare messages
      const prepareMessages = messages.filter((m) => m.type === 'Prepare' && m.status === 'in-flight');
      prepareMessages.forEach((msg) => {
        paxos.handlePrepare(msg.id);
      });
      updateVisualization();
    });

    simulation.onEvent('handle_promise', (event) => {
      // Process all Promise messages
      const promiseMessages = messages.filter((m) => m.type === 'Promise' && m.status === 'in-flight');
      promiseMessages.forEach((msg) => {
        paxos.handlePromise(msg.id, event.data.value);
      });
      updateVisualization();
    });

    simulation.onEvent('handle_accept', () => {
      // Process all Accept messages
      const acceptMessages = messages.filter((m) => m.type === 'Accept' && m.status === 'in-flight');
      acceptMessages.forEach((msg) => {
        paxos.handleAccept(msg.id);
      });
      updateVisualization();
    });

    simulation.onEvent('fail_node', (event) => {
      paxos.failNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('recover_node', (event) => {
      paxos.recoverNode(event.data.nodeId);
      updateVisualization();
    });
  }, [paxos, simulation, updateVisualization, messages]);

  // Handle scenario selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = paxosScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      paxos.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  // Handle node click (fail/recover)
  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      if (node.status === 'healthy') {
        paxos.failNode(nodeId);
      } else {
        paxos.recoverNode(nodeId);
      }
      updateVisualization();
    }
  };

  // Manual proposal
  const triggerProposal = (proposerId: string, value: string) => {
    paxos.startProposal(proposerId, value);
    updateVisualization();
  };

  // Ask Claude
  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const currentState = {
      proposers: paxos.getProposers().map((n) => ({
        id: n.id,
        status: n.status,
        proposalNumber: n.proposalNumber,
      })),
      acceptors: paxos.getAcceptors().map((n) => ({
        id: n.id,
        status: n.status,
        promisedProposal: n.promisedProposal,
        acceptedProposal: n.acceptedProposal,
        acceptedValue: n.acceptedValue,
      })),
      decidedValue,
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  // Get node color based on role and status
  const getNodeColor = (node: PaxosNode): string => {
    if (node.status === 'failed') return '#EF4444'; // red

    switch (node.role) {
      case 'proposer':
        return '#3B82F6'; // blue
      case 'acceptor':
        return node.acceptedValue ? '#10B981' : '#6B7280'; // green if accepted, gray otherwise
      case 'learner':
        return '#8B5CF6'; // purple
      default:
        return '#6B7280'; // gray
    }
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Control Panel */}
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={paxosScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          paxos.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
        onAskClaude={handleAskClaude}
        apiKeyExists={claude.apiKeyExists}
      />

      {/* Main Visualization Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Paxos Consensus Algorithm</h1>
          <p className="text-slate-400 text-sm mt-1">
            Two-phase consensus with proposers, acceptors, and learners
          </p>
          {decidedValue && (
            <div className="mt-2 inline-block bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold">
              ✓ Consensus Reached: {decidedValue}
            </div>
          )}
        </div>

        {/* Visualization Canvas */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg className="w-full h-full">
            {/* Draw messages */}
            <AnimatePresence>
              {messages.map((message) => {
                const fromNode = nodes.find((n) => n.id === message.from);
                let toNodes: PaxosNode[] = [];

                if (message.to === 'learners') {
                  toNodes = paxos.getLearners();
                } else {
                  const toNode = nodes.find((n) => n.id === message.to);
                  if (toNode) toNodes = [toNode];
                }

                if (!fromNode || toNodes.length === 0) return null;

                const color =
                  message.type === 'Prepare' || message.type === 'Promise'
                    ? '#8B5CF6' // purple for phase 1
                    : '#F59E0B'; // amber for phase 2

                return toNodes.map((toNode) => (
                  <motion.line
                    key={`${message.id}-${toNode.id}`}
                    x1={fromNode.position.x}
                    y1={fromNode.position.y}
                    x2={toNode.position.x}
                    y2={toNode.position.y}
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  />
                ));
              })}
            </AnimatePresence>

            {/* Draw nodes */}
            {nodes.map((node) => {
              const nodeColor = getNodeColor(node);

              return (
                <g key={node.id}>
                  {/* Node circle */}
                  <motion.circle
                    cx={node.position.x}
                    cy={node.position.y}
                    r="35"
                    fill={nodeColor}
                    stroke="#1F2937"
                    strokeWidth="3"
                    className="cursor-pointer"
                    onClick={() => handleNodeClick(node.id)}
                    whileHover={{ scale: 1.1 }}
                  />

                  {/* Node label */}
                  <text
                    x={node.position.x}
                    y={node.position.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {node.id.split('-')[0][0].toUpperCase()}
                    {node.id.split('-')[1]}
                  </text>

                  {/* Role label */}
                  <text
                    x={node.position.x}
                    y={node.position.y - 50}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    className="pointer-events-none uppercase"
                  >
                    {node.role}
                  </text>

                  {/* Additional info */}
                  {node.role === 'proposer' && node.proposalNumber !== undefined && node.proposalNumber > 0 && (
                    <text
                      x={node.position.x}
                      y={node.position.y + 50}
                      textAnchor="middle"
                      fill="white"
                      fontSize="9"
                      className="pointer-events-none"
                    >
                      P#{node.proposalNumber}
                    </text>
                  )}

                  {node.role === 'acceptor' && (
                    <>
                      {node.promisedProposal !== undefined && node.promisedProposal > 0 && (
                        <text
                          x={node.position.x}
                          y={node.position.y + 50}
                          textAnchor="middle"
                          fill="#8B5CF6"
                          fontSize="8"
                          className="pointer-events-none"
                        >
                          Promised: {node.promisedProposal}
                        </text>
                      )}
                      {node.acceptedValue && (
                        <text
                          x={node.position.x}
                          y={node.position.y + 65}
                          textAnchor="middle"
                          fill="#10B981"
                          fontSize="8"
                          fontWeight="bold"
                          className="pointer-events-none"
                        >
                          ✓ {node.acceptedValue}
                        </text>
                      )}
                    </>
                  )}
                </g>
              );
            })}

            {/* Role section labels */}
            <text x="20" y="100" fill="white" fontSize="14" fontWeight="bold">
              Proposers
            </text>
            <text x="20" y="300" fill="white" fontSize="14" fontWeight="bold">
              Acceptors
            </text>
            <text x="20" y="500" fill="white" fontSize="14" fontWeight="bold">
              Learners
            </text>
          </svg>

          {/* Manual controls overlay */}
          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Manual Controls</h3>
            <div className="space-y-2">
              <button
                onClick={() => triggerProposal('proposer-0', `Value-${Date.now() % 100}`)}
                className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Proposer 0: Propose
              </button>
              <button
                onClick={() => triggerProposal('proposer-1', `Value-${Date.now() % 100}`)}
                className="w-full px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
              >
                Proposer 1: Propose
              </button>
              <p className="text-xs text-slate-400 mt-2">Click nodes to fail/recover them</p>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Message Types</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-purple-500" />
                <span className="text-slate-400">Phase 1 (Prepare/Promise)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-amber-500" />
                <span className="text-slate-400">Phase 2 (Accept/Accepted)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explanation Panel */}
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
