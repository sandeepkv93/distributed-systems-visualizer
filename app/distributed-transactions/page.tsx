'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DistributedTransactionsAlgorithm } from '@/lib/algorithms/distributedTransactions';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { distributedTransactionsScenarios } from '@/visualizers/distributed-transactions/scenarios';
import { TransactionMessage, TransactionParticipant, SagaStep } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';

export default function DistributedTransactionsPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transactions] = useState(() => new DistributedTransactionsAlgorithm(3));
  const [participants, setParticipants] = useState<TransactionParticipant[]>(
    transactions.getParticipants()
  );
  const [sagaSteps, setSagaSteps] = useState<SagaStep[]>(transactions.getSagaSteps());
  const [messages, setMessages] = useState<TransactionMessage[]>(transactions.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<
    { kind: 'participant'; id: string } | { kind: 'saga'; id: string } | null
  >(null);

  const syncVisualization = useCallback(() => {
    setParticipants([...transactions.getParticipants()]);
    setSagaSteps([...transactions.getSagaSteps()]);
    setMessages([...transactions.getMessages()]);
  }, [transactions]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => transactions.serialize(),
      restore: (snapshot) => {
        transactions.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('distributed-transactions', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = transactions.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      simulation.scheduleTimeout(() => {
        inFlight.forEach((msg) => transactions.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [transactions, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('start_3pc', () => {
      transactions.start3PC();
      updateVisualization();
    });

    simulation.onEvent('vote', (event) => {
      const votes = event.data.votes as Record<string, 'yes' | 'no'>;
      Object.entries(votes).forEach(([participantId, vote]) => {
        transactions.receiveVote(participantId, vote);
      });
      updateVisualization();
    });

    simulation.onEvent('decide_3pc', () => {
      transactions.decide3PC();
      updateVisualization();
    });

    simulation.onEvent('commit_3pc', () => {
      transactions.commit3PC();
      updateVisualization();
    });

    simulation.onEvent('start_saga', () => {
      transactions.startSaga();
      updateVisualization();
    });

    simulation.onEvent('saga_step', (event) => {
      transactions.completeSagaStep(event.data.stepId);
      updateVisualization();
    });

    simulation.onEvent('saga_compensate', (event) => {
      transactions.compensateSaga(event.data.stepId);
      updateVisualization();
    });
  }, [transactions, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = distributedTransactionsScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      transactions.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const start3PC = () => {
    transactions.start3PC();
    updateVisualization();
  };

  const voteYes = (participantId?: string) => {
    if (participantId) {
      transactions.receiveVote(participantId, 'yes');
    } else {
      participants.forEach((p) => transactions.receiveVote(p.id, 'yes'));
    }
    updateVisualization();
  };

  const voteNo = (participantId?: string) => {
    const targetId = participantId ?? participants[0]?.id;
    if (targetId) {
      transactions.receiveVote(targetId, 'no');
    }
    updateVisualization();
  };

  const decide3PC = () => {
    transactions.decide3PC();
    updateVisualization();
  };

  const commit3PC = () => {
    transactions.commit3PC();
    updateVisualization();
  };

  const startSaga = () => {
    transactions.startSaga();
    updateVisualization();
  };

  const completeStep = (stepId: string) => {
    transactions.completeSagaStep(stepId);
    updateVisualization();
  };

  const compensateStep = (stepId: string) => {
    transactions.compensateSaga(stepId);
    updateVisualization();
  };

  const getParticipantColor = (participant: TransactionParticipant): string => {
    if (participant.phase === 'abort') return SCOPE_COLORS.danger;
    if (participant.phase === 'commit' || participant.phase === 'done') return SCOPE_COLORS.emerald;
    if (participant.phase === 'pre-commit') return SCOPE_COLORS.amber;
    if (participant.phase === 'prepare') return SCOPE_COLORS.cobalt;
    return SCOPE_COLORS.inkMuted;
  };

  const getSagaColor = (step: SagaStep): string => {
    if (step.status === 'completed') return SCOPE_COLORS.emerald;
    if (step.status === 'compensated') return SCOPE_COLORS.danger;
    return SCOPE_COLORS.inkMuted;
  };

  const stats = transactions.getStats();
  const coordX = 460;
  const coordY = 105;
  const participantCoords = participants.map((p, i) => ({
    id: p.id,
    x: 240 + i * 220,
    y: 250,
  }));
  const sagaCoords = sagaSteps.map((s, i) => ({
    id: s.id,
    x: 240 + i * 220,
    y: 430,
  }));

  const inspectedParticipant =
    selectedEntity?.kind === 'participant'
      ? participants.find((p) => p.id === selectedEntity.id) ?? null
      : null;
  const inspectedSaga =
    selectedEntity?.kind === 'saga'
      ? sagaSteps.find((s) => s.id === selectedEntity.id) ?? null
      : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={distributedTransactionsScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          transactions.reset();
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
          <h1 className="text-2xl font-bold text-white">Distributed Transactions</h1>
          <p className="text-slate-400 text-sm mt-1">
            Compare 3PC atomic commit with saga compensation
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
              Prepared: <span className="font-semibold text-blue-400">{stats.prepared}</span>
            </span>
            <span className="text-slate-300">
              Committed: <span className="font-semibold text-green-400">{stats.committed}</span>
            </span>
            <span className="text-slate-300">
              Aborted: <span className="font-semibold text-red-400">{stats.aborted}</span>
            </span>
            <span className="text-slate-300">
              Saga Completed:{' '}
              <span className="font-semibold text-green-400">{stats.sagaCompleted}</span>
            </span>
            <span className="text-slate-300">
              Compensated:{' '}
              <span className="font-semibold text-red-400">{stats.sagaCompensated}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Distributed Transactions"
              currentState={{
                scenario: selectedScenario,
                stats,
                participants: participants.map((p) => ({ id: p.id, phase: p.phase, vote: p.vote })),
                sagaSteps: sagaSteps.map((s) => ({ id: s.id, status: s.status })),
              }}
            />
          </div>

          <svg ref={svgRef} viewBox="0 0 920 560" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="dtx" />

            {/* Band labels & divider */}
            <text
              x={60}
              y={52}
              fill={SCOPE_COLORS.inkMuted}
              fontSize="10"
              fontFamily="var(--font-mono), monospace"
              letterSpacing="0.14em"
            >
              01 · THREE-PHASE COMMIT (3PC)
            </text>
            <line
              x1={60}
              y1={336}
              x2={860}
              y2={336}
              stroke={SCOPE_COLORS.hairline}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={60}
              y={362}
              fill={SCOPE_COLORS.inkMuted}
              fontSize="10"
              fontFamily="var(--font-mono), monospace"
              letterSpacing="0.14em"
            >
              02 · SAGA WORKFLOW &amp; COMPENSATIONS
            </text>

            {/* 3PC coordinator spokes */}
            {participantCoords.map((pos) => (
              <line
                key={`3pc-spoke-${pos.id}`}
                x1={coordX}
                y1={coordY}
                x2={pos.x}
                y2={pos.y}
                stroke={SCOPE_COLORS.hairline}
                strokeWidth="1"
              />
            ))}

            {/* Saga forward/compensation chain */}
            {sagaCoords.slice(0, -1).map((pos, idx) => {
              const next = sagaCoords[idx + 1];
              const step = sagaSteps[idx];
              const isComp = step?.status === 'compensated';
              return (
                <line
                  key={`saga-link-${pos.id}-${next.id}`}
                  x1={pos.x + 42}
                  y1={pos.y}
                  x2={next.x - 42}
                  y2={next.y}
                  stroke={isComp ? SCOPE_COLORS.danger : SCOPE_COLORS.cobalt}
                  strokeWidth="1.5"
                  strokeDasharray={isComp ? '4 4' : undefined}
                  markerEnd={`url(#dtx-arrow-${isComp ? 'danger' : 'cobalt'})`}
                  opacity="0.7"
                />
              );
            })}

            {/* In-flight 3PC / Saga messages */}
            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const pTarget = participantCoords.find((p) => p.id === message.to);
                if (pTarget) {
                  const isAbort = message.type === 'Abort';
                  const isCommit = message.type === 'Commit';
                  return (
                    <ScopeEdge
                      key={message.id}
                      idPrefix="dtx"
                      x1={coordX}
                      y1={coordY}
                      x2={pTarget.x}
                      y2={pTarget.y}
                      color={
                        isAbort
                          ? SCOPE_COLORS.danger
                          : isCommit
                          ? SCOPE_COLORS.emerald
                          : SCOPE_COLORS.cobalt
                      }
                      markerKey={isAbort ? 'danger' : isCommit ? 'emerald' : 'cobalt'}
                      inset={42}
                      label={message.type.toUpperCase()}
                      dashed={isAbort}
                    />
                  );
                }
                return null;
              })}

            {/* 3PC Coordinator */}
            <ScopeNode
              x={coordX}
              y={coordY}
              radius={36}
              label="COORD"
              sublabel="3PC"
              topTag={stats.committed > 0 ? 'COMMITTED' : stats.aborted > 0 ? 'ABORTED' : 'COORDINATOR'}
              accentColor={
                stats.aborted > 0
                  ? SCOPE_COLORS.danger
                  : stats.committed > 0
                  ? SCOPE_COLORS.emerald
                  : SCOPE_COLORS.signal
              }
              highlighted
            />

            {/* 3PC Participants */}
            {participants.map((participant, idx) => {
              const pos = participantCoords[idx];
              return (
                <ScopeNode
                  key={participant.id}
                  x={pos.x}
                  y={pos.y}
                  radius={38}
                  label={participant.id}
                  sublabel={participant.phase.toUpperCase()}
                  topTag={participant.vote ? `VOTE ${participant.vote.toUpperCase()}` : 'PARTICIPANT'}
                  accentColor={getParticipantColor(participant)}
                  failed={participant.phase === 'abort'}
                  highlighted={participant.phase === 'pre-commit'}
                  selected={
                    selectedEntity?.kind === 'participant' && selectedEntity.id === participant.id
                  }
                  onClick={() =>
                    setSelectedEntity((prev) =>
                      prev?.kind === 'participant' && prev.id === participant.id
                        ? null
                        : { kind: 'participant', id: participant.id }
                    )
                  }
                />
              );
            })}

            {/* Saga Steps */}
            {sagaSteps.map((step, idx) => {
              const pos = sagaCoords[idx];
              return (
                <ScopeNode
                  key={step.id}
                  x={pos.x}
                  y={pos.y}
                  radius={38}
                  label={step.id}
                  sublabel={step.status.toUpperCase()}
                  topTag={step.name.toUpperCase()}
                  accentColor={getSagaColor(step)}
                  failed={step.status === 'compensated'}
                  highlighted={step.status === 'completed'}
                  selected={selectedEntity?.kind === 'saga' && selectedEntity.id === step.id}
                  onClick={() =>
                    setSelectedEntity((prev) =>
                      prev?.kind === 'saga' && prev.id === step.id
                        ? null
                        : { kind: 'saga', id: step.id }
                    )
                  }
                />
              );
            })}
          </svg>

          {!inspectedParticipant && !inspectedSaga && (
            <WireTapHint text="Click any 3PC participant or Saga step to inspect & act" />
          )}

          {inspectedParticipant && (
            <WireTapInspector
              title={`PARTICIPANT ${inspectedParticipant.id}`}
              subtitle="THREE-PHASE COMMIT"
              status={
                inspectedParticipant.phase === 'abort'
                  ? 'failed'
                  : inspectedParticipant.phase === 'pre-commit'
                  ? 'candidate'
                  : 'healthy'
              }
              className="top-14 left-4"
              metrics={[
                { label: 'Phase', value: inspectedParticipant.phase.toUpperCase(), tone: 'cobalt' },
                {
                  label: 'Vote',
                  value: inspectedParticipant.vote ? inspectedParticipant.vote.toUpperCase() : 'NONE',
                  tone: inspectedParticipant.vote === 'no' ? 'danger' : 'emerald',
                },
                { label: 'Prepared', value: stats.prepared },
                { label: 'Committed', value: stats.committed, tone: 'emerald' },
              ]}
              actions={[
                {
                  label: 'Vote YES',
                  onClick: () => voteYes(inspectedParticipant.id),
                  variant: 'emerald',
                },
                {
                  label: 'Vote NO',
                  onClick: () => voteNo(inspectedParticipant.id),
                  variant: 'danger',
                },
              ]}
              onClose={() => setSelectedEntity(null)}
            />
          )}

          {inspectedSaga && (
            <WireTapInspector
              title={`SAGA ${inspectedSaga.id}`}
              subtitle={inspectedSaga.name.toUpperCase()}
              status={
                inspectedSaga.status === 'compensated'
                  ? 'failed'
                  : inspectedSaga.status === 'completed'
                  ? 'healthy'
                  : 'info'
              }
              className="top-14 left-4"
              metrics={[
                { label: 'Step Name', value: inspectedSaga.name },
                {
                  label: 'Status',
                  value: inspectedSaga.status.toUpperCase(),
                  tone:
                    inspectedSaga.status === 'compensated'
                      ? 'danger'
                      : inspectedSaga.status === 'completed'
                      ? 'emerald'
                      : 'amber',
                },
                { label: 'Completed', value: stats.sagaCompleted, tone: 'emerald' },
                { label: 'Compensated', value: stats.sagaCompensated, tone: 'signal' },
              ]}
              actions={[
                {
                  label: 'Complete Step',
                  onClick: () => completeStep(inspectedSaga.id),
                  variant: 'emerald',
                },
                {
                  label: 'Compensate',
                  onClick: () => compensateStep(inspectedSaga.id),
                  variant: 'danger',
                },
              ]}
              onClose={() => setSelectedEntity(null)}
            />
          )}

          {/* 3PC Manual Controls */}
          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-3.5 border border-slate-700 space-y-1.5 w-56">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">
              3PC Controls
            </h3>
            <button
              onClick={start3PC}
              className="w-full px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Start 3PC
            </button>
            <div className="flex gap-1.5">
              <button
                onClick={() => voteYes()}
                className="flex-1 px-2 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                Vote Yes
              </button>
              <button
                onClick={() => voteNo()}
                className="flex-1 px-2 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Vote No
              </button>
            </div>
            <button
              onClick={decide3PC}
              className="w-full px-2.5 py-1.5 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
            >
              Decide (Pre-Commit / Abort)
            </button>
            <button
              onClick={commit3PC}
              className="w-full px-2.5 py-1.5 bg-[#D9441E] text-white text-xs rounded hover:bg-[#B83412]"
            >
              Commit 3PC
            </button>
          </div>

          {/* Saga Manual Controls */}
          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-3.5 border border-slate-700 space-y-1.5 w-60">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">
              Saga Controls
            </h3>
            <button
              onClick={startSaga}
              className="w-full px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Start Saga
            </button>
            {sagaSteps.map((step) => (
              <div key={`controls-${step.id}`} className="flex gap-1.5">
                <button
                  onClick={() => completeStep(step.id)}
                  className="flex-1 px-2 py-1 bg-green-600 text-white text-[11px] rounded hover:bg-green-700"
                >
                  Done {step.id}
                </button>
                <button
                  onClick={() => compensateStep(step.id)}
                  className="flex-1 px-2 py-1 bg-red-600 text-white text-[11px] rounded hover:bg-red-700"
                >
                  Undo {step.id}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['distributed-transactions'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['distributed-transactions'].sections.map((section) => (
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
