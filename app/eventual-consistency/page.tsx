'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { EventualConsistencyAlgorithm } from '@/lib/algorithms/eventualConsistency';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { eventualConsistencyScenarios } from '@/visualizers/eventual-consistency/scenarios';
import { EventualConsistencyNode, EventualConsistencyMessage } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import InvariantMonitor from '@/components/InvariantMonitor';
import WireLogDrawer from '@/components/WireLogDrawer';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import { evaluateEventualConsistencyInvariants } from '@/lib/invariants';

export default function EventualConsistencyPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [ec] = useState(() => new EventualConsistencyAlgorithm(5, 3));
  const [nodes, setNodes] = useState<EventualConsistencyNode[]>(ec.getNodes());
  const [messages, setMessages] = useState<EventualConsistencyMessage[]>(ec.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('topology');

  const syncVisualization = useCallback(() => {
    setNodes([...ec.getNodes()]);
    setMessages([...ec.getMessages()]);
  }, [ec]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => ec.serialize(),
      restore: (snapshot) => {
        ec.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('eventual-consistency', selectedScenario, simulation.state);

  // Update visualization
  const updateVisualization = useCallback(() => {
    syncVisualization();

    // Process in-flight messages
    const inFlightMessages = ec.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlightMessages.length > 0) {
      simulation.scheduleTimeout(() => {
        inFlightMessages.forEach((msg) => {
          ec.receiveReplicate(msg.id);
        });
        updateVisualization();
      }, 500);
    }
  }, [ec, simulation, syncVisualization]);

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
      simulation.scheduleTimeout(() => updateVisualization(), 300);
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

  // Manual controls
  const writeKey = (
    key: string,
    value: unknown,
    consistencyLevel: 'ONE' | 'QUORUM' | 'ALL' = 'QUORUM',
    targetNodeId?: string
  ) => {
    const healthyNodes = nodes.filter((n) => n.status === 'healthy');
    const coordinatorId = targetNodeId ?? healthyNodes[0]?.id;
    if (coordinatorId) {
      ec.write(key, value, coordinatorId, consistencyLevel);
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
    if (node.status === 'failed') return SCOPE_COLORS.danger;
    if (node.data.size === 0) return SCOPE_COLORS.inkMuted;
    return SCOPE_COLORS.emerald;
  };

  // Get message color
  const getMessageColor = (message: EventualConsistencyMessage): string => {
    switch (message.type) {
      case 'Replicate':
        return SCOPE_COLORS.cobalt;
      case 'AntiEntropy':
        return SCOPE_COLORS.signal;
      default:
        return SCOPE_COLORS.inkMuted;
    }
  };

  const stats = ec.getStats();
  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
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
        currentEventIndex={simulation.state.currentEventIndex}
        events={simulation.state.events}
        onScenarioChange={handleScenarioChange}
        onJumpToStep={simulation.jumpToStep}
      />

      {/* Main Visualization Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Eventual Consistency</h1>
          <p className="text-slate-400 text-sm mt-1">
            Asynchronous replication with tunable consistency guarantees
          </p>
          <div className="mt-3">
            <button
              onClick={() => setShowArticle(true)}
              className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
            >
              Read the theory
            </button>
          </div>
          <div className="flex flex-wrap gap-6 mt-2 text-sm">
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
              <span
                className={`font-semibold ${stats.inconsistentKeys > 0 ? 'text-amber-400' : 'text-green-400'}`}
              >
                {stats.inconsistentKeys}
              </span>
            </span>
            <span className="text-slate-300">
              Replication Factor:{' '}
              <span className="font-semibold text-white">{stats.replicationFactor}</span>
            </span>
          </div>
        </div>

        {/* Visualization Canvas */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Eventual Consistency Properties"
            checks={evaluateEventualConsistencyInvariants(stats)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Eventual Consistency"
              currentState={{ scenario: selectedScenario }}
            />
          </div>

          <WireLogDrawer
            protocol="Eventual Consistency"
            scenario={selectedScenario}
            invariants={evaluateEventualConsistencyInvariants(stats)}
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
          <svg ref={svgRef} viewBox="0 0 840 700" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="ec" />

            {/* Subtle replication ring hairlines */}
            {nodes.map((a, i) => {
              const b = nodes[(i + 1) % nodes.length];
              if (!b) return null;
              return (
                <line
                  key={`ec-ring-${a.id}-${b.id}`}
                  x1={a.position.x}
                  y1={a.position.y}
                  x2={b.position.x}
                  y2={b.position.y}
                  stroke={SCOPE_COLORS.hairlineSubtle}
                  strokeWidth="1"
                />
              );
            })}

            {/* Messages */}
            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const fromNode = nodes.find((n) => n.id === message.from);
                const toNode = nodes.find((n) => n.id === message.to);
                if (!fromNode || !toNode) return null;
                const isAntiEntropy = message.type === 'AntiEntropy';
                return (
                  <ScopeEdge
                    key={message.id}
                    idPrefix="ec"
                    x1={fromNode.position.x}
                    y1={fromNode.position.y}
                    x2={toNode.position.x}
                    y2={toNode.position.y}
                    color={getMessageColor(message)}
                    markerKey={isAntiEntropy ? 'signal' : 'cobalt'}
                    inset={46}
                    label={isAntiEntropy ? 'SYNC' : 'REPL'}
                    dashed={isAntiEntropy}
                  />
                );
              })}

            {/* Nodes */}
            {nodes.map((node) => (
              <ScopeNode
                key={node.id}
                x={node.position.x}
                y={node.position.y}
                radius={42}
                label={node.id}
                sublabel={`v${node.version}`}
                topTag={node.status === 'failed' ? 'OFFLINE' : node.data.size > 0 ? 'REPLICA' : 'IDLE'}
                bottomLine1={`${node.data.size} ${node.data.size === 1 ? 'KEY' : 'KEYS'}`}
                accentColor={getNodeColor(node)}
                failed={node.status === 'failed'}
                highlighted={node.status === 'healthy' && node.data.size > 0}
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
              title="EVENTUAL CONSISTENCY · ASYNC REPLICATION TRACE"
              idPrefix="ec-st"
              actors={nodes.map((node) => ({
                id: node.id,
                label: node.id,
                sublabel: node.status === 'failed' ? 'OFFLINE' : `${node.data.size} KEYS`,
                color: getNodeColor(node),
                failed: node.status === 'failed',
              }))}
              frames={messages.map((msg) => ({
                id: msg.id,
                from: msg.from,
                to: msg.to,
                label: msg.type === 'AntiEntropy' ? 'SYNC' : 'REPL',
                color: getMessageColor(msg),
                status: msg.status,
                dashed: msg.type === 'AntiEntropy',
              }))}
            />
          )}

          {!inspectedNode && <WireTapHint text="Click any replica to inspect versions & inject faults" />}

          {inspectedNode && (
            <WireTapInspector
              title={`REPLICA ${inspectedNode.id}`}
              subtitle="ASYNC REPLICATION NODE"
              status={inspectedNode.status === 'failed' ? 'failed' : 'healthy'}
              className="top-14 left-4"
              metrics={[
                {
                  label: 'State',
                  value: inspectedNode.status.toUpperCase(),
                  tone: inspectedNode.status === 'failed' ? 'danger' : 'emerald',
                },
                { label: 'Version', value: `v${inspectedNode.version}`, tone: 'cobalt' },
                { label: 'Keys Held', value: inspectedNode.data.size, tone: 'amber' },
                { label: 'RF Target', value: stats.replicationFactor },
              ]}
              actions={[
                ...(inspectedNode.status === 'healthy'
                  ? [
                      {
                        label: 'Write QUORUM',
                        onClick: () =>
                          writeKey(
                            `k${inspectedNode.id.slice(-1)}`,
                            Math.floor(Math.random() * 100),
                            'QUORUM',
                            inspectedNode.id
                          ),
                        variant: 'signal' as const,
                      },
                      {
                        label: 'Fail Replica',
                        onClick: () => failNode(inspectedNode.id),
                        variant: 'danger' as const,
                      },
                    ]
                  : [
                      {
                        label: 'Recover Replica',
                        onClick: () => recoverNode(inspectedNode.id),
                        variant: 'emerald' as const,
                      },
                    ]),
              ]}
              onClose={() => setSelectedNodeId(null)}
            >
              <div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                  Local Key-Value Store ({inspectedNode.data.size})
                </div>
                {inspectedNode.data.size === 0 ? (
                  <div className="text-[#9E9B90]">Empty store</div>
                ) : (
                  <div className="space-y-1">
                    {Array.from(inspectedNode.data.entries()).map(([key, dataValue]) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-[#F4F0E8]">{key}</span>
                        <span className="text-[#34D399]">
                          {JSON.stringify(dataValue.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </WireTapInspector>
          )}

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
                className="w-full px-2 py-1 bg-[#D9441E] text-white text-xs rounded hover:bg-[#B83412] mb-1"
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
          </div>

          {/* Data view */}
          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-80 overflow-y-auto">
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
                          {key}:{' '}
                          <span className="text-green-400">{JSON.stringify(dataValue.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {nodes.every((n) => n.data.size === 0) && (
                <p className="text-xs text-slate-400">
                  No data yet. Run a scenario or write manually.
                </p>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Consistency Levels</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                <span className="text-slate-400">ONE / Replicate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#D9441E]" />
                <span className="text-slate-400">QUORUM / Anti-Entropy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                <span className="text-slate-400">ALL (strong, slower)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#34D399]" />
                <span className="text-slate-400">Healthy replica</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F87171]" />
                <span className="text-slate-400">Failed replica</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['eventual-consistency'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['eventual-consistency'].sections.map((section) => (
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
