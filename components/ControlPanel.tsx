'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Keyboard,
} from 'lucide-react';
import { Scenario, SimulationEvent } from '@/lib/types';

interface ControlPanelProps {
  isPlaying: boolean;
  speed: number;
  progress: number;
  scenarios?: Scenario[];
  selectedScenario?: string;
  currentEventIndex?: number;
  events?: SimulationEvent[];
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onScenarioChange?: (scenarioId: string) => void;
  onJumpToStep?: (stepIndex: number) => void;
}

const SPEED_OPTIONS = [0.5, 1, 2, 5];

export default function ControlPanel({
  isPlaying,
  speed,
  progress,
  scenarios = [],
  selectedScenario,
  currentEventIndex,
  events,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  onSpeedChange,
  onScenarioChange,
  onJumpToStep,
}: ControlPanelProps) {
  const [showObjectives, setShowObjectives] = useState(false);

  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === selectedScenario) ?? null,
    [scenarios, selectedScenario]
  );

  const timelineEvents = useMemo(
    () => (events && events.length > 0 ? events : activeScenario?.events ?? []),
    [events, activeScenario]
  );

  const totalEvents = timelineEvents.length;
  const resolvedIndex =
    typeof currentEventIndex === 'number'
      ? currentEventIndex
      : totalEvents > 0
      ? Math.round((progress / 100) * totalEvents)
      : 0;

  const canStepBackward = totalEvents > 0 && resolvedIndex > 0;
  const canStepForward = totalEvents > 0 && resolvedIndex < totalEvents;
  const canPlay = totalEvents > 0 && resolvedIndex < totalEvents;
  const isComplete = totalEvents > 0 && resolvedIndex >= totalEvents;

  const lastExecutedEvent =
    resolvedIndex > 0 && resolvedIndex <= totalEvents ? timelineEvents[resolvedIndex - 1] : null;
  const nextEvent =
    resolvedIndex >= 0 && resolvedIndex < totalEvents ? timelineEvents[resolvedIndex] : null;

  // Keyboard shortcuts: Space (Play/Pause), Left/Right arrows (Step), R (Reset)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.code === 'Space') {
        if (isPlaying) {
          event.preventDefault();
          onPause();
        } else if (canPlay) {
          event.preventDefault();
          onPlay();
        }
      } else if (event.key === 'ArrowRight' && canStepForward) {
        event.preventDefault();
        onStepForward();
      } else if (event.key === 'ArrowLeft' && canStepBackward) {
        event.preventDefault();
        onStepBackward();
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        onReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, canPlay, canStepForward, canStepBackward, onPlay, onPause, onStepForward, onStepBackward, onReset]);

  return (
    <aside className="bg-slate-800 border-b md:border-b-0 md:border-r border-slate-700 p-4 space-y-5 w-full md:w-80 flex-shrink-0 flex flex-col max-h-[45vh] md:max-h-none md:h-full overflow-y-auto">
      {/* Scenario Selector */}
      {scenarios.length > 0 && (
        <div>
          <label htmlFor="scenario-select" className="block text-sm font-medium text-slate-300 mb-2">
            Scenario
          </label>
          <select
            id="scenario-select"
            value={selectedScenario || ''}
            onChange={(e) => onScenarioChange?.(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:border-blue-500 text-sm"
          >
            <option value="">Select a scenario...</option>
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>

          {activeScenario && (
            <div className="mt-2.5 bg-slate-900/60 border border-slate-700 rounded-lg p-3 space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">{activeScenario.description}</p>

              {activeScenario.learningObjectives.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowObjectives((prev) => !prev)}
                    className="flex items-center justify-between w-full text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Learning objectives ({activeScenario.learningObjectives.length})</span>
                    {showObjectives ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {showObjectives && (
                    <ul className="mt-1.5 space-y-1 text-xs text-slate-300 list-disc list-inside">
                      {activeScenario.learningObjectives.map((objective) => (
                        <li key={objective}>{objective}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeScenario.expectedOutcome && (
                <div
                  className={`text-xs rounded px-2 py-1.5 border ${
                    isComplete
                      ? 'bg-green-900/30 border-green-600/70 text-green-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="font-semibold">Expected outcome:</span>{' '}
                  {activeScenario.expectedOutcome}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Speed Control */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Speed: {speed}x
        </label>
        <div className="flex gap-2">
          {SPEED_OPTIONS.map((speedOption) => (
            <button
              key={speedOption}
              type="button"
              onClick={() => onSpeedChange(speedOption)}
              className={`flex-1 px-2 py-1 rounded text-sm transition-colors ${
                speed === speedOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {speedOption}x
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Controls</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onStepBackward}
            disabled={!canStepBackward}
            className="p-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            title="Step Backward (←)"
            aria-label="Step Backward"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {isPlaying ? (
            <button
              type="button"
              onClick={onPause}
              className="p-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center transition-colors"
              title="Pause (Space)"
              aria-label="Pause"
            >
              <Pause className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onPlay}
              disabled={!canPlay}
              className="p-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              title="Play (Space)"
              aria-label="Play"
            >
              <Play className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onStepForward}
            disabled={!canStepForward}
            className="p-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            title="Step Forward (→)"
            aria-label="Step Forward"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="w-full mt-2 p-2 bg-slate-700 text-white rounded hover:bg-slate-600 flex items-center justify-center gap-2 text-sm transition-colors"
          title="Reset (R)"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Progress Bar & Current Step */}
      <div>
        <div className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
          <span>
            Progress: {Math.round(progress)}%
          </span>
          {totalEvents > 0 && (
            <span className="text-xs text-slate-400">
              Step {resolvedIndex}/{totalEvents}
            </span>
          )}
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isComplete ? 'bg-green-500' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {totalEvents > 0 && (
          <div className="mt-2.5 bg-slate-900/70 border border-slate-700 rounded-lg p-2.5 text-xs">
            {lastExecutedEvent ? (
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="font-semibold text-blue-400">
                    {isComplete ? 'Completed' : `Step ${resolvedIndex}`}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {lastExecutedEvent.type}
                  </span>
                </div>
                <p className="text-slate-200">{lastExecutedEvent.description}</p>
              </div>
            ) : (
              <div>
                <span className="font-semibold text-slate-300">Ready to start</span>
                {nextEvent && (
                  <p className="text-slate-400 mt-0.5">Next: {nextEvent.description}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Event Timeline */}
      {totalEvents > 0 && (
        <div className="flex-1 min-h-0 flex flex-col">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Event Timeline
          </label>
          <div className="space-y-1 max-h-48 md:max-h-56 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => onJumpToStep?.(0)}
              disabled={!onJumpToStep}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                resolvedIndex === 0
                  ? 'bg-blue-600/30 border border-blue-500 text-white'
                  : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700 border border-transparent'
              }`}
            >
              <span className="w-4 text-center font-mono text-[10px] text-slate-400">0</span>
              <span className="truncate">Initial State</span>
            </button>

            {timelineEvents.map((event, idx) => {
              const stepNumber = idx + 1;
              const isCurrent = resolvedIndex === stepNumber;
              const isDone = resolvedIndex > stepNumber;

              return (
                <button
                  key={`${event.id}-${idx}`}
                  type="button"
                  onClick={() => onJumpToStep?.(stepNumber)}
                  disabled={!onJumpToStep}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-start gap-2 transition-colors ${
                    isCurrent
                      ? 'bg-blue-600/30 border border-blue-500 text-white'
                      : isDone
                      ? 'bg-slate-700/60 text-slate-200 hover:bg-slate-700 border border-transparent'
                      : 'bg-slate-900/40 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span className="w-4 flex-shrink-0 flex items-center justify-center mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <span className="font-mono text-[10px]">{stepNumber}</span>
                    )}
                  </span>
                  <span className="leading-snug">{event.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Legend</label>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-400">Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-400">Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-400">Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-slate-400">Leader</span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="pt-2 border-t border-slate-700 text-[11px] text-slate-400 flex items-center gap-1.5">
        <Keyboard className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
        <span>Space: Play/Pause · ←/→: Step · R: Reset</span>
      </div>
    </aside>
  );
}
