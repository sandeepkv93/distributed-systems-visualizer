'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GossipAntiEntropyAlgorithm } from '@/lib/algorithms/gossipAntiEntropy';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { gossipAntiEntropyScenarios } from '@/visualizers/gossip-anti-entropy/scenarios';
import { GossipNode, GossipMessage, GossipMode } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';

export default function GossipAntiEntropyPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [gossip] = useState(() => new GossipAntiEntropyAlgorithm(6));
  const [nodes, setNodes] = useState<GossipNode[]>(gossip.getNodes());
  const [messages, setMessages] = useState<GossipMessage[]>(gossip.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [fanout, setFanout] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const syncVisualization = useCallback(() => {
    setNodes([...gossip.getNodes()]);
    setMessages([...gossip.getMessages()]);
  }, [gossip]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => gossip.serialize(),
      restore: (snapshot) => {
        gossip.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('gossip-anti-entropy', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = gossip.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      simulation.scheduleTimeout(() => {
        inFlight.forEach((msg) => {
          gossip.deliverGossip(msg.id);
        });
        updateVisualization();
      }, 500);
    }
  }, [gossip, simulation, syncVisualization]);

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

  const setRandomValue = (targetNodeId?: string) => {
    const healthyNodes = nodes.filter((n) => n.status === 'healthy');
    if (healthyNodes.length === 0) return;
    const target =
      (targetNodeId && healthyNodes.find((n) => n.id === targetNodeId)) ||
      healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
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
    if (state === 'failed') return SCOPE_COLORS.danger;
    if (state === 'stale') return SCOPE_COLORS.amber;
    return SCOPE_COLORS.emerald;
  };

  const getMessageStyle = (
    message: GossipMessage
  ): { color: string; markerKey: 'cobalt' | 'amber' | 'signal' | 'muted'; label: string } => {
    switch (message.payload.mode) {
      case 'push':
        return { color: SCOPE_COLORS.cobalt, markerKey: 'cobalt', label: 'PUSH' };
      case 'pull':
        return { color: SCOPE_COLORS.amber, markerKey: 'amber', label: 'PULL' };
      case 'push-pull':
        return { color: SCOPE_COLORS.signal, markerKey: 'signal', label: 'P-PULL' };
      default:
        return { color: SCOPE_COLORS.inkMuted, markerKey: 'muted', label: 'GOSSIP' };
    }
  };

  const stats = gossip.getStats();
  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;
  const inspectedSyncState = inspectedNode ? getNodeSyncState(inspectedNode) : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
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
        currentEventIndex={simulation.state.currentEventIndex}
        events={simulation.state.events}
        onScenarioChange={handleScenarioChange}
        onJumpToStep={simulation.jumpToStep}
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
              Divergent Nodes:{' '}
              <span
                className={`font-semibold ${stats.divergentNodes > 0 ? 'text-amber-400' : 'text-green-400'}`}
              >
                {stats.divergentNodes}
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Gossip & Anti-Entropy"
              currentState={{ scenario: selectedScenario, fanout }}
            />
          </div>

          <svg ref={svgRef} viewBox="0 0 840 700" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="gossip" />

            {/* Peer mesh hairlines */}
            {nodes.map((a, i) =>
              nodes.slice(i + 1).map((b) => (
                <line
                  key={`g-mesh-${a.id}-${b.id}`}
                  x1={a.position.x}
                  y1={a.position.y}
                  x2={b.position.x}
                  y2={b.position.y}
                  stroke={SCOPE_COLORS.hairlineSubtle}
                  strokeWidth="0.9"
                />
              ))
            )}

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
                    idPrefix="gossip"
                    x1={fromNode.position.x}
                    y1={fromNode.position.y}
                    x2={toNode.position.x}
                    y2={toNode.position.y}
                    color={style.color}
                    markerKey={style.markerKey}
                    inset={46}
                    label={style.label}
                    dashed={message.payload.mode === 'pull'}
                  />
                );
              })}

            {nodes.map((node) => {
              const syncState = getNodeSyncState(node);
              return (
                <ScopeNode
                  key={node.id}
                  x={node.position.x}
                  y={node.position.y}
                  radius={42}
                  label={node.id}
                  sublabel={`v${node.version}`}
                  topTag={syncState.toUpperCase()}
                  bottomLine1={`${node.data.size} ${node.data.size === 1 ? 'RUMOR' : 'RUMORS'}`}
                  accentColor={getNodeColor(node)}
                  failed={node.status === 'failed'}
                  highlighted={syncState === 'stale'}
                  selected={selectedNodeId === node.id}
                  onClick={() =>
                    setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
                  }
                />
              );
            })}
          </svg>

          {!inspectedNode && <WireTapHint text="Click any peer to inspect rumors & inject faults" />}

          {inspectedNode && inspectedSyncState && (
            <WireTapInspector
              title={`PEER ${inspectedNode.id}`}
              subtitle="EPIDEMIC GOSSIP MEMBER"
              status={
                inspectedSyncState === 'failed'
                  ? 'failed'
                  : inspectedSyncState === 'stale'
                  ? 'candidate'
                  : 'healthy'
              }
              className="top-14 left-4"
              metrics={[
                {
                  label: 'Convergence',
                  value: inspectedSyncState.toUpperCase(),
                  tone:
                    inspectedSyncState === 'failed'
                      ? 'danger'
                      : inspectedSyncState === 'stale'
                      ? 'amber'
                      : 'emerald',
                },
                { label: 'Version', value: `v${inspectedNode.version}`, tone: 'cobalt' },
                { label: 'Rumors Held', value: inspectedNode.data.size },
                { label: 'Fanout', value: `k = ${fanout}`, tone: 'signal' },
              ]}
              actions={[
                ...(inspectedNode.status === 'healthy'
                  ? [
                      {
                        label: 'Inject Rumor',
                        onClick: () => setRandomValue(inspectedNode.id),
                        variant: 'signal' as const,
                      },
                      {
                        label: 'Fail Peer',
                        onClick: () => failNode(inspectedNode.id),
                        variant: 'danger' as const,
                      },
                    ]
                  : [
                      {
                        label: 'Recover Peer',
                        onClick: () => recoverNode(inspectedNode.id),
                        variant: 'emerald' as const,
                      },
                    ]),
              ]}
              onClose={() => setSelectedNodeId(null)}
            >
              <div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                  Peer Digest ({inspectedNode.data.size})
                </div>
                {inspectedNode.data.size === 0 ? (
                  <div className="text-[#9E9B90]">No rumors received</div>
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
            <button
              onClick={() => setRandomValue()}
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
                className="w-full px-3 py-2 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
              >
                Run Push-Pull Round
              </button>
            </div>
          </div>

          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-72 overflow-y-auto">
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
                <span className="text-slate-400">Synced</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                <span className="text-slate-400">Stale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F87171]" />
                <span className="text-slate-400">Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                <span className="text-slate-400">Push gossip</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                <span className="text-slate-400">Pull gossip</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#D9441E]" />
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
