'use client';

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  markConceptCompleted,
  markScenarioCompleted,
  startSession,
  endSession,
  resetProgress,
  subscribeProgress,
  getClientProgressSnapshot,
  getServerProgressSnapshot,
} from '@/lib/progress';
import { CONCEPTS_BY_ID, normalizeConceptId } from '@/lib/catalog';
import { SimulationState } from '@/lib/types';

export function useProgress(concept?: string) {
  const snapshot = useSyncExternalStore(
    subscribeProgress,
    getClientProgressSnapshot,
    getServerProgressSnapshot
  );

  // Start session tracking on mount and flush on unmount / page hide
  useEffect(() => {
    if (!concept) return;

    startSession(concept);

    const handlePageHide = () => {
      endSession();
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      endSession();
    };
  }, [concept]);

  // Complete a concept
  const completeConcept = useCallback((conceptName: string) => {
    markConceptCompleted(conceptName);
  }, []);

  // Complete a scenario
  const completeScenario = useCallback(
    (scenarioId: string, explicitConcept?: string) => {
      markScenarioCompleted(scenarioId, explicitConcept ?? concept);
    },
    [concept]
  );

  // Reset all progress
  const reset = useCallback(() => {
    resetProgress();
  }, []);

  // No-op kept for API compatibility (store updates automatically via subscriptions)
  const refresh = useCallback(() => {}, []);

  return {
    progress: snapshot.progress,
    achievements: snapshot.achievements,
    stats: snapshot.stats,
    completeConcept,
    completeScenario,
    reset,
    refresh,
  };
}

/**
 * Tracks session time for a visualizer concept and automatically marks the
 * selected scenario (and its parent concept when all scenarios finish) completed
 * once playback reaches the final event.
 */
export function useScenarioCompletion(
  concept: string,
  selectedScenario: string,
  simulationState: SimulationState
) {
  const { completeScenario } = useProgress(concept);

  useEffect(() => {
    if (!selectedScenario) return;
    if (simulationState.events.length === 0) return;
    if (simulationState.currentEventIndex < simulationState.events.length) return;

    const conceptEntry = CONCEPTS_BY_ID.get(normalizeConceptId(concept));
    const scenarioExists = conceptEntry?.scenarios.some((s) => s.id === selectedScenario);
    if (!scenarioExists) return;

    completeScenario(selectedScenario, concept);
  }, [
    concept,
    selectedScenario,
    simulationState.currentEventIndex,
    simulationState.events.length,
    completeScenario,
  ]);
}
