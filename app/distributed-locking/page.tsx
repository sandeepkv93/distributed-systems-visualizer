'use client';

import { useState, useEffect, useCallback } from 'react';
import { DistributedLockAlgorithm } from '@/lib/algorithms/distributedLock';
import { useSimulation } from '@/hooks/useSimulation';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ControlPanel from '@/components/ControlPanel';
import ExplanationPanel from '@/components/ExplanationPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import { distributedLockingScenarios } from '@/visualizers/distributed-locking/scenarios';
import { LockMessage, LockNode } from '@/lib/types';
import { motion } from 'framer-motion';

export default function DistributedLockingPage() {
  const [lock] = useState(() => new DistributedLockAlgorithm(4, 4000));
  const [nodes, setNodes] = useState<LockNode[]>(lock.getNodes());
  const [messages, setMessages] = useState<LockMessage[]>(lock.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);
  const claude = useClaudeExplainer('Distributed Locking + Leases');

  const updateVisualization = useCallback(() => {
    lock.checkTimeouts();
    setNodes([...lock.getNodes()]);
    setMessages([...lock.getMessages()]);

    const inFlight = lock.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => lock.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [lock]);

  useEffect(() => {
    simulation.onEvent('request_lock', (event) => {
      lock.requestLock(event.data.clientId);
      updateVisualization();
    });

    simulation.onEvent('release_lock', (event) => {
      lock.releaseLock(event.data.clientId);
      updateVisualization();
    });

    simulation.onEvent('heartbeat', (event) => {
      lock.sendHeartbeat(event.data.clientId);
      updateVisualization();
    });

    simulation.onEvent('tick', () => {
      lock.checkTimeouts();
      updateVisualization();
    });

    simulation.onEvent('fail_node', (event) => {
      lock.failNode(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('recover_node', (event) => {
      lock.recoverNode(event.data.nodeId);
      updateVisualization();
    });
  }, [lock, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = distributedLockingScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      lock.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const stats = lock.getStats();
    const currentState = {
      nodes: nodes.map((n) => ({
        id: n.id,
        role: n.role,
        status: n.status,
        holdingLock: n.holdingLock,
        leaseExpiresAt: n.leaseExpiresAt,
      })),
      stats,
      scenario: selectedScenario,
    };
    await claude.explain(currentState, question);
  };

  const requestRandom = () => {
    const clients = nodes.filter((n) => n.role === 'client' && n.status === 'healthy');
    if (clients.length === 0) return;
    const client = clients[Math.floor(Math.random() * clients.length)];
    lock.requestLock(client.id);
    updateVisualization();
  };

  const releaseOwner = () => {
    const owner = nodes.find((n) => n.holdingLock);
    if (!owner) return;
    lock.releaseLock(owner.id);
    updateVisualization();
  };

  const heartbeatOwner = () => {
    const owner = nodes.find((n) => n.holdingLock);
    if (!owner) return;
    lock.sendHeartbeat(owner.id);
    updateVisualization();
  };

  const tickLease = () => {
    lock.checkTimeouts();
    updateVisualization();
  };

  const failNode = (nodeId: string) => {
    if (nodeId === 'L') return;
    lock.failNode(nodeId);
    updateVisualization();
  };

  const recoverNode = (nodeId: string) => {
    lock.recoverNode(nodeId);
    updateVisualization();
  };

  const getNodeColor = (node: LockNode): string => {
    if (node.status === 'failed') return '#EF4444';
    if (node.role === 'manager') return '#3B82F6';
    if (node.holdingLock) return '#10B981';
    return '#6B7280';
  };

  const getMessageColor = (message: LockMessage): string => {
    switch (message.type) {
      case 'Acquire':
        return '#3B82F6';
      case 'Grant':
        return '#10B981';
      case 'Heartbeat':
        return '#F59E0B';
      case 'Release':
        return '#EC4899';
      case 'Timeout':
        return '#EF4444';
      case 'Deny':
        return '#94A3B8';
      default:
        return '#6B7280';
    }
  };

  const stats = lock.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={distributedLockingScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          lock.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
        onAskClaude={handleAskClaude}
        apiKeyExists={claude.apiKeyExists}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Distributed Locking + Leases</h1>
          <p className="text-slate-400 text-sm mt-1">
            Lease-based locking with heartbeats to maintain ownership
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
              Nodes: <span className="font-semibold text-white">{stats.totalNodes}</span>
            </span>
            <span className="text-slate-300">
              Healthy: <span className="font-semibold text-green-400">{stats.healthyNodes}</span>
            </span>
            <span className="text-slate-300">
              Lease Owner:{' '}
              <span className="font-semibold text-white">{stats.leaseOwner || 'none'}</span>
            </span>
            <span className="text-slate-300">
              Queue: <span className="font-semibold text-white">{stats.queueLength}</span>
            </span>
            <span className="text-slate-300">
              TTL: <span className="font-semibold text-white">{Math.round(stats.leaseTtlMs / 1000)}s</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <svg className="w-full h-full">
            {nodes.map((node, index) => (
              <motion.g
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <circle
                  cx={node.position.x}
                  cy={node.position.y}
                  r={node.role === 'manager' ? 55 : 45}
                  fill={getNodeColor(node)}
                  stroke="#1F2937"
                  strokeWidth="3"
                  className={node.role === 'client' ? 'cursor-pointer' : ''}
                  onClick={() =>
                    node.role === 'client' &&
                    (node.status === 'failed' ? recoverNode(node.id) : failNode(node.id))
                  }
                />
                <text
                  x={node.position.x}
                  y={node.position.y - 10}
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {node.id}
                </text>
                <text
                  x={node.position.x}
                  y={node.position.y + 6}
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize="10"
                >
                  {node.role === 'manager' ? 'LOCK MANAGER' : node.holdingLock ? 'OWNER' : 'CLIENT'}
                </text>
                {node.holdingLock && node.leaseExpiresAt && (
                  <text
                    x={node.position.x}
                    y={node.position.y + 22}
                    textAnchor="middle"
                    fill="#FDE68A"
                    fontSize="9"
                  >
                    expires {Math.max(0, Math.ceil((node.leaseExpiresAt - Date.now()) / 1000))}s
                  </text>
                )}
                {node.status === 'failed' && (
                  <text
                    x={node.position.x}
                    y={node.position.y + 35}
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

            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const fromNode = nodes.find((n) => n.id === message.from);
                const toNode = nodes.find((n) => n.id === message.to);

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
                      strokeDasharray="6,6"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                    <motion.circle
                      cx={midX}
                      cy={midY}
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
            <button
              onClick={requestRandom}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Request Lock (Random Client)
            </button>
            <button
              onClick={releaseOwner}
              className="w-full px-3 py-2 bg-pink-600 text-white text-sm rounded hover:bg-pink-700"
            >
              Release Lock (Owner)
            </button>
            <button
              onClick={heartbeatOwner}
              className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
            >
              Send Heartbeat (Owner)
            </button>
            <button
              onClick={tickLease}
              className="w-full px-3 py-2 bg-slate-600 text-white text-sm rounded hover:bg-slate-700"
            >
              Check Lease Expiry
            </button>
            <p className="text-xs text-slate-400">Click clients to fail/recover.</p>
          </div>

          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Client Status</h3>
            <div className="space-y-2">
              {nodes
                .filter((n) => n.role === 'client')
                .map((node) => (
                  <div key={`client-${node.id}`} className="text-xs">
                    <div className="font-semibold text-white mb-1">
                      {node.id} ({node.status})
                    </div>
                    <div className="pl-2 text-slate-300">
                      {node.holdingLock ? 'Holding lock' : 'Idle'}
                      {node.leaseExpiresAt && (
                        <span className="text-slate-400">
                          {' '}
                          · expires in {Math.max(0, Math.ceil((node.leaseExpiresAt - Date.now()) / 1000))}s
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Legend</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600" />
                <span className="text-slate-400">Lock manager</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-slate-400">Lock owner</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-500" />
                <span className="text-slate-400">Client idle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600" />
                <span className="text-slate-400">Failed client</span>
              </div>
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
        title={topicArticles['distributed-locking'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['distributed-locking'].sections.map((section) => (
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
