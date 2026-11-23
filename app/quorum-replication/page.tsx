'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QuorumReplicationAlgorithm } from '@/lib/algorithms/quorumReplication';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { quorumReplicationScenarios } from '@/visualizers/quorum-replication/scenarios';
import { QuorumNode, QuorumMessage } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';

export default function QuorumReplicationPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [quorum] = useState(() => new QuorumReplicationAlgorithm(5, 3));
  const [nodes, setNodes] = useState<QuorumNode[]>(quorum.getNodes());
  const [messages, setMessages] = useState<QuorumMessage[]>(quorum.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [quorumWrite, setQuorumWrite] = useState(2);
  const [quorumRead, setQuorumRead] = useState(2);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const syncVisualization = useCallback(() => {
    setNodes([...quorum.getNodes()]);
    setMessages([...quorum.getMessages()]);
  }, [quorum]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => quorum.serialize(),
      restore: (snapshot) => {
        quorum.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('quorum-replication', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = quorum.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      simulation.scheduleTimeout(() => {
        inFlight.forEach((msg) => quorum.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [quorum, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('write', (event) => {
      quorum.write(
        event.data.key,
        event.data.value,
        event.data.nodeId,
        event.data.quorumWrite || quorumWrite
      );
      updateVisualization();
    });

    simulation.onEvent('read', (event) => {
      quorum.read(event.data.key, event.data.nodeId, event.data.quorumRead || quorumRead);
      updateVisualization();
    });

    simulation.onEvent('fail_node', (event) => {
      quorum.failNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('recover_node', (event) => {
      quorum.recoverNode(event.data.nodeId);
      updateVisualization();
    });
  }, [quorum, simulation, updateVisualization, quorumRead, quorumWrite]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = quorumReplicationScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      quorum.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const writeRandom = (coordinatorId?: string) => {
    const healthyNodes = nodes.filter((n) => n.status === 'healthy');
    if (healthyNodes.length === 0) return;
    const coordinator =
      (coordinatorId && healthyNodes.find((n) => n.id === coordinatorId)) ||
      healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
    const key = `item:${Math.floor(Math.random() * 5) + 1}`;
    const value = Math.floor(Math.random() * 100);
    quorum.write(key, value, coordinator.id, quorumWrite);
    updateVisualization();
  };

  const readRandom = (coordinatorId?: string) => {
    const healthyNodes = nodes.filter((n) => n.status === 'healthy');
    if (healthyNodes.length === 0) return;
    const coordinator =
      (coordinatorId && healthyNodes.find((n) => n.id === coordinatorId)) ||
      healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
    const key = `item:${Math.floor(Math.random() * 5) + 1}`;
    quorum.read(key, coordinator.id, quorumRead);
    updateVisualization();
  };

  const failNode = (nodeId: string) => {
    quorum.failNode(nodeId);
    updateVisualization();
  };

  const recoverNode = (nodeId: string) => {
    quorum.recoverNode(nodeId);
    updateVisualization();
  };

  const getNodeColor = (node: QuorumNode): string => {
    if (node.status === 'failed') return SCOPE_COLORS.danger;
    if (node.data.size === 0) return SCOPE_COLORS.inkMuted;
    return SCOPE_COLORS.emerald;
  };

  const getMessageStyle = (
    message: QuorumMessage
  ): { color: string; markerKey: 'cobalt' | 'amber' | 'signal' | 'muted'; label: string } => {
    switch (message.type) {
      case 'Write':
        return { color: SCOPE_COLORS.cobalt, markerKey: 'cobalt', label: 'WRITE' };
      case 'Read':
        return { color: SCOPE_COLORS.amber, markerKey: 'amber', label: 'READ' };
      case 'Repair':
        return { color: SCOPE_COLORS.signal, markerKey: 'signal', label: 'REPAIR' };
      default:
        return { color: SCOPE_COLORS.inkMuted, markerKey: 'muted', label: 'MSG' };
    }
  };

  const stats = quorum.getStats();
  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;
  const strongOverlap = quorumWrite + quorumRead > stats.replicationFactor;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={quorumReplicationScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          quorum.reset();
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
          <h1 className="text-2xl font-bold text-white">Quorum Replication + Read Repair</h1>
          <p className="text-slate-400 text-sm mt-1">
            Quorum reads and writes with repair of stale replicas
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
              Quorum:{' '}
              <span className={`font-semibold ${strongOverlap ? 'text-green-400' : 'text-amber-400'}`}>
                W={quorumWrite} + R={quorumRead} {strongOverlap ? '>' : '≤'} RF={stats.replicationFactor}
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Quorum Replication + Read Repair"
              currentState={{ scenario: selectedScenario, quorumWrite, quorumRead }}
            />
          </div>

          <svg ref={svgRef} viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="quorum" />

            {/* Mesh ring hairlines */}
            {nodes.map((a, i) => {
              const b = nodes[(i + 1) % nodes.length];
              if (!b) return null;
              return (
                <line
                  key={`q-ring-${a.id}-${b.id}`}
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
                    idPrefix="quorum"
                    x1={fromNode.position.x}
                    y1={fromNode.position.y}
                    x2={toNode.position.x}
                    y2={toNode.position.y}
                    color={style.color}
                    markerKey={style.markerKey}
                    inset={46}
                    label={style.label}
                    dashed={message.type === 'Repair'}
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
                sublabel={`v${node.version}`}
                topTag={node.status === 'failed' ? 'FAILED' : node.data.size > 0 ? 'REPLICA' : 'EMPTY'}
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

          {!inspectedNode && <WireTapHint text="Click any replica to inspect versions & inject faults" />}

          {inspectedNode && (
            <WireTapInspector
              title={`REPLICA ${inspectedNode.id}`}
              subtitle={`W=${quorumWrite} · R=${quorumRead} · RF=${stats.replicationFactor}`}
              status={inspectedNode.status === 'failed' ? 'failed' : 'healthy'}
              className="top-14 left-4"
              metrics={[
                {
                  label: 'Status',
                  value: inspectedNode.status.toUpperCase(),
                  tone: inspectedNode.status === 'failed' ? 'danger' : 'emerald',
                },
                { label: 'Version', value: `v${inspectedNode.version}`, tone: 'cobalt' },
                { label: 'Stored Keys', value: inspectedNode.data.size, tone: 'amber' },
                {
                  label: 'Overlap',
                  value: strongOverlap ? 'W + R > RF' : 'STALE RISK',
                  tone: strongOverlap ? 'emerald' : 'signal',
                },
              ]}
              actions={[
                ...(inspectedNode.status === 'healthy'
                  ? [
                      {
                        label: 'Coord Write',
                        onClick: () => writeRandom(inspectedNode.id),
                        variant: 'signal' as const,
                      },
                      {
                        label: 'Coord Read',
                        onClick: () => readRandom(inspectedNode.id),
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
                  Replica Entries ({inspectedNode.data.size})
                </div>
                {inspectedNode.data.size === 0 ? (
                  <div className="text-[#9E9B90]">No data stored</div>
                ) : (
                  <div className="space-y-1">
                    {Array.from(inspectedNode.data.entries()).map(([key, dataValue]) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-[#F4F0E8]">{key}</span>
                        <span className="text-[#34D399]">
                          {JSON.stringify(dataValue.value)}{' '}
                          <span className="text-[#9E9B90]">v{dataValue.version}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </WireTapInspector>
          )}

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-3 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Write Quorum (W)</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((value) => (
                  <button
                    key={`w-${value}`}
                    onClick={() => setQuorumWrite(value)}
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      quorumWrite === value
                        ? 'bg-slate-200 text-slate-900'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Read Quorum (R)</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((value) => (
                  <button
                    key={`r-${value}`}
                    onClick={() => setQuorumRead(value)}
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      quorumRead === value
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
                onClick={() => writeRandom()}
                className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Write Random Key
              </button>
              <button
                onClick={() => readRandom()}
                className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
              >
                Read Random Key
              </button>
            </div>
          </div>

          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-72 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Replica Data</h3>
            <div className="space-y-2">
              {nodes.map((node) => (
                <div key={node.id} className="text-xs">
                  <div className="font-semibold text-white mb-1">
                    {node.id} ({node.status})
                  </div>
                  <div className="pl-2 space-y-1">
                    {Array.from(node.data.entries()).map(([key, dataValue]) => (
                      <div key={`${node.id}-${key}`} className="text-slate-300">
                        {key}:{' '}
                        <span className="text-green-400">{JSON.stringify(dataValue.value)}</span>{' '}
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
                <div className="w-3 h-3 rounded-full bg-[#34D399]" />
                <span className="text-slate-400">Replica with data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#9E9B90]" />
                <span className="text-slate-400">Empty replica</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F87171]" />
                <span className="text-slate-400">Failed replica</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                <span className="text-slate-400">Write</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                <span className="text-slate-400">Read</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#D9441E]" />
                <span className="text-slate-400">Read Repair</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['quorum-replication'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['quorum-replication'].sections.map((section) => (
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
