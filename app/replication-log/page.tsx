'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReplicationLogAlgorithm } from '@/lib/algorithms/replicationLog';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import { replicationLogScenarios } from '@/visualizers/replication-log/scenarios';
import { LogMessage, LogPartition } from '@/lib/types';
import { motion } from 'framer-motion';

export default function ReplicationLogPage() {
  const [replication] = useState(() => new ReplicationLogAlgorithm(3));
  const [partition, setPartition] = useState<LogPartition>(replication.getPartition());
  const [messages, setMessages] = useState<LogMessage[]>(replication.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);

  const updateVisualization = useCallback(() => {
    setPartition({ ...replication.getPartition(), replicas: [...replication.getPartition().replicas] });
    setMessages([...replication.getMessages()]);

    const inFlight = replication.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => replication.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [replication]);

  useEffect(() => {
    simulation.onEvent('produce', (event) => {
      replication.produce(event.data.value);
      updateVisualization();
    });

    simulation.onEvent('fetch', (event) => {
      replication.fetch(event.data.replicaId);
      updateVisualization();
    });

    simulation.onEvent('mark_out_of_sync', (event) => {
      replication.markOutOfSync(event.data.replicaId);
      updateVisualization();
    });

    simulation.onEvent('mark_in_sync', (event) => {
      replication.markInSync(event.data.replicaId);
      updateVisualization();
    });
  }, [replication, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = replicationLogScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      replication.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const produce = () => {
    const value = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    replication.produce(value);
    updateVisualization();
  };

  const markOutOfSync = () => {
    const follower = partition.replicas.find((r) => r.role === 'follower');
    if (!follower) return;
    replication.markOutOfSync(follower.id);
    updateVisualization();
  };

  const markInSync = () => {
    const follower = partition.replicas.find((r) => r.role === 'follower' && !r.inSync);
    if (!follower) return;
    replication.markInSync(follower.id);
    updateVisualization();
  };

  const getReplicaColor = (replica: LogPartition['replicas'][number]): string => {
    if (replica.role === 'leader') return '#3B82F6';
    if (!replica.inSync) return '#F59E0B';
    return '#10B981';
  };

  const getMessageColor = (message: LogMessage): string => {
    switch (message.type) {
      case 'Produce':
        return '#3B82F6';
      case 'Replicate':
        return '#10B981';
      case 'Fetch':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const stats = replication.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={replicationLogScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          replication.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Replication Log (Kafka-style)</h1>
          <p className="text-slate-400 text-sm mt-1">
            Leader-based partition with followers, ISR tracking, and high-watermark
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
              Replicas: <span className="font-semibold text-white">{stats.replicas}</span>
            </span>
            <span className="text-slate-300">
              ISR: <span className="font-semibold text-white">{stats.isrSize}</span>
            </span>
            <span className="text-slate-300">
              HW: <span className="font-semibold text-white">{stats.highWatermark}</span>
            </span>
            <span className="text-slate-300">
              Log Size: <span className="font-semibold text-white">{stats.logSize}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg className="w-full h-full">
            {partition.replicas.map((replica, index) => (
              <motion.g
                key={replica.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <circle
                  cx={160 + index * 260}
                  cy={160}
                  r="45"
                  fill={getReplicaColor(replica)}
                  stroke="#1F2937"
                  strokeWidth="3"
                />
                <text x={160 + index * 260} y={150} textAnchor="middle" fill="#FFF" fontSize="14" fontWeight="bold">
                  {replica.id}
                </text>
                <text x={160 + index * 260} y={168} textAnchor="middle" fill="#E2E8F0" fontSize="10">
                  {replica.role.toUpperCase()}
                </text>
                <text x={160 + index * 260} y={182} textAnchor="middle" fill="#CBD5E1" fontSize="9">
                  hw {replica.highWatermark}
                </text>
              </motion.g>
            ))}

            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const fromIndex = partition.replicas.findIndex((r) => r.id === message.from);
                const toIndex = partition.replicas.findIndex((r) => r.id === message.to);
                if (fromIndex === -1 || toIndex === -1) return null;
                const x1 = 160 + fromIndex * 260;
                const x2 = 160 + toIndex * 260;
                return (
                  <g key={message.id}>
                    <motion.line
                      x1={x1}
                      y1={160}
                      x2={x2}
                      y2={160}
                      stroke={getMessageColor(message)}
                      strokeWidth="2"
                      strokeDasharray="6,6"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                    <motion.circle
                      cx={(x1 + x2) / 2}
                      cy={160}
                      r="6"
                      fill={getMessageColor(message)}
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
            <button onClick={produce} className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              Produce Message
            </button>
            <button
              onClick={markOutOfSync}
              className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
            >
              Remove Follower from ISR
            </button>
            <button
              onClick={markInSync}
              className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Rejoin ISR
            </button>
          </div>

          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Replica Logs</h3>
            <div className="space-y-2">
              {partition.replicas.map((replica) => (
                <div key={`log-${replica.id}`} className="text-xs">
                  <div className="font-semibold text-white mb-1">
                    {replica.id} ({replica.inSync ? 'ISR' : 'OOS'})
                  </div>
                  <div className="pl-2 space-y-1 text-slate-300">
                    {replica.log.length === 0 && <div className="text-slate-500">No entries</div>}
                    {replica.log.map((entry) => (
                      <div key={`${replica.id}-${entry.offset}`}>
                        {entry.offset}: {entry.value}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['replication-log'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['replication-log'].sections.map((section) => (
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
