'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FailureDetectorsAlgorithm } from '@/lib/algorithms/failureDetectors';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { failureDetectorScenarios } from '@/visualizers/failure-detectors/scenarios';
import { FailureDetectorMessage, FailureDetectorNode } from '@/lib/types';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import InvariantMonitor from '@/components/InvariantMonitor';
import { evaluateFailureDetectorInvariants } from '@/lib/invariants';

export default function FailureDetectorsPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [fd] = useState(() => new FailureDetectorsAlgorithm(5));
  const [nodes, setNodes] = useState<FailureDetectorNode[]>(fd.getNodes());
  const [messages, setMessages] = useState<FailureDetectorMessage[]>(fd.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const syncVisualization = useCallback(() => {
    setNodes([...fd.getNodes()]);
    setMessages([...fd.getMessages()]);
  }, [fd]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => fd.serialize(),
      restore: (snapshot) => {
        fd.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('failure-detectors', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    fd.tick();
    syncVisualization();

    const inFlight = fd.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      simulation.scheduleTimeout(() => {
        inFlight.forEach((msg) => fd.deliverMessage(msg.id));
        updateVisualization();
      }, 500);
    }
  }, [fd, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('heartbeat', (event) => {
      fd.sendHeartbeat(event.data.nodeId);
      updateVisualization();
    });

    simulation.onEvent('probe', (event) => {
      fd.probe(event.data.targetId, event.data.fromId);
      updateVisualization();
    });

    simulation.onEvent('tick', () => {
      fd.tick();
      updateVisualization();
    });

    simulation.onEvent('suspect', (event) => {
      const message: FailureDetectorMessage = {
        id: `manual-suspect-${event.data.nodeId}`,
        from: 'system',
        to: event.data.nodeId,
        type: 'Suspect',
        payload: { targetId: event.data.nodeId },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      fd.getMessages().push(message);
      updateVisualization();
    });

    simulation.onEvent('confirm', (event) => {
      const message: FailureDetectorMessage = {
        id: `manual-confirm-${event.data.nodeId}`,
        from: 'system',
        to: event.data.nodeId,
        type: 'Confirm',
        payload: { targetId: event.data.nodeId },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      fd.getMessages().push(message);
      updateVisualization();
    });

    simulation.onEvent('manual_fail', (event) => {
      fd.markFailed(event.data.nodeId);
      updateVisualization();
    });
  }, [fd, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = failureDetectorScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      fd.reset();
      simulation.setEvents(scenario.events);
      syncVisualization();
    }
  };

  const heartbeatRandom = (nodeId?: string) => {
    const alive = nodes.filter((n) => n.fdStatus !== 'failed');
    const targetId =
      nodeId ?? (alive.length > 0 ? alive[Math.floor(Math.random() * alive.length)].id : null);
    if (!targetId) return;
    fd.sendHeartbeat(targetId);
    updateVisualization();
  };

  const probeRandom = (targetId?: string) => {
    if (nodes.length < 2) return;
    const target =
      (targetId && nodes.find((n) => n.id === targetId)) ||
      nodes[Math.floor(Math.random() * nodes.length)];
    const peers = nodes.filter((n) => n.id !== target.id);
    const from = peers[Math.floor(Math.random() * peers.length)];
    if (!from) return;
    fd.probe(target.id, from.id);
    updateVisualization();
  };

  const tick = () => {
    fd.tick();
    updateVisualization();
  };

  const toggleFail = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (node.fdStatus === 'failed') {
      fd.recover(nodeId);
    } else {
      fd.markFailed(nodeId);
    }
    updateVisualization();
  };

  const getNodeColor = (node: FailureDetectorNode): string => {
    if (node.fdStatus === 'failed') return SCOPE_COLORS.danger;
    if (node.fdStatus === 'suspect') return SCOPE_COLORS.amber;
    return SCOPE_COLORS.emerald;
  };

  const getMessageStyle = (
    message: FailureDetectorMessage
  ): {
    color: string;
    markerKey: 'cobalt' | 'amber' | 'emerald' | 'signal' | 'danger' | 'muted';
    label: string;
  } => {
    switch (message.type) {
      case 'Heartbeat':
        return { color: SCOPE_COLORS.cobalt, markerKey: 'cobalt', label: 'HBEAT' };
      case 'Probe':
        return { color: SCOPE_COLORS.amber, markerKey: 'amber', label: 'PROBE' };
      case 'Ack':
        return { color: SCOPE_COLORS.emerald, markerKey: 'emerald', label: 'ACK' };
      case 'Suspect':
        return { color: SCOPE_COLORS.signal, markerKey: 'signal', label: 'SUSPECT' };
      case 'Confirm':
        return { color: SCOPE_COLORS.danger, markerKey: 'danger', label: 'CONFIRM' };
      default:
        return { color: SCOPE_COLORS.inkMuted, markerKey: 'muted', label: 'MSG' };
    }
  };

  const stats = fd.getStats();
  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={failureDetectorScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          fd.reset();
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
          <h1 className="text-2xl font-bold text-white">Failure Detectors</h1>
          <p className="text-slate-400 text-sm mt-1">
            Phi accrual and SWIM-style probes signal suspicion and failure
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
              Alive: <span className="font-semibold text-green-400">{stats.alive}</span>
            </span>
            <span className="text-slate-300">
              Suspect: <span className="font-semibold text-amber-400">{stats.suspect}</span>
            </span>
            <span className="text-slate-300">
              Failed: <span className="font-semibold text-red-400">{stats.failed}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Failure Detector Properties"
            checks={evaluateFailureDetectorInvariants(stats)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Failure Detectors"
              currentState={{ scenario: selectedScenario, stats }}
            />
          </div>

          <svg ref={svgRef} viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="fd" />

            {/* SWIM membership mesh hairlines */}
            {nodes.map((a, i) =>
              nodes.slice(i + 1).map((b) => (
                <line
                  key={`fd-mesh-${a.id}-${b.id}`}
                  x1={a.position.x}
                  y1={a.position.y}
                  x2={b.position.x}
                  y2={b.position.y}
                  stroke={SCOPE_COLORS.hairlineSubtle}
                  strokeWidth="0.9"
                />
              ))
            )}

            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => {
                const fromNode = nodes.find((n) => n.id === message.from);
                const toNode = nodes.find((n) => n.id === message.to);
                if (!fromNode || !toNode) return null;
                const style = getMessageStyle(message);
                return (
                  <ScopeEdge
                    key={message.id}
                    idPrefix="fd"
                    x1={fromNode.position.x}
                    y1={fromNode.position.y}
                    x2={toNode.position.x}
                    y2={toNode.position.y}
                    color={style.color}
                    markerKey={style.markerKey}
                    inset={46}
                    label={style.label}
                    dashed={message.type === 'Probe' || message.type === 'Suspect'}
                  />
                );
              })}

            {nodes.map((node) => (
              <ScopeNode
                key={node.id}
                x={node.position.x}
                y={node.position.y}
                radius={42}
                label={node.id}
                sublabel={`φ = ${node.phi.toFixed(1)}`}
                topTag={node.fdStatus.toUpperCase()}
                bottomLine1={
                  node.fdStatus === 'failed'
                    ? 'CONFIRMED DEAD'
                    : node.fdStatus === 'suspect'
                    ? 'SUSPICION RISING'
                    : 'HEARTBEAT OK'
                }
                accentColor={getNodeColor(node)}
                failed={node.fdStatus === 'failed'}
                highlighted={node.fdStatus === 'suspect'}
                selected={selectedNodeId === node.id}
                onClick={() =>
                  setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
                }
              />
            ))}
          </svg>

          {!inspectedNode && <WireTapHint text="Click any member to inspect φ-accrual & inject probes" />}

          {inspectedNode && (
            <WireTapInspector
              title={`MEMBER ${inspectedNode.id}`}
              subtitle="PHI ACCRUAL / SWIM DETECTOR"
              status={
                inspectedNode.fdStatus === 'failed'
                  ? 'failed'
                  : inspectedNode.fdStatus === 'suspect'
                  ? 'candidate'
                  : 'healthy'
              }
              className="top-14 left-4"
              metrics={[
                {
                  label: 'FD Status',
                  value: inspectedNode.fdStatus.toUpperCase(),
                  tone:
                    inspectedNode.fdStatus === 'failed'
                      ? 'danger'
                      : inspectedNode.fdStatus === 'suspect'
                      ? 'amber'
                      : 'emerald',
                },
                {
                  label: 'Phi (φ)',
                  value: inspectedNode.phi.toFixed(2),
                  tone: inspectedNode.phi >= 4 ? 'signal' : 'cobalt',
                },
                { label: 'Last Beat', value: `t=${inspectedNode.lastHeartbeat}` },
                { label: 'Alive Peers', value: `${stats.alive}/${nodes.length}`, tone: 'emerald' },
              ]}
              actions={[
                ...(inspectedNode.fdStatus !== 'failed'
                  ? [
                      {
                        label: 'Send Heartbeat',
                        onClick: () => heartbeatRandom(inspectedNode.id),
                        variant: 'emerald' as const,
                      },
                      {
                        label: 'SWIM Probe',
                        onClick: () => probeRandom(inspectedNode.id),
                        variant: 'signal' as const,
                      },
                      {
                        label: 'Mark Failed',
                        onClick: () => toggleFail(inspectedNode.id),
                        variant: 'danger' as const,
                      },
                    ]
                  : [
                      {
                        label: 'Recover Member',
                        onClick: () => toggleFail(inspectedNode.id),
                        variant: 'emerald' as const,
                      },
                    ]),
              ]}
              onClose={() => setSelectedNodeId(null)}
            />
          )}

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={() => heartbeatRandom()}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Heartbeat Random
            </button>
            <button
              onClick={() => probeRandom()}
              className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
            >
              Probe Random
            </button>
            <button
              onClick={tick}
              className="w-full px-3 py-2 bg-slate-600 text-white text-sm rounded hover:bg-slate-700"
            >
              Tick Time
            </button>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['failure-detectors'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['failure-detectors'].sections.map((section) => (
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
