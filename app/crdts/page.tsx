'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CRDTAlgorithm } from '@/lib/algorithms/crdts';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { crdtScenarios } from '@/visualizers/crdts/scenarios';
import { CRDTMessage, CRDTReplica } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import InvariantMonitor from '@/components/InvariantMonitor';
import { evaluateCRDTInvariants } from '@/lib/invariants';
import WireLogDrawer from '@/components/WireLogDrawer';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';

export default function CRDTsPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [crdt] = useState(() => new CRDTAlgorithm(3));
  const [replicas, setReplicas] = useState<CRDTReplica[]>(crdt.getReplicas());
  const [messages, setMessages] = useState<CRDTMessage[]>(crdt.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedReplicaId, setSelectedReplicaId] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('topology');

  const syncVisualization = useCallback(() => {
    setReplicas([...crdt.getReplicas()]);
    setMessages([...crdt.getMessages()]);
  }, [crdt]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => crdt.serialize(),
      restore: (snapshot) => {
        crdt.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('crdts', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = crdt.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      simulation.scheduleTimeout(() => {
        inFlight.forEach((msg) => crdt.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [crdt, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('g_inc', (event) => {
      const times = event.data.times || 1;
      for (let i = 0; i < times; i += 1) {
        crdt.increment(event.data.replicaId);
      }
      updateVisualization();
    });

    simulation.onEvent('or_add', (event) => {
      crdt.orSetAdd(event.data.replicaId, event.data.value);
      updateVisualization();
    });

    simulation.onEvent('or_remove', (event) => {
      crdt.orSetRemove(event.data.replicaId, event.data.value);
      updateVisualization();
    });

    simulation.onEvent('rga_insert', (event) => {
      crdt.rgaInsert(event.data.replicaId, event.data.value);
      updateVisualization();
    });

    simulation.onEvent('rga_remove', (event) => {
      crdt.rgaRemove(event.data.replicaId, event.data.elementId);
      updateVisualization();
    });

    simulation.onEvent('sync_pair', (event) => {
      crdt.sync(event.data.fromId, event.data.toId);
      updateVisualization();
    });

    simulation.onEvent('sync_all', () => {
      crdt.syncAll();
      updateVisualization();
    });
  }, [crdt, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = crdtScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      crdt.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const incrementRandom = (replicaId?: string) => {
    const target = replicaId ?? replicas[Math.floor(Math.random() * replicas.length)].id;
    crdt.increment(target);
    updateVisualization();
  };

  const addRandom = (replicaId?: string) => {
    const target = replicaId ?? replicas[Math.floor(Math.random() * replicas.length)].id;
    const value = ['apple', 'banana', 'cherry'][Math.floor(Math.random() * 3)];
    crdt.orSetAdd(target, value);
    updateVisualization();
  };

  const removeRandom = (replicaId?: string) => {
    const replica =
      (replicaId && replicas.find((r) => r.id === replicaId)) ||
      replicas[Math.floor(Math.random() * replicas.length)];
    const values = crdt.getORSetValues(replica);
    if (values.length === 0) return;
    crdt.orSetRemove(replica.id, values[0]);
    updateVisualization();
  };

  const insertRga = (replicaId?: string) => {
    const target = replicaId ?? replicas[Math.floor(Math.random() * replicas.length)].id;
    const value = String.fromCharCode(65 + Math.floor(Math.random() * 5));
    crdt.rgaInsert(target, value);
    updateVisualization();
  };

  const removeRga = (replicaId?: string) => {
    const replica =
      (replicaId && replicas.find((r) => r.id === replicaId)) ||
      replicas[Math.floor(Math.random() * replicas.length)];
    const seq = crdt.getRgaSequence(replica);
    if (seq.length === 0) return;
    crdt.rgaRemove(replica.id, seq[seq.length - 1].id);
    updateVisualization();
  };

  const syncAll = () => {
    crdt.syncAll();
    updateVisualization();
  };

  const stats = crdt.getStats();
  const hasDivergence =
    stats.divergentGCounter > 0 || stats.divergentORSet > 0 || stats.divergentRGA > 0;
  const inspectedReplica = selectedReplicaId
    ? replicas.find((r) => r.id === selectedReplicaId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={crdtScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          crdt.reset();
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
          <h1 className="text-2xl font-bold text-white">CRDTs</h1>
          <p className="text-slate-400 text-sm mt-1">
            G-Counter, OR-Set, and RGA converge via merge operations
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
              Replicas: <span className="font-semibold text-white">{stats.replicaCount}</span>
            </span>
            <span className="text-slate-300">
              Divergent Counters:{' '}
              <span
                className={`font-semibold ${stats.divergentGCounter > 0 ? 'text-amber-400' : 'text-green-400'}`}
              >
                {stats.divergentGCounter}
              </span>
            </span>
            <span className="text-slate-300">
              Divergent OR-Set:{' '}
              <span
                className={`font-semibold ${stats.divergentORSet > 0 ? 'text-amber-400' : 'text-green-400'}`}
              >
                {stats.divergentORSet}
              </span>
            </span>
            <span className="text-slate-300">
              Divergent RGA:{' '}
              <span
                className={`font-semibold ${stats.divergentRGA > 0 ? 'text-amber-400' : 'text-green-400'}`}
              >
                {stats.divergentRGA}
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="CRDT Formal Properties"
            checks={evaluateCRDTInvariants(replicas, stats)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="CRDTs"
              currentState={{ scenario: selectedScenario }}
            />
          </div>

          <WireLogDrawer
            protocol="CRDTs (G-Counter / OR-Set / RGA)"
            scenario={selectedScenario}
            invariants={evaluateCRDTInvariants(replicas, stats)}
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
          <svg ref={svgRef} viewBox="0 0 880 340" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="crdt" />

            {/* Lattice sync bus */}
            {replicas.length > 1 && (
              <line
                x1={160}
                y1={160}
                x2={160 + (replicas.length - 1) * 280}
                y2={160}
                stroke={hasDivergence ? SCOPE_COLORS.amber : SCOPE_COLORS.emerald}
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.4"
              />
            )}

            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const fromIndex = replicas.findIndex((r) => r.id === message.from);
                const toIndex = replicas.findIndex((r) => r.id === message.to);
                if (fromIndex === -1 || toIndex === -1) return null;
                const x1 = 160 + fromIndex * 280;
                const x2 = 160 + toIndex * 280;
                return (
                  <ScopeEdge
                    key={message.id}
                    idPrefix="crdt"
                    x1={x1}
                    y1={160}
                    x2={x2}
                    y2={160}
                    color={SCOPE_COLORS.cobalt}
                    markerKey="cobalt"
                    inset={50}
                    label="MERGE"
                  />
                );
              })}

            {replicas.map((replica, index) => {
              const cx = 160 + index * 280;
              const orCount = crdt.getORSetValues(replica).length;
              const rgaLen = crdt.getRgaSequence(replica).length;
              return (
                <ScopeNode
                  key={replica.id}
                  x={cx}
                  y={160}
                  radius={46}
                  label={replica.id}
                  sublabel={`G = ${crdt.getGCounterTotal(replica)}`}
                  topTag={hasDivergence ? 'LOCAL STATE' : 'CONVERGED'}
                  bottomLine1={`SET ${orCount} · RGA ${rgaLen}`}
                  accentColor={hasDivergence ? SCOPE_COLORS.amber : SCOPE_COLORS.emerald}
                  highlighted={hasDivergence}
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
              title="CRDT · SEMILATTICE MERGE & ANTI-ENTROPY TRACE"
              idPrefix="crdt-st"
              actors={replicas.map((r) => ({
                id: r.id,
                label: r.id,
                sublabel: `G=${crdt.getGCounterTotal(r)}`,
                color: hasDivergence ? SCOPE_COLORS.amber : SCOPE_COLORS.emerald,
              }))}
              frames={messages.map((msg) => ({
                id: msg.id,
                from: msg.from,
                to: msg.to,
                label: msg.type,
                color: SCOPE_COLORS.emerald,
                status: msg.status,
              }))}
            />
          )}

          {!inspectedReplica && <WireTapHint text="Click any replica to inspect lattice state & mutate locally" />}

          {inspectedReplica && (
            <WireTapInspector
              title={`REPLICA ${inspectedReplica.id}`}
              subtitle="CONFLICT-FREE REPLICATED DATA TYPE"
              status={hasDivergence ? 'candidate' : 'healthy'}
              className="top-14 left-4"
              metrics={[
                { label: 'G-Counter', value: crdt.getGCounterTotal(inspectedReplica), tone: 'cobalt' },
                { label: 'OR-Set Size', value: crdt.getORSetValues(inspectedReplica).length, tone: 'emerald' },
                { label: 'RGA Length', value: crdt.getRgaSequence(inspectedReplica).length, tone: 'amber' },
                {
                  label: 'Cluster',
                  value: hasDivergence ? 'DIVERGENT' : 'CONVERGED',
                  tone: hasDivergence ? 'signal' : 'emerald',
                },
              ]}
              actions={[
                {
                  label: '+1 Counter',
                  onClick: () => incrementRandom(inspectedReplica.id),
                },
                {
                  label: 'OR-Set Add',
                  onClick: () => addRandom(inspectedReplica.id),
                  variant: 'emerald',
                },
                {
                  label: 'RGA Insert',
                  onClick: () => insertRga(inspectedReplica.id),
                  variant: 'signal',
                },
                {
                  label: 'Merge All',
                  onClick: syncAll,
                },
              ]}
              onClose={() => setSelectedReplicaId(null)}
            >
              <div className="space-y-1.5">
                <div>
                  <span className="text-[#9E9B90]">Vector: </span>
                  <span className="text-[#60A5FA]">{JSON.stringify(inspectedReplica.gCounter)}</span>
                </div>
                <div>
                  <span className="text-[#9E9B90]">OR-Set: </span>
                  <span className="text-[#34D399]">
                    {crdt.getORSetValues(inspectedReplica).join(', ') || 'empty'}
                  </span>
                </div>
                <div>
                  <span className="text-[#9E9B90]">RGA: </span>
                  <span className="text-[#FBBF24]">
                    {crdt
                      .getRgaSequence(inspectedReplica)
                      .map((e) => e.value)
                      .join(' ') || 'empty'}
                  </span>
                </div>
              </div>
            </WireTapInspector>
          )}

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={() => incrementRandom()}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Increment G-Counter
            </button>
            <button
              onClick={() => addRandom()}
              className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              OR-Set Add
            </button>
            <button
              onClick={() => removeRandom()}
              className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
            >
              OR-Set Remove
            </button>
            <button
              onClick={() => insertRga()}
              className="w-full px-3 py-2 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
            >
              RGA Insert
            </button>
            <button
              onClick={() => removeRga()}
              className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              RGA Remove
            </button>
            <button
              onClick={syncAll}
              className="w-full px-3 py-2 bg-slate-600 text-white text-sm rounded hover:bg-slate-700"
            >
              Sync All
            </button>
          </div>

          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-80 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Replica State</h3>
            <div className="space-y-3">
              {replicas.map((replica) => (
                <div key={`replica-${replica.id}`} className="text-xs">
                  <div className="font-semibold text-white mb-1">{replica.id}</div>
                  <div className="pl-2 space-y-1 text-slate-300">
                    <div>G-Counter: {JSON.stringify(replica.gCounter)}</div>
                    <div>OR-Set: {crdt.getORSetValues(replica).join(', ') || 'empty'}</div>
                    <div>
                      RGA:{' '}
                      {crdt
                        .getRgaSequence(replica)
                        .map((e) => e.value)
                        .join(' ') || 'empty'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles.crdts.title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles.crdts.sections.map((section) => (
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
