'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LamportClocksAlgorithm } from '@/lib/algorithms/lamportClocks';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { lamportClocksScenarios } from '@/visualizers/lamport-clocks/scenarios';
import { LamportNode, LamportMessage } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';

export default function LamportClocksPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lamport] = useState(() => new LamportClocksAlgorithm(3));
  const [nodes, setNodes] = useState<LamportNode[]>(lamport.getNodes());
  const [messages, setMessages] = useState<LamportMessage[]>(lamport.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('topology');

  const syncVisualization = useCallback(() => {
    setNodes([...lamport.getNodes()]);
    setMessages([...lamport.getMessages()]);
  }, [lamport]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => lamport.serialize(),
      restore: (snapshot) => {
        lamport.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('lamport-clocks', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = lamport.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      simulation.scheduleTimeout(() => {
        inFlight.forEach((msg) => lamport.deliverMessage(msg.id));
        updateVisualization();
      }, 450);
    }
  }, [lamport, simulation, syncVisualization]);

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
    if (node.holdback.length > 0) return SCOPE_COLORS.amber;
    if (node.delivered.length > 0) return SCOPE_COLORS.emerald;
    return SCOPE_COLORS.cobalt;
  };

  const getMessageColor = (message: LamportMessage): string => {
    return message.type === 'Broadcast' ? SCOPE_COLORS.cobalt : SCOPE_COLORS.signal;
  };

  const stats = lamport.getStats();
  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
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
        currentEventIndex={simulation.state.currentEventIndex}
        events={simulation.state.events}
        onScenarioChange={handleScenarioChange}
        onJumpToStep={simulation.jumpToStep}
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
          <div className="flex flex-wrap gap-6 mt-2 text-sm">
            <span className="text-slate-300">
              Nodes: <span className="font-semibold text-white">{stats.totalNodes}</span>
            </span>
            <span className="text-slate-300">
              Broadcasts: <span className="font-semibold text-white">{stats.totalBroadcasts}</span>
            </span>
            <span className="text-slate-300">
              Delivered:{' '}
              <span className="font-semibold text-green-400">{stats.totalDelivered}</span>
            </span>
            <span className="text-slate-300">
              Pending: <span className="font-semibold text-amber-400">{stats.pendingMessages}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Lamport Clocks + Total Order Broadcast"
              currentState={{ scenario: selectedScenario }}
            />
          </div>

          <ScopeModeToggle
            mode={scopeMode}
            onChange={setScopeMode}
            frameCount={messages.length}
          />

          {scopeMode === 'topology' ? (
            <svg ref={svgRef} viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
              <ScopeDefs idPrefix="lamport" />

              {/* Mesh connections */}
              {nodes.map((a, i) =>
                nodes.slice(i + 1).map((b) => (
                  <line
                    key={`lm-${a.id}-${b.id}`}
                    x1={a.position.x}
                    y1={a.position.y}
                    x2={b.position.x}
                    y2={b.position.y}
                    stroke={SCOPE_COLORS.hairlineSubtle}
                    strokeWidth="1"
                  />
                ))
              )}

              {messages
                .filter((m) => m.status === 'in-flight')
                .map((message) => {
                  const fromNode = nodes.find((n) => n.id === message.from);
                  const toNode = nodes.find((n) => n.id === message.to);
                  if (!fromNode || !toNode) return null;
                  const isBcast = message.type === 'Broadcast';
                  return (
                    <ScopeEdge
                      key={message.id}
                      idPrefix="lamport"
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      color={getMessageColor(message)}
                      markerKey={isBcast ? 'cobalt' : 'signal'}
                      inset={46}
                      label={isBcast ? 'BCAST' : 'ACK'}
                      dashed={!isBcast}
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
                  sublabel={`L = ${node.clock}`}
                  topTag={node.holdback.length > 0 ? 'HOLDBACK' : 'PROCESS'}
                  bottomLine1={`QUEUE ${node.holdback.length} · DELIV ${node.delivered.length}`}
                  accentColor={getNodeColor(node)}
                  highlighted={node.holdback.length > 0}
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
              idPrefix="lamport-st"
              title="Lamport Clocks"
              actors={nodes.map((n) => ({
                id: n.id,
                label: n.id,
                sublabel: `L = ${n.clock}`,
                color: getNodeColor(n),
              }))}
              frames={messages.map((m) => {
                const ts = m.payload.timestamp ?? m.payload.ackTimestamp;
                return {
                  id: m.id,
                  from: m.from,
                  to: m.to,
                  label: `${m.type === 'Broadcast' ? 'BCAST' : 'ACK'}${ts !== undefined ? `(L=${ts})` : ''}`,
                  sublabel: m.payload.messageId,
                  color: getMessageColor(m),
                  status: m.status,
                  dashed: m.type === 'Ack',
                };
              })}
            />
          )}

          {scopeMode === 'topology' && !inspectedNode && (
            <WireTapHint text="Click any process to inspect holdback & deliveries" />
          )}

          {inspectedNode && (
            <WireTapInspector
              title={`PROCESS ${inspectedNode.id}`}
              subtitle="SCALAR LOGICAL CLOCK"
              status={inspectedNode.holdback.length > 0 ? 'candidate' : 'healthy'}
              className="top-14 left-4"
              metrics={[
                { label: 'Lamport Clock', value: inspectedNode.clock, tone: 'cobalt' },
                { label: 'Holdback Queue', value: inspectedNode.holdback.length, tone: 'amber' },
                { label: 'Delivered', value: inspectedNode.delivered.length, tone: 'emerald' },
                { label: 'Status', value: inspectedNode.status.toUpperCase() },
              ]}
              actions={[
                {
                  label: 'Local Event',
                  onClick: () => localEvent(inspectedNode.id),
                },
                {
                  label: 'Broadcast',
                  onClick: () => broadcast(inspectedNode.id),
                  variant: 'signal',
                },
              ]}
              onClose={() => setSelectedNodeId(null)}
            >
              <div className="space-y-2">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                    Delivered Total Order ({inspectedNode.delivered.length})
                  </div>
                  {inspectedNode.delivered.length === 0 ? (
                    <div className="text-[#6E6B62]">No deliveries yet</div>
                  ) : (
                    <div className="space-y-1">
                      {inspectedNode.delivered.map((msg) => (
                        <div
                          key={`${inspectedNode.id}-${msg.id}`}
                          className="px-2 py-1 bg-[#0E1110] border border-[rgba(244,240,232,0.1)] text-[10px]"
                        >
                          <span className="text-[#60A5FA]">t={msg.timestamp}</span> {msg.from}:{' '}
                          {JSON.stringify(msg.value)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </WireTapInspector>
          )}

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

          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-xs max-h-64 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Delivery Order</h3>
            <div className="space-y-2 font-mono">
              {nodes.map((node) => (
                <div key={`delivered-${node.id}`} className="text-xs">
                  <div className="font-semibold text-[#F4F0E8] mb-0.5">{node.id}</div>
                  <div className="pl-2 space-y-0.5 text-slate-300">
                    {node.delivered.length === 0 && (
                      <div className="text-slate-500">No deliveries yet</div>
                    )}
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
            <h3 className="text-sm font-semibold text-white mb-2">Signals</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                <span className="text-slate-300">Pending Holdback</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#34D399]" />
                <span className="text-slate-300">Delivered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                <span className="text-slate-300">Broadcast</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#D9441E]" />
                <span className="text-slate-300">Ack</span>
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
