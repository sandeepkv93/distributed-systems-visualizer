'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MerkleAntiEntropyAlgorithm } from '@/lib/algorithms/merkleAntiEntropy';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { merkleAntiEntropyScenarios } from '@/visualizers/merkle-anti-entropy/scenarios';
import { MerkleMessage, MerkleReplica } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';

export default function MerkleAntiEntropyPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [merkle] = useState(() => new MerkleAntiEntropyAlgorithm(2));
  const [replicas, setReplicas] = useState<MerkleReplica[]>(merkle.getReplicas());
  const [messages, setMessages] = useState<MerkleMessage[]>(merkle.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedReplicaId, setSelectedReplicaId] = useState<string | null>(null);

  const syncVisualization = useCallback(() => {
    setReplicas([...merkle.getReplicas()]);
    setMessages([...merkle.getMessages()]);
  }, [merkle]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => merkle.serialize(),
      restore: (snapshot) => {
        merkle.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('merkle-anti-entropy', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = merkle.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      simulation.scheduleTimeout(() => {
        inFlight.forEach((msg) => merkle.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [merkle, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('compare_roots', () => {
      merkle.compareRoots();
      updateVisualization();
    });

    simulation.onEvent('compare_nodes', () => {
      merkle.compareRoots();
      updateVisualization();
    });

    simulation.onEvent('sync_leaf', () => {
      merkle.compareRoots();
      updateVisualization();
    });
  }, [merkle, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = merkleAntiEntropyScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      merkle.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const compareRoots = () => {
    merkle.compareRoots();
    updateVisualization();
  };

  const mutateKey = (replicaId: string = 'R0') => {
    const key = `k${Math.floor(Math.random() * 12) + 1}`;
    merkle.mutateReplica(replicaId, key, `${key}-v${Math.floor(Math.random() * 5) + 2}`);
    updateVisualization();
  };

  const getMessageStyle = (
    message: MerkleMessage
  ): { color: string; markerKey: 'cobalt' | 'amber' | 'emerald' | 'muted'; label: string } => {
    switch (message.type) {
      case 'CompareRoot':
        return { color: SCOPE_COLORS.cobalt, markerKey: 'cobalt', label: 'ROOT DIFF' };
      case 'CompareNode':
        return { color: SCOPE_COLORS.amber, markerKey: 'amber', label: 'SUBTREE' };
      case 'SyncLeaf':
        return { color: SCOPE_COLORS.emerald, markerKey: 'emerald', label: 'SYNC LEAF' };
      default:
        return { color: SCOPE_COLORS.inkMuted, markerKey: 'muted', label: 'MSG' };
    }
  };

  const stats = merkle.getStats();
  const rootsMatch =
    replicas.length >= 2 && replicas[0].root?.hash === replicas[1].root?.hash;
  const inspectedReplica = selectedReplicaId
    ? replicas.find((r) => r.id === selectedReplicaId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={merkleAntiEntropyScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          merkle.reset();
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
          <h1 className="text-2xl font-bold text-white">Merkle Tree Anti-Entropy</h1>
          <p className="text-slate-400 text-sm mt-1">
            Compare hashed subtrees to locate and sync divergent keys
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
              Divergent Keys:{' '}
              <span
                className={`font-semibold ${stats.mismatchedKeys > 0 ? 'text-amber-400' : 'text-green-400'}`}
              >
                {stats.mismatchedKeys}
              </span>
            </span>
            <span className="text-slate-300">
              Roots:{' '}
              <span className={`font-semibold ${rootsMatch ? 'text-green-400' : 'text-amber-400'}`}>
                {rootsMatch ? 'MATCH' : 'DIVERGED'}
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Merkle Tree Anti-Entropy"
              currentState={{ scenario: selectedScenario, mismatchedKeys: stats.mismatchedKeys }}
            />
          </div>

          <svg ref={svgRef} viewBox="0 0 840 420" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="merkle" />

            {/* Sync channel rail between replicas */}
            <line
              x1={220}
              y1={200}
              x2={620}
              y2={200}
              stroke={rootsMatch ? SCOPE_COLORS.emerald : SCOPE_COLORS.amber}
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.45"
            />
            <text
              x={420}
              y={178}
              textAnchor="middle"
              fill={rootsMatch ? SCOPE_COLORS.emerald : SCOPE_COLORS.amber}
              fontSize="10"
              fontFamily="var(--font-mono), monospace"
              letterSpacing="0.12em"
            >
              {rootsMatch ? 'MERKLE ROOTS CONVERGED' : `${stats.mismatchedKeys} DIVERGENT LEAF KEYS`}
            </text>

            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const style = getMessageStyle(message);
                const fromLeft = message.from === replicas[0]?.id;
                return (
                  <ScopeEdge
                    key={message.id}
                    idPrefix="merkle"
                    x1={fromLeft ? 220 : 620}
                    y1={200}
                    x2={fromLeft ? 620 : 220}
                    y2={200}
                    color={style.color}
                    markerKey={style.markerKey}
                    inset={58}
                    label={style.label}
                    dashed={message.type === 'CompareNode'}
                  />
                );
              })}

            {replicas.map((replica, index) => {
              const cx = 220 + index * 400;
              return (
                <ScopeNode
                  key={replica.id}
                  x={cx}
                  y={200}
                  radius={52}
                  label={replica.id}
                  sublabel={`#${replica.root?.hash?.slice(0, 6) || 'n/a'}`}
                  topTag={rootsMatch ? 'SYNCED TREE' : 'DIVERGENT TREE'}
                  bottomLine1={`${replica.data.size} LEAF KEYS`}
                  accentColor={rootsMatch ? SCOPE_COLORS.emerald : SCOPE_COLORS.amber}
                  highlighted={!rootsMatch}
                  selected={selectedReplicaId === replica.id}
                  onClick={() =>
                    setSelectedReplicaId((prev) => (prev === replica.id ? null : replica.id))
                  }
                />
              );
            })}
          </svg>

          {!inspectedReplica && <WireTapHint text="Click any replica to inspect Merkle root & keys" />}

          {inspectedReplica && (
            <WireTapInspector
              title={`REPLICA ${inspectedReplica.id}`}
              subtitle="MERKLE HASH TREE"
              status={rootsMatch ? 'healthy' : 'candidate'}
              className="top-14 left-4"
              metrics={[
                {
                  label: 'Root Hash',
                  value: inspectedReplica.root?.hash?.slice(0, 8) || 'n/a',
                  tone: 'cobalt',
                },
                {
                  label: 'Tree Status',
                  value: rootsMatch ? 'IN SYNC' : 'DIVERGED',
                  tone: rootsMatch ? 'emerald' : 'amber',
                },
                { label: 'Leaf Keys', value: inspectedReplica.data.size },
                {
                  label: 'Mismatches',
                  value: stats.mismatchedKeys,
                  tone: stats.mismatchedKeys > 0 ? 'signal' : 'emerald',
                },
              ]}
              actions={[
                {
                  label: 'Mutate Key',
                  onClick: () => mutateKey(inspectedReplica.id),
                  variant: 'signal',
                },
                {
                  label: 'Compare Roots',
                  onClick: compareRoots,
                  variant: 'emerald',
                },
              ]}
              onClose={() => setSelectedReplicaId(null)}
            >
              <div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                  Leaf Entries ({inspectedReplica.data.size})
                </div>
                <div className="space-y-1">
                  {Array.from(inspectedReplica.data.entries()).map(([key, value]) => {
                    const peer = replicas.find((r) => r.id !== inspectedReplica.id);
                    const mismatched = peer && peer.data.get(key) !== value;
                    return (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-[#F4F0E8]">{key}</span>
                        <span className={mismatched ? 'text-[#FB923C]' : 'text-[#34D399]'}>
                          {value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </WireTapInspector>
          )}

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={compareRoots}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Compare Roots
            </button>
            <button
              onClick={() => mutateKey('R0')}
              className="w-full px-3 py-2 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
            >
              Mutate Replica R0
            </button>
            <p className="text-xs text-slate-400">
              Compare triggers subtree checks and leaf syncs.
            </p>
          </div>

          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-64 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Replica Data</h3>
            <div className="space-y-2">
              {replicas.map((replica) => (
                <div key={`data-${replica.id}`} className="text-xs">
                  <div className="font-semibold text-white mb-1">{replica.id}</div>
                  <div className="pl-2 space-y-1 text-slate-300">
                    {Array.from(replica.data.entries()).map(([key, value]) => (
                      <div key={`${replica.id}-${key}`}>
                        {key}: <span className="text-green-400">{value}</span>
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
                <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                <span className="text-slate-400">Root compare</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                <span className="text-slate-400">Subtree compare</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#34D399]" />
                <span className="text-slate-400">Leaf sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['merkle-anti-entropy'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['merkle-anti-entropy'].sections.map((section) => (
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
