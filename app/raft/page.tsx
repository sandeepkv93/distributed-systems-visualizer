'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RaftAlgorithm } from '@/lib/algorithms/raft';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { raftScenarios } from '@/visualizers/raft/scenarios';
import { RaftNode as RaftNodeType, RaftMessage } from '@/lib/types';
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

export default function RaftPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [raft] = useState(() => new RaftAlgorithm(5));
  const [nodes, setNodes] = useState<RaftNodeType[]>(raft.getNodes());
  const [messages, setMessages] = useState<RaftMessage[]>([]);
  const [partitions, setPartitions] = useState<string[][]>([]);
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

  // Update visualization from algorithm state
  const updateVisualization = useCallback(() => {
    setNodes([...raft.getNodes()]);
    setMessages([...raft.getMessages()]);
    setPartitions(raft.getPartitions());
  }, [raft]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => raft.serialize(),
      restore: (snapshot) => {
        raft.restore(snapshot);
        updateVisualization();
      },
    },
  });

  useScenarioCompletion('raft', selectedScenario, simulation.state);

  // Handle events
  useEffect(() => {
    const runWithChaos = (
      filterType: RaftMessage['type'],
      deliverAction: () => void
    ) => {
      const execute = () => {
        const { dropRate } = chaosRef.current;
        if (dropRate > 0) {
          const pending = raft
            .getMessages()
            .filter((m) => m.type === filterType && m.status === 'in-flight');
          const { dropped } = applyChaosToMessages(pending, dropRate);
          if (dropped.length > 0) {
            setDroppedCount((c) => c + dropped.length);
          }
        }
        deliverAction();
        updateVisualization();
      };

      const { delayMultiplier } = chaosRef.current;
      if (delayMultiplier > 1) {
        simulation.scheduleTimeout(execute, computeDeliveryDelay(280, delayMultiplier));
      } else {
        execute();
      }
    };

    simulation.onEvent('start_election', (event) => {
      raft.startElection(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('request_vote', () => {
      runWithChaos('RequestVote', () => raft.processRequestVotes());
    });

    simulation.onEvent('vote_response', () => {
      runWithChaos('RequestVoteResponse', () => raft.processVoteResponses());
    });

    simulation.onEvent('leader_elected', () => {
      raft.finalizeElection();
      updateVisualization();
    });

    simulation.onEvent('network_partition', (event) => {
      if (Array.isArray(event.data?.partition)) {
        raft.partitionNetwork(event.data.partition);
      }
      updateVisualization();
    });

    simulation.onEvent('heal_partition', () => {
      raft.healPartition();
      updateVisualization();
    });

    simulation.onEvent('fail_node', (event) => {
      raft.failNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('recover_node', (event) => {
      raft.recoverNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('client_request', (event) => {
      raft.addClientRequest(event.data.leaderId, event.data.command);
      updateVisualization();
    });

    simulation.onEvent('replicate_log', () => {
      raft.replicatePendingLogs();
      updateVisualization();
    });

    simulation.onEvent('catch_up', (event) => {
      if (event.data?.nodeId) {
        raft.catchUpNode(event.data.nodeId);
      }
      updateVisualization();
    });
  }, [raft, simulation, updateVisualization]);

  // Handle scenario selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = raftScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      raft.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  // Handle manual election trigger
  const triggerElection = (nodeId: string) => {
    raft.startElection(nodeId);
    updateVisualization();
  };

  // Handle node fail/recover toggle
  const toggleNodeHealth = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      if (node.status === 'healthy') {
        raft.failNode(nodeId);
      } else {
        raft.recoverNode(nodeId);
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
    ? messages.filter((m) => m.from === inspectedNode.id || m.to === inspectedNode.id).slice(-5)
    : [];

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      {/* Control Panel */}
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={raftScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          raft.reset();
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
          <div>
            <h1 className="text-2xl font-bold text-white">Raft Consensus Algorithm</h1>
            <p className="text-slate-400 text-sm mt-1">
              Leader election and log replication in distributed systems
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowArticle(true)}
                className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                Read the theory
              </button>
              {partitions.length > 0 && (
                <span className="px-3 py-1 text-xs font-semibold bg-amber-900/50 border border-amber-500 text-amber-300 rounded">
                  Partition Active:{' '}
                  {partitions
                    .map((group) => `[${group.map((id) => id.replace('node-', 'N')).join(', ')}]`)
                    .join(' | ')}
                </span>
              )}
            </div>
          </div>
          <ExportMenu
            svgRef={svgRef}
            concept="Raft Consensus"
            currentState={{
              nodes: nodes.map((n) => ({
                id: n.id,
                state: n.state,
                term: n.term,
                logLength: n.log.length,
                status: n.status,
              })),
              partitions,
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
            <svg ref={svgRef} viewBox="0 0 840 640" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
              <ScopeDefs idPrefix="raft" />

              {/* Subtle cluster topology mesh */}
              {nodes.map((a, i) =>
                nodes.slice(i + 1).map((b) => {
                  const aPart = partitions.findIndex((g) => g.includes(a.id));
                  const bPart = partitions.findIndex((g) => g.includes(b.id));
                  const severed = partitions.length > 0 && aPart !== bPart;
                  return (
                    <line
                      key={`mesh-${a.id}-${b.id}`}
                      x1={a.position.x}
                      y1={a.position.y}
                      x2={b.position.x}
                      y2={b.position.y}
                      stroke={severed ? 'rgba(217, 68, 30, 0.16)' : SCOPE_COLORS.hairlineSubtle}
                      strokeWidth="1"
                      strokeDasharray={severed ? '4 6' : undefined}
                    />
                  );
                })
              )}

              {/* Draw animated directional messages */}
              <AnimatePresence>
                {messages.map((message) => {
                  const fromNode = nodes.find((n) => n.id === message.from);
                  const toNode = nodes.find((n) => n.id === message.to);
                  if (!fromNode || !toNode) return null;

                  const isVote = message.type === 'RequestVote';
                  const isAppend = message.type === 'AppendEntries';
                  const color = isVote
                    ? SCOPE_COLORS.amber
                    : isAppend
                    ? SCOPE_COLORS.cobalt
                    : SCOPE_COLORS.emerald;
                  const markerKey = isVote ? 'amber' : isAppend ? 'cobalt' : 'emerald';
                  const shortLabel = isVote ? 'RV' : isAppend ? 'AE' : 'ACK';

                  return (
                    <ScopeEdge
                      key={message.id}
                      idPrefix="raft"
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      color={color}
                      markerKey={markerKey}
                      inset={44}
                      label={shortLabel}
                      dashed={isVote}
                    />
                  );
                })}
              </AnimatePresence>

              {/* Draw double-ring oscilloscope nodes */}
              {nodes.map((node) => {
                const isFailed = node.status === 'failed';
                const isLeader = !isFailed && node.state === 'leader';
                const isCandidate = !isFailed && node.state === 'candidate';

                const accentColor = isFailed
                  ? SCOPE_COLORS.danger
                  : isLeader
                  ? SCOPE_COLORS.signal
                  : isCandidate
                  ? SCOPE_COLORS.amber
                  : SCOPE_COLORS.emerald;

                const partitionIndex = partitions.findIndex((group) => group.includes(node.id));
                const haloColor =
                  partitionIndex === 0
                    ? SCOPE_COLORS.amber
                    : partitionIndex === 1
                    ? SCOPE_COLORS.cobalt
                    : undefined;

                const nodeNum = node.id.replace('node-', '');
                const bottomLine2 =
                  isCandidate
                    ? `LOG ${node.log.length} · VOTES ${node.votesReceived}`
                    : `LOG ${node.log.length} · CMT ${node.commitIndex}`;

                return (
                  <ScopeNode
                    key={node.id}
                    x={node.position.x}
                    y={node.position.y}
                    radius={38}
                    label={`N${nodeNum}`}
                    sublabel={isFailed ? 'OFFLINE' : `T${node.term}`}
                    topTag={isFailed ? 'FAILED' : node.state.toUpperCase()}
                    bottomLine1={`TERM ${node.term}`}
                    bottomLine2={bottomLine2}
                    accentColor={accentColor}
                    failed={isFailed}
                    highlighted={isLeader}
                    selected={selectedNodeId === node.id}
                    haloColor={haloColor}
                    onClick={() => handleNodeClick(node.id)}
                  />
                );
              })}
            </svg>
          ) : (
            <SpaceTimeScope
              svgRef={svgRef}
              idPrefix="raft-st"
              title="Raft Consensus"
              actors={nodes.map((n) => ({
                id: n.id,
                label: `N${n.id.replace('node-', '')}`,
                sublabel: n.status === 'failed' ? 'OFFLINE' : `${n.state.slice(0, 4).toUpperCase()} T${n.term}`,
                color:
                  n.status === 'failed'
                    ? SCOPE_COLORS.danger
                    : n.state === 'leader'
                    ? SCOPE_COLORS.signal
                    : n.state === 'candidate'
                    ? SCOPE_COLORS.amber
                    : SCOPE_COLORS.emerald,
                failed: n.status === 'failed',
              }))}
              frames={messages.map((m) => ({
                id: m.id,
                from: m.from,
                to: m.to,
                label:
                  m.type === 'RequestVote'
                    ? `RV(T${m.payload.term})`
                    : m.type === 'AppendEntries'
                    ? `AE(T${m.payload.term})`
                    : m.type === 'RequestVoteResponse'
                    ? 'VoteAck'
                    : 'AppendAck',
                sublabel: `term ${m.payload.term}`,
                color:
                  m.type === 'RequestVote'
                    ? SCOPE_COLORS.amber
                    : m.type === 'AppendEntries'
                    ? SCOPE_COLORS.cobalt
                    : SCOPE_COLORS.emerald,
                status: m.status,
                dashed: m.type === 'RequestVote',
              }))}
            />
          )}

          {scopeMode === 'topology' && !inspectedNode && (
            <WireTapHint text="Click any node to inspect log & state" />
          )}

          {inspectedNode && (
            <WireTapInspector
              title={`NODE N${inspectedNode.id.replace('node-', '')}`}
              subtitle={`${inspectedNode.state.toUpperCase()} · ${inspectedNode.status.toUpperCase()}`}
              status={
                inspectedNode.status === 'failed'
                  ? 'failed'
                  : inspectedNode.state === 'leader'
                  ? 'leader'
                  : inspectedNode.state === 'candidate'
                  ? 'candidate'
                  : 'healthy'
              }
              metrics={[
                { label: 'Term', value: inspectedNode.term, tone: 'cobalt' },
                {
                  label: 'Commit Index',
                  value: inspectedNode.commitIndex,
                  tone: inspectedNode.commitIndex > 0 ? 'emerald' : 'default',
                },
                {
                  label: 'Voted For',
                  value: inspectedNode.votedFor ? inspectedNode.votedFor.replace('node-', 'N') : '—',
                },
                {
                  label: 'Votes',
                  value: inspectedNode.votesReceived,
                  tone: inspectedNode.votesReceived > 0 ? 'amber' : 'default',
                },
              ]}
              actions={[
                {
                  label: inspectedNode.status === 'healthy' ? 'Crash Node' : 'Recover Node',
                  onClick: () => toggleNodeHealth(inspectedNode.id),
                  variant: inspectedNode.status === 'healthy' ? 'danger' : 'emerald',
                },
                {
                  label: 'Start Election',
                  onClick: () => triggerElection(inspectedNode.id),
                  variant: 'signal',
                  disabled: inspectedNode.status === 'failed',
                },
              ]}
              onClose={() => setSelectedNodeId(null)}
            >
              <div className="space-y-2.5">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                    Replicated Log ({inspectedNode.log.length})
                  </div>
                  {inspectedNode.log.length === 0 ? (
                    <div className="text-[#6E6B62]">Empty log</div>
                  ) : (
                    <div className="space-y-1">
                      {inspectedNode.log.map((entry) => {
                        const committed = entry.index <= inspectedNode.commitIndex;
                        return (
                          <div
                            key={`${entry.index}-${entry.term}`}
                            className="flex items-center justify-between gap-2 px-2 py-1 bg-[#0E1110] border border-[rgba(244,240,232,0.1)]"
                          >
                            <span className="text-[#9E9B90]">
                              #{entry.index} T{entry.term}
                            </span>
                            <span className="text-[#F4F0E8] truncate flex-1">{entry.command}</span>
                            <span
                              className={`text-[9px] uppercase ${
                                committed ? 'text-[#34D399]' : 'text-[#FBBF24]'
                              }`}
                            >
                              {committed ? 'CMT' : 'UNCMT'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {inspectedMessages.length > 0 && (
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90] mb-1">
                      Active Wire Frames ({inspectedMessages.length})
                    </div>
                    <div className="space-y-1">
                      {inspectedMessages.map((msg) => (
                        <div key={msg.id} className="text-[10px] text-[#D6D2C7] truncate">
                          {msg.from.replace('node-', 'N')} → {msg.to.replace('node-', 'N')} ·{' '}
                          <span className="text-[#60A5FA]">{msg.type}</span>
                        </div>
                      ))}
                    </div>
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
                onClick={() => triggerElection('node-0')}
                className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Trigger Election (Node 0)
              </button>
              <button
                onClick={() => {
                  raft.finalizeElection();
                  updateVisualization();
                }}
                className="w-full px-3 py-1 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
              >
                Process Votes
              </button>
              <button
                onClick={() => {
                  const leader = nodes.find((n) => n.state === 'leader');
                  if (leader) {
                    raft.addClientRequest(leader.id, `SET x=${Date.now()}`);
                    raft.replicatePendingLogs();
                    updateVisualization();
                  }
                }}
                className="w-full px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                disabled={!nodes.some((n) => n.state === 'leader')}
              >
                Add Client Request
              </button>
              <p className="text-xs text-slate-400 mt-2">Click any node to inspect or crash/recover</p>
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
        title={topicArticles.raft.title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles.raft.sections.map((section) => (
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
