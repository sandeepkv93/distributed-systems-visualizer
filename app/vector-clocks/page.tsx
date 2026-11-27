'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VectorClocksAlgorithm } from '@/lib/algorithms/vectorClocks';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import InvariantMonitor from '@/components/InvariantMonitor';
import WireLogDrawer from '@/components/WireLogDrawer';
import { evaluateVectorClockInvariants } from '@/lib/invariants';
import { vectorClockScenarios } from '@/visualizers/vector-clocks/scenarios';
import { VectorClockProcess, VectorClockEvent, VectorClock } from '@/lib/types';
import { motion } from 'framer-motion';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import { SCOPE_COLORS } from '@/components/ScopeSvgKit';
import ChaosStrip from '@/components/ChaosStrip';
import {
  ChaosConfig,
  DEFAULT_CHAOS_CONFIG,
  shouldDropPacket,
} from '@/lib/chaos';

export default function VectorClocksPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [vc] = useState(() => new VectorClocksAlgorithm(3));
  const [processes, setProcesses] = useState<VectorClockProcess[]>(vc.getProcesses());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showArticle, setShowArticle] = useState(false);
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
    setProcesses([...vc.getProcesses()]);
  }, [vc]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => vc.serialize(),
      restore: (snapshot) => {
        vc.restore(snapshot);
        setSelectedEvents(new Set());
        updateVisualization();
      },
    },
  });

  useScenarioCompletion('vector-clocks', selectedScenario, simulation.state);

  // Handle events
  useEffect(() => {
    simulation.onEvent('local_event', (event) => {
      vc.createLocalEvent(event.data.processId, event.data.description);
      updateVisualization();
    });

    simulation.onEvent('send_message', (event) => {
      vc.sendMessage(event.data.from, event.data.to, event.data.message);
      updateVisualization();
    });

    simulation.onEvent('receive_message', (event) => {
      if (chaosRef.current.dropRate > 0 && shouldDropPacket(chaosRef.current.dropRate)) {
        setDroppedCount((c) => c + 1);
        updateVisualization();
        return;
      }
      const currentEvents = vc.getAllEvents();
      let sendEvent: VectorClockEvent | undefined;
      if (event.data.sendEventId) {
        sendEvent = currentEvents.find((e) => e.id === event.data.sendEventId);
      }
      if (!sendEvent) {
        for (let i = currentEvents.length - 1; i >= 0; i--) {
          if (currentEvents[i].type === 'send') {
            sendEvent = currentEvents[i];
            break;
          }
        }
      }
      if (sendEvent) {
        vc.receiveMessage(event.data.to, sendEvent.vectorClock, sendEvent.id, event.data.message);
      }
      updateVisualization();
    });

    simulation.onEvent('fail_process', (event) => {
      vc.failProcess(event.data.processId);
      updateVisualization();
    });

    simulation.onEvent('recover_process', (event) => {
      vc.recoverProcess(event.data.processId);
      updateVisualization();
    });
  }, [vc, simulation, updateVisualization]);

  // Handle scenario selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = vectorClockScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      vc.reset();
      setSelectedEvents(new Set());
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  // Handle event selection
  const toggleEventSelection = (eventId: string) => {
    const newSelection = new Set(selectedEvents);
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId);
    } else {
      if (newSelection.size < 2) {
        newSelection.add(eventId);
      } else {
        newSelection.clear();
        newSelection.add(eventId);
      }
    }
    setSelectedEvents(newSelection);
  };

  // Compare selected events
  const getEventComparison = (): string => {
    if (selectedEvents.size !== 2) return '';

    const [eventId1, eventId2] = Array.from(selectedEvents);
    const relation = vc.compareEvents(eventId1, eventId2);

    switch (relation) {
      case 'before':
        return `${eventId1} happened before ${eventId2}`;
      case 'after':
        return `${eventId1} happened after ${eventId2}`;
      case 'concurrent':
        return `${eventId1} and ${eventId2} are concurrent`;
      default:
        return 'Unknown relationship';
    }
  };

  // Manual controls
  const createLocalEvent = (processId: string) => {
    vc.createLocalEvent(processId, 'User event');
    updateVisualization();
  };

  const sendMessage = (fromId: string, toId: string) => {
    const sendEvent = vc.sendMessage(fromId, toId, `${fromId}→${toId}`);
    if (sendEvent) {
      // Auto-receive after delay
      simulation.scheduleTimeout(() => {
        vc.receiveMessage(toId, sendEvent.vectorClock, sendEvent.id, `${fromId}→${toId}`);
        updateVisualization();
      }, 100);
    }
    updateVisualization();
  };

  // Helper to format vector clock
  const formatClock = (clock: VectorClock): string => {
    const keys = Object.keys(clock).sort();
    return `[${keys.map((k) => clock[k]).join(', ')}]`;
  };

  // Get event color based on type
  const getEventColor = (event: VectorClockEvent): string => {
    if (selectedEvents.has(event.id)) return '#FBBF24'; // amber if selected
    switch (event.type) {
      case 'local':
        return '#60A5FA'; // cobalt
      case 'send':
        return '#34D399'; // emerald
      case 'receive':
        return '#D9441E'; // signal vermilion
      default:
        return '#9E9B90';
    }
  };

  const stats = vc.getStats();

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      {/* Control Panel */}
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={vectorClockScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          vc.reset();
          setSelectedEvents(new Set());
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
          <h1 className="text-2xl font-bold text-white">Vector Clocks</h1>
          <p className="text-slate-400 text-sm mt-1">
            Tracking causality and detecting concurrent events in distributed systems
          </p>
          <div className="mt-3">
            <button
              onClick={() => setShowArticle(true)}
              className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
            >
              Read the theory
            </button>
          </div>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-slate-300">
              Total Events: <span className="font-semibold text-white">{stats.totalEvents}</span>
            </span>
            <span className="text-slate-300">
              Concurrent Pairs:{' '}
              <span className="font-semibold text-amber-400">{stats.concurrentPairs}</span>
            </span>
          </div>
        </div>

        {/* Visualization Canvas */}
        <div className="flex-1 relative bg-slate-900 overflow-auto p-6 min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Vector Clock Causality"
            checks={evaluateVectorClockInvariants(processes, stats.concurrentPairs)}
          />
          <ScopeModeToggle
            mode={scopeMode}
            onChange={setScopeMode}
            frameCount={vc.getAllEvents().length}
          />
          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Vector Clocks"
              currentState={{
                scenario: selectedScenario,
                stats,
                processes: processes.map((p) => ({
                  id: p.id,
                  status: p.status,
                  clock: p.vectorClock,
                  events: p.events.length,
                })),
              }}
            />
          </div>

          <WireLogDrawer
            protocol="Vector Clocks"
            scenario={selectedScenario}
            invariants={evaluateVectorClockInvariants(processes, stats.concurrentPairs)}
            frames={(() => {
              const allEvents = vc.getAllEvents();
              const byId = new Map(allEvents.map((e) => [e.id, e]));
              return allEvents
                .filter((evt) => evt.type !== 'send')
                .map((evt) => {
                  const sender = evt.relatedEvent ? byId.get(evt.relatedEvent) : undefined;
                  const isRecv = evt.type === 'receive' && Boolean(sender);
                  return {
                    id: evt.id,
                    from: isRecv && sender ? sender.processId : evt.processId,
                    to: evt.processId,
                    type: isRecv ? 'MSG' : 'LOCAL',
                    status: 'success',
                    detail: formatClock(evt.vectorClock),
                  };
                });
            })()}
          />
          {scopeMode === 'spacetime' ? (
            <div className="w-full h-full min-h-[420px]">
              <SpaceTimeScope
                svgRef={svgRef}
                title="VECTOR CLOCKS · CAUSAL SPACE-TIME TRACE"
                idPrefix="vc-st"
                actors={processes.map((proc) => ({
                  id: proc.id,
                  label: proc.id,
                  sublabel: formatClock(proc.vectorClock),
                  color: proc.status === 'failed' ? SCOPE_COLORS.danger : SCOPE_COLORS.cobalt,
                  failed: proc.status === 'failed',
                }))}
                frames={(() => {
                  const allEvents = vc.getAllEvents();
                  const byId = new Map(allEvents.map((e) => [e.id, e]));
                  return allEvents
                    .filter((evt) => evt.type !== 'send')
                    .map((evt) => {
                      const sender = evt.relatedEvent ? byId.get(evt.relatedEvent) : undefined;
                      const isRecv = evt.type === 'receive' && Boolean(sender);
                      return {
                        id: evt.id,
                        from: isRecv && sender ? sender.processId : evt.processId,
                        to: evt.processId,
                        label: isRecv
                          ? `MSG ${formatClock(evt.vectorClock)}`
                          : `LOCAL ${formatClock(evt.vectorClock)}`,
                        color: isRecv ? SCOPE_COLORS.emerald : SCOPE_COLORS.cobalt,
                        status: 'success' as const,
                      };
                    });
                })()}
              />
            </div>
          ) : (
            <>
              <svg ref={svgRef} aria-hidden="true" className="hidden" width="1200" height="800" viewBox="0 0 1200 800">
                <rect width="1200" height="800" fill="#111413" />
                <text x="40" y="70" fill="#F4F0E8" fontSize="38" fontWeight="700">
                  Vector Clocks
                </text>
                <text x="40" y="115" fill="#9E9B90" fontSize="20">
                  Scenario: {selectedScenario || 'manual'}
                </text>
                <text x="40" y="160" fill="#F4F0E8" fontSize="24">
                  Summary
                </text>
                <text x="40" y="200" fill="#60A5FA" fontSize="20">
                  Total Events: {stats.totalEvents}
                </text>
                <text x="300" y="200" fill="#FBBF24" fontSize="20">
                  Concurrent Pairs: {stats.concurrentPairs}
                </text>
              </svg>
              {/* Process timelines */}
              <div className="space-y-14 max-w-5xl pt-10">
            {processes.map((process, processIndex) => (
              <div key={process.id} className="relative">
                {/* Process label and current clock */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 border-2 flex items-center justify-center font-mono text-xs font-bold bg-[#171C1A] ${
                        process.status === 'failed'
                          ? 'border-[#F87171] text-[#F87171]'
                          : 'border-[#60A5FA] text-[#F4F0E8]'
                      }`}
                    >
                      {process.id}
                    </div>
                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-[#F4F0E8] font-semibold">
                        Process {process.id}
                      </div>
                      <div className="font-mono text-xs text-[#9E9B90] tabular-nums">
                        VC = <span className="text-[#34D399]">{formatClock(process.vectorClock)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#9E9B90]">
                    {process.events.length} EVENT{process.events.length === 1 ? '' : 'S'}
                  </div>
                </div>

                {/* Oscilloscope timeline lane */}
                <div className="relative h-24 bg-[#161A18] border border-[rgba(244,240,232,0.14)]">
                  {/* Calibrated rail line */}
                  <div className="absolute top-1/2 left-4 right-4 h-px bg-[rgba(244,240,232,0.2)]" />

                  {/* Events */}
                  {process.events.map((event, eventIndex) => {
                    const xPos = 56 + eventIndex * 124;
                    const eventColor = getEventColor(event);
                    const isSelected = selectedEvents.has(event.id);
                    return (
                      <motion.div
                        key={event.id}
                        className="absolute"
                        style={{
                          left: `${xPos}px`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.25 }}
                      >
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={`${isSelected ? 'Deselect' : 'Select'} ${process.id} ${event.type} event at vector clock ${formatClock(event.vectorClock)}`}
                          className="cursor-pointer group relative bg-transparent border-0 p-0 block rounded-full focus-visible:outline-2 focus-visible:outline-[#F4F0E8] focus-visible:outline-offset-2"
                          onClick={() => toggleEventSelection(event.id)}
                        >
                          {/* Double-ring event pin */}
                          <span
                            className={`w-8 h-8 rounded-full bg-[#111413] flex items-center justify-center transition-transform group-hover:scale-110 ${
                              isSelected ? 'ring-2 ring-[#FBBF24] ring-offset-2 ring-offset-[#161A18]' : ''
                            }`}
                            style={{ border: `2px solid ${eventColor}` }}
                          >
                            <span
                              className="font-mono text-[11px] font-bold"
                              style={{ color: eventColor }}
                            >
                              {event.type[0].toUpperCase()}
                            </span>
                          </span>

                          {/* Monospace vector clock chip */}
                          <span className="block absolute top-10 left-1/2 -translate-x-1/2 bg-[#111413] border border-[rgba(244,240,232,0.18)] px-2 py-0.5 text-[11px] whitespace-nowrap">
                            <span className="block text-[#F4F0E8] font-mono tabular-nums">
                              {formatClock(event.vectorClock)}
                            </span>
                            <span className="block text-[#9E9B90] font-mono text-[9px] uppercase text-center">
                              {event.type}
                            </span>
                          </span>
                        </button>

                        {/* Causal message arrow */}
                        {event.type === 'send' && event.relatedEvent && (
                          <svg
                            aria-hidden="true"
                            className="absolute pointer-events-none"
                            style={{
                              left: '16px',
                              top: '16px',
                              width: '120px',
                              height: `${(processIndex + 1) * 120}px`,
                            }}
                          >
                            <defs>
                              <marker
                                id={`vc-arrow-${event.id}`}
                                markerWidth="8"
                                markerHeight="6"
                                refX="7"
                                refY="3"
                                orient="auto"
                              >
                                <polygon points="0 0, 8 3, 0 6" fill="#34D399" />
                              </marker>
                            </defs>
                            <line
                              x1="0"
                              y1="0"
                              x2="60"
                              y2={`${(processIndex + 1) * 120 - 40}`}
                              stroke="#34D399"
                              strokeWidth="1.6"
                              strokeDasharray="4 4"
                              markerEnd={`url(#vc-arrow-${event.id})`}
                            />
                          </svg>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Comparison result */}
          {selectedEvents.size === 2 && (
            <div className="mt-10 max-w-2xl bg-[#181C1A] border border-[#FBBF24] p-4 font-mono">
              <div className="text-[10px] uppercase tracking-widest text-[#FBBF24] mb-1">
                Causal Ordering Comparison
              </div>
              <p className="text-sm text-[#F4F0E8]">{getEventComparison()}</p>
            </div>
          )}
            </>
          )}

          {/* Manual controls */}
          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2">
            <h3 className="text-sm font-semibold text-white mb-2">Manual Controls</h3>
            {processes.map((process) => (
              <button
                key={`local-${process.id}`}
                onClick={() => createLocalEvent(process.id)}
                className="w-full px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                disabled={process.status === 'failed'}
              >
                {process.id}: Local Event
              </button>
            ))}
            <div className="border-t border-slate-700 pt-2 mt-2">
              <p className="text-xs text-slate-400 mb-2">Send Message:</p>
              <button
                onClick={() => sendMessage('P0', 'P1')}
                className="w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mb-1"
              >
                P0 → P1
              </button>
              <button
                onClick={() => sendMessage('P1', 'P2')}
                className="w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mb-1"
              >
                P1 → P2
              </button>
              <button
                onClick={() => sendMessage('P2', 'P0')}
                className="w-full px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                P2 → P0
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">Click 2 events to compare causality</p>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Event Pins</h3>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-[#60A5FA] bg-[#111413]" />
                <span className="text-slate-300">Local (L)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-[#34D399] bg-[#111413]" />
                <span className="text-slate-300">Send (S)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-[#D9441E] bg-[#111413]" />
                <span className="text-slate-300">Receive (R)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-[#FBBF24] bg-[#111413]" />
                <span className="text-slate-300">Selected</span>
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
        title={topicArticles['vector-clocks'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['vector-clocks'].sections.map((section) => (
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
