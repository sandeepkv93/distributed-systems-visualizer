'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConsistentHashingAlgorithm } from '@/lib/algorithms/consistentHashing';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import { consistentHashingScenarios } from '@/visualizers/consistent-hashing/scenarios';
import { motion } from 'framer-motion';

export default function ConsistentHashingPage() {
  const [ch] = useState(() => new ConsistentHashingAlgorithm(3, 3));
  const [ring, setRing] = useState(ch.getRing());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);

  // Update visualization
  const updateVisualization = useCallback(() => {
    setRing({ ...ch.getRing() });
  }, [ch]);

  // Handle events
  useEffect(() => {
    simulation.onEvent('add_keys', (event) => {
      ch.addRandomKeys(event.data.count, event.data.prefix);
      updateVisualization();
    });

    simulation.onEvent('add_server', (event) => {
      ch.addServer(event.data.serverId);
      updateVisualization();
    });

    simulation.onEvent('remove_server', (event) => {
      ch.removeServer(event.data.serverId);
      updateVisualization();
    });

    simulation.onEvent('set_virtual_nodes', (event) => {
      ch.setVirtualNodesPerServer(event.data.count);
      updateVisualization();
    });
  }, [ch, simulation, updateVisualization]);

  // Handle scenario selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = consistentHashingScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      ch.reset();
      // Initialize with scenario parameters
      for (let i = 0; i < scenario.initialState.serverCount; i++) {
        ch.addServer(`server-${i}`);
      }
      if (scenario.initialState.virtualNodes) {
        ch.setVirtualNodesPerServer(scenario.initialState.virtualNodes);
      }
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  // Manual controls
  const addServer = () => {
    const servers = ch.getPhysicalServers();
    const nextId = servers.length;
    ch.addServer(`server-${nextId}`);
    updateVisualization();
  };

  const removeServer = (serverId: string) => {
    ch.removeServer(serverId);
    updateVisualization();
  };

  const addKeys = (count: number) => {
    ch.addRandomKeys(count, 'key');
    updateVisualization();
  };

  const increaseVirtualNodes = () => {
    ch.setVirtualNodesPerServer(ring.virtualNodesPerNode + 1);
    updateVisualization();
  };

  const decreaseVirtualNodes = () => {
    if (ring.virtualNodesPerNode > 1) {
      ch.setVirtualNodesPerServer(ring.virtualNodesPerNode - 1);
      updateVisualization();
    }
  };

  // Visualization constants
  const centerX = 400;
  const centerY = 350;
  const radius = 250;

  // Calculate position on ring
  const getPositionOnRing = (hashValue: number): { x: number; y: number } => {
    const angle = (hashValue / (2 ** 32)) * 2 * Math.PI - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  // Get color for server
  const serverColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EF4444', // red
    '#06B6D4', // cyan
    '#F97316', // orange
  ];

  const getServerColor = (serverId: string): string => {
    const index = parseInt(serverId.split('-')[1]) % serverColors.length;
    return serverColors[index];
  };

  const stats = ch.getStats();
  const servers = ch.getPhysicalServers();

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Control Panel */}
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={consistentHashingScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          ch.reset();
          // Re-initialize with 3 servers
          for (let i = 0; i < 3; i++) {
            ch.addServer(`server-${i}`);
          }
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
      />

      {/* Main Visualization Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Consistent Hashing</h1>
          <p className="text-slate-400 text-sm mt-1">
            Efficient key distribution with minimal redistribution on topology changes
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
              Servers: <span className="font-semibold text-white">{stats.physicalServers}</span>
            </span>
            <span className="text-slate-300">
              Virtual Nodes:{' '}
              <span className="font-semibold text-white">{stats.virtualNodesPerServer}</span>/server
            </span>
            <span className="text-slate-300">
              Keys: <span className="font-semibold text-white">{stats.totalKeys}</span>
            </span>
            <span className="text-slate-300">
              Balance: <span className="font-semibold text-amber-400">
                {stats.loadStats.imbalance.toFixed(2)}x
              </span>
            </span>
          </div>
        </div>


        {/* Visualization Canvas */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg className="w-full h-full">
            {/* Ring circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="#475569"
              strokeWidth="2"
              strokeDasharray="10,5"
            />

            {/* Hash space labels */}
            <text x={centerX} y={centerY - radius - 20} textAnchor="middle" fill="#94A3B8" fontSize="12">
              0
            </text>
            <text x={centerX + radius + 20} y={centerY + 5} textAnchor="start" fill="#94A3B8" fontSize="12">
              2³¹
            </text>

            {/* Virtual nodes on ring */}
            {ring.nodes.map((node) => {
              const pos = getPositionOnRing(node.hashValue);
              const color = getServerColor(node.physicalNodeId || '');

              return (
                <g key={node.id}>
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r="8"
                    fill={color}
                    stroke="#1F2937"
                    strokeWidth="2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  {/* Node label */}
                  <text
                    x={pos.x}
                    y={pos.y + 20}
                    textAnchor="middle"
                    fill={color}
                    fontSize="8"
                    className="pointer-events-none"
                  >
                    {node.id}
                  </text>
                </g>
              );
            })}

            {/* Keys on ring */}
            {ring.keys.map((key) => {
              const pos = getPositionOnRing(key.hashValue);
              const node = ring.nodes.find((n) => n.id === key.nodeId);
              const color = node ? getServerColor(node.physicalNodeId || '') : '#6B7280';

              // Offset keys slightly inward
              const keyPos = {
                x: centerX + (pos.x - centerX) * 0.85,
                y: centerY + (pos.y - centerY) * 0.85,
              };

              return (
                <motion.circle
                  key={key.key}
                  cx={keyPos.x}
                  cy={keyPos.y}
                  r="3"
                  fill={color}
                  opacity="0.6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              );
            })}

            {/* Center info */}
            <text x={centerX} y={centerY - 10} textAnchor="middle" fill="#FFF" fontSize="16" fontWeight="bold">
              Hash Ring
            </text>
            <text x={centerX} y={centerY + 10} textAnchor="middle" fill="#94A3B8" fontSize="12">
              {stats.totalKeys} keys
            </text>
          </svg>

          {/* Manual controls */}
          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white mb-2">Manual Controls</h3>

            <div>
              <p className="text-xs text-slate-400 mb-1">Keys:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => addKeys(5)}
                  className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  +5 Keys
                </button>
                <button
                  onClick={() => addKeys(10)}
                  className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  +10 Keys
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Servers:</p>
              <button
                onClick={addServer}
                className="w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mb-1"
              >
                Add Server
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Virtual Nodes/Server:</p>
              <div className="flex gap-2 items-center">
                <button
                  onClick={decreaseVirtualNodes}
                  disabled={ring.virtualNodesPerNode <= 1}
                  className="px-2 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600 disabled:opacity-50"
                >
                  -
                </button>
                <span className="text-white text-sm font-semibold flex-1 text-center">
                  {ring.virtualNodesPerNode}
                </span>
                <button
                  onClick={increaseVirtualNodes}
                  className="px-2 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-600"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Load distribution */}
          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-xs">
            <h3 className="text-sm font-semibold text-white mb-2">Load Distribution</h3>
            {servers.map((serverId) => {
              const load = stats.loadDistribution.get(serverId) || 0;
              const percentage = stats.totalKeys > 0 ? (load / stats.totalKeys) * 100 : 0;
              const color = getServerColor(serverId);

              return (
                <div key={serverId} className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white">{serverId}</span>
                    <span className="text-slate-400">{load} keys ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <button
                    onClick={() => removeServer(serverId)}
                    className="mt-1 text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
            <div className="mt-3 pt-3 border-t border-slate-700 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Avg:</span>
                <span>{stats.loadStats.avg.toFixed(1)} keys</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Std Dev:</span>
                <span>{stats.loadStats.stdDev.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Imbalance:</span>
                <span className={stats.loadStats.imbalance > 1.5 ? 'text-amber-400' : 'text-green-400'}>
                  {stats.loadStats.imbalance.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['consistent-hashing'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['consistent-hashing'].sections.map((section) => (
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
