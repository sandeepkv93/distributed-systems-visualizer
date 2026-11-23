'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PaxosAlgorithm } from '@/lib/algorithms/paxos';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { paxosScenarios } from '@/visualizers/paxos/scenarios';
import { PaxosNode, PaxosMessage } from '@/lib/types';
import { AnimatePresence } from 'framer-motion';
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

export default function PaxosPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [paxos] = useState(() => new PaxosAlgorithm(2, 5, 2));
  const [nodes, setNodes] = useState<PaxosNode[]>(paxos.getAllNodes());
  const [messages, setMessages] = useState<PaxosMessage[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [decidedValue, setDecidedValue] = useState<any>(null);
  const [decidedValues, setDecidedValues] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('topology');
  const [chaos, setChaos] = useState<ChaosConfig>(DEFAULT_CHAOS_CONFIG);
  const [droppedCount, setDroppedCount] = useState(0);
  const chaosRef = useRef<ChaosConfig>(DEFAULT_CHAOS_CONFIG);

  const handleChaosChange = useCallback((next: ChaosConfig) => {
    chaosRef.current = next;
    setChaos(next);
  }, []);

  // Update visualization from algorithm state
  const updateVisualization = useCallback(() => {
    setNodes([...paxos.getAllNodes()]);
    setMessages([...paxos.getMessages()]);
    setDecidedValue(paxos.getDecidedValue());
    setDecidedValues(paxos.getDecidedValues());
  }, [paxos]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => paxos.serialize(),
      restore: (snapshot) => {
        paxos.restore(snapshot);
        updateVisualization();
      },
    },
  });

  useScenarioCompletion('paxos', selectedScenario, simulation.state);

  // Handle events (reading live messages from paxos instance to avoid stale closures)
  useEffect(() => {
    const deliverWithChaos = (
      type: PaxosMessage['type'],
      handler: (msg: PaxosMessage) => void
    ) => {
      const execute = () => {
        const pending = paxos
          .getMessages()
          .filter((m) => m.type === type && m.status === 'in-flight');
        const { dropRate } = chaosRef.current;
        const { survivors, dropped } =
          dropRate > 0
            ? applyChaosToMessages(pending, dropRate)
            : { survivors: pending, dropped: [] };
        if (dropped.length > 0) {
          setDroppedCount((c) => c + dropped.length);
        }
        survivors.forEach(handler);
        updateVisualization();
      };

      const { delayMultiplier } = chaosRef.current;
      if (delayMultiplier > 1) {
        simulation.scheduleTimeout(execute, computeDeliveryDelay(280, delayMultiplier));
      } else {
        execute();
      }
    };

    simulation.onEvent('start_proposal', (event) => {
      paxos.startProposal(
        event.data.proposerId,
        event.data.value,
        Boolean(event.data.newInstance)
      );
      updateVisualization();
    });

    simulation.onEvent('handle_prepare', () => {
      deliverWithChaos('Prepare', (msg) => paxos.handlePrepare(msg.id));
    });

    simulation.onEvent('handle_promise', (event) => {
      deliverWithChaos('Promise', (msg) => paxos.handlePromise(msg.id, event.data?.value));
    });

    simulation.onEvent('handle_accept', () => {
      deliverWithChaos('Accept', (msg) => paxos.handleAccept(msg.id));
    });

    simulation.onEvent('consensus_reached', (event) => {
      paxos.finalizeConsensus(event.data?.value);
      updateVisualization();
    });

    simulation.onEvent('fail_node', (event) => {
      paxos.failNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('recover_node', (event) => {
      paxos.recoverNode(event.data.nodeId);
      updateVisualization();
    });
  }, [paxos, simulation, updateVisualization]);

  // Handle scenario selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = paxosScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      paxos.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  // Handle node fail/recover toggle
  const toggleNodeHealth = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      if (node.status === 'healthy') {
        paxos.failNode(nodeId);
      } else {
        paxos.recoverNode(nodeId);
      }
      updateVisualization();
    }
  };

  // Handle node click (select in Wire Tap Inspector)
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;
  const inspectedMessages = inspectedNode
    ? messages
        .filter((m) => m.from === inspectedNode.id || m.to === inspectedNode.id)
        .slice(-5)
    : [];

  // Manual proposal
  const triggerProposal = (proposerId: string, value: string) => {
    paxos.startProposal(proposerId, value);
    updateVisualization();
  };

  // Get node color based on role and status
  const getNodeColor = (node: PaxosNode): string => {
    if (node.status === 'failed') return SCOPE_COLORS.danger;

    switch (node.role) {
      case 'proposer':
        return SCOPE_COLORS.cobalt;
      case 'acceptor':
        return node.acceptedValue
          ? SCOPE_COLORS.emerald
          : node.promisedProposal
          ? SCOPE_COLORS.amber
          : SCOPE_COLORS.inkMuted;
      case 'learner':
        return SCOPE_COLORS.signal;
      default:
        return SCOPE_COLORS.inkMuted;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      {/* Control Panel */}
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={paxosScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          paxos.reset();
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
        <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Paxos Consensus Algorithm</h1>
            <p className="text-slate-400 text-sm mt-1">
              Two-phase consensus with proposers, acceptors, and learners
            </p>
            <div className="mt-3">
              <button
                onClick={() => setShowArticle(true)}
                className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                Read the theory
              </button>
            </div>
            {decidedValues.length > 0 ? (
              <div className="mt-2 inline-block bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold">
                ✓ Consensus Reached: {decidedValues.join(', ')}
              </div>
            ) : (
              decidedValue && (
                <div className="mt-2 inline-block bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold">
                  ✓ Consensus Reached: {decidedValue}
                </div>
              )
            )}
          </div>
          <ExportMenu
            svgRef={svgRef}
            concept="Paxos Consensus"
            currentState={{
              proposers: paxos.getProposers().map((n) => ({
                id: n.id,
                status: n.status,
                proposalNumber: n.proposalNumber,
              })),
              acceptors: paxos.getAcceptors().map((n) => ({
                id: n.id,
                status: n.status,
                promisedProposal: n.promisedProposal,
                acceptedProposal: n.acceptedProposal,
                acceptedValue: n.acceptedValue,
              })),
              decidedValue,
              decidedValues,
              scenario: selectedScenario,
            }}
          />
        </div>

        {/* Visualization Canvas */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <ScopeModeToggle
            mode={scopeMode}
            onChange={setScopeMode}
            frameCount={messages.length}
          />

          {scopeMode === 'topology' ? (
            <svg ref={svgRef} viewBox="0 0 820 620" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
              <ScopeDefs idPrefix="paxos" />

              {/* Architectural role swimlanes */}
              {[
                { y: 100, label: 'PROPOSERS' },
                { y: 300, label: 'ACCEPTORS' },
                { y: 500, label: 'LEARNERS' },
              ].map((lane) => (
                <g key={lane.label} className="pointer-events-none">
                  <line
                    x1="18"
                    y1={lane.y}
                    x2="802"
                    y2={lane.y}
                    stroke={SCOPE_COLORS.hairlineSubtle}
                    strokeWidth="1"
                    strokeDasharray="3 5"
                  />
                  <text
                    x="22"
                    y={lane.y - 10}
                    fill={SCOPE_COLORS.inkMuted}
                    fontSize="10"
                    fontWeight="600"
                    letterSpacing="0.14em"
                  >
                    {lane.label}
                  </text>
                </g>
              ))}

              {/* Draw animated directional messages */}
              <AnimatePresence>
                {messages.map((message) => {
                  const fromNode = nodes.find((n) => n.id === message.from);
                  let toNodes: PaxosNode[] = [];

                  if (message.to === 'learners') {
                    toNodes = paxos.getLearners();
                  } else {
                    const toNode = nodes.find((n) => n.id === message.to);
                    if (toNode) toNodes = [toNode];
                  }

                  if (!fromNode || toNodes.length === 0) return null;

                  const isPhase1 = message.type === 'Prepare' || message.type === 'Promise';
                  const color = isPhase1 ? SCOPE_COLORS.cobalt : SCOPE_COLORS.amber;
                  const markerKey = isPhase1 ? 'cobalt' : 'amber';

                  return toNodes.map((toNode) => (
                    <ScopeEdge
                      key={`${message.id}-${toNode.id}`}
                      idPrefix="paxos"
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      color={color}
                      markerKey={markerKey}
                      inset={39}
                      dashed={isPhase1}
                    />
                  ));
                })}
              </AnimatePresence>

              {/* Draw double-ring oscilloscope nodes */}
              {nodes.map((node) => {
                const nodeColor = getNodeColor(node);
                const isFailed = node.status === 'failed';
                const shortId = `${node.id.split('-')[0][0].toUpperCase()}${node.id.split('-')[1]}`;

                let bottomLine1: string | undefined;
                let bottomLine2: string | undefined;

                if (node.role === 'proposer' && node.proposalNumber !== undefined && node.proposalNumber > 0) {
                  bottomLine1 = `PROP #${node.proposalNumber}`;
                } else if (node.role === 'acceptor') {
                  if (node.promisedProposal !== undefined && node.promisedProposal > 0) {
                    bottomLine1 = `PROM #${node.promisedProposal}`;
                  }
                  if (node.acceptedValue) {
                    bottomLine2 = `✓ ${node.acceptedValue}`;
                  }
                }

                return (
                  <ScopeNode
                    key={node.id}
                    x={node.position.x}
                    y={node.position.y}
                    radius={33}
                    label={shortId}
                    sublabel={isFailed ? 'DOWN' : node.role.slice(0, 3).toUpperCase()}
                    topTag={isFailed ? 'FAILED' : node.role.toUpperCase()}
                    bottomLine1={bottomLine1}
                    bottomLine2={bottomLine2}
                    accentColor={nodeColor}
                    failed={isFailed}
                    highlighted={Boolean(node.acceptedValue)}
                    selected={selectedNodeId === node.id}
                    onClick={() => handleNodeClick(node.id)}
                  />
                );
              })}
            </svg>
          ) : (
            <SpaceTimeScope
              svgRef={svgRef}
              idPrefix="paxos-st"
              title="Paxos Consensus"
              actors={nodes.map((n) => ({
                id: n.id,
                label: `${n.id.split('-')[0][0].toUpperCase()}${n.id.split('-')[1]}`,
                sublabel: n.status === 'failed' ? 'OFFLINE' : n.role.slice(0, 4).toUpperCase(),
                color: getNodeColor(n),
                failed: n.status === 'failed',
              }))}
              frames={messages.flatMap((m) => {
                const targets =
                  m.to === 'learners'
                    ? [paxos.getLearners()[0]?.id].filter((id): id is string => Boolean(id))
                    : [m.to];
                const isPhase1 = m.type === 'Prepare' || m.type === 'Promise';
                const isNack = m.type === 'Nack';
                return targets.map((targetId) => ({
                  id: `${m.id}-${targetId}`,
                  from: m.from,
                  to: targetId,
                  label: `${m.type}(#${m.payload.proposalNumber})`,
                  sublabel: m.payload.value !== undefined ? String(m.payload.value) : undefined,
                  color: isNack
                    ? SCOPE_COLORS.danger
                    : isPhase1
                    ? SCOPE_COLORS.cobalt
                    : SCOPE_COLORS.amber,
                  status: m.status,
                  dashed: isPhase1,
                }));
              })}
            />
          )}

          {scopeMode === 'topology' && !inspectedNode && (
            <WireTapHint text="Click any node to inspect Paxos tuples" />
          )}

          {inspectedNode && (
            <WireTapInspector
              title={inspectedNode.id.toUpperCase()}
              subtitle={`${inspectedNode.role.toUpperCase()} · ${inspectedNode.status.toUpperCase()}`}
              status={
                inspectedNode.status === 'failed'
                  ? 'failed'
                  : inspectedNode.acceptedValue
                  ? 'healthy'
                  : 'info'
              }
              metrics={[
                { label: 'Role', value: inspectedNode.role.toUpperCase(), tone: 'cobalt' },
                {
                  label: 'Proposal #',
                  value: inspectedNode.proposalNumber ?? '—',
                  tone: inspectedNode.proposalNumber ? 'amber' : 'default',
                },
                {
                  label: 'Promised #',
                  value: inspectedNode.promisedProposal ?? '—',
                  tone: inspectedNode.promisedProposal ? 'cobalt' : 'default',
                },
                {
                  label: 'Accepted',
                  value: inspectedNode.acceptedValue
                    ? `${inspectedNode.acceptedValue} (#${inspectedNode.acceptedProposal ?? '?'})`
                    : '—',
                  tone: inspectedNode.acceptedValue ? 'emerald' : 'default',
                },
              ]}
              actions={[
                {
                  label: inspectedNode.status === 'healthy' ? 'Crash Node' : 'Recover Node',
                  onClick: () => toggleNodeHealth(inspectedNode.id),
                  variant: inspectedNode.status === 'healthy' ? 'danger' : 'emerald',
                },
                ...(inspectedNode.role === 'proposer'
                  ? [
                      {
                        label: 'Send Proposal',
                        onClick: () =>
                          triggerProposal(inspectedNode.id, `Val-${Date.now() % 100}`),
                        variant: 'signal' as const,
                        disabled: inspectedNode.status === 'failed',
                      },
                    ]
                  : []),
              ]}
              onClose={() => setSelectedNodeId(null)}
            >
              <div>
                <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                  Wire Frames ({inspectedMessages.length})
                </div>
                {inspectedMessages.length === 0 ? (
                  <div className="text-[#6E6B62]">No recent messages</div>
                ) : (
                  <div className="space-y-1">
                    {inspectedMessages.map((msg) => (
                      <div key={msg.id} className="text-[10px] text-[#D6D2C7] truncate">
                        {msg.from} → {msg.to} ·{' '}
                        <span className="text-[#FBBF24]">{msg.type}</span>{' '}
                        (#{msg.payload.proposalNumber})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </WireTapInspector>
          )}

          {/* Manual controls overlay */}
          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Manual Controls</h3>
            <div className="space-y-2">
              <button
                onClick={() => triggerProposal('proposer-0', `Value-${Date.now() % 100}`)}
                className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Proposer 0: Propose
              </button>
              <button
                onClick={() => triggerProposal('proposer-1', `Value-${Date.now() % 100}`)}
                className="w-full px-3 py-1 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
              >
                Proposer 1: Propose
              </button>
              <p className="text-xs text-slate-400 mt-2">Click any node to inspect or crash/recover</p>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Wire Phases</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-[#60A5FA]" />
                <span className="text-slate-300">Phase 1 · Prepare / Promise</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-[#FBBF24]" />
                <span className="text-slate-300">Phase 2 · Accept / Accepted</span>
              </div>
            </div>
          </div>

          <ChaosStrip
            config={chaos}
            droppedCount={droppedCount}
            onChange={handleChaosChange}
            onResetDropped={() => setDroppedCount(0)}
          />
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles.paxos.title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles.paxos.sections.map((section) => (
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
