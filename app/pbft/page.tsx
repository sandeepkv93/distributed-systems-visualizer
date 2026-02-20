'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PBFTAlgorithm } from '@/lib/algorithms/pbft';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { pbftScenarios } from '@/visualizers/pbft/scenarios';
import { PBFTNode, PBFTMessage } from '@/lib/types';
import { motion } from 'framer-motion';

export default function PBFTPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pbft] = useState(() => new PBFTAlgorithm(4));
  const [nodes, setNodes] = useState<PBFTNode[]>(pbft.getNodes());
  const [messages, setMessages] = useState<PBFTMessage[]>(pbft.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);

  const updateVisualization = useCallback(() => {
    setNodes([...pbft.getNodes()]);
    setMessages([...pbft.getMessages()]);

    const inFlight = pbft.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => pbft.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [pbft]);

  useEffect(() => {
    simulation.onEvent('client_request', (event) => {
      pbft.clientRequest(event.data.value);
      updateVisualization();
    });

    simulation.onEvent('view_change', () => {
      pbft.triggerViewChange();
      updateVisualization();
    });

    simulation.onEvent('fail_node', (event) => {
      pbft.failNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('recover_node', (event) => {
      pbft.recoverNode(event.data.nodeId);
      updateVisualization();
    });
  }, [pbft, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = pbftScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      pbft.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const sendClientRequest = () => {
    pbft.clientRequest({ op: `tx-${Math.floor(Math.random() * 100)}` });
    updateVisualization();
  };

  const triggerViewChange = () => {
    pbft.triggerViewChange();
    updateVisualization();
  };

  const failNode = (nodeId: string) => {
    pbft.failNode(nodeId);
    updateVisualization();
  };

  const recoverNode = (nodeId: string) => {
    pbft.recoverNode(nodeId);
    updateVisualization();
  };

  const getNodeColor = (node: PBFTNode): string => {
    if (node.status === 'failed') return '#EF4444';
    if (node.role === 'primary') return '#3B82F6';
    return '#10B981';
  };

  const getMessageColor = (message: PBFTMessage): string => {
    switch (message.type) {
      case 'PrePrepare':
        return '#6366F1';
      case 'Prepare':
        return '#F59E0B';
      case 'Commit':
        return '#10B981';
      case 'ViewChange':
        return '#EC4899';
      default:
        return '#94A3B8';
    }
  };

  const stats = pbft.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={pbftScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          pbft.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">PBFT Consensus</h1>
          <p className="text-slate-400 text-sm mt-1">
            Byzantine Fault Tolerance with pre-prepare, prepare, and commit phases
          </p>
          <div className="mt-3">
            <button
              onClick={() => setShowArticle(true)}
              className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
            >
              Read the theory
            </button>
          </div>
          <div className="flex gap-6 mt-2 text-sm">
            <span className="text-slate-300">
              Nodes: <span className="font-semibold text-white">{stats.totalNodes}</span>
            </span>
            <span className="text-slate-300">
              Healthy: <span className="font-semibold text-green-400">{stats.healthyNodes}</span>
            </span>
            <span className="text-slate-300">
              View: <span className="font-semibold text-white">v{stats.view}</span>
            </span>
            <span className="text-slate-300">
              Quorum: <span className="font-semibold text-white">{stats.quorum}</span>
            </span>
            <span className="text-slate-300">
              Executed: <span className="font-semibold text-green-400">{stats.executed}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="PBFT Consensus"
              currentState={{ scenario: selectedScenario }}
            />
          </div>

          <svg ref={svgRef} className="w-full h-full">
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
                  onClick={() =>
                    node.status === 'failed' ? recoverNode(node.id) : failNode(node.id)
                  }
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
                  y={node.position.y + 6}
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize="10"
                >
                  {node.role.toUpperCase()}
                </text>
                <text
                  x={node.position.x}
                  y={node.position.y + 20}
                  textAnchor="middle"
                  fill="#CBD5E1"
                  fontSize="9"
                >
                  log {node.log.size}
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
                      transition={{ duration: 0.4 }}
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
              onClick={sendClientRequest}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Send Client Request
            </button>
            <button
              onClick={triggerViewChange}
              className="w-full px-3 py-2 bg-pink-600 text-white text-sm rounded hover:bg-pink-700"
            >
              Trigger View Change
            </button>
            <p className="text-xs text-slate-400">Click nodes to fail/recover.</p>
          </div>

          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Replica Log</h3>
            <div className="space-y-2">
              {nodes.map((node) => (
                <div key={`log-${node.id}`} className="text-xs">
                  <div className="font-semibold text-white mb-1">{node.id}</div>
                  <div className="pl-2 space-y-1 text-slate-300">
                    {node.log.size === 0 && <div className="text-slate-500">No entries</div>}
                    {Array.from(node.log.values()).map((entry) => (
                      <div key={`${node.id}-${entry.requestId}`}>
                        {entry.requestId} v{entry.view} s{entry.seq} {entry.phase}
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
                <span className="text-slate-400">Primary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-slate-400">Replica</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600" />
                <span className="text-slate-400">Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-indigo-500" />
                <span className="text-slate-400">Pre-prepare</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span className="text-slate-400">Prepare</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-slate-400">Commit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles.pbft.title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles.pbft.sections.map((section) => (
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
