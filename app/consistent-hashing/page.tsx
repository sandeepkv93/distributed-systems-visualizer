'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConsistentHashingAlgorithm, DistributionSnapshot } from '@/lib/algorithms/consistentHashing';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { consistentHashingScenarios } from '@/visualizers/consistent-hashing/scenarios';
import { motion } from 'framer-motion';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import InvariantMonitor from '@/components/InvariantMonitor';
import { evaluateConsistentHashingInvariants } from '@/lib/invariants';
import WireLogDrawer from '@/components/WireLogDrawer';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import { SCOPE_COLORS } from '@/components/ScopeSvgKit';

export default function ConsistentHashingPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [ch] = useState(() => new ConsistentHashingAlgorithm(3, 3));
  const [ring, setRing] = useState(ch.getRing());
  const [distributionSnapshot, setDistributionSnapshot] = useState<DistributionSnapshot | null>(
    ch.getLastDistributionSnapshot()
  );
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedVNodeId, setSelectedVNodeId] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('topology');

  // Update visualization
  const updateVisualization = useCallback(() => {
    setRing({
      ...ch.getRing(),
      nodes: [...ch.getRing().nodes],
      keys: [...ch.getRing().keys],
    });
    setDistributionSnapshot(ch.getLastDistributionSnapshot());
  }, [ch]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => ch.serialize(),
      restore: (snapshot) => {
        ch.restore(snapshot);
        updateVisualization();
      },
    },
  });

  useScenarioCompletion('consistent-hashing', selectedScenario, simulation.state);

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

    simulation.onEvent('show_distribution', (event) => {
      ch.recordDistributionSnapshot(event.description);
      updateVisualization();
    });
  }, [ch, simulation, updateVisualization]);

  const initializeRing = useCallback(
    (serverCount: number, virtualNodes: number) => {
      ch.reset();
      for (let i = 0; i < serverCount; i++) {
        ch.addServer(`server-${i}`);
      }
      if (virtualNodes) {
        ch.setVirtualNodesPerServer(virtualNodes);
      }
    },
    [ch]
  );

  // Handle scenario selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = consistentHashingScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      initializeRing(
        scenario.initialState.serverCount || 3,
        scenario.initialState.virtualNodes || 3
      );
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
    const angle = (hashValue / 2 ** 32) * 2 * Math.PI - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  // Get color for server
  const serverColors = [
    '#60A5FA', // cobalt
    '#34D399', // emerald
    '#FBBF24', // amber
    '#D9441E', // signal vermilion
    '#F87171', // coral red
    '#2DD4BF', // teal
    '#FB923C', // orange
  ];

  const getServerColor = (serverId: string): string => {
    const index = parseInt(serverId.split('-')[1], 10) % serverColors.length;
    return serverColors[index];
  };

  const stats = ch.getStats();
  const servers = ch.getPhysicalServers();

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
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
          const scenario = consistentHashingScenarios.find((s) => s.id === selectedScenario);
          if (scenario) {
            initializeRing(
              scenario.initialState.serverCount || 3,
              scenario.initialState.virtualNodes || 3
            );
          } else {
            initializeRing(3, 3);
          }
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        currentEventIndex={simulation.state.currentEventIndex}
        events={simulation.state.events}
        onScenarioChange={handleScenarioChange}
        onJumpToStep={simulation.jumpToStep}
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
              Balance:{' '}
              <span className="font-semibold text-amber-400">
                {stats.loadStats.imbalance.toFixed(2)}x
              </span>
            </span>
          </div>
        </div>

        {/* Visualization Canvas */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Hash Ring Properties"
            checks={evaluateConsistentHashingInvariants(stats)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Consistent Hashing"
              currentState={{ scenario: selectedScenario, distributionSnapshot }}
            />
          </div>

          <WireLogDrawer
            protocol="Consistent Hashing Ring"
            scenario={selectedScenario}
            invariants={evaluateConsistentHashingInvariants(stats)}
            frames={ring.keys.slice(-24).map((k, idx) => ({
              id: `route-${idx}-${k.key}`,
              from: 'client',
              to: k.nodeId.split('#')[0],
              type: 'RouteKey',
              detail: `${k.key} -> ${k.nodeId}`,
              status: 'delivered',
            }))}
          />

          <ScopeModeToggle
            mode={scopeMode}
            onChange={setScopeMode}
            frameCount={ring.keys.length}
          />

          {scopeMode === 'topology' ? (
          <svg ref={svgRef} viewBox="0 0 820 700" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            {/* Outer calibrated compass ticks (24 divisions around 2^32 space) */}
            {Array.from({ length: 24 }, (_, idx) => {
              const angle = (idx / 24) * 2 * Math.PI - Math.PI / 2;
              const isMajor = idx % 6 === 0;
              const r1 = radius + (isMajor ? 2 : 5);
              const r2 = radius + (isMajor ? 14 : 10);
              return (
                <line
                  key={`tick-${idx}`}
                  x1={centerX + r1 * Math.cos(angle)}
                  y1={centerY + r1 * Math.sin(angle)}
                  x2={centerX + r2 * Math.cos(angle)}
                  y2={centerY + r2 * Math.sin(angle)}
                  stroke={isMajor ? 'rgba(244,240,232,0.45)' : 'rgba(244,240,232,0.16)'}
                  strokeWidth={isMajor ? '1.5' : '1'}
                />
              );
            })}

            {/* Concentric guide rings */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius * 0.84}
              fill="none"
              stroke="rgba(244,240,232,0.08)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="rgba(244,240,232,0.3)"
              strokeWidth="1.75"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r={68}
              fill="#151917"
              stroke="rgba(244,240,232,0.14)"
              strokeWidth="1"
            />

            {/* Hash space quadrant labels */}
            <text
              x={centerX}
              y={centerY - radius - 22}
              textAnchor="middle"
              fill="#9E9B90"
              fontSize="11"
            >
              0x00000000
            </text>
            <text
              x={centerX + radius + 22}
              y={centerY + 4}
              textAnchor="start"
              fill="#9E9B90"
              fontSize="11"
            >
              2³⁰
            </text>
            <text
              x={centerX}
              y={centerY + radius + 28}
              textAnchor="middle"
              fill="#9E9B90"
              fontSize="11"
            >
              2³¹
            </text>
            <text
              x={centerX - radius - 22}
              y={centerY + 4}
              textAnchor="end"
              fill="#9E9B90"
              fontSize="11"
            >
              3·2³⁰
            </text>

            {/* Keys on inner orbit with subtle radial ticks */}
            {ring.keys.map((key) => {
              const pos = getPositionOnRing(key.hashValue);
              const node = ring.nodes.find((n) => n.id === key.nodeId);
              const color = node ? getServerColor(node.physicalNodeId || '') : '#6B7280';

              const keyPos = {
                x: centerX + (pos.x - centerX) * 0.84,
                y: centerY + (pos.y - centerY) * 0.84,
              };

              return (
                <g key={key.key}>
                  <line
                    x1={keyPos.x}
                    y1={keyPos.y}
                    x2={pos.x}
                    y2={pos.y}
                    stroke={color}
                    strokeWidth="0.75"
                    opacity="0.28"
                  />
                  <motion.circle
                    cx={keyPos.x}
                    cy={keyPos.y}
                    r="3.2"
                    fill={color}
                    opacity="0.85"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </g>
              );
            })}

            {/* Virtual nodes on ring (double-ring instrument pins) */}
            {ring.nodes.map((node) => {
              const pos = getPositionOnRing(node.hashValue);
              const color = getServerColor(node.physicalNodeId || '');
              const isSelected = selectedVNodeId === node.id;
              const labelPos = {
                x: centerX + (pos.x - centerX) * 1.11,
                y: centerY + (pos.y - centerY) * 1.11,
              };

              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Inspect virtual node ${node.id.replace('server-', 'S')} (hash ${node.hashValue})`}
                  onClick={() =>
                    setSelectedVNodeId((prev) => (prev === node.id ? null : node.id))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedVNodeId((prev) => (prev === node.id ? null : node.id));
                    }
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? '15' : '12'}
                    fill="none"
                    stroke={isSelected ? '#F4F0E8' : color}
                    strokeWidth={isSelected ? '1.5' : '0.9'}
                    opacity={isSelected ? '0.95' : '0.45'}
                  />
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r="7.5"
                    fill="#151917"
                    stroke={color}
                    strokeWidth="2.4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? '#F4F0E8' : color}
                    fontSize="8.5"
                    fontWeight="600"
                    className="pointer-events-none"
                  >
                    {node.id.replace('server-', 'S')}
                  </text>
                </g>
              );
            })}

            {/* Center calibrated readout */}
            <text
              x={centerX}
              y={centerY - 14}
              textAnchor="middle"
              fill="#9E9B90"
              fontSize="9"
              letterSpacing="0.14em"
            >
              RING 2³²
            </text>
            <text
              x={centerX}
              y={centerY + 6}
              textAnchor="middle"
              fill="#F4F0E8"
              fontSize="18"
              fontWeight="600"
            >
              {stats.totalKeys} KEYS
            </text>
            <text
              x={centerX}
              y={centerY + 24}
              textAnchor="middle"
              fill={stats.loadStats.imbalance > 1.5 ? '#FBBF24' : '#34D399'}
              fontSize="10"
            >
              {stats.loadStats.imbalance.toFixed(2)}× IMBAL
            </text>
          </svg>
          ) : (
            <SpaceTimeScope
              svgRef={svgRef}
              title="CONSISTENT HASHING · KEY ROUTING WIRE TRACE"
              idPrefix="ch-st"
              actors={[
                { id: 'client', label: 'CLIENT', sublabel: 'ROUTER', color: SCOPE_COLORS.cobalt },
                ...servers.map((serverId) => ({
                  id: serverId,
                  label: serverId.replace('server-', 'S'),
                  sublabel: `${stats.loadDistribution.get(serverId) || 0} KEYS`,
                  color: getServerColor(serverId),
                })),
              ]}
              frames={ring.keys.slice(-18).map((k, idx) => ({
                id: `ch-frame-${idx}-${k.key}`,
                from: 'client',
                to: k.nodeId.split('#')[0],
                label: k.key,
                color: getServerColor(k.nodeId.split('#')[0]),
                status: 'delivered',
              }))}
            />
          )}

          {!selectedVNodeId && <WireTapHint text="Click any ring pin to inspect vnode & keys" />}

          {(() => {
            const inspected = selectedVNodeId
              ? ring.nodes.find((n) => n.id === selectedVNodeId) ?? null
              : null;
            if (!inspected) return null;
            const physicalId = inspected.physicalNodeId || inspected.id;
            const vnodeKeys = ring.keys.filter((k) => k.nodeId === inspected.id);
            const serverTotalKeys = stats.loadDistribution.get(physicalId) || 0;
            const pct = stats.totalKeys > 0 ? ((serverTotalKeys / stats.totalKeys) * 100).toFixed(1) : '0.0';
            const hexHash = `0x${(inspected.hashValue >>> 0).toString(16).padStart(8, '0').toUpperCase()}`;

            return (
              <WireTapInspector
                title={inspected.id.toUpperCase()}
                subtitle={`PHYSICAL ${physicalId.toUpperCase()} · RING PIN`}
                status="info"
                className="top-4 left-4"
                metrics={[
                  { label: 'Hash Position', value: hexHash, tone: 'cobalt' },
                  { label: 'VNode Keys', value: vnodeKeys.length, tone: 'emerald' },
                  { label: 'Server Load', value: `${serverTotalKeys} (${pct}%)`, tone: 'amber' },
                  { label: 'VNodes / Srv', value: ring.virtualNodesPerNode },
                ]}
                actions={[
                  {
                    label: `Remove ${physicalId}`,
                    onClick: () => {
                      removeServer(physicalId);
                      setSelectedVNodeId(null);
                    },
                    variant: 'danger',
                  },
                ]}
                onClose={() => setSelectedVNodeId(null)}
              >
                <div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                    Keys Routed Here ({vnodeKeys.length})
                  </div>
                  {vnodeKeys.length === 0 ? (
                    <div className="text-[#6E6B62]">No keys mapped to this vnode</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {vnodeKeys.slice(0, 18).map((k) => (
                        <span
                          key={k.key}
                          className="px-1.5 py-0.5 bg-[#0E1110] border border-[rgba(244,240,232,0.12)] text-[10px] text-[#D6D2C7]"
                        >
                          {k.key}
                        </span>
                      ))}
                      {vnodeKeys.length > 18 && (
                        <span className="text-[10px] text-[#9E9B90]">
                          +{vnodeKeys.length - 18} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </WireTapInspector>
            );
          })()}

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
          <div
            className={`absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border max-w-xs transition-colors ${
              distributionSnapshot ? 'border-blue-500' : 'border-slate-700'
            }`}
          >
            <h3 className="text-sm font-semibold text-white mb-2">Load Distribution</h3>
            {distributionSnapshot && (
              <div className="mb-3 px-2 py-1.5 rounded bg-blue-900/40 border border-blue-700 text-xs text-blue-200">
                {distributionSnapshot.label}
              </div>
            )}
            {servers.map((serverId) => {
              const load = stats.loadDistribution.get(serverId) || 0;
              const percentage = stats.totalKeys > 0 ? (load / stats.totalKeys) * 100 : 0;
              const color = getServerColor(serverId);

              return (
                <div key={serverId} className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white">{serverId}</span>
                    <span className="text-slate-400">
                      {load} keys ({percentage.toFixed(1)}%)
                    </span>
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
                <span
                  className={stats.loadStats.imbalance > 1.5 ? 'text-amber-400' : 'text-green-400'}
                >
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
