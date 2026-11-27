'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TwoPhaseCommitAlgorithm } from '@/lib/algorithms/twoPhaseCommit';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import InvariantMonitor from '@/components/InvariantMonitor';
import WireLogDrawer from '@/components/WireLogDrawer';
import { evaluateTwoPhaseCommitInvariants } from '@/lib/invariants';
import { twoPhaseCommitScenarios } from '@/visualizers/two-phase-commit/scenarios';
import { TwoPhaseCommitNode, TwoPhaseCommitMessage } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import ChaosStrip from '@/components/ChaosStrip';
import {
  ChaosConfig,
  DEFAULT_CHAOS_CONFIG,
  applyChaosToMessages,
} from '@/lib/chaos';

export default function TwoPhaseCommitPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tpc] = useState(() => new TwoPhaseCommitAlgorithm(3));
  const [coordinator, setCoordinator] = useState<TwoPhaseCommitNode>(tpc.getCoordinator());
  const [participants, setParticipants] = useState<TwoPhaseCommitNode[]>(tpc.getParticipants());
  const [messages, setMessages] = useState<TwoPhaseCommitMessage[]>(tpc.getMessages());
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

  // Update visualization
  const updateVisualization = useCallback(() => {
    const { dropRate } = chaosRef.current;
    if (dropRate > 0) {
      const inFlight = tpc.getMessages().filter((m) => m.status === 'in-flight');
      if (inFlight.length > 0) {
        const { dropped } = applyChaosToMessages(inFlight, dropRate);
        if (dropped.length > 0) {
          setDroppedCount((c) => c + dropped.length);
        }
      }
    }
    setCoordinator({ ...tpc.getCoordinator() });
    setParticipants([...tpc.getParticipants()]);
    setMessages([...tpc.getMessages()]);
  }, [tpc]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => tpc.serialize(),
      restore: (snapshot) => {
        tpc.restore(snapshot);
        updateVisualization();
      },
    },
  });

  useScenarioCompletion('two-phase-commit', selectedScenario, simulation.state);

  // Handle events
  useEffect(() => {
    simulation.onEvent('start_transaction', () => {
      tpc.startTransaction();
      updateVisualization();
    });

    simulation.onEvent('send_vote_requests', () => {
      // Already handled in start_transaction
      updateVisualization();
    });

    simulation.onEvent('participant_vote', (event) => {
      tpc.participantVote(event.data.participantId, event.data.vote);
      updateVisualization();
    });

    simulation.onEvent('coordinator_decide', () => {
      tpc.coordinatorDecide();
      updateVisualization();
    });

    simulation.onEvent('participant_finalize', (event) => {
      tpc.participantFinalize(event.data.participantId, event.data.decision);
      updateVisualization();
    });

    simulation.onEvent('coordinator_complete', () => {
      tpc.coordinatorComplete();
      updateVisualization();
    });

    simulation.onEvent('fail_participant', (event) => {
      tpc.failParticipant(event.data.participantId);
      updateVisualization();
    });

    simulation.onEvent('recover_participant', (event) => {
      tpc.recoverParticipant(event.data.participantId);
      updateVisualization();
    });

    simulation.onEvent('timeout', () => {
      tpc.handleTimeout();
      updateVisualization();
    });

    simulation.onEvent('fail_coordinator', () => {
      const coord = tpc.getCoordinator();
      coord.status = 'failed';
      updateVisualization();
    });

    simulation.onEvent('send_aborts', () => {
      // Visual only
      updateVisualization();
    });

    simulation.onEvent('all_participants_finalize', (event) => {
      tpc.getParticipants().forEach((p) => {
        if (p.status === 'healthy') {
          tpc.participantFinalize(p.id, event.data.decision);
        }
      });
      updateVisualization();
    });

    simulation.onEvent('show_blocking', () => {
      // Visual indicator only
      updateVisualization();
    });

    simulation.onEvent('participant_query', () => {
      // Visual indicator only
      updateVisualization();
    });
  }, [tpc, simulation, updateVisualization]);

  // Handle scenario selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = twoPhaseCommitScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      tpc.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  // Manual controls
  const startTransaction = () => {
    tpc.reset();
    tpc.startTransaction();
    updateVisualization();
  };

  const voteYes = (participantId: string) => {
    tpc.participantVote(participantId, 'yes');
    simulation.scheduleTimeout(() => {
      const decision = tpc.coordinatorDecide();
      if (decision !== 'waiting') {
        simulation.scheduleTimeout(() => {
          tpc.getParticipants().forEach((p) => {
            if (p.status === 'healthy') {
              tpc.participantFinalize(p.id, decision);
            }
          });
          tpc.coordinatorComplete();
          updateVisualization();
        }, 500);
      }
      updateVisualization();
    }, 200);
    updateVisualization();
  };

  const voteNo = (participantId: string) => {
    tpc.participantVote(participantId, 'no');
    simulation.scheduleTimeout(() => {
      const decision = tpc.coordinatorDecide();
      if (decision !== 'waiting') {
        simulation.scheduleTimeout(() => {
          tpc.getParticipants().forEach((p) => {
            if (p.status === 'healthy') {
              tpc.participantFinalize(p.id, decision);
            }
          });
          tpc.coordinatorComplete();
          updateVisualization();
        }, 500);
      }
      updateVisualization();
    }, 200);
    updateVisualization();
  };

  const failParticipant = (participantId: string) => {
    tpc.failParticipant(participantId);
    updateVisualization();
  };

  const recoverParticipant = (participantId: string) => {
    tpc.recoverParticipant(participantId);
    updateVisualization();
  };

  // Get node color based on state
  const getNodeColor = (node: TwoPhaseCommitNode): string => {
    if (node.status === 'failed') return SCOPE_COLORS.danger;

    switch (node.state) {
      case 'preparing':
      case 'prepared':
        return SCOPE_COLORS.amber;
      case 'committing':
        return SCOPE_COLORS.cobalt;
      case 'committed':
        return SCOPE_COLORS.emerald;
      case 'aborting':
      case 'aborted':
        return SCOPE_COLORS.signal;
      default:
        return SCOPE_COLORS.inkMuted;
    }
  };

  // Get message color
  const getMessageColor = (message: TwoPhaseCommitMessage): string => {
    switch (message.type) {
      case 'VoteRequest':
        return SCOPE_COLORS.amber;
      case 'VoteYes':
        return SCOPE_COLORS.emerald;
      case 'VoteNo':
        return SCOPE_COLORS.danger;
      case 'Commit':
        return SCOPE_COLORS.cobalt;
      case 'Abort':
        return SCOPE_COLORS.signal;
      default:
        return SCOPE_COLORS.inkMuted;
    }
  };

  const getMessageMarker = (
    message: TwoPhaseCommitMessage
  ): 'amber' | 'emerald' | 'danger' | 'cobalt' | 'signal' | 'muted' => {
    switch (message.type) {
      case 'VoteRequest':
        return 'amber';
      case 'VoteYes':
        return 'emerald';
      case 'VoteNo':
        return 'danger';
      case 'Commit':
        return 'cobalt';
      case 'Abort':
        return 'signal';
      default:
        return 'muted';
    }
  };

  const stats = tpc.getStats();
  const allNodes = [coordinator, ...participants];
  const inspectedNode = selectedNodeId
    ? allNodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      {/* Control Panel */}
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={twoPhaseCommitScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          tpc.reset();
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
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Two-Phase Commit (2PC)</h1>
          <p className="text-slate-400 text-sm mt-1">
            Distributed transaction protocol ensuring atomic commitment across nodes
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
              Participants:{' '}
              <span className="font-semibold text-white">{stats.totalParticipants}</span>
            </span>
            <span className="text-slate-300">
              Healthy:{' '}
              <span className="font-semibold text-green-400">{stats.healthyParticipants}</span>
            </span>
            <span className="text-slate-300">
              YES Votes: <span className="font-semibold text-green-400">{stats.yesVotes}</span>
            </span>
            <span className="text-slate-300">
              NO Votes: <span className="font-semibold text-red-400">{stats.noVotes}</span>
            </span>
            <span className="text-slate-300">
              Outcome:{' '}
              <span
                className={`font-semibold ${
                  stats.transactionOutcome === 'committed'
                    ? 'text-green-400'
                    : stats.transactionOutcome === 'aborted'
                      ? 'text-red-400'
                      : 'text-amber-400'
                }`}
              >
                {stats.transactionOutcome.toUpperCase()}
              </span>
            </span>
          </div>
        </div>

        {/* Visualization Canvas */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Two-Phase Commit (2PC)"
              currentState={{ scenario: selectedScenario }}
            />
          </div>

          <InvariantMonitor
            protocolLabel="2PC Atomicity & Liveness"
            checks={evaluateTwoPhaseCommitInvariants(coordinator, participants)}
          />

          <WireLogDrawer
            protocol="Two-Phase Commit"
            scenario={selectedScenario}
            invariants={evaluateTwoPhaseCommitInvariants(coordinator, participants)}
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
            <svg ref={svgRef} role="group" aria-label="Two-phase commit coordinator and participant prepare-commit topology diagram" viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
              <ScopeDefs idPrefix="tpc" />

              {/* Coordinator-to-participant topology links */}
              {participants.map((p) => (
                <line
                  key={`tpc-link-${p.id}`}
                  x1={coordinator.position.x}
                  y1={coordinator.position.y}
                  x2={p.position.x}
                  y2={p.position.y}
                  stroke={SCOPE_COLORS.hairlineSubtle}
                  strokeWidth="1.2"
                />
              ))}

              {/* Animated directional messages */}
              {messages
                .filter((m) => m.status === 'in-flight')
                .map((message) => {
                  const fromNode =
                    message.from === 'coordinator'
                      ? coordinator
                      : participants.find((p) => p.id === message.from);
                  const toNode =
                    message.to === 'coordinator'
                      ? coordinator
                      : participants.find((p) => p.id === message.to);
                  if (!fromNode || !toNode) return null;

                  return (
                    <ScopeEdge
                      key={message.id}
                      idPrefix="tpc"
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      color={getMessageColor(message)}
                      markerKey={getMessageMarker(message)}
                      inset={44}
                      label={message.type}
                      dashed={message.type === 'VoteRequest'}
                    />
                  );
                })}

              {/* Coordinator */}
              <ScopeNode
                x={coordinator.position.x}
                y={coordinator.position.y}
                radius={44}
                label="COORD"
                sublabel={coordinator.status === 'failed' ? 'OFFLINE' : coordinator.state.toUpperCase()}
                topTag="COORDINATOR"
                bottomLine1={`OUTCOME ${stats.transactionOutcome.toUpperCase()}`}
                accentColor={getNodeColor(coordinator)}
                failed={coordinator.status === 'failed'}
                highlighted
                selected={selectedNodeId === coordinator.id}
                onClick={() =>
                  setSelectedNodeId((prev) => (prev === coordinator.id ? null : coordinator.id))
                }
              />

              {/* Participants */}
              {participants.map((participant) => {
                const isFailed = participant.status === 'failed';
                return (
                  <ScopeNode
                    key={participant.id}
                    x={participant.position.x}
                    y={participant.position.y}
                    radius={38}
                    label={`P${participant.id.split('-')[1]}`}
                    sublabel={isFailed ? 'OFFLINE' : participant.state.toUpperCase()}
                    topTag={participant.vote ? `VOTE ${participant.vote.toUpperCase()}` : 'PARTICIPANT'}
                    bottomLine1={participant.id}
                    accentColor={getNodeColor(participant)}
                    failed={isFailed}
                    highlighted={participant.state === 'committed'}
                    selected={selectedNodeId === participant.id}
                    onClick={() =>
                      setSelectedNodeId((prev) => (prev === participant.id ? null : participant.id))
                    }
                  />
                );
              })}
            </svg>
          ) : (
            <SpaceTimeScope
              svgRef={svgRef}
              idPrefix="tpc-st"
              title="Two-Phase Commit"
              actors={[
                {
                  id: coordinator.id,
                  label: 'COORD',
                  sublabel: coordinator.status === 'failed' ? 'OFFLINE' : coordinator.state.toUpperCase(),
                  color: getNodeColor(coordinator),
                  failed: coordinator.status === 'failed',
                },
                ...participants.map((p) => ({
                  id: p.id,
                  label: `P${p.id.split('-')[1]}`,
                  sublabel: p.status === 'failed' ? 'OFFLINE' : p.state.toUpperCase(),
                  color: getNodeColor(p),
                  failed: p.status === 'failed',
                })),
              ]}
              frames={messages.map((m) => ({
                id: m.id,
                from: m.from,
                to: m.to,
                label: m.type,
                sublabel: m.payload.transactionId,
                color: getMessageColor(m),
                status: m.status,
                dashed: m.type === 'VoteRequest',
              }))}
            />
          )}

          {scopeMode === 'topology' && !inspectedNode && (
            <WireTapHint text="Click coordinator or participant to open Wire Tap" />
          )}

          {inspectedNode && (
            <WireTapInspector
              title={inspectedNode.role === 'coordinator' ? 'COORDINATOR' : inspectedNode.id.toUpperCase()}
              subtitle={`${inspectedNode.state.toUpperCase()} · ${inspectedNode.status.toUpperCase()}`}
              status={
                inspectedNode.status === 'failed'
                  ? 'failed'
                  : inspectedNode.state === 'committed'
                  ? 'healthy'
                  : inspectedNode.state === 'aborted' || inspectedNode.state === 'aborting'
                  ? 'leader'
                  : 'candidate'
              }
              className="top-14 left-4"
              metrics={[
                { label: 'Phase State', value: inspectedNode.state.toUpperCase(), tone: 'amber' },
                {
                  label: 'Vote',
                  value: inspectedNode.vote ? inspectedNode.vote.toUpperCase() : '—',
                  tone:
                    inspectedNode.vote === 'yes'
                      ? 'emerald'
                      : inspectedNode.vote === 'no'
                      ? 'danger'
                      : 'default',
                },
                { label: 'YES / NO', value: `${stats.yesVotes} / ${stats.noVotes}`, tone: 'cobalt' },
                { label: 'Outcome', value: stats.transactionOutcome.toUpperCase() },
              ]}
              actions={
                inspectedNode.role === 'participant'
                  ? [
                      {
                        label: inspectedNode.status === 'failed' ? 'Recover' : 'Crash Node',
                        onClick: () =>
                          inspectedNode.status === 'failed'
                            ? recoverParticipant(inspectedNode.id)
                            : failParticipant(inspectedNode.id),
                        variant: inspectedNode.status === 'failed' ? 'emerald' : 'danger',
                      },
                      {
                        label: 'Vote YES',
                        onClick: () => voteYes(inspectedNode.id),
                        variant: 'emerald',
                        disabled: inspectedNode.status === 'failed' || inspectedNode.vote !== undefined,
                      },
                      {
                        label: 'Vote NO',
                        onClick: () => voteNo(inspectedNode.id),
                        variant: 'signal',
                        disabled: inspectedNode.status === 'failed' || inspectedNode.vote !== undefined,
                      },
                    ]
                  : [
                      {
                        label: 'Start Transaction',
                        onClick: startTransaction,
                        variant: 'signal',
                      },
                    ]
              }
              onClose={() => setSelectedNodeId(null)}
            />
          )}

          {/* Manual controls */}
          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white mb-2">Manual Controls</h3>

            <button
              onClick={startTransaction}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 mb-3"
            >
              Start New Transaction
            </button>

            <div className="border-t border-slate-700 pt-2">
              <p className="text-xs text-slate-400 mb-2">Participant Votes:</p>
              {participants.map((p) => (
                <div key={p.id} className="flex gap-2 mb-2">
                  <button
                    onClick={() => voteYes(p.id)}
                    disabled={p.status === 'failed' || p.vote !== undefined}
                    className="flex-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {p.id} YES
                  </button>
                  <button
                    onClick={() => voteNo(p.id)}
                    disabled={p.status === 'failed' || p.vote !== undefined}
                    className="flex-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {p.id} NO
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-2 mt-2">
              <p className="text-xs text-slate-400 mb-1">Click any node to inspect or fail/recover</p>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">States</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#9E9B90]" />
                <span className="text-slate-300">INIT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                <span className="text-slate-300">PREPARING / PREPARED</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                <span className="text-slate-300">COMMITTING</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#34D399]" />
                <span className="text-slate-300">COMMITTED</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#D9441E]" />
                <span className="text-slate-300">ABORTED / FAILED</span>
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
        title={topicArticles['two-phase-commit'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['two-phase-commit'].sections.map((section) => (
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
