'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConsensusVariantsAlgorithm } from '@/lib/algorithms/consensusVariants';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { consensusVariantsScenarios } from '@/visualizers/consensus-variants/scenarios';
import { ConsensusMessage, ConsensusNode, ConsensusVariant } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import InvariantMonitor from '@/components/InvariantMonitor';
import WireLogDrawer from '@/components/WireLogDrawer';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import { evaluateConsensusVariantInvariants } from '@/lib/invariants';
import ChaosStrip from '@/components/ChaosStrip';
import {
  ChaosConfig,
  DEFAULT_CHAOS_CONFIG,
  applyChaosToMessages,
  computeDeliveryDelay,
} from '@/lib/chaos';

const variantLabels: Record<ConsensusVariant, string> = {
  'raft-joint': 'Raft Joint Consensus',
  'multi-paxos': 'Multi-Paxos',
  epaxos: 'EPaxos',
};

export default function ConsensusVariantsPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [variants] = useState(() => new ConsensusVariantsAlgorithm(5));
  const [variant, setVariant] = useState<ConsensusVariant>('raft-joint');
  const [nodes, setNodes] = useState<ConsensusNode[]>(variants.getNodes('raft-joint'));
  const [messages, setMessages] = useState<ConsensusMessage[]>(variants.getMessages());
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
    setNodes([...variants.getNodes(variant)]);
    setMessages([...variants.getMessages()]);
  }, [variants, variant]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => variants.serialize(),
      restore: (snapshot) => {
        variants.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('consensus-variants', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = variants.getMessages().filter((m) => m.status === 'in-flight');
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
        survivors.forEach((msg) => variants.deliverMessage(msg.id));
        updateVisualization();
      }, delayMs);
    }
  }, [variants, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('elect_leader', (event) => {
      variants.electLeader(event.data.variant, event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('joint_start', (event) => {
      variants.startJointConsensus(event.data.newConfigIds);
      updateVisualization();
    });

    simulation.onEvent('joint_end', () => {
      variants.finalizeJointConsensus();
      updateVisualization();
    });

    simulation.onEvent('append', (event) => {
      variants.appendEntry(event.data.variant, event.data.value);
      updateVisualization();
    });

    simulation.onEvent('multi_paxos', (event) => {
      variants.proposeMultiPaxos(event.data.value);
      updateVisualization();
    });

    simulation.onEvent('epaxos', (event) => {
      variants.proposeEPaxos(event.data.value, event.data.path);
      updateVisualization();
    });
  }, [variants, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = consensusVariantsScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      variants.reset();
      const nextVariant = scenario.initialState.variant as ConsensusVariant;
      setVariant(nextVariant);
      simulation.setEvents(scenario.events);
      setNodes([...variants.getNodes(nextVariant)]);
      setMessages([...variants.getMessages()]);
    }
  };

  const electLeader = (nodeId?: string) => {
    const targetId = nodeId ?? nodes[0]?.id;
    if (!targetId) return;
    variants.electLeader(variant, targetId);
    updateVisualization();
  };

  const appendEntry = () => {
    variants.appendEntry(variant, `val-${Math.floor(Math.random() * 100)}`);
    updateVisualization();
  };

  const startJoint = () => {
    variants.startJointConsensus(['N0', 'N1', 'N2', 'N3']);
    updateVisualization();
  };

  const finalizeJoint = () => {
    variants.finalizeJointConsensus();
    updateVisualization();
  };

  const proposeFast = () => {
    variants.proposeEPaxos('X', 'fast');
    updateVisualization();
  };

  const proposeSlow = () => {
    variants.proposeEPaxos('Y', 'slow');
    updateVisualization();
  };

  const getNodeColor = (node: ConsensusNode): string => {
    if (node.role === 'leader') return SCOPE_COLORS.signal;
    if (node.role === 'proposer') return SCOPE_COLORS.amber;
    if (variant === 'raft-joint' && node.configPhase === 'joint') return SCOPE_COLORS.cobalt;
    return SCOPE_COLORS.emerald;
  };

  const stats = variants.getStats(variant);
  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={consensusVariantsScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          variants.reset();
          setVariant('raft-joint');
          setNodes([...variants.getNodes('raft-joint')]);
          setMessages([...variants.getMessages()]);
        }}
        onSpeedChange={simulation.setSpeed}
        currentEventIndex={simulation.state.currentEventIndex}
        events={simulation.state.events}
        onScenarioChange={handleScenarioChange}
        onJumpToStep={simulation.jumpToStep}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Consensus Variants</h1>
          <p className="text-slate-400 text-sm mt-1">
            Compare Raft joint consensus, Multi-Paxos, and EPaxos
          </p>
          <div className="mt-3">
            <button
              onClick={() => setShowArticle(true)}
              className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
            >
              Read the theory
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {(['raft-joint', 'multi-paxos', 'epaxos'] as ConsensusVariant[]).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setVariant(v);
                  setNodes([...variants.getNodes(v)]);
                  setMessages([...variants.getMessages()]);
                }}
                className={`px-3 py-1 rounded text-sm ${
                  variant === v ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                {variantLabels[v]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-6 mt-3 text-sm">
            <span className="text-slate-300">
              Nodes: <span className="font-semibold text-white">{stats.nodes}</span>
            </span>
            <span className="text-slate-300">
              Committed: <span className="font-semibold text-green-400">{stats.committed}</span>
            </span>
            {stats.configPhase && (
              <span className="text-slate-300">
                Config: <span className="font-semibold text-amber-400">{stats.configPhase}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Consensus Variant Properties"
            checks={evaluateConsensusVariantInvariants(nodes, variant)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Consensus Variants"
              currentState={{ scenario: selectedScenario, variant, stats }}
            />
          </div>

          <WireLogDrawer
            protocol={`Consensus Variants (${variant})`}
            scenario={selectedScenario}
            invariants={evaluateConsensusVariantInvariants(nodes, variant)}
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
          <svg ref={svgRef} viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="cvar" />

            {/* Mesh links */}
            {nodes.map((a, i) =>
              nodes.slice(i + 1).map((b) => (
                <line
                  key={`cv-mesh-${a.id}-${b.id}`}
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
                const isFast = variant === 'epaxos';
                return (
                  <ScopeEdge
                    key={message.id}
                    idPrefix="cvar"
                    x1={fromNode.position.x}
                    y1={fromNode.position.y}
                    x2={toNode.position.x}
                    y2={toNode.position.y}
                    color={isFast ? SCOPE_COLORS.emerald : SCOPE_COLORS.cobalt}
                    markerKey={isFast ? 'emerald' : 'cobalt'}
                    inset={46}
                    label={message.type.slice(0, 8).toUpperCase()}
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
                sublabel={node.role.toUpperCase()}
                topTag={
                  variant === 'raft-joint' && node.configPhase
                    ? `CFG ${node.configPhase.toUpperCase()}`
                    : variantLabels[variant].toUpperCase()
                }
                bottomLine1={`COMMIT #${node.committedIndex} · LOG ${node.log.length}`}
                accentColor={getNodeColor(node)}
                haloColor={
                  variant === 'raft-joint' && node.configPhase === 'joint'
                    ? SCOPE_COLORS.amber
                    : undefined
                }
                highlighted={node.role === 'leader' || node.role === 'proposer'}
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
              title={`CONSENSUS VARIANTS · ${variantLabels[variant].toUpperCase()} TRACE`}
              idPrefix="cvar-st"
              actors={nodes.map((node) => ({
                id: node.id,
                label: node.id,
                sublabel: node.role.toUpperCase(),
                color: getNodeColor(node),
              }))}
              frames={messages.map((msg) => ({
                id: msg.id,
                from: msg.from,
                to: msg.to,
                label: msg.type,
                color: SCOPE_COLORS.cobalt,
                status: msg.status,
              }))}
            />
          )}

          {!inspectedNode && <WireTapHint text="Click any replica to inspect consensus variant role & commits" />}

          {inspectedNode && (
            <WireTapInspector
              title={`REPLICA ${inspectedNode.id}`}
              subtitle={variantLabels[variant].toUpperCase()}
              status={
                inspectedNode.role === 'leader'
                  ? 'leader'
                  : inspectedNode.role === 'proposer'
                  ? 'candidate'
                  : 'healthy'
              }
              className="top-14 left-4"
              metrics={[
                { label: 'Role', value: inspectedNode.role.toUpperCase(), tone: 'signal' },
                { label: 'Commit Idx', value: inspectedNode.committedIndex, tone: 'emerald' },
                {
                  label: 'Config Phase',
                  value: inspectedNode.configPhase ? inspectedNode.configPhase.toUpperCase() : 'STABLE',
                  tone: 'amber',
                },
                { label: 'Term / Log', value: `T${inspectedNode.term} · ${inspectedNode.log.length}`, tone: 'cobalt' },
              ]}
              actions={[
                {
                  label: 'Elect Leader',
                  onClick: () => electLeader(inspectedNode.id),
                  variant: 'signal',
                },
                {
                  label: 'Append Entry',
                  onClick: appendEntry,
                  variant: 'emerald',
                },
              ]}
              onClose={() => setSelectedNodeId(null)}
            />
          )}

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={() => electLeader()}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Elect Leader
            </button>
            <button
              onClick={appendEntry}
              className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Append Entry
            </button>
            {variant === 'raft-joint' && (
              <>
                <button
                  onClick={startJoint}
                  className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
                >
                  Start Joint Config
                </button>
                <button
                  onClick={finalizeJoint}
                  className="w-full px-3 py-2 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
                >
                  Finalize Config
                </button>
              </>
            )}
            {variant === 'epaxos' && (
              <>
                <button
                  onClick={proposeFast}
                  className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  EPaxos Fast Path
                </button>
                <button
                  onClick={proposeSlow}
                  className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  EPaxos Slow Path
                </button>
              </>
            )}
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
        title={topicArticles['consensus-variants'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['consensus-variants'].sections.map((section) => (
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
