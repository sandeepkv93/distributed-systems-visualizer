'use client';

import { useState, useEffect, useCallback } from 'react';
import { CRDTAlgorithm } from '@/lib/algorithms/crdts';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import { crdtScenarios } from '@/visualizers/crdts/scenarios';
import { CRDTMessage, CRDTReplica } from '@/lib/types';
import { motion } from 'framer-motion';

export default function CRDTsPage() {
  const [crdt] = useState(() => new CRDTAlgorithm(3));
  const [replicas, setReplicas] = useState<CRDTReplica[]>(crdt.getReplicas());
  const [messages, setMessages] = useState<CRDTMessage[]>(crdt.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('CRDTs');

  const updateVisualization = useCallback(() => {
    setReplicas([...crdt.getReplicas()]);
    setMessages([...crdt.getMessages()]);

    const inFlight = crdt.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => crdt.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [crdt]);

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

  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const stats = crdt.getStats();
    const currentState = {
      replicas: replicas.map((r) => ({
        id: r.id,
        gCounter: r.gCounter,
        orSet: crdt.getORSetValues(r),
        rga: crdt.getRgaSequence(r).map((e) => e.value),
      })),
      stats,
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  const incrementRandom = () => {
    const replica = replicas[Math.floor(Math.random() * replicas.length)];
    crdt.increment(replica.id);
    updateVisualization();
  };

  const addRandom = () => {
    const replica = replicas[Math.floor(Math.random() * replicas.length)];
    const value = ['apple', 'banana', 'cherry'][Math.floor(Math.random() * 3)];
    crdt.orSetAdd(replica.id, value);
    updateVisualization();
  };

  const removeRandom = () => {
    const replica = replicas[Math.floor(Math.random() * replicas.length)];
    const values = crdt.getORSetValues(replica);
    if (values.length === 0) return;
    crdt.orSetRemove(replica.id, values[0]);
    updateVisualization();
  };

  const insertRga = () => {
    const replica = replicas[Math.floor(Math.random() * replicas.length)];
    const value = String.fromCharCode(65 + Math.floor(Math.random() * 5));
    crdt.rgaInsert(replica.id, value);
    updateVisualization();
  };

  const removeRga = () => {
    const replica = replicas[Math.floor(Math.random() * replicas.length)];
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

  return (
    <div className="flex h-screen bg-slate-900">
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
        onScenarioChange={handleScenarioChange}
        onAskClaude={handleAskClaude}
        apiKeyExists={claude.apiKeyExists}
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
          <div className="flex gap-6 mt-3 text-sm">
            <span className="text-slate-300">
              Replicas: <span className="font-semibold text-white">{stats.replicaCount}</span>
            </span>
            <span className="text-slate-300">
              Divergent Counters:{' '}
              <span className={`font-semibold ${stats.divergentGCounter > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {stats.divergentGCounter}
              </span>
            </span>
            <span className="text-slate-300">
              Divergent OR-Set:{' '}
              <span className={`font-semibold ${stats.divergentORSet > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {stats.divergentORSet}
              </span>
            </span>
            <span className="text-slate-300">
              Divergent RGA:{' '}
              <span className={`font-semibold ${stats.divergentRGA > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                {stats.divergentRGA}
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg className="w-full h-full">
            {replicas.map((replica, index) => (
              <motion.g
                key={replica.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <circle
                  cx={160 + index * 280}
                  cy={150}
                  r="45"
                  fill="#1E293B"
                  stroke="#334155"
                  strokeWidth="3"
                />
                <text
                  x={160 + index * 280}
                  y={145}
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {replica.id}
                </text>
                <text
                  x={160 + index * 280}
                  y={165}
                  textAnchor="middle"
                  fill="#CBD5E1"
                  fontSize="10"
                >
                  G={crdt.getGCounterTotal(replica)}
                </text>
              </motion.g>
            ))}

            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const fromIndex = replicas.findIndex((r) => r.id === message.from);
                const toIndex = replicas.findIndex((r) => r.id === message.to);
                if (fromIndex === -1 || toIndex === -1) return null;
                const x1 = 160 + fromIndex * 280;
                const x2 = 160 + toIndex * 280;
                return (
                  <g key={message.id}>
                    <motion.line
                      x1={x1}
                      y1={150}
                      x2={x2}
                      y2={150}
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeDasharray="6,6"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                    <motion.circle
                      cx={(x1 + x2) / 2}
                      cy={150}
                      r="6"
                      fill="#3B82F6"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </g>
                );
              })}
          </svg>

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={incrementRandom}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Increment G-Counter
            </button>
            <button
              onClick={addRandom}
              className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              OR-Set Add
            </button>
            <button
              onClick={removeRandom}
              className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
            >
              OR-Set Remove
            </button>
            <button
              onClick={insertRga}
              className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
            >
              RGA Insert
            </button>
            <button
              onClick={removeRga}
              className="w-full px-3 py-2 bg-pink-600 text-white text-sm rounded hover:bg-pink-700"
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

          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Replica State</h3>
            <div className="space-y-3">
              {replicas.map((replica) => (
                <div key={`replica-${replica.id}`} className="text-xs">
                  <div className="font-semibold text-white mb-1">{replica.id}</div>
                  <div className="pl-2 space-y-1 text-slate-300">
                    <div>G-Counter: {JSON.stringify(replica.gCounter)}</div>
                    <div>OR-Set: {crdt.getORSetValues(replica).join(', ') || 'empty'}</div>
                    <div>
                      RGA: {crdt.getRgaSequence(replica).map((e) => e.value).join(' ') || 'empty'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
