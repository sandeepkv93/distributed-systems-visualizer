'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  Link2,
  ArrowRight,
} from 'lucide-react';
import { Scenario, SimulationEvent } from '@/lib/types';
import { getCheckpointForScenario } from '@/lib/checkpoints';
import {
  buildScenarioDeepLinkUrl,
  clampDeepLinkStep,
  parseScenarioDeepLink,
} from '@/lib/deeplink';
import { getTrackContextForConcept } from '@/lib/tracks';
import { showToast } from '@/lib/toast';
import PredictionCheckpoint from './PredictionCheckpoint';

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
  const pathname = usePathname();
  const [showObjectives, setShowObjectives] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const deepLinkInitializedRef = useRef(false);
  const pendingDeepLinkStepRef = useRef<number | null>(null);
  const pendingDeepLinkScenarioRef = useRef<string | null>(null);
  const activeStepButtonRef = useRef<HTMLButtonElement | null>(null);

  const conceptId = pathname?.replace(/^\/|\/$/g, '') || '';

  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === selectedScenario) ?? null,
    [scenarios, selectedScenario]
  );

  const nextScenario = useMemo(() => {
    if (!selectedScenario || scenarios.length < 2) return null;
    const idx = scenarios.findIndex((s) => s.id === selectedScenario);
    if (idx === -1 || idx >= scenarios.length - 1) return null;
    return scenarios[idx + 1];
  }, [scenarios, selectedScenario]);

  const nextPlate = useMemo(() => {
    if (!conceptId) return null;
    return getTrackContextForConcept(conceptId)?.next ?? null;
  }, [conceptId]);

  const activeCheckpoint = useMemo(() => {
    if (!conceptId || !selectedScenario) return null;
    return getCheckpointForScenario(conceptId, selectedScenario);
  }, [conceptId, selectedScenario]);

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

  // Hydrate `?scenario=<id>&step=<n>` once on mount (static-export safe)
  useEffect(() => {
    if (deepLinkInitializedRef.current || typeof window === 'undefined') return;
    if (scenarios.length === 0 || !onScenarioChange) {
      deepLinkInitializedRef.current = true;
      return;
    }

    deepLinkInitializedRef.current = true;
    const { scenarioId, step } = parseScenarioDeepLink(window.location.search);
    if (!scenarioId) return;

    const matched = scenarios.find((s) => s.id === scenarioId);
    if (!matched) return;

    pendingDeepLinkScenarioRef.current = matched.id;
    pendingDeepLinkStepRef.current = step;
    if (selectedScenario !== matched.id) {
      onScenarioChange(matched.id);
    }
  }, [scenarios, selectedScenario, onScenarioChange]);

  // Apply queued `?step=<n>` once the deep-linked scenario's events are mounted
  useEffect(() => {
    if (pendingDeepLinkStepRef.current === null) return;
    if (
      pendingDeepLinkScenarioRef.current &&
      selectedScenario !== pendingDeepLinkScenarioRef.current
    ) {
      return;
    }
    if (totalEvents === 0 || !onJumpToStep) return;

    const targetStep = clampDeepLinkStep(pendingDeepLinkStepRef.current, totalEvents);
    pendingDeepLinkStepRef.current = null;
    pendingDeepLinkScenarioRef.current = null;

    if (targetStep > 0) {
      onJumpToStep(targetStep);
    }
  }, [selectedScenario, totalEvents, onJumpToStep]);

  // Keep URL query params synchronized with active scenario & step index for one-click sharing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!deepLinkInitializedRef.current || pendingDeepLinkStepRef.current !== null) return;

    const nextUrl = buildScenarioDeepLinkUrl(
      window.location.href,
      selectedScenario,
      resolvedIndex
    );
    if (nextUrl !== window.location.href) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [selectedScenario, resolvedIndex]);

  // Keep the active step visible inside the Event Tape scroll container
  useEffect(() => {
    if (isCollapsed || totalEvents === 0) return;
    const el = activeStepButtonRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [resolvedIndex, isCollapsed, totalEvents]);

  const canStepBackward = totalEvents > 0 && resolvedIndex > 0;
  const canStepForward = totalEvents > 0 && resolvedIndex < totalEvents;
  const canPlay = totalEvents > 0 && resolvedIndex < totalEvents;
  const isComplete = totalEvents > 0 && resolvedIndex >= totalEvents;

  const lastExecutedEvent =
    resolvedIndex > 0 && resolvedIndex <= totalEvents ? timelineEvents[resolvedIndex - 1] : null;
  const nextEvent =
    resolvedIndex >= 0 && resolvedIndex < totalEvents ? timelineEvents[resolvedIndex] : null;

  const handleCopyDeepLink = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = buildScenarioDeepLinkUrl(
      window.location.href,
      selectedScenario,
      resolvedIndex
    );
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast('Link to this exact simulation step copied.', 'success');
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      showToast('Unable to copy link in this browser context.', 'error');
    }
  };

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
  }, [
    isPlaying,
    canPlay,
    canStepForward,
    canStepBackward,
    onPlay,
    onPause,
    onStepForward,
    onStepBackward,
    onReset,
  ]);

  if (isCollapsed) {
    return (
      <aside
        aria-label="Collapsed Instrument Deck"
        className="bg-[var(--chassis)] text-[var(--ink)] border-b md:border-b-0 md:border-r border-[var(--rule)] w-full md:w-[54px] flex-shrink-0 flex md:flex-col items-center justify-between gap-2 px-3 py-2 md:py-3 md:px-0"
      >
        <div className="flex md:flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="p-2 bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] text-[var(--ink)] transition-colors cursor-pointer"
            title="Expand Instrument Deck"
            aria-label="Expand Instrument Deck"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>

          <div className="flex md:flex-col items-center gap-1">
            <button
              type="button"
              onClick={onStepBackward}
              disabled={!canStepBackward}
              className="p-2 bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Step Backward (←)"
              aria-label="Step Backward"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {isPlaying ? (
              <button
                type="button"
                onClick={onPause}
                className="p-2 bg-[var(--ink)] text-[var(--paper-elevated)] cursor-pointer"
                title="Pause (Space)"
                aria-label="Pause"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlay}
                disabled={!canPlay}
                className="p-2 bg-[var(--signal)] text-[#FAF7F1] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                title="Play (Space)"
                aria-label="Play"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onStepForward}
              disabled={!canStepForward}
              className="p-2 bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Step Forward (→)"
              aria-label="Step Forward"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onReset}
              className="p-2 bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] cursor-pointer"
              title="Reset (R)"
              aria-label="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex md:flex-col items-center gap-1.5 font-mono text-[10px] tabular-nums text-[var(--ink-secondary)]">
          <span
            className={`w-2 h-2 rounded-full ${
              isPlaying
                ? 'bg-[var(--signal)]'
                : isComplete
                ? 'bg-[var(--emerald)]'
                : 'bg-[var(--ink)]/35'
            }`}
          />
          {totalEvents > 0 && (
            <span className="font-semibold text-[var(--ink)]">
              {String(resolvedIndex).padStart(2, '0')}/{String(totalEvents).padStart(2, '0')}
            </span>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-[var(--chassis)] text-[var(--ink)] border-b md:border-b-0 md:border-r border-[var(--rule)] w-full md:w-[328px] flex-shrink-0 flex flex-col max-h-[44vh] md:max-h-none md:h-full overflow-y-auto">
      {/* Instrument Deck Header Strip */}
      <div className="px-4 py-2 border-b border-[var(--rule)] bg-[var(--chassis-deep)]/65 flex items-center justify-between gap-2 font-mono text-[10px] tracking-[0.12em] uppercase text-[var(--ink-secondary)]">
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isPlaying
                ? 'bg-[var(--signal)]'
                : isComplete
                ? 'bg-[var(--emerald)]'
                : 'bg-[var(--ink)]/35'
            }`}
          />
          <span className="truncate">Instrument Deck</span>
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="tabular-nums text-[var(--ink)] font-semibold">
            {isPlaying ? 'RUNNING' : isComplete ? 'VERIFIED' : totalEvents > 0 ? 'ARMED' : 'MANUAL'}
          </span>
          <button
            type="button"
            onClick={handleCopyDeepLink}
            className="p-1 text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--paper-elevated)] border border-transparent hover:border-[var(--rule)] transition-colors cursor-pointer"
            title="Copy direct link to this scenario step"
            aria-label="Copy direct link to this scenario step"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-[var(--emerald)]" />
            ) : (
              <Link2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--paper-elevated)] border border-transparent hover:border-[var(--rule)] transition-colors cursor-pointer"
            title="Collapse Instrument Deck for wider canvas"
            aria-label="Collapse Instrument Deck"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 flex-1 flex flex-col">
        {/* Scenario Cartridge Selector */}
        {scenarios.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="scenario-select"
                className="font-mono text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--ink-secondary)]"
              >
                01 · Scenario Cartridge
              </label>
              <span className="font-mono text-[10px] text-[var(--ink-muted)] tabular-nums">
                {scenarios.length} presets
              </span>
            </div>
            <select
              id="scenario-select"
              value={selectedScenario || ''}
              onChange={(e) => onScenarioChange?.(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--paper-elevated)] text-[var(--ink)] border border-[rgba(22,22,20,0.3)] focus:border-[var(--ink)] focus:outline-none text-sm font-medium cursor-pointer"
            >
              <option value="">Select a scenario...</option>
              {scenarios.map((scenario, idx) => (
                <option key={scenario.id} value={scenario.id}>
                  {String(idx + 1).padStart(2, '0')} — {scenario.name}
                </option>
              ))}
            </select>

            {activeScenario && (
              <div className="mt-2.5 bg-[var(--paper-elevated)] border border-[var(--rule)] p-3 space-y-2.5">
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                  {activeScenario.description}
                </p>

                {activeScenario.learningObjectives.length > 0 && (
                  <div className="pt-1 border-t border-[var(--rule)]">
                    <button
                      type="button"
                      aria-expanded={showObjectives}
                      onClick={() => setShowObjectives((prev) => !prev)}
                      className="flex items-center justify-between w-full font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--cobalt)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                    >
                      <span>Objectives ({activeScenario.learningObjectives.length})</span>
                      {showObjectives ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {showObjectives && (
                      <ul className="mt-2 space-y-1.5 text-xs text-[var(--ink-secondary)] list-disc list-inside">
                        {activeScenario.learningObjectives.map((objective) => (
                          <li key={objective} className="leading-snug">
                            {objective}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {activeScenario.expectedOutcome && (
                  <div
                    className={`text-xs px-2.5 py-2 border-l-2 ${
                      isComplete
                        ? 'bg-[#0F6B50]/10 border-[var(--emerald)] text-[var(--emerald)]'
                        : 'bg-[var(--paper)] border-[var(--ink)]/35 text-[var(--ink-secondary)]'
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold block mb-0.5">
                      {isComplete ? '✓ Outcome Verified' : 'Expected Outcome'}
                    </span>
                    <span className="leading-snug block">{activeScenario.expectedOutcome}</span>

                    {/* Zero Dead-End Next Action on Scenario Completion */}
                    {isComplete && (nextScenario || nextPlate) && (
                      <div className="mt-2.5 pt-2 border-t border-[var(--emerald)]/25 flex flex-wrap items-center justify-between gap-2">
                        {nextScenario && onScenarioChange ? (
                          <button
                            type="button"
                            onClick={() => onScenarioChange(nextScenario.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--emerald)] hover:bg-[var(--ink)] text-[#FAF7F1] font-mono text-[10px] uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                          >
                            <span>Next Scenario</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : nextPlate ? (
                          <Link
                            href={nextPlate.path}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--emerald)] hover:bg-[var(--ink)] text-[#FAF7F1] font-mono text-[10px] uppercase tracking-wider font-semibold transition-colors"
                          >
                            <span>Next: PL {nextPlate.plateNumber} · {nextPlate.navName}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeCheckpoint && (
              <PredictionCheckpoint key={activeCheckpoint.id} checkpoint={activeCheckpoint} />
            )}
          </div>
        )}

        {/* Tactile Hardware Transport Deck */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--ink-secondary)]">
              02 · Transport &amp; Clock
            </span>
            <span className="font-mono text-[10px] text-[var(--ink-muted)] tabular-nums">
              {speed}× RATE
            </span>
          </div>

          <div className="grid grid-cols-4 border border-[var(--ink)] bg-[var(--paper-elevated)] divide-x divide-[var(--ink)]">
            <button
              type="button"
              onClick={onStepBackward}
              disabled={!canStepBackward}
              className="py-2.5 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--chassis)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer active:translate-y-px"
              title="Step Backward (←)"
              aria-label="Step Backward"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {isPlaying ? (
              <button
                type="button"
                onClick={onPause}
                className="col-span-2 py-2.5 bg-[var(--ink)] hover:bg-[#2C2B27] text-[var(--paper-elevated)] flex items-center justify-center gap-1.5 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer active:translate-y-px"
                title="Pause (Space)"
                aria-label="Pause"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlay}
                disabled={!canPlay}
                className="col-span-2 py-2.5 bg-[var(--signal)] hover:bg-[var(--signal-hover)] text-[#FAF7F1] disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 font-mono text-xs uppercase tracking-wider font-medium transition-colors cursor-pointer active:translate-y-px"
                title="Play (Space)"
                aria-label="Play"
              >
                <Play className="w-4 h-4" />
                <span>Run</span>
              </button>
            )}

            <button
              type="button"
              onClick={onStepForward}
              disabled={!canStepForward}
              className="py-2.5 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--chassis)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer active:translate-y-px"
              title="Step Forward (→)"
              aria-label="Step Forward"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector + Reset Row */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 grid grid-cols-4 border border-[var(--rule)] bg-[var(--paper-elevated)] divide-x divide-[var(--rule)]">
              {SPEED_OPTIONS.map((speedOption) => (
                <button
                  key={speedOption}
                  type="button"
                  aria-pressed={speed === speedOption}
                  onClick={() => onSpeedChange(speedOption)}
                  className={`py-1.5 font-mono text-[11px] tabular-nums transition-colors cursor-pointer ${
                    speed === speedOption
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)] font-semibold'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--chassis)] hover:text-[var(--ink)]'
                  }`}
                >
                  {speedOption}×
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onReset}
              className="px-2.5 py-1.5 bg-[var(--paper-elevated)] text-[var(--ink)] border border-[var(--rule)] hover:border-[var(--ink)] flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider transition-colors cursor-pointer active:translate-y-px"
              title="Reset (R)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Calibrated Scrubbable Progress Ruler & Live Step Telemetry */}
        <div>
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--ink-secondary)] mb-1.5">
            <span>03 · Progress · {Math.round(progress)}%</span>
            {totalEvents > 0 && (
              <span className="tabular-nums font-semibold text-[var(--ink)]">
                STEP {String(resolvedIndex).padStart(2, '0')}/{String(totalEvents).padStart(2, '0')}
              </span>
            )}
          </div>

          {totalEvents > 0 && onJumpToStep ? (
            <div className="relative h-5 flex items-center">
              <div className="w-full bg-[var(--paper-elevated)] border border-[var(--rule)] h-2 overflow-hidden pointer-events-none">
                <div
                  className={`h-full transition-all duration-150 ${
                    isComplete ? 'bg-[var(--emerald)]' : 'bg-[var(--signal)]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={totalEvents}
                step={1}
                value={resolvedIndex}
                onChange={(e) => onJumpToStep(Number(e.target.value))}
                aria-label="Scrub simulation timeline"
                title="Drag or click to scrub directly to any step"
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
              />
            </div>
          ) : (
            <div className="w-full bg-[var(--paper-elevated)] border border-[var(--rule)] h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isComplete ? 'bg-[var(--emerald)]' : 'bg-[var(--signal)]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {totalEvents > 0 && (
            <div
              className="mt-2 bg-[var(--paper-elevated)] border border-[var(--rule)] p-2.5 text-xs"
              aria-live="polite"
            >
              {lastExecutedEvent ? (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1 font-mono text-[10px]">
                    <span
                      className={`font-semibold uppercase tracking-wider ${
                        isComplete ? 'text-[var(--emerald)]' : 'text-[var(--signal)]'
                      }`}
                    >
                      {isComplete ? 'Sequence Complete' : `Step ${String(resolvedIndex).padStart(2, '0')}`}
                    </span>
                    <span className="text-[var(--ink-muted)] truncate">
                      {lastExecutedEvent.type}
                    </span>
                  </div>
                  <p className="text-[var(--ink)] leading-snug">{lastExecutedEvent.description}</p>
                </div>
              ) : (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--ink-secondary)]">
                    Standby · Initial State
                  </span>
                  {nextEvent && (
                    <p className="text-[var(--ink-muted)] mt-1 leading-snug">
                      Next: {nextEvent.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interactive Auto-Scrolling Event Tape Sequencer */}
        {totalEvents > 0 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="font-mono text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--ink-secondary)] mb-1.5">
              04 · Event Tape
            </div>
            <div className="border border-[var(--rule)] bg-[var(--paper-elevated)] divide-y divide-[var(--rule)] max-h-48 md:max-h-56 overflow-y-auto">
              <button
                ref={resolvedIndex === 0 ? activeStepButtonRef : null}
                type="button"
                onClick={() => onJumpToStep?.(0)}
                disabled={!onJumpToStep}
                className={`w-full text-left px-2.5 py-2 text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                  resolvedIndex === 0
                    ? 'bg-[var(--ink)] text-[var(--paper-elevated)]'
                    : 'text-[var(--ink-secondary)] hover:bg-[var(--chassis)]'
                }`}
              >
                <span
                  className={`w-5 font-mono text-[10px] tabular-nums ${
                    resolvedIndex === 0 ? 'text-[#FB923C]' : 'text-[var(--ink-muted)]'
                  }`}
                >
                  00
                </span>
                <span className="truncate font-medium">Initial State</span>
              </button>

              {timelineEvents.map((event, idx) => {
                const stepNumber = idx + 1;
                const isCurrent = resolvedIndex === stepNumber;
                const isDone = resolvedIndex > stepNumber;

                return (
                  <button
                    key={`${event.id}-${idx}`}
                    ref={isCurrent ? activeStepButtonRef : null}
                    type="button"
                    onClick={() => onJumpToStep?.(stepNumber)}
                    disabled={!onJumpToStep}
                    className={`w-full text-left px-2.5 py-2 text-xs flex items-start gap-2.5 transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--ink)] text-[var(--paper-elevated)]'
                        : isDone
                        ? 'bg-[var(--paper)]/70 text-[var(--ink)] hover:bg-[var(--chassis)]'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--chassis)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <span className="w-5 flex-shrink-0 flex items-center mt-0.5 font-mono text-[10px] tabular-nums">
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 text-[var(--emerald)] stroke-[2.5]" />
                      ) : (
                        <span className={isCurrent ? 'text-[#FB923C] font-semibold' : ''}>
                          {String(stepNumber).padStart(2, '0')}
                        </span>
                      )}
                    </span>
                    <span className="leading-snug">{event.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Signal Legend */}
        <div className="pt-3 border-t border-[var(--rule)]">
          <div className="font-mono text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--ink-muted)] mb-2">
            Signal Legend
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 font-mono text-[11px] text-[var(--ink-secondary)]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] ring-1 ring-black/15" />
              <span>Healthy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] ring-1 ring-black/15" />
              <span>Failed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] ring-1 ring-black/15" />
              <span>Active / Msg</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] ring-1 ring-black/15" />
              <span>Leader</span>
            </div>
          </div>
        </div>

        {/* Physical Keycap Shortcuts Hint */}
        <div className="pt-2.5 border-t border-[var(--rule)] flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[var(--paper-elevated)] border border-[var(--rule)] text-[var(--ink)]">
              SPACE
            </kbd>
            Play
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[var(--paper-elevated)] border border-[var(--rule)] text-[var(--ink)]">
              ←/→
            </kbd>
            Step
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[var(--paper-elevated)] border border-[var(--rule)] text-[var(--ink)]">
              R
            </kbd>
            Reset
          </span>
        </div>
      </div>
    </aside>
  );
}
