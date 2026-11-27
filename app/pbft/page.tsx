'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PBFTAlgorithm } from '@/lib/algorithms/pbft';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import InvariantMonitor from '@/components/InvariantMonitor';
import WireLogDrawer from '@/components/WireLogDrawer';
import { evaluatePBFTInvariants } from '@/lib/invariants';
import { pbftScenarios } from '@/visualizers/pbft/scenarios';
import { PBFTNode, PBFTMessage } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import ChaosStrip from '@/components/ChaosStrip';
import {
  ChaosConfig,
  DEFAULT_CHAOS_CONFIG,
  applyChaosToMessages,
  computeDeliveryDelay,
} from '@/lib/chaos';

export default function PBFTPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pbft] = useState(() => new PBFTAlgorithm(4));
  const [nodes, setNodes] = useState<PBFTNode[]>(pbft.getNodes());
  const [messages, setMessages] = useState<PBFTMessage[]>(pbft.getMessages());
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
    setNodes([...pbft.getNodes()]);
    setMessages([...pbft.getMessages()]);
  }, [pbft]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => pbft.serialize(),
      restore: (snapshot) => {
        pbft.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('pbft', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = pbft.getMessages().filter((m) => m.status === 'in-flight');
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
        survivors.forEach((msg) => pbft.deliverMessage(msg.id));
        updateVisualization();
      }, delayMs);
    }
  }, [pbft, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('client_request', (event) => {
      pbft.clientRequest(event.data.value);
      updateVisualization();
    });

    simulation.onEvent('view_change', () => {
      pbft.triggerViewChange();
      updateVisualization();
    });

    simulation.onEvent('fail_node', (event) => {
      pbft.failNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('recover_node', (event) => {
      pbft.recoverNode(event.data.nodeId);
      updateVisualization();
    });
  }, [pbft, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = pbftScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      pbft.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const sendClientRequest = () => {
    pbft.clientRequest({ op: `tx-${Math.floor(Math.random() * 100)}` });
    updateVisualization();
  };

  const triggerViewChange = () => {
    pbft.triggerViewChange();
    updateVisualization();
  };

  const failNode = (nodeId: string) => {
    pbft.failNode(nodeId);
    updateVisualization();
  };

  const recoverNode = (nodeId: string) => {
    pbft.recoverNode(nodeId);
    updateVisualization();
  };

  const getNodeColor = (node: PBFTNode): string => {
    if (node.status === 'failed') return SCOPE_COLORS.danger;
    if (node.role === 'primary') return SCOPE_COLORS.signal;
    return SCOPE_COLORS.emerald;
  };

  const getMessageColor = (message: PBFTMessage): string => {
    switch (message.type) {
      case 'PrePrepare':
        return SCOPE_COLORS.cobalt;
      case 'Prepare':
        return SCOPE_COLORS.amber;
      case 'Commit':
        return SCOPE_COLORS.emerald;
      case 'ViewChange':
        return SCOPE_COLORS.signal;
      default:
        return SCOPE_COLORS.inkMuted;
    }
  };

  const getMessageMarker = (
    message: PBFTMessage
  ): 'cobalt' | 'amber' | 'emerald' | 'signal' | 'muted' => {
    switch (message.type) {
      case 'PrePrepare':
        return 'cobalt';
      case 'Prepare':
        return 'amber';
      case 'Commit':
        return 'emerald';
      case 'ViewChange':
        return 'signal';
      default:
        return 'muted';
    }
  };

  const stats = pbft.getStats();

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={pbftScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          pbft.reset();
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
          <h1 className="text-2xl font-bold text-white">PBFT Consensus</h1>
          <p className="text-slate-400 text-sm mt-1">
            Byzantine Fault Tolerance with pre-prepare, prepare, and commit phases
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
              View: <span className="font-semibold text-white">v{stats.view}</span>
            </span>
            <span className="text-slate-300">
              Quorum: <span className="font-semibold text-white">{stats.quorum}</span>
            </span>
            <span className="text-slate-300">
              Executed: <span className="font-semibold text-green-400">{stats.executed}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="PBFT Consensus"
              currentState={{ scenario: selectedScenario }}
            />
          </div>

          <InvariantMonitor
            protocolLabel="PBFT Byzantine Safety"
            checks={evaluatePBFTInvariants(nodes)}
          />

          <WireLogDrawer
            protocol="PBFT Consensus"
            scenario={selectedScenario}
            invariants={evaluatePBFTInvariants(nodes)}
            frames={messages.map((m) => ({
              id: m.id,
              from: m.from,
              to: m.to,
              type: m.type,
              status: m.status,
              detail: `v${m.payload.view ?? 0}${m.payload.seq !== undefined ? ` seq=${m.payload.seq}` : ''}`,
            }))}
          />

          <ScopeModeToggle
            mode={scopeMode}
            onChange={setScopeMode}
            frameCount={messages.length}
          />

          {scopeMode === 'topology' ? (
            <svg ref={svgRef} role="group" aria-label="Practical Byzantine Fault Tolerance 3f+1 replica consensus phase diagram" viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
              <ScopeDefs idPrefix="pbft" />

              {/* Full Byzantine all-to-all mesh */}
              {nodes.map((a, i) =>
                nodes.slice(i + 1).map((b) => (
                  <line
                    key={`pbft-mesh-${a.id}-${b.id}`}
                    x1={a.position.x}
                    y1={a.position.y}
                    x2={b.position.x}
                    y2={b.position.y}
                    stroke={SCOPE_COLORS.hairlineSubtle}
                    strokeWidth="1"
                  />
                ))
              )}

              {/* Animated directional in-flight messages */}
              {messages
                .filter((m) => m.status === 'in-flight')
                .map((message) => {
                  const fromNode = nodes.find((n) => n.id === message.from);
                  const toNode = nodes.find((n) => n.id === message.to);
                  if (!fromNode || !toNode) return null;

                  const tag =
                    message.type === 'PrePrepare'
                      ? 'PP'
                      : message.type === 'Prepare'
                      ? 'PR'
                      : message.type === 'Commit'
                      ? 'CM'
                      : 'VC';

                  return (
                    <ScopeEdge
                      key={message.id}
                      idPrefix="pbft"
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      color={getMessageColor(message)}
                      markerKey={getMessageMarker(message)}
                      inset={46}
                      label={tag}
                      dashed={message.type === 'ViewChange'}
                    />
                  );
                })}

              {/* Double-ring Byzantine replicas */}
              {nodes.map((node) => {
                const isFailed = node.status === 'failed';
                const isPrimary = !isFailed && node.role === 'primary';
                return (
                  <ScopeNode
                    key={node.id}
                    x={node.position.x}
                    y={node.position.y}
                    radius={42}
                    label={node.id.toUpperCase()}
                    sublabel={isFailed ? 'OFFLINE' : `LOG ${node.log.size}`}
                    topTag={isFailed ? 'FAILED' : node.role.toUpperCase()}
                    bottomLine1={isPrimary ? `VIEW v${stats.view}` : `QUORUM 2f+1=${stats.quorum}`}
                    accentColor={getNodeColor(node)}
                    failed={isFailed}
                    highlighted={isPrimary}
                    selected={selectedNodeId === node.id}
                    onClick={() =>
                      setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
                    }
                  />
                );
              })}
            </svg>
          ) : (
            <SpaceTimeScope
              svgRef={svgRef}
              idPrefix="pbft-st"
              title="PBFT Consensus"
              actors={nodes.map((n) => ({
                id: n.id,
                label: n.id.toUpperCase(),
                sublabel: n.status === 'failed' ? 'OFFLINE' : n.role.toUpperCase(),
                color: getNodeColor(n),
                failed: n.status === 'failed',
              }))}
              frames={messages.map((m) => ({
                id: m.id,
                from: m.from,
                to: m.to,
                label: `${m.type}(v${m.payload.view})`,
                sublabel: m.payload.seq !== undefined ? `seq ${m.payload.seq}` : undefined,
                color: getMessageColor(m),
                status: m.status,
                dashed: m.type === 'ViewChange',
              }))}
            />
          )}

          {scopeMode === 'topology' && !selectedNodeId && (
            <WireTapHint text="Click any replica to open Wire Tap" />
          )}

          {(() => {
            const inspected = selectedNodeId
              ? nodes.find((n) => n.id === selectedNodeId) ?? null
              : null;
            if (!inspected) return null;
            const entries = Array.from(inspected.log.values());
            return (
              <WireTapInspector
                title={inspected.id.toUpperCase()}
                subtitle={`${inspected.role.toUpperCase()} · VIEW v${stats.view}`}
                status={
                  inspected.status === 'failed'
                    ? 'failed'
                    : inspected.role === 'primary'
                    ? 'leader'
                    : 'healthy'
                }
                className="top-16 left-4"
                metrics={[
                  { label: 'Role', value: inspected.role.toUpperCase(), tone: 'signal' },
                  {
                    label: 'Status',
                    value: inspected.status.toUpperCase(),
                    tone: inspected.status === 'failed' ? 'danger' : 'emerald',
                  },
                  { label: 'Log Entries', value: entries.length, tone: 'cobalt' },
                  { label: 'Quorum 2f+1', value: stats.quorum, tone: 'amber' },
                ]}
                actions={[
                  {
                    label: inspected.status === 'failed' ? 'Recover Replica' : 'Fail Replica',
                    onClick: () =>
                      inspected.status === 'failed'
                        ? recoverNode(inspected.id)
                        : failNode(inspected.id),
                    variant: inspected.status === 'failed' ? 'emerald' : 'danger',
                  },
                ]}
                onClose={() => setSelectedNodeId(null)}
              >
                <div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                    PBFT Phase Log ({entries.length})
                  </div>
                  {entries.length === 0 ? (
                    <div className="text-[#6E6B62]">No logged requests</div>
                  ) : (
                    <div className="space-y-1">
                      {entries.map((entry) => (
                        <div
                          key={`${inspected.id}-${entry.requestId}`}
                          className="flex items-center justify-between gap-2 px-2 py-1 bg-[#0E1110] border border-[rgba(244,240,232,0.1)]"
                        >
                          <span className="text-[#F4F0E8] truncate">{entry.requestId}</span>
                          <span className="text-[#9E9B90]">
                            v{entry.view}·s{entry.seq}
                          </span>
                          <span className="text-[#34D399] uppercase text-[9px]">{entry.phase}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </WireTapInspector>
            );
          })()}

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={sendClientRequest}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Send Client Request
            </button>
            <button
              onClick={triggerViewChange}
              className="w-full px-3 py-2 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
            >
              Trigger View Change
            </button>
            <p className="text-xs text-slate-400">Click any replica to inspect or fail/recover.</p>
          </div>

          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-xs max-h-72 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Replica Log</h3>
            <div className="space-y-2">
              {nodes.map((node) => (
                <div key={`log-${node.id}`} className="text-xs font-mono">
                  <div className="font-semibold text-[#F4F0E8] mb-0.5">{node.id}</div>
                  <div className="pl-2 space-y-0.5 text-slate-300">
                    {node.log.size === 0 && <div className="text-slate-500">No entries</div>}
                    {Array.from(node.log.values()).map((entry) => (
                      <div key={`${node.id}-${entry.requestId}`}>
                        {entry.requestId} v{entry.view} s{entry.seq} {entry.phase}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Phases</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#D9441E]" />
                <span className="text-slate-300">Primary / View Change</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                <span className="text-slate-300">Pre-prepare (PP)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                <span className="text-slate-300">Prepare (PR)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#34D399]" />
                <span className="text-slate-300">Commit (CM) / Replica</span>
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
        title={topicArticles.pbft.title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles.pbft.sections.map((section) => (
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
