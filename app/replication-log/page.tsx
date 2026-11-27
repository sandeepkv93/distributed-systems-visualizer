'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReplicationLogAlgorithm } from '@/lib/algorithms/replicationLog';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { replicationLogScenarios } from '@/visualizers/replication-log/scenarios';
import { LogMessage, LogPartition } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import InvariantMonitor from '@/components/InvariantMonitor';
import WireLogDrawer from '@/components/WireLogDrawer';
import { evaluateReplicationLogInvariants } from '@/lib/invariants';
import ChaosStrip from '@/components/ChaosStrip';
import {
  ChaosConfig,
  DEFAULT_CHAOS_CONFIG,
  applyChaosToMessages,
  computeDeliveryDelay,
} from '@/lib/chaos';

export default function ReplicationLogPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [replication] = useState(() => new ReplicationLogAlgorithm(3));
  const [partition, setPartition] = useState<LogPartition>(replication.getPartition());
  const [messages, setMessages] = useState<LogMessage[]>(replication.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedReplicaId, setSelectedReplicaId] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('topology');
  const [chaos, setChaos] = useState<ChaosConfig>(DEFAULT_CHAOS_CONFIG);
  const [droppedCount, setDroppedCount] = useState(0);
  const chaosRef = useRef<ChaosConfig>(DEFAULT_CHAOS_CONFIG);

  const handleChaosChange = useCallback((next: ChaosConfig) => {
    chaosRef.current = next;
    setChaos(next);
  }, []);

  const syncVisualization = useCallback(() => {
    setPartition({
      ...replication.getPartition(),
      replicas: [...replication.getPartition().replicas],
    });
    setMessages([...replication.getMessages()]);
  }, [replication]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => replication.serialize(),
      restore: (snapshot) => {
        replication.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('replication-log', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = replication.getMessages().filter((m) => m.status === 'in-flight');
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
        survivors.forEach((msg) => replication.deliverMessage(msg.id));
        updateVisualization();
      }, delayMs);
    }
  }, [replication, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('produce', (event) => {
      replication.produce(event.data.value);
      updateVisualization();
    });

    simulation.onEvent('fetch', (event) => {
      replication.fetch(event.data.replicaId);
      updateVisualization();
    });

    simulation.onEvent('mark_out_of_sync', (event) => {
      replication.markOutOfSync(event.data.replicaId);
      updateVisualization();
    });

    simulation.onEvent('mark_in_sync', (event) => {
      replication.markInSync(event.data.replicaId);
      updateVisualization();
    });
  }, [replication, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = replicationLogScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      replication.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const produce = () => {
    const value = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    replication.produce(value);
    updateVisualization();
  };

  const markOutOfSync = (replicaId?: string) => {
    const follower =
      (replicaId && partition.replicas.find((r) => r.id === replicaId && r.role === 'follower')) ||
      partition.replicas.find((r) => r.role === 'follower');
    if (!follower) return;
    replication.markOutOfSync(follower.id);
    updateVisualization();
  };

  const markInSync = (replicaId?: string) => {
    const follower =
      (replicaId && partition.replicas.find((r) => r.id === replicaId && r.role === 'follower')) ||
      partition.replicas.find((r) => r.role === 'follower' && !r.inSync);
    if (!follower) return;
    replication.markInSync(follower.id);
    updateVisualization();
  };

  const fetchReplica = (replicaId: string) => {
    replication.fetch(replicaId);
    updateVisualization();
  };

  const getReplicaColor = (replica: LogPartition['replicas'][number]): string => {
    if (replica.role === 'leader') return SCOPE_COLORS.signal;
    if (!replica.inSync) return SCOPE_COLORS.amber;
    return SCOPE_COLORS.emerald;
  };

  const getMessageStyle = (
    message: LogMessage
  ): { color: string; markerKey: 'cobalt' | 'emerald' | 'amber' | 'muted'; label: string } => {
    switch (message.type) {
      case 'Produce':
        return { color: SCOPE_COLORS.cobalt, markerKey: 'cobalt', label: 'PRODUCE' };
      case 'Replicate':
        return { color: SCOPE_COLORS.emerald, markerKey: 'emerald', label: 'REPL' };
      case 'Fetch':
        return { color: SCOPE_COLORS.amber, markerKey: 'amber', label: 'FETCH' };
      default:
        return { color: SCOPE_COLORS.inkMuted, markerKey: 'muted', label: 'MSG' };
    }
  };

  const stats = replication.getStats();
  const inspectedReplica = selectedReplicaId
    ? partition.replicas.find((r) => r.id === selectedReplicaId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={replicationLogScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          replication.reset();
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
          <h1 className="text-2xl font-bold text-white">Replication Log (Kafka-style)</h1>
          <p className="text-slate-400 text-sm mt-1">
            Leader-based partition with followers, ISR tracking, and high-watermark
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
              Replicas: <span className="font-semibold text-white">{stats.replicas}</span>
            </span>
            <span className="text-slate-300">
              ISR: <span className="font-semibold text-green-400">{stats.isrSize}</span>
            </span>
            <span className="text-slate-300">
              HW: <span className="font-semibold text-blue-400">{stats.highWatermark}</span>
            </span>
            <span className="text-slate-300">
              Log Size: <span className="font-semibold text-white">{stats.logSize}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Replication Log Properties"
            checks={evaluateReplicationLogInvariants(partition)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Replication Log (Kafka-style)"
              currentState={{ scenario: selectedScenario }}
            />
          </div>

          <WireLogDrawer
            protocol="Replication Log"
            scenario={selectedScenario}
            invariants={evaluateReplicationLogInvariants(partition)}
            frames={messages.map((m) => ({
              id: m.id,
              from: m.from,
              to: m.to,
              type: m.type,
              status: m.status,
              detail: m.payload.offset !== undefined ? `offset=${m.payload.offset}` : undefined,
            }))}
          />

          <ScopeModeToggle
            mode={scopeMode}
            onChange={setScopeMode}
            frameCount={messages.length}
          />

          {scopeMode === 'topology' ? (
            <svg ref={svgRef} role="group" aria-label="Write-ahead replication log leader-follower offset and commit index diagram" viewBox="0 0 840 360" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
              <ScopeDefs idPrefix="repllog" />

              {/* Replication bus rail */}
              {partition.replicas.length > 1 && (
                <line
                  x1={160}
                  y1={160}
                  x2={160 + (partition.replicas.length - 1) * 260}
                  y2={160}
                  stroke={SCOPE_COLORS.hairline}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              )}

              {messages
                .filter((m) => m.status === 'in-flight')
                .map((message) => {
                  const fromIndex = partition.replicas.findIndex((r) => r.id === message.from);
                  const toIndex = partition.replicas.findIndex((r) => r.id === message.to);
                  if (fromIndex === -1 || toIndex === -1) return null;
                  const x1 = 160 + fromIndex * 260;
                  const x2 = 160 + toIndex * 260;
                  const style = getMessageStyle(message);
                  return (
                    <ScopeEdge
                      key={message.id}
                      idPrefix="repllog"
                      x1={x1}
                      y1={160}
                      x2={x2}
                      y2={160}
                      color={style.color}
                      markerKey={style.markerKey}
                      inset={48}
                      label={style.label}
                      dashed={message.type === 'Fetch'}
                    />
                  );
                })}

              {partition.replicas.map((replica, index) => {
                const cx = 160 + index * 260;
                return (
                  <ScopeNode
                    key={replica.id}
                    x={cx}
                    y={160}
                    radius={44}
                    label={replica.id}
                    sublabel={`HW ${replica.highWatermark}`}
                    topTag={replica.role === 'leader' ? 'LEADER · ISR' : replica.inSync ? 'FOLLOWER · ISR' : 'OUT OF SYNC'}
                    bottomLine1={`LEO ${replica.log.length}`}
                    accentColor={getReplicaColor(replica)}
                    highlighted={replica.role === 'leader'}
                    selected={selectedReplicaId === replica.id}
                    onClick={() =>
                      setSelectedReplicaId((prev) => (prev === replica.id ? null : replica.id))
                    }
                  />
                );
              })}
            </svg>
          ) : (
            <SpaceTimeScope
              svgRef={svgRef}
              title="REPLICATION LOG · ISR FETCH & ACK TRACE"
              idPrefix="repllog-st"
              actors={partition.replicas.map((replica) => ({
                id: replica.id,
                label: replica.id,
                sublabel: replica.role === 'leader' ? 'LEADER' : `HW ${replica.highWatermark}`,
                color: getReplicaColor(replica),
              }))}
              frames={messages.map((msg) => {
                const style = getMessageStyle(msg);
                return {
                  id: msg.id,
                  from: msg.from,
                  to: msg.to,
                  label: style.label,
                  sublabel: msg.type,
                  color: style.color,
                  status: msg.status,
                  dashed: msg.type === 'Fetch',
                };
              })}
            />
          )}

          {!inspectedReplica && <WireTapHint text="Click any replica to inspect log offsets & ISR status" />}

          {inspectedReplica && (
            <WireTapInspector
              title={`REPLICA ${inspectedReplica.id}`}
              subtitle={inspectedReplica.role === 'leader' ? 'PARTITION LEADER' : 'PARTITION FOLLOWER'}
              status={
                inspectedReplica.role === 'leader'
                  ? 'leader'
                  : inspectedReplica.inSync
                  ? 'healthy'
                  : 'candidate'
              }
              className="top-14 left-4"
              metrics={[
                { label: 'Role', value: inspectedReplica.role.toUpperCase(), tone: 'signal' },
                {
                  label: 'ISR State',
                  value: inspectedReplica.inSync ? 'IN-SYNC' : 'OUT-OF-SYNC',
                  tone: inspectedReplica.inSync ? 'emerald' : 'amber',
                },
                { label: 'High-Watermark', value: inspectedReplica.highWatermark, tone: 'cobalt' },
                { label: 'Log End (LEO)', value: inspectedReplica.log.length },
              ]}
              actions={
                inspectedReplica.role === 'leader'
                  ? [
                      {
                        label: 'Produce Entry',
                        onClick: produce,
                        variant: 'signal',
                      },
                    ]
                  : [
                      {
                        label: 'Fetch Log',
                        onClick: () => fetchReplica(inspectedReplica.id),
                      },
                      inspectedReplica.inSync
                        ? {
                            label: 'Drop from ISR',
                            onClick: () => markOutOfSync(inspectedReplica.id),
                            variant: 'danger',
                          }
                        : {
                            label: 'Rejoin ISR',
                            onClick: () => markInSync(inspectedReplica.id),
                            variant: 'emerald',
                          },
                    ]
              }
              onClose={() => setSelectedReplicaId(null)}
            >
              <div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                  Commit Log ({inspectedReplica.log.length} records)
                </div>
                {inspectedReplica.log.length === 0 ? (
                  <div className="text-[#9E9B90]">Empty partition log</div>
                ) : (
                  <div className="space-y-1">
                    {inspectedReplica.log.map((entry) => {
                      const committed = entry.offset < inspectedReplica.highWatermark;
                      return (
                        <div key={entry.offset} className="flex items-center justify-between gap-2">
                          <span className="text-[#9E9B90]">#{entry.offset}</span>
                          <span className="text-[#F4F0E8]">{entry.value}</span>
                          <span className={committed ? 'text-[#34D399]' : 'text-[#FBBF24]'}>
                            {committed ? 'HW' : 'UNCOMMIT'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </WireTapInspector>
          )}

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={produce}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Produce Message
            </button>
            <button
              onClick={() => markOutOfSync()}
              className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
            >
              Remove Follower from ISR
            </button>
            <button
              onClick={() => markInSync()}
              className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Rejoin ISR
            </button>
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-xs max-h-56 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Replica Logs</h3>
            <div className="space-y-2">
              {partition.replicas.map((replica) => (
                <div key={`log-${replica.id}`} className="text-xs">
                  <div className="font-semibold text-white mb-1">
                    {replica.id} ({replica.inSync ? 'ISR' : 'OOS'})
                  </div>
                  <div className="pl-2 space-y-1 text-slate-300">
                    {replica.log.length === 0 && <div className="text-slate-500">No entries</div>}
                    {replica.log.map((entry) => (
                      <div key={`${replica.id}-${entry.offset}`}>
                        {entry.offset}: {entry.value}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
        title={topicArticles['replication-log'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['replication-log'].sections.map((section) => (
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
