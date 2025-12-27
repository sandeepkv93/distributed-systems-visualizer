'use client';

import { useState, useEffect, useCallback } from 'react';
import { TwoPhaseCommitAlgorithm } from '@/lib/algorithms/twoPhaseCommit';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import { twoPhaseCommitScenarios } from '@/visualizers/two-phase-commit/scenarios';
import { TwoPhaseCommitNode, TwoPhaseCommitMessage } from '@/lib/types';
import { motion } from 'framer-motion';

export default function TwoPhaseCommitPage() {
  const [tpc] = useState(() => new TwoPhaseCommitAlgorithm(3));
  const [coordinator, setCoordinator] = useState<TwoPhaseCommitNode>(tpc.getCoordinator());
  const [participants, setParticipants] = useState<TwoPhaseCommitNode[]>(tpc.getParticipants());
  const [messages, setMessages] = useState<TwoPhaseCommitMessage[]>(tpc.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('Two-Phase Commit');

  // Update visualization
  const updateVisualization = useCallback(() => {
    setCoordinator({ ...tpc.getCoordinator() });
    setParticipants([...tpc.getParticipants()]);
    setMessages([...tpc.getMessages()]);
  }, [tpc]);

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
      participants.forEach((p) => {
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
  }, [tpc, simulation, updateVisualization, participants]);

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

  // Ask Claude
  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const stats = tpc.getStats();
    const currentState = {
      coordinatorState: stats.coordinatorState,
      totalParticipants: stats.totalParticipants,
      healthyParticipants: stats.healthyParticipants,
      yesVotes: stats.yesVotes,
      noVotes: stats.noVotes,
      transactionOutcome: stats.transactionOutcome,
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  // Manual controls
  const startTransaction = () => {
    tpc.reset();
    tpc.startTransaction();
    updateVisualization();
  };

  const voteYes = (participantId: string) => {
    tpc.participantVote(participantId, 'yes');
    setTimeout(() => {
      const decision = tpc.coordinatorDecide();
      if (decision !== 'waiting') {
        setTimeout(() => {
          participants.forEach((p) => {
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
    setTimeout(() => {
      const decision = tpc.coordinatorDecide();
      if (decision !== 'waiting') {
        setTimeout(() => {
          participants.forEach((p) => {
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
    if (node.status === 'failed') return '#EF4444'; // red

    if (node.role === 'coordinator') {
      switch (node.state) {
        case 'init':
          return '#6B7280'; // gray
        case 'preparing':
          return '#F59E0B'; // amber
        case 'committing':
          return '#3B82F6'; // blue
        case 'committed':
          return '#10B981'; // green
        case 'aborting':
          return '#F97316'; // orange
        case 'aborted':
          return '#EF4444'; // red
        default:
          return '#6B7280';
      }
    } else {
      switch (node.state) {
        case 'init':
          return '#6B7280'; // gray
        case 'prepared':
          return '#F59E0B'; // amber
        case 'committed':
          return '#10B981'; // green
        case 'aborted':
          return '#EF4444'; // red
        default:
          return '#6B7280';
      }
    }
  };

  // Get message color
  const getMessageColor = (message: TwoPhaseCommitMessage): string => {
    switch (message.type) {
      case 'VoteRequest':
        return '#8B5CF6'; // purple
      case 'VoteYes':
        return '#10B981'; // green
      case 'VoteNo':
        return '#EF4444'; // red
      case 'Commit':
        return '#3B82F6'; // blue
      case 'Abort':
        return '#F97316'; // orange
      case 'Ack':
        return '#6B7280'; // gray
      default:
        return '#6B7280';
    }
  };

  const stats = tpc.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
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
        onScenarioChange={handleScenarioChange}
        onAskClaude={handleAskClaude}
        apiKeyExists={claude.apiKeyExists}
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
          <div className="flex gap-6 mt-2 text-sm">
            <span className="text-slate-300">
              Participants: <span className="font-semibold text-white">{stats.totalParticipants}</span>
            </span>
            <span className="text-slate-300">
              Healthy: <span className="font-semibold text-green-400">{stats.healthyParticipants}</span>
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
        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg className="w-full h-full">
            {/* Coordinator */}
            <motion.g
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <circle
                cx={coordinator.position.x}
                cy={coordinator.position.y}
                r="40"
                fill={getNodeColor(coordinator)}
                stroke="#1F2937"
                strokeWidth="3"
              />
              <text
                x={coordinator.position.x}
                y={coordinator.position.y - 5}
                textAnchor="middle"
                fill="#FFF"
                fontSize="14"
                fontWeight="bold"
              >
                Coordinator
              </text>
              <text
                x={coordinator.position.x}
                y={coordinator.position.y + 10}
                textAnchor="middle"
                fill="#FFF"
                fontSize="10"
              >
                {coordinator.state.toUpperCase()}
              </text>
              {coordinator.status === 'failed' && (
                <text
                  x={coordinator.position.x}
                  y={coordinator.position.y + 25}
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="12"
                  fontWeight="bold"
                >
                  FAILED
                </text>
              )}
            </motion.g>

            {/* Participants */}
            {participants.map((participant, index) => (
              <motion.g
                key={participant.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <circle
                  cx={participant.position.x}
                  cy={participant.position.y}
                  r="35"
                  fill={getNodeColor(participant)}
                  stroke="#1F2937"
                  strokeWidth="3"
                  className="cursor-pointer"
                  onClick={() =>
                    participant.status === 'failed'
                      ? recoverParticipant(participant.id)
                      : failParticipant(participant.id)
                  }
                />
                <text
                  x={participant.position.x}
                  y={participant.position.y - 5}
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {participant.id}
                </text>
                <text
                  x={participant.position.x}
                  y={participant.position.y + 10}
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="9"
                >
                  {participant.state.toUpperCase()}
                </text>
                {participant.vote && (
                  <text
                    x={participant.position.x}
                    y={participant.position.y + 25}
                    textAnchor="middle"
                    fill={participant.vote === 'yes' ? '#10B981' : '#EF4444'}
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {participant.vote.toUpperCase()}
                  </text>
                )}
                {participant.status === 'failed' && (
                  <text
                    x={participant.position.x}
                    y={participant.position.y + 40}
                    textAnchor="middle"
                    fill="#FFF"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    FAILED
                  </text>
                )}
              </motion.g>
            ))}

            {/* Messages */}
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

                const midX = (fromNode.position.x + toNode.position.x) / 2;
                const midY = (fromNode.position.y + toNode.position.y) / 2;

                return (
                  <g key={message.id}>
                    <motion.line
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      stroke={getMessageColor(message)}
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                    <motion.circle
                      cx={midX}
                      cy={midY}
                      r="8"
                      fill={getMessageColor(message)}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    <text
                      x={midX}
                      y={midY - 12}
                      textAnchor="middle"
                      fill={getMessageColor(message)}
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {message.type}
                    </text>
                  </g>
                );
              })}
          </svg>

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
              <p className="text-xs text-slate-400 mb-1">Click participants to fail/recover</p>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">States</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-600" />
                <span className="text-slate-400">INIT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-600" />
                <span className="text-slate-400">PREPARING/PREPARED</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600" />
                <span className="text-slate-400">COMMITTING</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-slate-400">COMMITTED</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600" />
                <span className="text-slate-400">ABORTED/FAILED</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explanation Panel */}
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
