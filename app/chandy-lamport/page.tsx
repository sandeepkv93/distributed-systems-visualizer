'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChandyLamportAlgorithm } from '@/lib/algorithms/chandyLamport';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { chandyLamportScenarios } from '@/visualizers/chandy-lamport/scenarios';
import { SnapshotNode, SnapshotMessage } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import InvariantMonitor from '@/components/InvariantMonitor';
import WireLogDrawer from '@/components/WireLogDrawer';
import { evaluateChandyLamportInvariants } from '@/lib/invariants';
import ChaosStrip from '@/components/ChaosStrip';
import {
  ChaosConfig,
  DEFAULT_CHAOS_CONFIG,
  applyChaosToMessages,
  computeDeliveryDelay,
} from '@/lib/chaos';

export default function ChandyLamportPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [snapshot] = useState(() => new ChandyLamportAlgorithm(5));
  const [nodes, setNodes] = useState<SnapshotNode[]>(snapshot.getNodes());
  const [messages, setMessages] = useState<SnapshotMessage[]>(snapshot.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('topology');
  const [chaos, setChaos] = useState<ChaosConfig>(DEFAULT_CHAOS_CONFIG);
  const [droppedCount, setDroppedCount] = useState(0);
  const chaosRef = useRef<ChaosConfig>(DEFAULT_CHAOS_CONFIG);

  const handleChaosChange = useCallback((next: ChaosConfig) => {
    chaosRef.current = next;
    setChaos(next);
  }, []);

  const syncVisualization = useCallback(() => {
    setNodes([...snapshot.getNodes()]);
    setMessages([...snapshot.getMessages()]);
  }, [snapshot]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => snapshot.serialize(),
      restore: (savedState) => {
        snapshot.restore(savedState);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('chandy-lamport', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = snapshot.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      const delayMs = computeDeliveryDelay(500, chaosRef.current.delayMultiplier);
      simulation.scheduleTimeout(() => {
        const { dropRate } = chaosRef.current;
        const { survivors, dropped } =
          dropRate > 0
            ? applyChaosToMessages(inFlight, dropRate)
            : { survivors: inFlight, dropped: [] };
        if (dropped.length > 0) {
          setDroppedCount((c) => c + dropped.length);
        }
        survivors.forEach((msg) => snapshot.deliverMessage(msg.id));
        updateVisualization();
      }, delayMs);
    }
  }, [snapshot, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('send_message', (event) => {
      snapshot.sendAppMessage(event.data.fromId, event.data.toId, event.data.value);
      updateVisualization();
    });

    simulation.onEvent('start_snapshot', (event) => {
      snapshot.startSnapshot(event.data.initiatorId);
      updateVisualization();
    });
  }, [snapshot, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = chandyLamportScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      snapshot.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const sendRandomMessage = () => {
    const healthyNodes = nodes;
    if (healthyNodes.length < 2) return;
    const from = healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
    let to = healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
    while (to.id === from.id) {
      to = healthyNodes[Math.floor(Math.random() * healthyNodes.length)];
    }
    const value = { op: Math.floor(Math.random() * 100) };
    snapshot.sendAppMessage(from.id, to.id, value);
    updateVisualization();
  };

  const startSnapshot = () => {
    const node = nodes[Math.floor(Math.random() * nodes.length)];
    snapshot.startSnapshot(node.id);
    updateVisualization();
  };

  const getNodeColor = (node: SnapshotNode): string => {
    if (!node.snapshot) return SCOPE_COLORS.cobalt;
    if (node.snapshot.complete) return SCOPE_COLORS.emerald;
    return SCOPE_COLORS.amber;
  };

  const getMessageColor = (message: SnapshotMessage): string => {
    return message.type === 'Marker' ? SCOPE_COLORS.signal : SCOPE_COLORS.cobalt;
  };

  const stats = snapshot.getStats();
  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={chandyLamportScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          snapshot.reset();
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
          <h1 className="text-2xl font-bold text-white">Chandy-Lamport Snapshot</h1>
          <p className="text-slate-400 text-sm mt-1">
            Capture a consistent global state with marker messages and channel recording
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
              Active Snapshots:{' '}
              <span
                className={`font-semibold ${stats.snapshotsActive > 0 ? 'text-amber-400' : 'text-slate-300'}`}
              >
                {stats.snapshotsActive}
              </span>
            </span>
            <span className="text-slate-300">
              Completed:{' '}
              <span className="font-semibold text-green-400">{stats.snapshotsComplete}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Chandy-Lamport Properties"
            checks={evaluateChandyLamportInvariants(nodes)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Chandy-Lamport Snapshot"
              currentState={{ scenario: selectedScenario }}
            />
          </div>

          <WireLogDrawer
            protocol="Chandy-Lamport Snapshot"
            scenario={selectedScenario}
            invariants={evaluateChandyLamportInvariants(nodes)}
            frames={messages.map((m) => ({
              id: m.id,
              from: m.from,
              to: m.to,
              type: m.type,
              status: m.status,
              detail:
                m.type === 'Marker'
                  ? m.payload.snapshotId ?? 'marker'
                  : JSON.stringify(m.payload.value ?? ''),
            }))}
          />

          <ScopeModeToggle
            mode={scopeMode}
            onChange={setScopeMode}
            frameCount={messages.length}
          />

          {scopeMode === 'topology' ? (
            <svg ref={svgRef} role="group" aria-label="Chandy-Lamport distributed snapshot topology and marker propagation diagram" viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
              <ScopeDefs idPrefix="cl" />

              {nodes.map((a, i) =>
                nodes.slice(i + 1).map((b) => (
                  <line
                    key={`cl-mesh-${a.id}-${b.id}`}
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
                  const isMarker = message.type === 'Marker';
                  return (
                    <ScopeEdge
                      key={message.id}
                      idPrefix="cl"
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      color={getMessageColor(message)}
                      markerKey={isMarker ? 'signal' : 'cobalt'}
                      inset={46}
                      label={isMarker ? 'MARKER' : 'APP'}
                      dashed={isMarker}
                    />
                  );
                })}

              {nodes.map((node) => (
                <ScopeNode
                  key={node.id}
                  x={node.position.x}
                  y={node.position.y}
                  radius={40}
                  label={node.id}
                  sublabel={`STATE ${node.localState}`}
                  topTag={
                    node.snapshot
                      ? node.snapshot.complete
                        ? 'DONE'
                        : 'RECORDING'
                      : 'PROCESS'
                  }
                  bottomLine1={
                    node.snapshot
                      ? `REC ${node.snapshot.localState} · CH ${Object.keys(node.snapshot.channels).length}`
                      : 'IDLE'
                  }
                  accentColor={getNodeColor(node)}
                  highlighted={Boolean(node.snapshot && !node.snapshot.complete)}
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
              title="CHANDY-LAMPORT · MARKER & CHANNEL TRACE"
              idPrefix="cl-st"
              actors={nodes.map((node) => ({
                id: node.id,
                label: node.id,
                sublabel: node.snapshot
                  ? node.snapshot.complete
                    ? 'DONE'
                    : 'REC'
                  : `S=${node.localState}`,
                color: getNodeColor(node),
              }))}
              frames={messages.map((msg) => ({
                id: msg.id,
                from: msg.from,
                to: msg.to,
                label: msg.type === 'Marker' ? 'MARKER' : 'APP',
                sublabel:
                  msg.type === 'Marker'
                    ? msg.payload.snapshotId ?? 'snap'
                    : String(msg.payload.value ?? ''),
                color: getMessageColor(msg),
                status: msg.status,
                dashed: msg.type === 'Marker',
              }))}
            />
          )}

          {!inspectedNode && <WireTapHint text="Click any node to inspect recorded channels" />}

          {inspectedNode && (
            <WireTapInspector
              title={`NODE ${inspectedNode.id}`}
              subtitle={
                inspectedNode.snapshot
                  ? inspectedNode.snapshot.complete
                    ? 'SNAPSHOT COMPLETE'
                    : 'RECORDING INCOMING CHANNELS'
                  : 'NO SNAPSHOT YET'
              }
              status={
                inspectedNode.snapshot
                  ? inspectedNode.snapshot.complete
                    ? 'healthy'
                    : 'candidate'
                  : 'info'
              }
              className="top-14 left-4"
              metrics={[
                { label: 'Live State', value: inspectedNode.localState, tone: 'cobalt' },
                {
                  label: 'Recorded State',
                  value: inspectedNode.snapshot ? inspectedNode.snapshot.localState : '—',
                  tone: 'emerald',
                },
                {
                  label: 'Recording From',
                  value: inspectedNode.snapshot?.recordingFrom.length ?? 0,
                  tone: 'amber',
                },
                {
                  label: 'Snapshot ID',
                  value: inspectedNode.snapshot?.id ?? '—',
                },
              ]}
              actions={[
                {
                  label: 'Initiate Snapshot',
                  onClick: () => {
                    snapshot.startSnapshot(inspectedNode.id);
                    updateVisualization();
                  },
                  variant: 'signal',
                },
              ]}
              onClose={() => setSelectedNodeId(null)}
            >
              <div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                  Recorded Channel Logs
                </div>
                {!inspectedNode.snapshot ? (
                  <div className="text-[#6E6B62]">No snapshot recorded yet</div>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(inspectedNode.snapshot.channels).map(([fromId, records]) => (
                      <div
                        key={`${inspectedNode.id}-${fromId}`}
                        className="px-2 py-1 bg-[#0E1110] border border-[rgba(244,240,232,0.1)] text-[10px]"
                      >
                        <span className="text-[#60A5FA]">{fromId}→{inspectedNode.id}:</span>{' '}
                        {records.length > 0
                          ? records.map((r) => JSON.stringify(r.value)).join(', ')
                          : 'empty'}
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
              onClick={sendRandomMessage}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Send Random Message
            </button>
            <button
              onClick={startSnapshot}
              className="w-full px-3 py-2 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
            >
              Start Snapshot
            </button>
            <p className="text-xs text-slate-400">
              Markers propagate automatically; in-flight messages are captured on open channels.
            </p>
          </div>

          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-xs max-h-64 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Snapshot State</h3>
            <div className="space-y-2 font-mono">
              {nodes.map((node) => (
                <div key={node.id} className="text-xs">
                  <div className="font-semibold text-[#F4F0E8] mb-0.5">{node.id}</div>
                  {node.snapshot ? (
                    <div className="pl-2 space-y-0.5 text-slate-300">
                      <div>local: {node.snapshot.localState}</div>
                      {Object.entries(node.snapshot.channels).map(([fromId, records]) => (
                        <div key={`${node.id}-${fromId}`} className="text-slate-400">
                          {fromId}:{' '}
                          {records.length > 0
                            ? records.map((r) => JSON.stringify(r.value)).join(', ')
                            : 'empty'}
                        </div>
                      ))}
                      {node.snapshot.complete && <div className="text-[#34D399]">Complete</div>}
                    </div>
                  ) : (
                    <div className="pl-2 text-slate-500">No snapshot yet</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Signals</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                <span className="text-slate-300">Recording</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#34D399]" />
                <span className="text-slate-300">Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                <span className="text-slate-300">App Message</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#D9441E]" />
                <span className="text-slate-300">Marker Cut</span>
              </div>
            </div>
          </div>

          <ChaosStrip
            config={chaos}
            onChange={handleChaosChange}
            droppedCount={droppedCount}
            onResetDropped={() => setDroppedCount(0)}
          />
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['chandy-lamport'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['chandy-lamport'].sections.map((section) => (
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
