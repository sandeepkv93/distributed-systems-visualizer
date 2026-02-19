'use client';

import { useState, useEffect, useCallback } from 'react';
import { LamportClocksAlgorithm } from '@/lib/algorithms/lamportClocks';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import { lamportClocksScenarios } from '@/visualizers/lamport-clocks/scenarios';
import { LamportNode, LamportMessage } from '@/lib/types';
import { motion } from 'framer-motion';

export default function LamportClocksPage() {
  const [lamport] = useState(() => new LamportClocksAlgorithm(3));
  const [nodes, setNodes] = useState<LamportNode[]>(lamport.getNodes());
  const [messages, setMessages] = useState<LamportMessage[]>(lamport.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);

  const updateVisualization = useCallback(() => {
    setNodes([...lamport.getNodes()]);
    setMessages([...lamport.getMessages()]);

    const inFlight = lamport.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => lamport.deliverMessage(msg.id));
        updateVisualization();
      }, 450);
    }
  }, [lamport]);

  useEffect(() => {
    simulation.onEvent('local_event', (event) => {
      lamport.localEvent(event.data.nodeId, event.data.description);
      updateVisualization();
    });

    simulation.onEvent('broadcast', (event) => {
      lamport.broadcast(event.data.fromId, event.data.value);
      updateVisualization();
    });
  }, [lamport, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = lamportClocksScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      lamport.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const localEvent = (nodeId: string) => {
    lamport.localEvent(nodeId);
    updateVisualization();
  };

  const broadcast = (nodeId: string) => {
    const value = { msg: Math.floor(Math.random() * 100) };
    lamport.broadcast(nodeId, value);
    updateVisualization();
  };

  const getNodeColor = (node: LamportNode): string => {
    if (node.holdback.length > 0) return '#F59E0B';
    if (node.delivered.length > 0) return '#10B981';
    return '#6B7280';
  };

  const getMessageColor = (message: LamportMessage): string => {
    return message.type === 'Broadcast' ? '#3B82F6' : '#8B5CF6';
  };

  const stats = lamport.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={lamportClocksScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          lamport.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Lamport Clocks + Total Order Broadcast</h1>
          <p className="text-slate-400 text-sm mt-1">
            Logical clocks and acknowledgements enforce a global delivery order
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
              Broadcasts: <span className="font-semibold text-white">{stats.totalBroadcasts}</span>
            </span>
            <span className="text-slate-300">
              Delivered: <span className="font-semibold text-green-400">{stats.totalDelivered}</span>
            </span>
            <span className="text-slate-300">
              Pending: <span className="font-semibold text-amber-400">{stats.pendingMessages}</span>
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
                  clock {node.clock}
                </text>
                <text
                  x={node.position.x}
                  y={node.position.y + 20}
                  textAnchor="middle"
                  fill="#CBD5E1"
                  fontSize="9"
                >
                  holdback {node.holdback.length}
                </text>
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
            <div className="space-y-1">
              {nodes.map((node) => (
                <div key={`controls-${node.id}`} className="flex gap-2">
                  <button
                    onClick={() => localEvent(node.id)}
                    className="flex-1 px-2 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600"
                  >
                    {node.id}: Local
                  </button>
                  <button
                    onClick={() => broadcast(node.id)}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    {node.id}: Broadcast
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Broadcasts enter holdback queues until all acks are received.
            </p>
          </div>

          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Delivery Order</h3>
            <div className="space-y-3">
              {nodes.map((node) => (
                <div key={`delivered-${node.id}`} className="text-xs">
                  <div className="font-semibold text-white mb-1">{node.id}</div>
                  <div className="pl-2 space-y-1 text-slate-300">
                    {node.delivered.length === 0 && <div className="text-slate-500">No deliveries yet</div>}
                    {node.delivered.map((msg) => (
                      <div key={`${node.id}-${msg.id}`}>
                        t{msg.timestamp} {msg.from}: {JSON.stringify(msg.value)}
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
                <div className="w-4 h-4 rounded-full bg-slate-500" />
                <span className="text-slate-400">Idle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span className="text-slate-400">Pending delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-slate-400">Delivered messages</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600" />
                <span className="text-slate-400">Broadcast</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-600" />
                <span className="text-slate-400">Ack</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['lamport-clocks'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['lamport-clocks'].sections.map((section) => (
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
