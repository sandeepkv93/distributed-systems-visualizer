'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DistributedLockAlgorithm } from '@/lib/algorithms/distributedLock';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { distributedLockingScenarios } from '@/visualizers/distributed-locking/scenarios';
import { LockMessage, LockNode } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import InvariantMonitor from '@/components/InvariantMonitor';
import WireLogDrawer from '@/components/WireLogDrawer';
import { evaluateDistributedLockInvariants } from '@/lib/invariants';
import ChaosStrip from '@/components/ChaosStrip';
import {
  ChaosConfig,
  DEFAULT_CHAOS_CONFIG,
  applyChaosToMessages,
  computeDeliveryDelay,
} from '@/lib/chaos';

export default function DistributedLockingPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lock] = useState(() => new DistributedLockAlgorithm(4, 4000));
  const [nodes, setNodes] = useState<LockNode[]>(lock.getNodes());
  const [messages, setMessages] = useState<LockMessage[]>(lock.getMessages());
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
    setNodes([...lock.getNodes()]);
    setMessages([...lock.getMessages()]);
  }, [lock]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => lock.serialize(),
      restore: (snapshot) => {
        lock.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('distributed-locking', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    lock.checkTimeouts();
    syncVisualization();

    const inFlight = lock.getMessages().filter((m) => m.status === 'in-flight');
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
        survivors.forEach((msg) => lock.deliverMessage(msg.id));
        updateVisualization();
      }, delayMs);
    }
  }, [lock, simulation, syncVisualization]);

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
      syncVisualization();
    }
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
    if (node.status === 'failed') return SCOPE_COLORS.danger;
    if (node.role === 'manager') return SCOPE_COLORS.cobalt;
    if (node.holdingLock) return SCOPE_COLORS.emerald;
    return SCOPE_COLORS.inkMuted;
  };

  const getMessageColor = (message: LockMessage): string => {
    switch (message.type) {
      case 'Acquire':
        return SCOPE_COLORS.cobalt;
      case 'Grant':
        return SCOPE_COLORS.emerald;
      case 'Heartbeat':
        return SCOPE_COLORS.amber;
      case 'Release':
        return SCOPE_COLORS.signal;
      case 'Timeout':
        return SCOPE_COLORS.danger;
      case 'Deny':
        return SCOPE_COLORS.inkMuted;
      default:
        return SCOPE_COLORS.inkMuted;
    }
  };

  const getMessageMarker = (
    message: LockMessage
  ): 'cobalt' | 'emerald' | 'amber' | 'signal' | 'danger' | 'muted' => {
    switch (message.type) {
      case 'Acquire':
        return 'cobalt';
      case 'Grant':
        return 'emerald';
      case 'Heartbeat':
        return 'amber';
      case 'Release':
        return 'signal';
      case 'Timeout':
        return 'danger';
      default:
        return 'muted';
    }
  };

  const stats = lock.getStats();
  const manager = nodes.find((n) => n.role === 'manager');
  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
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
          syncVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        currentEventIndex={simulation.state.currentEventIndex}
        events={simulation.state.events}
        onScenarioChange={handleScenarioChange}
        onJumpToStep={simulation.jumpToStep}
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
          <div className="flex flex-wrap gap-6 mt-2 text-sm">
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
              TTL:{' '}
              <span className="font-semibold text-white">
                {Math.round(stats.leaseTtlMs / 1000)}s
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Distributed Lease Properties"
            checks={evaluateDistributedLockInvariants(nodes)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Distributed Locking + Leases"
              currentState={{ scenario: selectedScenario }}
            />
          </div>

          <WireLogDrawer
            protocol="Distributed Locking"
            scenario={selectedScenario}
            invariants={evaluateDistributedLockInvariants(nodes)}
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
            <svg ref={svgRef} role="group" aria-label="Distributed locking lease, fencing token, and lock manager topology diagram" viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
              <ScopeDefs idPrefix="lock" />

              {/* Spokes from lock manager to clients */}
              {manager &&
                nodes
                  .filter((n) => n.role === 'client')
                  .map((client) => (
                    <line
                      key={`lk-wire-${client.id}`}
                      x1={manager.position.x}
                      y1={manager.position.y}
                      x2={client.position.x}
                      y2={client.position.y}
                      stroke={
                        client.holdingLock
                          ? 'rgba(52, 211, 153, 0.35)'
                          : SCOPE_COLORS.hairlineSubtle
                      }
                      strokeWidth={client.holdingLock ? '1.6' : '1'}
                    />
                  ))}

              {messages
                .filter((m) => m.status === 'in-flight')
                .map((message) => {
                  const fromNode = nodes.find((n) => n.id === message.from);
                  const toNode = nodes.find((n) => n.id === message.to);
                  if (!fromNode || !toNode) return null;

                  return (
                    <ScopeEdge
                      key={message.id}
                      idPrefix="lock"
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      color={getMessageColor(message)}
                      markerKey={getMessageMarker(message)}
                      inset={48}
                      label={message.type.toUpperCase()}
                      dashed={message.type === 'Heartbeat'}
                    />
                  );
                })}

              {nodes.map((node) => {
                const isFailed = node.status === 'failed';
                const isManager = node.role === 'manager';
                const remainingSec =
                  node.holdingLock && node.leaseExpiresAt
                    ? Math.max(0, Math.ceil((node.leaseExpiresAt - Date.now()) / 1000))
                    : null;
                return (
                  <ScopeNode
                    key={node.id}
                    x={node.position.x}
                    y={node.position.y}
                    radius={isManager ? 48 : 38}
                    label={node.id}
                    sublabel={
                      isFailed
                        ? 'OFFLINE'
                        : isManager
                        ? 'MANAGER'
                        : node.holdingLock
                        ? 'LEASED'
                        : 'IDLE'
                    }
                    topTag={isManager ? 'COORDINATOR' : node.holdingLock ? 'LOCK OWNER' : 'CLIENT'}
                    bottomLine1={
                      remainingSec !== null
                        ? `TTL ${remainingSec}s`
                        : isManager
                        ? `OWNER ${stats.leaseOwner || 'NONE'}`
                        : undefined
                    }
                    accentColor={getNodeColor(node)}
                    failed={isFailed}
                    highlighted={node.holdingLock || isManager}
                    selected={selectedNodeId === node.id}
                    onClick={() =>
                      setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
                    }
                  />
                );
              })}
            </svg>
          ) : (
            <SpaceTimeScope
              svgRef={svgRef}
              title="DISTRIBUTED LOCKING · LEASE & RENEWAL TRACE"
              idPrefix="lock-st"
              actors={nodes.map((node) => ({
                id: node.id,
                label: node.id,
                sublabel:
                  node.status === 'failed'
                    ? 'DOWN'
                    : node.role === 'manager'
                    ? 'MGR'
                    : node.holdingLock
                    ? 'OWNER'
                    : 'CLIENT',
                color: getNodeColor(node),
                failed: node.status === 'failed',
              }))}
              frames={messages.map((msg) => ({
                id: msg.id,
                from: msg.from,
                to: msg.to,
                label: msg.type.toUpperCase(),
                color: getMessageColor(msg),
                status: msg.status,
                dashed: msg.type === 'Heartbeat',
              }))}
            />
          )}

          {!inspectedNode && <WireTapHint text="Click manager or client to inspect lease state" />}

          {inspectedNode && (
            <WireTapInspector
              title={inspectedNode.role === 'manager' ? 'LOCK MANAGER (L)' : `CLIENT ${inspectedNode.id}`}
              subtitle={`${inspectedNode.role.toUpperCase()} · ${inspectedNode.status.toUpperCase()}`}
              status={
                inspectedNode.status === 'failed'
                  ? 'failed'
                  : inspectedNode.holdingLock
                  ? 'healthy'
                  : 'info'
              }
              className="top-14 left-4"
              metrics={[
                { label: 'Role', value: inspectedNode.role.toUpperCase(), tone: 'cobalt' },
                {
                  label: 'Holding Lease',
                  value: inspectedNode.holdingLock ? 'YES' : 'NO',
                  tone: inspectedNode.holdingLock ? 'emerald' : 'default',
                },
                { label: 'Current Owner', value: stats.leaseOwner || 'NONE', tone: 'amber' },
                { label: 'Wait Queue', value: stats.queueLength },
              ]}
              actions={
                inspectedNode.role === 'client'
                  ? [
                      {
                        label: inspectedNode.status === 'failed' ? 'Recover' : 'Crash Client',
                        onClick: () =>
                          inspectedNode.status === 'failed'
                            ? recoverNode(inspectedNode.id)
                            : failNode(inspectedNode.id),
                        variant: inspectedNode.status === 'failed' ? 'emerald' : 'danger',
                      },
                      {
                        label: inspectedNode.holdingLock ? 'Renew Heartbeat' : 'Request Lock',
                        onClick: () => {
                          if (inspectedNode.holdingLock) {
                            lock.sendHeartbeat(inspectedNode.id);
                          } else {
                            lock.requestLock(inspectedNode.id);
                          }
                          updateVisualization();
                        },
                        variant: 'signal',
                        disabled: inspectedNode.status === 'failed',
                      },
                    ]
                  : [
                      {
                        label: 'Check Lease Expiry',
                        onClick: tickLease,
                        variant: 'signal',
                      },
                    ]
              }
              onClose={() => setSelectedNodeId(null)}
            />
          )}

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
              className="w-full px-3 py-2 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
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
            <p className="text-xs text-slate-400">Click any node to inspect or crash/recover.</p>
          </div>

          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-xs max-h-64 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Client Status</h3>
            <div className="space-y-2 font-mono">
              {nodes
                .filter((n) => n.role === 'client')
                .map((node) => (
                  <div key={`client-${node.id}`} className="text-xs">
                    <div className="font-semibold text-[#F4F0E8] mb-0.5">
                      {node.id} ({node.status})
                    </div>
                    <div className="pl-2 text-slate-300">
                      {node.holdingLock ? 'Holding lock' : 'Idle'}
                      {node.leaseExpiresAt && (
                        <span className="text-slate-400">
                          {' '}
                          · {Math.max(0, Math.ceil((node.leaseExpiresAt - Date.now()) / 1000))}s
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Legend</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
                <span className="text-slate-300">Lock Manager</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#34D399]" />
                <span className="text-slate-300">Lease Owner</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#9E9B90]" />
                <span className="text-slate-300">Client Idle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F87171]" />
                <span className="text-slate-300">Failed Client</span>
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
