'use client';

import { useState, useEffect, useCallback } from 'react';
import { EventualConsistencyAlgorithm } from '@/lib/algorithms/eventualConsistency';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import { eventualConsistencyScenarios } from '@/visualizers/eventual-consistency/scenarios';
import { EventualConsistencyNode, EventualConsistencyMessage } from '@/lib/types';
import { motion } from 'framer-motion';

export default function EventualConsistencyPage() {
  const [ec] = useState(() => new EventualConsistencyAlgorithm(5, 3));
  const [nodes, setNodes] = useState<EventualConsistencyNode[]>(ec.getNodes());
  const [messages, setMessages] = useState<EventualConsistencyMessage[]>(ec.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('Eventual Consistency');

  // Update visualization
  const updateVisualization = useCallback(() => {
    setNodes([...ec.getNodes()]);
    setMessages([...ec.getMessages()]);

    // Process in-flight messages
    const inFlightMessages = ec.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlightMessages.length > 0) {
      setTimeout(() => {
        inFlightMessages.forEach((msg) => {
          ec.receiveReplicate(msg.id);
        });
        updateVisualization();
      }, 500);
    }
  }, [ec]);

  // Handle events
  useEffect(() => {
    simulation.onEvent('write', (event) => {
      ec.write(
        event.data.key,
        event.data.value,
        event.data.nodeId,
        event.data.consistencyLevel || 'QUORUM'
      );
      updateVisualization();
    });

    simulation.onEvent('read', (event) => {
      ec.read(event.data.key, event.data.nodeId, event.data.consistencyLevel || 'ONE');
      updateVisualization();
    });

    simulation.onEvent('replicate_complete', () => {
      // Visual indicator only
      setTimeout(() => updateVisualization(), 300);
    });

    simulation.onEvent('replicate_progress', () => {
      updateVisualization();
    });

    simulation.onEvent('anti_entropy', () => {
      ec.runAntiEntropy();
      updateVisualization();
    });

    simulation.onEvent('fail_node', (event) => {
      ec.failNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('recover_node', (event) => {
      ec.recoverNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('show_consistency', () => {
      updateVisualization();
    });

    simulation.onEvent('show_conflict', () => {
      updateVisualization();
    });

    simulation.onEvent('show_resolution', () => {
      updateVisualization();
    });

    simulation.onEvent('partition', () => {
      // Simplified: just visual indicator
      updateVisualization();
    });

    simulation.onEvent('heal_partition', () => {
      updateVisualization();
    });

    simulation.onEvent('show_divergence', () => {
      updateVisualization();
    });

    simulation.onEvent('show_inconsistency', () => {
      updateVisualization();
    });
  }, [ec, simulation, updateVisualization]);

  // Handle scenario selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = eventualConsistencyScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      ec.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  // Ask Claude
  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const stats = ec.getStats();
    const currentState = {
      totalNodes: stats.totalNodes,
      healthyNodes: stats.healthyNodes,
      totalKeys: stats.totalKeys,
      inconsistentKeys: stats.inconsistentKeys,
      replicationFactor: stats.replicationFactor,
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  // Manual controls
  const writeKey = (key: string, value: any, consistencyLevel: 'ONE' | 'QUORUM' | 'ALL' = 'QUORUM') => {
    const healthyNodes = nodes.filter((n) => n.status === 'healthy');
    if (healthyNodes.length > 0) {
      ec.write(key, value, healthyNodes[0].id, consistencyLevel);
      updateVisualization();
    }
  };

  const runAntiEntropy = () => {
    ec.runAntiEntropy();
    updateVisualization();
  };

  const failNode = (nodeId: string) => {
    ec.failNode(nodeId);
    updateVisualization();
  };

  const recoverNode = (nodeId: string) => {
    ec.recoverNode(nodeId);
    updateVisualization();
  };

  // Get node color
  const getNodeColor = (node: EventualConsistencyNode): string => {
    if (node.status === 'failed') return '#EF4444'; // red
    if (node.data.size === 0) return '#6B7280'; // gray (no data)
    return '#10B981'; // green (has data)
  };

  // Get message color
  const getMessageColor = (message: EventualConsistencyMessage): string => {
    switch (message.type) {
      case 'Replicate':
        return '#8B5CF6'; // purple
      case 'AntiEntropy':
        return '#F59E0B'; // amber
      default:
        return '#6B7280';
    }
  };

  const stats = ec.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Control Panel */}
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={eventualConsistencyScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          ec.reset();
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
          <h1 className="text-2xl font-bold text-white">Eventual Consistency</h1>
          <p className="text-slate-400 text-sm mt-1">
            Asynchronous replication with tunable consistency guarantees
          </p>
          <div className="flex gap-6 mt-2 text-sm">
            <span className="text-slate-300">
              Nodes: <span className="font-semibold text-white">{stats.totalNodes}</span>
            </span>
            <span className="text-slate-300">
              Healthy: <span className="font-semibold text-green-400">{stats.healthyNodes}</span>
            </span>
            <span className="text-slate-300">
              Keys: <span className="font-semibold text-white">{stats.totalKeys}</span>
            </span>
            <span className="text-slate-300">
              Inconsistent:{' '}
              <span className={`font-semibold ${stats.inconsistentKeys > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {stats.inconsistentKeys}
              </span>
            </span>
            <span className="text-slate-300">
              Replication Factor: <span className="font-semibold text-white">{stats.replicationFactor}</span>
            </span>
          </div>
        </div>

        {/* Visualization Canvas */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg className="w-full h-full">
            {/* Nodes */}
            {nodes.map((node, index) => (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <circle
                  cx={node.position.x}
                  cy={node.position.y}
                  r="45"
                  fill={getNodeColor(node)}
                  stroke="#1F2937"
                  strokeWidth="3"
                  className="cursor-pointer"
                  onClick={() => (node.status === 'failed' ? recoverNode(node.id) : failNode(node.id))}
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
                  v{node.version}
                </text>
                <text
                  x={node.position.x}
                  y={node.position.y + 20}
                  textAnchor="middle"
                  fill="#CBD5E1"
                  fontSize="9"
                >
                  {node.data.size} keys
                </text>
                {node.status === 'failed' && (
                  <text
                    x={node.position.x}
                    y={node.position.y + 35}
                    textAnchor="middle"
                    fill="#FFF"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    FAILED
                  </text>
                )}
              </motion.g>
            ))}

            {/* Messages */}
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
                      strokeDasharray="5,5"
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

          {/* Manual controls */}
          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white mb-2">Manual Controls</h3>

            <div>
              <p className="text-xs text-slate-400 mb-2">Write Operations:</p>
              <button
                onClick={() => writeKey('key1', Math.floor(Math.random() * 100), 'ONE')}
                className="w-full px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 mb-1"
              >
                Write (ONE)
              </button>
              <button
                onClick={() => writeKey('key2', Math.floor(Math.random() * 100), 'QUORUM')}
                className="w-full px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 mb-1"
              >
                Write (QUORUM)
              </button>
              <button
                onClick={() => writeKey('key3', Math.floor(Math.random() * 100), 'ALL')}
                className="w-full px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
              >
                Write (ALL)
              </button>
            </div>

            <div className="border-t border-slate-700 pt-2 mt-2">
              <button
                onClick={runAntiEntropy}
                className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Run Anti-Entropy
              </button>
            </div>

            <div className="border-t border-slate-700 pt-2 mt-2">
              <p className="text-xs text-slate-400 mb-1">Click nodes to fail/recover</p>
            </div>
          </div>

          {/* Data view */}
          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Node Data</h3>
            <div className="space-y-2">
              {nodes
                .filter((n) => n.status === 'healthy' && n.data.size > 0)
                .map((node) => (
                  <div key={node.id} className="text-xs">
                    <div className="font-semibold text-white mb-1">{node.id}:</div>
                    <div className="pl-2 space-y-1">
                      {Array.from(node.data.entries()).map(([key, dataValue]) => (
                        <div key={key} className="text-slate-300">
                          {key}: <span className="text-green-400">{JSON.stringify(dataValue.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {nodes.every((n) => n.data.size === 0) && (
                <p className="text-xs text-slate-400">No data yet. Run a scenario or write manually.</p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Consistency Levels</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600" />
                <span className="text-slate-400">ONE (fast, may be stale)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-600" />
                <span className="text-slate-400">QUORUM (balanced)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-600" />
                <span className="text-slate-400">ALL (strong, slower)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-slate-400">Healthy node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600" />
                <span className="text-slate-400">Failed node</span>
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
