'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShardingRebalancingAlgorithm } from '@/lib/algorithms/shardingRebalancing';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import { shardingRebalancingScenarios } from '@/visualizers/sharding-rebalancing/scenarios';
import { ShardMessage, ShardNode, ShardingStrategy } from '@/lib/types';
import { motion } from 'framer-motion';

export default function ShardingRebalancingPage() {
  const [sharding] = useState(() => new ShardingRebalancingAlgorithm(3, 'range'));
  const [nodes, setNodes] = useState<ShardNode[]>(sharding.getNodes());
  const [messages, setMessages] = useState<ShardMessage[]>(sharding.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [strategy, setStrategy] = useState<ShardingStrategy>('range');

  const simulation = useSimulation([]);

  const updateVisualization = useCallback(() => {
    setNodes([...sharding.getNodes()]);
    setMessages([...sharding.getMessages()]);

    const inFlight = sharding.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => sharding.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [sharding]);

  useEffect(() => {
    simulation.onEvent('set_strategy', (event) => {
      const next = event.data.strategy as ShardingStrategy;
      setStrategy(next);
      sharding.setStrategy(next);
      updateVisualization();
    });

    simulation.onEvent('add_node', () => {
      sharding.addNode();
      updateVisualization();
    });

    simulation.onEvent('remove_node', (event) => {
      sharding.removeNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('rebalance', () => {
      sharding.rebalance();
      updateVisualization();
    });
  }, [sharding, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = shardingRebalancingScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      sharding.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const toggleStrategy = () => {
    const next = strategy === 'range' ? 'hash' : 'range';
    setStrategy(next);
    sharding.setStrategy(next);
    updateVisualization();
  };

  const addNode = () => {
    sharding.addNode();
    updateVisualization();
  };

  const removeLastNode = () => {
    if (nodes.length <= 1) return;
    const target = nodes[nodes.length - 1].id;
    sharding.removeNode(target);
    updateVisualization();
  };

  const rebalance = () => {
    sharding.rebalance();
    updateVisualization();
  };

  const getNodeColor = (node: ShardNode): string => {
    if (node.load === 0) return '#6B7280';
    if (node.load > 25) return '#F59E0B';
    return '#10B981';
  };

  const getMessageColor = (message: ShardMessage): string => {
    return message.type === 'MoveShard' ? '#3B82F6' : '#8B5CF6';
  };

  const stats = sharding.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={shardingRebalancingScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          sharding.reset();
          setStrategy('range');
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Sharding + Rebalancing</h1>
          <p className="text-slate-400 text-sm mt-1">
            Compare range and hash sharding as nodes join or leave
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
              Nodes: <span className="font-semibold text-white">{stats.totalNodes}</span>
            </span>
            <span className="text-slate-300">
              Strategy: <span className="font-semibold text-white">{stats.strategy}</span>
            </span>
            <span className="text-slate-300">
              Keys: <span className="font-semibold text-white">{stats.totalKeys}</span>
            </span>
            <span className="text-slate-300">
              Avg Load: <span className="font-semibold text-white">{stats.avgLoad.toFixed(1)}</span>
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
                  load {node.load}
                </text>
                <text
                  x={node.position.x}
                  y={node.position.y + 20}
                  textAnchor="middle"
                  fill="#CBD5E1"
                  fontSize="9"
                >
                  shards {node.shards.length}
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
            <button
              onClick={toggleStrategy}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Switch to {strategy === 'range' ? 'Hash' : 'Range'} Sharding
            </button>
            <button
              onClick={addNode}
              className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Add Node
            </button>
            <button
              onClick={removeLastNode}
              className="w-full px-3 py-2 bg-pink-600 text-white text-sm rounded hover:bg-pink-700"
            >
              Remove Last Node
            </button>
            <button
              onClick={rebalance}
              className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
            >
              Rebalance Now
            </button>
          </div>

          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Shard Ranges</h3>
            <div className="space-y-2">
              {nodes.map((node) => (
                <div key={`shards-${node.id}`} className="text-xs">
                  <div className="font-semibold text-white mb-1">{node.id}</div>
                  <div className="pl-2 text-slate-300 space-y-1">
                    {node.shards.map((shard, index) => (
                      <div key={`${node.id}-${index}`}>
                        [{shard.start}, {shard.end}] · keys {node.keys.length}
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
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-slate-400">Balanced load</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span className="text-slate-400">Hot shard</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-500" />
                <span className="text-slate-400">Idle</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['sharding-rebalancing'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['sharding-rebalancing'].sections.map((section) => (
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
