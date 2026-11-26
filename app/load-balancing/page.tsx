'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LoadBalancingAlgorithm } from '@/lib/algorithms/loadBalancing';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { loadBalancingScenarios } from '@/visualizers/load-balancing/scenarios';
import { LoadMessage, LoadRequest, LoadWorker } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import InvariantMonitor from '@/components/InvariantMonitor';
import WireLogDrawer from '@/components/WireLogDrawer';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import { evaluateLoadBalancingInvariants } from '@/lib/invariants';
import ChaosStrip from '@/components/ChaosStrip';
import {
  ChaosConfig,
  DEFAULT_CHAOS_CONFIG,
  applyChaosToMessages,
  computeDeliveryDelay,
} from '@/lib/chaos';

export default function LoadBalancingPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lb] = useState(() => new LoadBalancingAlgorithm(4));
  const [workers, setWorkers] = useState<LoadWorker[]>(lb.getWorkers());
  const [requests, setRequests] = useState<LoadRequest[]>(lb.getRequests());
  const [messages, setMessages] = useState<LoadMessage[]>(lb.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('topology');
  const [chaos, setChaos] = useState<ChaosConfig>(DEFAULT_CHAOS_CONFIG);
  const [droppedCount, setDroppedCount] = useState(0);
  const chaosRef = useRef<ChaosConfig>(DEFAULT_CHAOS_CONFIG);

  const handleChaosChange = useCallback((next: ChaosConfig) => {
    chaosRef.current = next;
    setChaos(next);
  }, []);

  const syncVisualization = useCallback(() => {
    setWorkers([...lb.getWorkers()]);
    setRequests([...lb.getRequests()]);
    setMessages([...lb.getMessages()]);
  }, [lb]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => lb.serialize(),
      restore: (snapshot) => {
        lb.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('load-balancing', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    lb.tick();
    syncVisualization();

    const inFlight = lb.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      const delayMs = computeDeliveryDelay(400, chaosRef.current.delayMultiplier);
      simulation.scheduleTimeout(() => {
        const { dropRate } = chaosRef.current;
        const { survivors, dropped } =
          dropRate > 0
            ? applyChaosToMessages(inFlight, dropRate)
            : { survivors: inFlight, dropped: [] };
        if (dropped.length > 0) {
          setDroppedCount((c) => c + dropped.length);
        }
        survivors.forEach((msg) => lb.deliverMessage(msg.id));
        updateVisualization();
      }, delayMs);
    }
  }, [lb, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('request', (event) => {
      lb.enqueueRequest(event.data.latency || 2);
      updateVisualization();
    });

    simulation.onEvent('burst', (event) => {
      for (let i = 0; i < (event.data.count || 5); i += 1) {
        lb.enqueueRequest(event.data.latency || 2);
      }
      updateVisualization();
    });

    simulation.onEvent('tick', () => {
      lb.tick();
      updateVisualization();
    });

    simulation.onEvent('fail_worker', (event) => {
      lb.failWorker(event.data.workerId);
      updateVisualization();
    });

    simulation.onEvent('recover_worker', (event) => {
      lb.recoverWorker(event.data.workerId);
      updateVisualization();
    });
  }, [lb, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = loadBalancingScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      lb.reset();
      simulation.setEvents(scenario.events);
      syncVisualization();
    }
  };

  const sendRequest = () => {
    lb.enqueueRequest(2);
    updateVisualization();
  };

  const burst = () => {
    for (let i = 0; i < 8; i += 1) {
      lb.enqueueRequest(3);
    }
    updateVisualization();
  };

  const tick = () => {
    lb.tick();
    updateVisualization();
  };

  const toggleWorker = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) return;
    if (worker.loadStatus === 'failed') {
      lb.recoverWorker(workerId);
    } else {
      lb.failWorker(workerId);
    }
    updateVisualization();
  };

  const getWorkerColor = (worker: LoadWorker): string => {
    if (worker.loadStatus === 'failed') return SCOPE_COLORS.danger;
    if (worker.loadStatus === 'overloaded') return SCOPE_COLORS.amber;
    return SCOPE_COLORS.emerald;
  };

  const stats = lb.getStats();
  const inspectedWorker = selectedWorkerId
    ? workers.find((w) => w.id === selectedWorkerId) ?? null
    : null;
  const hubX = 420;
  const hubY = 340;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={loadBalancingScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          lb.reset();
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
          <h1 className="text-2xl font-bold text-white">Load Balancing + Backpressure</h1>
          <p className="text-slate-400 text-sm mt-1">
            Dispatch requests to workers while protecting queues
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
              Total: <span className="font-semibold text-white">{stats.totalRequests}</span>
            </span>
            <span className="text-slate-300">
              In Flight: <span className="font-semibold text-amber-400">{stats.inFlight}</span>
            </span>
            <span className="text-slate-300">
              Dropped: <span className="font-semibold text-red-400">{stats.dropped}</span>
            </span>
            <span className="text-slate-300">
              Completed: <span className="font-semibold text-green-400">{stats.completed}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Load Balancing Properties"
            checks={evaluateLoadBalancingInvariants(workers, stats)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Load Balancing + Backpressure"
              currentState={{ scenario: selectedScenario, stats }}
            />
          </div>

          <WireLogDrawer
            protocol="Load Balancing"
            scenario={selectedScenario}
            invariants={evaluateLoadBalancingInvariants(workers, stats)}
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
          <svg ref={svgRef} viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="lb" />

            {/* Dispatcher-to-worker spokes */}
            {workers.map((worker) => (
              <line
                key={`lb-spoke-${worker.id}`}
                x1={hubX}
                y1={hubY}
                x2={worker.position.x}
                y2={worker.position.y}
                stroke={
                  worker.loadStatus === 'failed'
                    ? SCOPE_COLORS.danger
                    : SCOPE_COLORS.hairline
                }
                strokeWidth="1"
                strokeDasharray={worker.loadStatus === 'failed' ? '4 4' : undefined}
                opacity={worker.loadStatus === 'failed' ? 0.35 : 0.7}
              />
            ))}

            {/* In-flight dispatch pulses */}
            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const target = workers.find((w) => w.id === message.to);
                if (!target) return null;
                return (
                  <ScopeEdge
                    key={message.id}
                    idPrefix="lb"
                    x1={hubX}
                    y1={hubY}
                    x2={target.position.x}
                    y2={target.position.y}
                    color={SCOPE_COLORS.cobalt}
                    markerKey="cobalt"
                    inset={44}
                    label="REQ"
                  />
                );
              })}

            {/* Central Load Balancer Router */}
            <ScopeNode
              x={hubX}
              y={hubY}
              radius={38}
              label="LB"
              sublabel={`${stats.inFlight} ACT`}
              topTag="DISPATCHER"
              bottomLine1={stats.dropped > 0 ? `${stats.dropped} SHED` : 'BACKPRESSURE OK'}
              accentColor={stats.dropped > 0 ? SCOPE_COLORS.signal : SCOPE_COLORS.cobalt}
              highlighted={stats.inFlight > 0}
            />

            {/* Worker nodes */}
            {workers.map((worker) => (
              <ScopeNode
                key={worker.id}
                x={worker.position.x}
                y={worker.position.y}
                radius={42}
                label={worker.id}
                sublabel={`Q${worker.queue} · P${worker.processing}`}
                topTag={worker.loadStatus.toUpperCase()}
                bottomLine1={`CAP ${worker.capacity}`}
                accentColor={getWorkerColor(worker)}
                failed={worker.loadStatus === 'failed'}
                highlighted={worker.loadStatus === 'overloaded'}
                selected={selectedWorkerId === worker.id}
                onClick={() =>
                  setSelectedWorkerId((prev) => (prev === worker.id ? null : worker.id))
                }
              />
            ))}
          </svg>
          ) : (
            <SpaceTimeScope
              svgRef={svgRef}
              title="LOAD BALANCING · DISPATCH & BACKPRESSURE TRACE"
              idPrefix="lb-st"
              actors={[
                { id: 'balancer', label: 'LB', sublabel: 'ROUTER', color: SCOPE_COLORS.cobalt },
                ...workers.map((worker) => ({
                  id: worker.id,
                  label: worker.id,
                  sublabel: worker.loadStatus.toUpperCase(),
                  color: getWorkerColor(worker),
                  failed: worker.loadStatus === 'failed',
                })),
              ]}
              frames={messages.map((msg) => ({
                id: msg.id,
                from: msg.from,
                to: msg.to,
                label: msg.type,
                color: msg.type === 'Drop' ? SCOPE_COLORS.danger : SCOPE_COLORS.cobalt,
                status: msg.status,
                dashed: msg.type === 'Drop',
              }))}
            />
          )}

          {!inspectedWorker && <WireTapHint text="Click any worker to inspect queue depth & inject faults" />}

          {inspectedWorker && (
            <WireTapInspector
              title={`WORKER ${inspectedWorker.id}`}
              subtitle="BACKPRESSURE QUEUE"
              status={
                inspectedWorker.loadStatus === 'failed'
                  ? 'failed'
                  : inspectedWorker.loadStatus === 'overloaded'
                  ? 'candidate'
                  : 'healthy'
              }
              className="top-14 left-4"
              metrics={[
                {
                  label: 'State',
                  value: inspectedWorker.loadStatus.toUpperCase(),
                  tone:
                    inspectedWorker.loadStatus === 'failed'
                      ? 'danger'
                      : inspectedWorker.loadStatus === 'overloaded'
                      ? 'amber'
                      : 'emerald',
                },
                { label: 'Queue Depth', value: inspectedWorker.queue, tone: 'cobalt' },
                { label: 'Processing', value: inspectedWorker.processing, tone: 'signal' },
                { label: 'Capacity', value: inspectedWorker.capacity },
              ]}
              actions={[
                {
                  label: 'Tick Queue',
                  onClick: tick,
                },
                inspectedWorker.loadStatus === 'failed'
                  ? {
                      label: 'Recover Worker',
                      onClick: () => toggleWorker(inspectedWorker.id),
                      variant: 'emerald',
                    }
                  : {
                      label: 'Fail Worker',
                      onClick: () => toggleWorker(inspectedWorker.id),
                      variant: 'danger',
                    },
              ]}
              onClose={() => setSelectedWorkerId(null)}
            />
          )}

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={sendRequest}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Send Request
            </button>
            <button
              onClick={burst}
              className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
            >
              Burst Requests
            </button>
            <button
              onClick={tick}
              className="w-full px-3 py-2 bg-slate-600 text-white text-sm rounded hover:bg-slate-700"
            >
              Tick
            </button>
          </div>

          <div className="absolute top-16 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-72 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Requests</h3>
            <div className="space-y-1.5">
              {requests.length === 0 ? (
                <div className="text-xs text-slate-400">No requests dispatched yet.</div>
              ) : (
                requests.slice(-10).map((req) => (
                  <div key={req.id} className="text-xs text-slate-300">
                    {req.id} ·{' '}
                    <span
                      className={
                        req.status === 'dropped'
                          ? 'text-red-400'
                          : req.status === 'done'
                          ? 'text-green-400'
                          : 'text-amber-400'
                      }
                    >
                      {req.status}
                    </span>{' '}
                    · {req.assignedTo || 'none'}
                  </div>
                ))
              )}
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
        title={topicArticles['load-balancing'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['load-balancing'].sections.map((section) => (
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
