'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChandyLamportAlgorithm } from '@/lib/algorithms/chandyLamport';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import { chandyLamportScenarios } from '@/visualizers/chandy-lamport/scenarios';
import { SnapshotNode, SnapshotMessage } from '@/lib/types';
import { motion } from 'framer-motion';

export default function ChandyLamportPage() {
  const [snapshot] = useState(() => new ChandyLamportAlgorithm(5));
  const [nodes, setNodes] = useState<SnapshotNode[]>(snapshot.getNodes());
  const [messages, setMessages] = useState<SnapshotMessage[]>(snapshot.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('Chandy-Lamport Snapshot');

  const updateVisualization = useCallback(() => {
    setNodes([...snapshot.getNodes()]);
    setMessages([...snapshot.getMessages()]);

    const inFlight = snapshot.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => snapshot.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [snapshot]);

  useEffect(() => {
    simulation.onEvent('send_message', (event) => {
      snapshot.sendAppMessage(event.data.fromId, event.data.toId, event.data.value);
      updateVisualization();
    });

    simulation.onEvent('start_snapshot', (event) => {
      snapshot.startSnapshot(event.data.initiatorId);
      updateVisualization();
    });
  }, [snapshot, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = chandyLamportScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      snapshot.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const stats = snapshot.getStats();
    const currentState = {
      nodes: nodes.map((n) => ({
        id: n.id,
        localState: n.localState,
        snapshot: n.snapshot,
      })),
      stats,
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  const sendRandomMessage = () => {
    const healthyNodes = nodes;
    if (healthyNodes.length < 2) return;
    const from = healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
    let to = healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
    while (to.id === from.id) {
      to = healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
    }
    const value = { op: Math.floor(Math.random() * 100) };
    snapshot.sendAppMessage(from.id, to.id, value);
    updateVisualization();
  };

  const startSnapshot = () => {
    const node = nodes[Math.floor(Math.random() * nodes.length)];
    snapshot.startSnapshot(node.id);
    updateVisualization();
  };

  const getNodeColor = (node: SnapshotNode): string => {
    if (!node.snapshot) return '#6B7280';
    if (node.snapshot.complete) return '#10B981';
    return '#F59E0B';
  };

  const getMessageColor = (message: SnapshotMessage): string => {
    return message.type === 'Marker' ? '#8B5CF6' : '#3B82F6';
  };

  const stats = snapshot.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={chandyLamportScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          snapshot.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
        onAskClaude={handleAskClaude}
        apiKeyExists={claude.apiKeyExists}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Chandy-Lamport Snapshot</h1>
          <p className="text-slate-400 text-sm mt-1">
            Capture a consistent global state with marker messages and channel recording
          </p>
          <div className="flex gap-6 mt-2 text-sm">
            <span className="text-slate-300">
              Nodes: <span className="font-semibold text-white">{stats.totalNodes}</span>
            </span>
            <span className="text-slate-300">
              Active Snapshots:{' '}
              <span className={`font-semibold ${stats.snapshotsActive > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {stats.snapshotsActive}
              </span>
            </span>
            <span className="text-slate-300">
              Completed:{' '}
              <span className="font-semibold text-green-400">{stats.snapshotsComplete}</span>
            </span>
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
                  fill={getNodeColor(node)}
                  stroke="#1F2937"
                  strokeWidth="3"
                />
                <text
                  x={node.position.x}
                  y={node.position.y - 10}
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {node.id}
                </text>
                <text
                  x={node.position.x}
                  y={node.position.y + 5}
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="10"
                >
                  local {node.localState}
                </text>
                {node.snapshot && (
                  <text
                    x={node.position.x}
                    y={node.position.y + 20}
                    textAnchor="middle"
                    fill="#E2E8F0"
                    fontSize="9"
                  >
                    {node.snapshot.complete ? 'SNAPSHOT DONE' : 'SNAPSHOT ACTIVE'}
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

                const midX = (fromNode.position.x + toNode.position.x) / 2;
                const midY = (fromNode.position.y + toNode.position.y) / 2;

                return (
                  <g key={message.id}>
                    <motion.line
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      stroke={getMessageColor(message)}
                      strokeWidth="2"
                      strokeDasharray="6,6"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                    <motion.circle
                      cx={midX}
                      cy={midY}
                      r="6"
                      fill={getMessageColor(message)}
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
            <button
              onClick={sendRandomMessage}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Send Random Message
            </button>
            <button
              onClick={startSnapshot}
              className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
            >
              Start Snapshot
            </button>
            <p className="text-xs text-slate-400">
              Markers propagate automatically; in-flight messages are delivered with a short delay.
            </p>
          </div>

          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Snapshot State</h3>
            <div className="space-y-3">
              {nodes.map((node) => (
                <div key={node.id} className="text-xs">
                  <div className="font-semibold text-white mb-1">{node.id}</div>
                  {node.snapshot ? (
                    <div className="pl-2 space-y-1 text-slate-300">
                      <div>Snapshot: {node.snapshot.id}</div>
                      <div>Recorded local: {node.snapshot.localState}</div>
                      <div>Recording from: {node.snapshot.recordingFrom.join(', ') || 'none'}</div>
                      <div className="text-slate-400">Channels:</div>
                      {Object.entries(node.snapshot.channels).map(([fromId, records]) => (
                        <div key={`${node.id}-${fromId}`} className="pl-2 text-slate-300">
                          {fromId}: {records.length > 0 ? records.map((r) => JSON.stringify(r.value)).join(', ') : 'empty'}
                        </div>
                      ))}
                      {node.snapshot.complete && <div className="text-green-400">Complete</div>}
                    </div>
                  ) : (
                    <div className="pl-2 text-slate-500">No snapshot yet</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Legend</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-500" />
                <span className="text-slate-400">No snapshot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span className="text-slate-400">Recording</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-slate-400">Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600" />
                <span className="text-slate-400">App message</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-600" />
                <span className="text-slate-400">Marker</span>
              </div>
            </div>
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
