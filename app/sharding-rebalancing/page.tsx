'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ShardingRebalancingAlgorithm } from '@/lib/algorithms/shardingRebalancing';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { shardingRebalancingScenarios } from '@/visualizers/sharding-rebalancing/scenarios';
import { ShardMessage, ShardNode, ShardingStrategy } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import InvariantMonitor from '@/components/InvariantMonitor';
import WireLogDrawer from '@/components/WireLogDrawer';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import { evaluateShardingInvariants } from '@/lib/invariants';

export default function ShardingRebalancingPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [sharding] = useState(() => new ShardingRebalancingAlgorithm(3, 'range'));
  const [nodes, setNodes] = useState<ShardNode[]>(sharding.getNodes());
  const [messages, setMessages] = useState<ShardMessage[]>(sharding.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [strategy, setStrategy] = useState<ShardingStrategy>('range');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('topology');

  const syncVisualization = useCallback(() => {
    setNodes([...sharding.getNodes()]);
    setMessages([...sharding.getMessages()]);
    setStrategy(sharding.getStrategy());
  }, [sharding]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => sharding.serialize(),
      restore: (snapshot) => {
        sharding.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('sharding-rebalancing', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = sharding.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      simulation.scheduleTimeout(() => {
        inFlight.forEach((msg) => sharding.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [sharding, simulation, syncVisualization]);

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
      syncVisualization();
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

  const removeLastNode = (nodeId?: string) => {
    if (nodes.length <= 1) return;
    const target = nodeId ?? nodes[nodes.length - 1].id;
    sharding.removeNode(target);
    if (selectedNodeId === target) {
      setSelectedNodeId(null);
    }
    updateVisualization();
  };

  const rebalance = () => {
    sharding.rebalance();
    updateVisualization();
  };

  const getNodeColor = (node: ShardNode): string => {
    if (node.load === 0) return SCOPE_COLORS.inkMuted;
    if (node.load > 25) return SCOPE_COLORS.amber;
    return SCOPE_COLORS.emerald;
  };

  const getMessageStyle = (
    message: ShardMessage
  ): { color: string; markerKey: 'cobalt' | 'signal'; label: string } => {
    return message.type === 'MoveShard'
      ? { color: SCOPE_COLORS.cobalt, markerKey: 'cobalt', label: 'MOVE SHARD' }
      : { color: SCOPE_COLORS.signal, markerKey: 'signal', label: 'REBALANCE' };
  };

  const stats = sharding.getStats();
  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
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
        currentEventIndex={simulation.state.currentEventIndex}
        events={simulation.state.events}
        onScenarioChange={handleScenarioChange}
        onJumpToStep={simulation.jumpToStep}
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
          <div className="flex flex-wrap gap-6 mt-3 text-sm">
            <span className="text-slate-300">
              Nodes: <span className="font-semibold text-white">{stats.totalNodes}</span>
            </span>
            <span className="text-slate-300">
              Strategy: <span className="font-semibold text-blue-400">{stats.strategy.toUpperCase()}</span>
            </span>
            <span className="text-slate-300">
              Keys: <span className="font-semibold text-white">{stats.totalKeys}</span>
            </span>
            <span className="text-slate-300">
              Avg Load: <span className="font-semibold text-white">{stats.avgLoad.toFixed(1)}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Sharding & Rebalancing Properties"
            checks={evaluateShardingInvariants(nodes, stats)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Sharding + Rebalancing"
              currentState={{ scenario: selectedScenario, strategy }}
            />
          </div>

          <WireLogDrawer
            protocol="Sharding & Rebalancing"
            scenario={selectedScenario}
            invariants={evaluateShardingInvariants(nodes, stats)}
            frames={messages.map((m) => ({
              id: m.id,
              from: m.from,
              to: m.to,
              type: m.type,
              status: m.status,
            }))}
          />

          <ScopeModeToggle
            mode={scopeMode}
            onChange={setScopeMode}
            frameCount={messages.length}
          />

          {scopeMode === 'topology' ? (
          <svg ref={svgRef} role="group" aria-label="Sharding and range/hash partition rebalancing cluster diagram" viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="shard" />

            {/* Shard cluster ring */}
            {nodes.map((a, i) => {
              const b = nodes[(i + 1) % nodes.length];
              if (!b || nodes.length < 2) return null;
              return (
                <line
                  key={`sh-ring-${a.id}-${b.id}`}
                  x1={a.position.x}
                  y1={a.position.y}
                  x2={b.position.x}
                  y2={b.position.y}
                  stroke={SCOPE_COLORS.hairlineSubtle}
                  strokeWidth="1"
                />
              );
            })}

            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const fromNode = nodes.find((n) => n.id === message.from);
                const toNode = nodes.find((n) => n.id === message.to);
                if (!fromNode || !toNode) return null;
                const style = getMessageStyle(message);
                return (
                  <ScopeEdge
                    key={message.id}
                    idPrefix="shard"
                    x1={fromNode.position.x}
                    y1={fromNode.position.y}
                    x2={toNode.position.x}
                    y2={toNode.position.y}
                    color={style.color}
                    markerKey={style.markerKey}
                    inset={46}
                    label={style.label}
                    dashed={message.type !== 'MoveShard'}
                  />
                );
              })}

            {nodes.map((node) => (
              <ScopeNode
                key={node.id}
                x={node.position.x}
                y={node.position.y}
                radius={42}
                label={node.id}
                sublabel={`LOAD ${node.load}`}
                topTag={node.load > 25 ? 'HOT SHARD' : node.load === 0 ? 'IDLE' : 'BALANCED'}
                bottomLine1={`${node.shards.length} ${node.shards.length === 1 ? 'SHARD' : 'SHARDS'} · ${node.keys.length} KEYS`}
                accentColor={getNodeColor(node)}
                highlighted={node.load > 25}
                selected={selectedNodeId === node.id}
                onClick={() =>
                  setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
                }
              />
            ))}
          </svg>
          ) : (
            <SpaceTimeScope
              svgRef={svgRef}
              title={`SHARDING · ${strategy.toUpperCase()} MIGRATION TRACE`}
              idPrefix="shard-st"
              actors={nodes.map((node) => ({
                id: node.id,
                label: node.id,
                sublabel: `LOAD ${node.load}`,
                color: getNodeColor(node),
              }))}
              frames={messages.map((msg) => {
                const style = getMessageStyle(msg);
                return {
                  id: msg.id,
                  from: msg.from,
                  to: msg.to,
                  label: style.label,
                  color: style.color,
                  status: msg.status,
                };
              })}
            />
          )}

          {!inspectedNode && <WireTapHint text="Click any shard node to inspect key ranges & load" />}

          {inspectedNode && (
            <WireTapInspector
              title={`SHARD NODE ${inspectedNode.id}`}
              subtitle={`${strategy.toUpperCase()} PARTITIONING`}
              status={inspectedNode.load > 25 ? 'candidate' : 'healthy'}
              className="top-14 left-4"
              metrics={[
                {
                  label: 'Load',
                  value: inspectedNode.load,
                  tone: inspectedNode.load > 25 ? 'amber' : 'emerald',
                },
                { label: 'Shards', value: inspectedNode.shards.length, tone: 'cobalt' },
                { label: 'Keys Owned', value: inspectedNode.keys.length },
                { label: 'Cluster Avg', value: stats.avgLoad.toFixed(1) },
              ]}
              actions={[
                {
                  label: 'Rebalance',
                  onClick: rebalance,
                  variant: 'signal',
                },
                {
                  label: 'Remove Node',
                  onClick: () => removeLastNode(inspectedNode.id),
                  variant: 'danger',
                  disabled: nodes.length <= 1,
                },
              ]}
              onClose={() => setSelectedNodeId(null)}
            >
              <div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                  Assigned Ranges ({inspectedNode.shards.length})
                </div>
                {inspectedNode.shards.length === 0 ? (
                  <div className="text-[#9E9B90]">No shards assigned</div>
                ) : (
                  <div className="space-y-1">
                    {inspectedNode.shards.map((shard, index) => (
                      <div key={index} className="text-[#F4F0E8]">
                        [{shard.start}, {shard.end}]
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </WireTapInspector>
          )}

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
              onClick={() => removeLastNode()}
              className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Remove Last Node
            </button>
            <button
              onClick={rebalance}
              className="w-full px-3 py-2 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
            >
              Rebalance Now
            </button>
          </div>

          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-72 overflow-y-auto">
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
                <div className="w-3 h-3 rounded-full bg-[#34D399]" />
                <span className="text-slate-400">Balanced load</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                <span className="text-slate-400">Hot shard</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#9E9B90]" />
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
