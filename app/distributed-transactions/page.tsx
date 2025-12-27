'use client';

import { useState, useEffect, useCallback } from 'react';
import { DistributedTransactionsAlgorithm } from '@/lib/algorithms/distributedTransactions';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import { distributedTransactionsScenarios } from '@/visualizers/distributed-transactions/scenarios';
import { TransactionMessage, TransactionParticipant, SagaStep } from '@/lib/types';
import { motion } from 'framer-motion';

export default function DistributedTransactionsPage() {
  const [transactions] = useState(() => new DistributedTransactionsAlgorithm(3));
  const [participants, setParticipants] = useState<TransactionParticipant[]>(transactions.getParticipants());
  const [sagaSteps, setSagaSteps] = useState<SagaStep[]>(transactions.getSagaSteps());
  const [messages, setMessages] = useState<TransactionMessage[]>(transactions.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('Distributed Transactions');

  const updateVisualization = useCallback(() => {
    setParticipants([...transactions.getParticipants()]);
    setSagaSteps([...transactions.getSagaSteps()]);
    setMessages([...transactions.getMessages()]);

    const inFlight = transactions.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => transactions.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [transactions]);

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

  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const stats = transactions.getStats();
    const currentState = {
      participants,
      sagaSteps,
      stats,
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  const start3PC = () => {
    transactions.start3PC();
    updateVisualization();
  };

  const voteYes = () => {
    participants.forEach((p) => transactions.receiveVote(p.id, 'yes'));
    updateVisualization();
  };

  const voteNo = () => {
    if (participants[0]) {
      transactions.receiveVote(participants[0].id, 'no');
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
    if (participant.phase === 'abort') return '#EF4444';
    if (participant.phase === 'commit' || participant.phase === 'done') return '#10B981';
    if (participant.phase === 'pre-commit') return '#F59E0B';
    if (participant.phase === 'prepare') return '#3B82F6';
    return '#6B7280';
  };

  const getSagaColor = (step: SagaStep): string => {
    if (step.status === 'completed') return '#10B981';
    if (step.status === 'compensated') return '#EF4444';
    return '#6B7280';
  };

  const stats = transactions.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
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
        onScenarioChange={handleScenarioChange}
        onAskClaude={handleAskClaude}
        apiKeyExists={claude.apiKeyExists}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Distributed Transactions</h1>
          <p className="text-slate-400 text-sm mt-1">
            Compare 3PC atomic commit with saga compensation
          </p>
          <div className="flex gap-6 mt-2 text-sm">
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
              Saga Completed: <span className="font-semibold text-green-400">{stats.sagaCompleted}</span>
            </span>
            <span className="text-slate-300">
              Compensated: <span className="font-semibold text-red-400">{stats.sagaCompensated}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <div className="grid grid-cols-2 gap-6 p-6 h-full">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 relative">
              <h2 className="text-lg font-semibold text-white mb-4">3PC Timeline</h2>
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: getParticipantColor(participant) }}
                    >
                      {participant.id}
                    </div>
                    <div className="text-slate-200 text-sm">
                      {participant.phase.toUpperCase()}
                      {participant.vote && <span className="text-slate-400"> · vote {participant.vote}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={start3PC}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Start 3PC
                </button>
                <button
                  onClick={voteYes}
                  className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Vote Yes
                </button>
                <button
                  onClick={voteNo}
                  className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Vote No (P0)
                </button>
                <button
                  onClick={decide3PC}
                  className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
                >
                  Decide (Pre-Commit/Abort)
                </button>
                <button
                  onClick={commit3PC}
                  className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                >
                  Commit
                </button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 relative">
              <h2 className="text-lg font-semibold text-white mb-4">Saga Steps</h2>
              <div className="space-y-3">
                {sagaSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: getSagaColor(step) }}
                    >
                      {step.id}
                    </div>
                    <div className="text-slate-200 text-sm">
                      {step.name} · {step.status}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={startSaga}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Start Saga
                </button>
                {sagaSteps.map((step) => (
                  <div key={`controls-${step.id}`} className="flex gap-2">
                    <button
                      onClick={() => completeStep(step.id)}
                      className="flex-1 px-2 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Complete {step.id}
                    </button>
                    <button
                      onClick={() => compensateStep(step.id)}
                      className="flex-1 px-2 py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Compensate {step.id}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {messages
            .filter((m) => m.status === 'in-flight')
            .map((message) => (
              <motion.div
                key={message.id}
                className="absolute top-6 right-6 text-xs text-slate-200 bg-slate-700 px-3 py-1 rounded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {message.type} → {message.to}
              </motion.div>
            ))}
        </div>
      </div>

      {showExplanation && (
        <ExplanationPanel
          explanation={claude.explanation}
          isLoading={claude.isLoading}
          error={claude.error}
          onClose={() => {
            setShowExplanation(false);
            claude.clearExplanation();
          }}
        />
      )}
    </div>
  );
}
