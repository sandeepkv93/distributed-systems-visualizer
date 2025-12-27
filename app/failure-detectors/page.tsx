'use client';

import { useState, useEffect, useCallback } from 'react';
import { FailureDetectorsAlgorithm } from '@/lib/algorithms/failureDetectors';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import { failureDetectorScenarios } from '@/visualizers/failure-detectors/scenarios';
import { FailureDetectorMessage, FailureDetectorNode } from '@/lib/types';
import { motion } from 'framer-motion';

export default function FailureDetectorsPage() {
  const [fd] = useState(() => new FailureDetectorsAlgorithm(5));
  const [nodes, setNodes] = useState<FailureDetectorNode[]>(fd.getNodes());
  const [messages, setMessages] = useState<FailureDetectorMessage[]>(fd.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('Failure Detectors');

  const updateVisualization = useCallback(() => {
    fd.tick();
    setNodes([...fd.getNodes()]);
    setMessages([...fd.getMessages()]);

    const inFlight = fd.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => fd.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [fd]);

  useEffect(() => {
    simulation.onEvent('heartbeat', (event) => {
      fd.sendHeartbeat(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('probe', (event) => {
      fd.probe(event.data.targetId, event.data.fromId);
      updateVisualization();
    });

    simulation.onEvent('tick', () => {
      fd.tick();
      updateVisualization();
    });

    simulation.onEvent('suspect', (event) => {
      const message: FailureDetectorMessage = {
        id: `manual-suspect-${event.data.nodeId}`,
        from: 'system',
        to: event.data.nodeId,
        type: 'Suspect',
        payload: { targetId: event.data.nodeId },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      fd.getMessages().push(message);
      updateVisualization();
    });

    simulation.onEvent('confirm', (event) => {
      const message: FailureDetectorMessage = {
        id: `manual-confirm-${event.data.nodeId}`,
        from: 'system',
        to: event.data.nodeId,
        type: 'Confirm',
        payload: { targetId: event.data.nodeId },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      fd.getMessages().push(message);
      updateVisualization();
    });

    simulation.onEvent('manual_fail', (event) => {
      fd.markFailed(event.data.nodeId);
      updateVisualization();
    });
  }, [fd, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = failureDetectorScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      fd.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const stats = fd.getStats();
    const currentState = {
      nodes: nodes.map((n) => ({ id: n.id, status: n.status, phi: n.phi.toFixed(2) })),
      stats,
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  const heartbeatRandom = () => {
    const alive = nodes.filter((n) => n.status !== 'failed');
    if (alive.length === 0) return;
    fd.sendHeartbeat(alive[Math.floor(Math.random() * alive.length)].id);
    updateVisualization();
  };

  const probeRandom = () => {
    if (nodes.length < 2) return;
    const from = nodes[Math.floor(Math.random() * nodes.length)];
    let target = nodes[Math.floor(Math.random() * nodes.length)];
    while (target.id === from.id) {
      target = nodes[Math.floor(Math.random() * nodes.length)];
    }
    fd.probe(target.id, from.id);
    updateVisualization();
  };

  const tick = () => {
    fd.tick();
    updateVisualization();
  };

  const toggleFail = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (node.status === 'failed') {
      fd.recover(nodeId);
    } else {
      fd.markFailed(nodeId);
    }
    updateVisualization();
  };

  const getNodeColor = (node: FailureDetectorNode): string => {
    if (node.status === 'failed') return '#EF4444';
    if (node.status === 'suspect') return '#F59E0B';
    return '#10B981';
  };

  const getMessageColor = (message: FailureDetectorMessage): string => {
    switch (message.type) {
      case 'Heartbeat':
        return '#3B82F6';
      case 'Probe':
        return '#F59E0B';
      case 'Ack':
        return '#10B981';
      case 'Suspect':
        return '#F97316';
      case 'Confirm':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const stats = fd.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={failureDetectorScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          fd.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
        onAskClaude={handleAskClaude}
        apiKeyExists={claude.apiKeyExists}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Failure Detectors</h1>
          <p className="text-slate-400 text-sm mt-1">
            Phi accrual and SWIM-style probes signal suspicion and failure
          </p>
          <div className="flex gap-6 mt-2 text-sm">
            <span className="text-slate-300">
              Alive: <span className="font-semibold text-green-400">{stats.alive}</span>
            </span>
            <span className="text-slate-300">
              Suspect: <span className="font-semibold text-amber-400">{stats.suspect}</span>
            </span>
            <span className="text-slate-300">
              Failed: <span className="font-semibold text-red-400">{stats.failed}</span>
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
                  className="cursor-pointer"
                  onClick={() => toggleFail(node.id)}
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
                  phi {node.phi.toFixed(1)}
                </text>
                {node.status === 'failed' && (
                  <text
                    x={node.position.x}
                    y={node.position.y + 20}
                    textAnchor="middle"
                    fill="#FFF"
                    fontSize="10"
                  >
                    FAILED
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
                      stroke={getMessageColor(message)}
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
              onClick={heartbeatRandom}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Heartbeat Random
            </button>
            <button
              onClick={probeRandom}
              className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
            >
              Probe Random
            </button>
            <button
              onClick={tick}
              className="w-full px-3 py-2 bg-slate-600 text-white text-sm rounded hover:bg-slate-700"
            >
              Tick Time
            </button>
            <p className="text-xs text-slate-400">Click a node to fail/recover.</p>
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
