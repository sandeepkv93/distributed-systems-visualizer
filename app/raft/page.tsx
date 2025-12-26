'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RaftAlgorithm } from '@/lib/algorithms/raft';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import ExportMenu from '@/components/ExportMenu';
import { raftScenarios } from '@/visualizers/raft/scenarios';
import { RaftNode as RaftNodeType, RaftMessage } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function RaftPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [raft] = useState(() => new RaftAlgorithm(5));
  const [nodes, setNodes] = useState<RaftNodeType[]>(raft.getNodes());
  const [messages, setMessages] = useState<RaftMessage[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('Raft Consensus');

  // Update visualization
  const updateVisualization = useCallback(() => {
    setNodes([...raft.getNodes()]);
    setMessages([...raft.getMessages()]);
  }, [raft]);

  // Handle events
  useEffect(() => {
    simulation.onEvent('start_election', (event) => {
      raft.startElection(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('fail_node', (event) => {
      raft.failNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('recover_node', (event) => {
      raft.recoverNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('client_request', (event) => {
      raft.addClientRequest(event.data.leaderId, event.data.command);
      updateVisualization();
    });
  }, [raft, simulation, updateVisualization]);

  // Handle scenario selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = raftScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      raft.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  // Handle manual election trigger
  const triggerElection = (nodeId: string) => {
    raft.startElection(nodeId);
    updateVisualization();
  };

  // Handle node click (fail/recover)
  const handleNodeClick = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      if (node.status === 'healthy') {
        raft.failNode(nodeId);
      } else {
        raft.recoverNode(nodeId);
      }
      updateVisualization();
    }
  };

  // Ask Claude
  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const currentState = {
      nodes: nodes.map((n) => ({
        id: n.id,
        state: n.state,
        term: n.term,
        logLength: n.log.length,
        status: n.status,
      })),
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Control Panel */}
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={raftScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          raft.reset();
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
        <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Raft Consensus Algorithm</h1>
            <p className="text-slate-400 text-sm mt-1">
              Leader election and log replication in distributed systems
            </p>
          </div>
          <ExportMenu
            svgRef={svgRef}
            concept="Raft Consensus"
            currentState={{
              nodes: nodes.map((n) => ({
                id: n.id,
                state: n.state,
                term: n.term,
                logLength: n.log.length,
                status: n.status,
              })),
              scenario: selectedScenario,
            }}
          />
        </div>

        {/* Visualization Canvas */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg ref={svgRef} className="w-full h-full">
            {/* Draw messages */}
            <AnimatePresence>
              {messages.map((message) => {
                const fromNode = nodes.find((n) => n.id === message.from);
                const toNode = nodes.find((n) => n.id === message.to);
                if (!fromNode || !toNode) return null;

                const color =
                  message.type === 'RequestVote'
                    ? '#F59E0B'
                    : message.type === 'AppendEntries'
                    ? '#3B82F6'
                    : '#10B981';

                return (
                  <motion.line
                    key={message.id}
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
                );
              })}
            </AnimatePresence>

            {/* Draw nodes */}
            {nodes.map((node) => {
              let nodeColor = '#10B981'; // healthy - green
              if (node.status === 'failed') nodeColor = '#EF4444'; // failed - red
              else if (node.state === 'leader') nodeColor = '#3B82F6'; // leader - blue
              else if (node.state === 'candidate') nodeColor = '#8B5CF6'; // candidate - purple

              return (
                <g key={node.id}>
                  {/* Node circle */}
                  <motion.circle
                    cx={node.position.x}
                    cy={node.position.y}
                    r="40"
                    fill={nodeColor}
                    stroke="#1F2937"
                    strokeWidth="3"
                    className="cursor-pointer"
                    onClick={() => handleNodeClick(node.id)}
                    whileHover={{ scale: 1.1 }}
                    animate={{
                      scale: node.state === 'leader' ? [1, 1.05, 1] : 1,
                    }}
                    transition={{
                      scale: {
                        repeat: node.state === 'leader' ? Infinity : 0,
                        duration: 2,
                      },
                    }}
                  />

                  {/* Node label */}
                  <text
                    x={node.position.x}
                    y={node.position.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {node.id.replace('node-', '')}
                  </text>

                  {/* Node state */}
                  <text
                    x={node.position.x}
                    y={node.position.y - 55}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    className="pointer-events-none"
                  >
                    {node.state.toUpperCase()}
                  </text>

                  {/* Term number */}
                  <text
                    x={node.position.x}
                    y={node.position.y + 55}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    className="pointer-events-none"
                  >
                    Term: {node.term}
                  </text>

                  {/* Log entries */}
                  <text
                    x={node.position.x}
                    y={node.position.y + 70}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    className="pointer-events-none"
                  >
                    Log: {node.log.length}
                  </text>

                  {/* Votes (if candidate) */}
                  {node.state === 'candidate' && (
                    <text
                      x={node.position.x}
                      y={node.position.y + 85}
                      textAnchor="middle"
                      fill="#F59E0B"
                      fontSize="10"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      Votes: {node.votesReceived}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Manual controls overlay */}
          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Manual Controls</h3>
            <div className="space-y-2">
              <button
                onClick={() => triggerElection('node-0')}
                className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Trigger Election (Node 0)
              </button>
              <button
                onClick={() => {
                  const leader = nodes.find((n) => n.state === 'leader');
                  if (leader) {
                    raft.addClientRequest(leader.id, `SET x=${Date.now()}`);
                    updateVisualization();
                  }
                }}
                className="w-full px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                disabled={!nodes.some((n) => n.state === 'leader')}
              >
                Add Client Request
              </button>
              <p className="text-xs text-slate-400 mt-2">Click nodes to fail/recover them</p>
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
