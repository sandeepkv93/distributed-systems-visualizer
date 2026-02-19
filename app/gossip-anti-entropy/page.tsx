'use client';

import { useState, useEffect, useCallback } from 'react';
import { GossipAntiEntropyAlgorithm } from '@/lib/algorithms/gossipAntiEntropy';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import { gossipAntiEntropyScenarios } from '@/visualizers/gossip-anti-entropy/scenarios';
import { GossipNode, GossipMessage, GossipMode } from '@/lib/types';
import { motion } from 'framer-motion';

export default function GossipAntiEntropyPage() {
  const [gossip] = useState(() => new GossipAntiEntropyAlgorithm(6));
  const [nodes, setNodes] = useState<GossipNode[]>(gossip.getNodes());
  const [messages, setMessages] = useState<GossipMessage[]>(gossip.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [fanout, setFanout] = useState(1);

  const simulation = useSimulation([]);

  const updateVisualization = useCallback(() => {
    setNodes([...gossip.getNodes()]);
    setMessages([...gossip.getMessages()]);

    const inFlight = gossip.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => {
          gossip.deliverGossip(msg.id);
        });
        updateVisualization();
      }, 500);
    }
  }, [gossip]);

  useEffect(() => {
    simulation.onEvent('set_value', (event) => {
      gossip.setValue(event.data.nodeId, event.data.key, event.data.value);
      updateVisualization();
    });

    simulation.onEvent('gossip_round', (event) => {
      const mode = (event.data.mode || 'push-pull') as GossipMode;
      const roundFanout = event.data.fanout || 1;
      gossip.gossipRound(mode, roundFanout);
      updateVisualization();
    });

    simulation.onEvent('fail_node', (event) => {
      gossip.failNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('recover_node', (event) => {
      gossip.recoverNode(event.data.nodeId);
      updateVisualization();
    });
  }, [gossip, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = gossipAntiEntropyScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      gossip.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const setRandomValue = () => {
    const healthyNodes = nodes.filter((n) => n.status === 'healthy');
    if (healthyNodes.length === 0) return;
    const target = healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
    const key = `rumor:${Math.floor(Math.random() * 3) + 1}`;
    const value = Math.floor(Math.random() * 100);
    gossip.setValue(target.id, key, value);
    updateVisualization();
  };

  const runGossipRound = (mode: GossipMode) => {
    gossip.gossipRound(mode, fanout);
    updateVisualization();
  };

  const failNode = (nodeId: string) => {
    gossip.failNode(nodeId);
    updateVisualization();
  };

  const recoverNode = (nodeId: string) => {
    gossip.recoverNode(nodeId);
    updateVisualization();
  };

  const getNodeSyncState = (node: GossipNode): 'synced' | 'stale' | 'failed' => {
    if (node.status === 'failed') return 'failed';
    const allKeys = new Set<string>();
    nodes.forEach((n) => {
      n.data.forEach((_, key) => allKeys.add(key));
    });
    for (const key of allKeys) {
      const nodeValue = node.data.get(key);
      let maxVersion = 0;
      nodes.forEach((n) => {
        const value = n.data.get(key);
        if (value) maxVersion = Math.max(maxVersion, value.version);
      });
      if (!nodeValue || nodeValue.version < maxVersion) {
        return 'stale';
      }
    }
    return 'synced';
  };

  const getNodeColor = (node: GossipNode): string => {
    const state = getNodeSyncState(node);
    if (state === 'failed') return '#EF4444';
    if (state === 'stale') return '#F59E0B';
    return '#10B981';
  };

  const getMessageColor = (message: GossipMessage): string => {
    switch (message.payload.mode) {
      case 'push':
        return '#3B82F6';
      case 'pull':
        return '#F59E0B';
      case 'push-pull':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const stats = gossip.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={gossipAntiEntropyScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          gossip.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Gossip &amp; Anti-Entropy</h1>
          <p className="text-slate-400 text-sm mt-1">
            Periodic peer exchanges that converge state without a central coordinator
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
              Keys: <span className="font-semibold text-white">{stats.totalKeys}</span>
            </span>
            <span className="text-slate-300">
              Divergent Nodes:{' '}
              <span className={`font-semibold ${stats.divergentNodes > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {stats.divergentNodes}
              </span>
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

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={setRandomValue}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Inject Random Rumor
            </button>

            <div className="border-t border-slate-700 pt-2">
              <label className="text-xs text-slate-400 block mb-1">Fanout</label>
              <div className="flex gap-2">
                {[1, 2].map((value) => (
                  <button
                    key={`fanout-${value}`}
                    onClick={() => setFanout(value)}
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      fanout === value
                        ? 'bg-slate-200 text-slate-900'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-700 pt-2 space-y-2">
              <button
                onClick={() => runGossipRound('push')}
                className="w-full px-3 py-2 bg-blue-700 text-white text-sm rounded hover:bg-blue-800"
              >
                Run Push Round
              </button>
              <button
                onClick={() => runGossipRound('pull')}
                className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
              >
                Run Pull Round
              </button>
              <button
                onClick={() => runGossipRound('push-pull')}
                className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
              >
                Run Push-Pull Round
              </button>
            </div>

            <p className="text-xs text-slate-400">Click nodes to fail or recover them.</p>
          </div>

          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Node State</h3>
            <div className="space-y-2">
              {nodes.map((node) => (
                <div key={node.id} className="text-xs">
                  <div className="font-semibold text-white mb-1">
                    {node.id} ({node.status})
                  </div>
                  <div className="pl-2 space-y-1">
                    {Array.from(node.data.entries()).map(([key, dataValue]) => (
                      <div key={`${node.id}-${key}`} className="text-slate-300">
                        {key}: <span className="text-green-400">{JSON.stringify(dataValue.value)}</span>{' '}
                        <span className="text-slate-400">v{dataValue.version}</span>
                      </div>
                    ))}
                    {node.data.size === 0 && <div className="text-slate-500">No data</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Legend</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-slate-400">Synced</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span className="text-slate-400">Stale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600" />
                <span className="text-slate-400">Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600" />
                <span className="text-slate-400">Push gossip</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-600" />
                <span className="text-slate-400">Pull gossip</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-600" />
                <span className="text-slate-400">Push-pull gossip</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['gossip-anti-entropy'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['gossip-anti-entropy'].sections.map((section) => (
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
