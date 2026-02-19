'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VectorClocksAlgorithm } from '@/lib/algorithms/vectorClocks';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { vectorClockScenarios } from '@/visualizers/vector-clocks/scenarios';
import { VectorClockProcess, VectorClockEvent, VectorClock } from '@/lib/types';
import { motion } from 'framer-motion';

export default function VectorClocksPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [vc] = useState(() => new VectorClocksAlgorithm(3));
  const [processes, setProcesses] = useState<VectorClockProcess[]>(vc.getProcesses());
  const [allEvents, setAllEvents] = useState<VectorClockEvent[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [lastSendEvent, setLastSendEvent] = useState<VectorClockEvent | null>(null);
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);

  // Update visualization
  const updateVisualization = useCallback(() => {
    setProcesses([...vc.getProcesses()]);
    setAllEvents([...vc.getAllEvents()]);
  }, [vc]);

  // Handle events
  useEffect(() => {
    simulation.onEvent('local_event', (event) => {
      vc.createLocalEvent(event.data.processId, event.data.description);
      updateVisualization();
    });

    simulation.onEvent('send_message', (event) => {
      const sendEvent = vc.sendMessage(event.data.from, event.data.to, event.data.message);
      if (sendEvent) {
        setLastSendEvent(sendEvent);
      }
      updateVisualization();
    });

    simulation.onEvent('receive_message', (event) => {
      const sendEvent = lastSendEvent || allEvents.find((e) => e.id === event.data.sendEventId);
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
  }, [vc, simulation, updateVisualization, lastSendEvent, allEvents]);

  // Handle scenario selection
  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = vectorClockScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      vc.reset();
      setLastSendEvent(null);
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
      setTimeout(() => {
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
    if (selectedEvents.has(event.id)) return '#F59E0B'; // amber if selected
    switch (event.type) {
      case 'local':
        return '#3B82F6'; // blue
      case 'send':
        return '#10B981'; // green
      case 'receive':
        return '#8B5CF6'; // purple
      default:
        return '#6B7280';
    }
  };

  const stats = vc.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
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
          setLastSendEvent(null);
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
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
        <div className="flex-1 relative bg-slate-900 overflow-auto p-6">
          {/* Process timelines */}
          <div className="space-y-12">
            {processes.map((process, processIndex) => (
              <div key={process.id} className="relative">
                {/* Process label and current clock */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                        process.status === 'failed' ? 'bg-red-600' : 'bg-blue-600'
                      }`}
                    >
                      {process.id}
                    </div>
                    <div>
                      <div className="text-white font-semibold">{process.id}</div>
                      <div className="text-sm text-slate-400">
                        Clock: {formatClock(process.vectorClock)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative h-20 bg-slate-800 rounded-lg border border-slate-700">
                  {/* Timeline line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-600" />

                  {/* Events */}
                  {process.events.map((event, eventIndex) => {
                    const xPos = 50 + eventIndex * 120;
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
                        transition={{ duration: 0.3 }}
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => toggleEventSelection(event.id)}
                        >
                          {/* Event circle */}
                          <div
                            className="w-8 h-8 rounded-full border-4 border-slate-900 flex items-center justify-center"
                            style={{ backgroundColor: getEventColor(event) }}
                          >
                            <span className="text-xs text-white font-bold">
                              {event.type[0].toUpperCase()}
                            </span>
                          </div>

                          {/* Event info */}
                          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                            <div className="text-white font-mono">
                              {formatClock(event.vectorClock)}
                            </div>
                            <div className="text-slate-300">{event.type}</div>
                          </div>
                        </div>

                        {/* Message arrow */}
                        {event.type === 'send' && event.relatedEvent && (
                          <svg
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
                                id="arrowhead"
                                markerWidth="10"
                                markerHeight="7"
                                refX="9"
                                refY="3.5"
                                orient="auto"
                              >
                                <polygon
                                  points="0 0, 10 3.5, 0 7"
                                  fill="#10B981"
                                />
                              </marker>
                            </defs>
                            <line
                              x1="0"
                              y1="0"
                              x2="60"
                              y2={`${(processIndex + 1) * 120 - 40}`}
                              stroke="#10B981"
                              strokeWidth="2"
                              strokeDasharray="5,5"
                              markerEnd="url(#arrowhead)"
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
            <div className="mt-6 bg-amber-900/20 border border-amber-700 rounded-lg p-4">
              <h3 className="text-amber-400 font-semibold mb-2">Event Comparison</h3>
              <p className="text-white">{getEventComparison()}</p>
            </div>
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
            <p className="text-xs text-slate-400 mt-2">Click events to compare</p>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-2">Event Types</h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-600" />
                <span className="text-slate-400">Local (L)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600" />
                <span className="text-slate-400">Send (S)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-600" />
                <span className="text-slate-400">Receive (R)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-600" />
                <span className="text-slate-400">Selected</span>
              </div>
            </div>
          </div>
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
