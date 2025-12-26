import { useState, useEffect, useCallback } from 'react';
import {
  getProgress,
  markConceptCompleted,
  markScenarioCompleted,
  saveQuizScore,
  startSession,
  endSession,
  getAllAchievements,
  getProgressStats,
  resetProgress,
} from '@/lib/progress';
import { UserProgress } from '@/lib/types';

export function useProgress(concept?: string) {
  const [progress, setProgress] = useState<UserProgress>(getProgress());
  const [achievements, setAchievements] = useState(getAllAchievements());
  const [stats, setStats] = useState(getProgressStats());

  // Refresh progress from localStorage
  const refresh = useCallback(() => {
    setProgress(getProgress());
    setAchievements(getAllAchievements());
    setStats(getProgressStats());
  }, []);

  // Start session tracking
  useEffect(() => {
    if (concept) {
      startSession(concept);

      return () => {
        endSession();
        refresh();
      };
    }
  }, [concept, refresh]);

  // Complete a concept
  const completeConcept = useCallback(
    (conceptName: string) => {
      markConceptCompleted(conceptName);
      refresh();
    },
    [refresh]
  );

  // Complete a scenario
  const completeScenario = useCallback(
    (scenarioId: string) => {
      markScenarioCompleted(scenarioId);
      refresh();
    },
    [refresh]
  );

  // Save a quiz score
  const recordQuizScore = useCallback(
    (quizId: string, score: number) => {
      saveQuizScore(quizId, score);
      refresh();
    },
    [refresh]
  );

  // Reset all progress
  const reset = useCallback(() => {
    resetProgress();
    refresh();
  }, [refresh]);

  return {
    progress,
    achievements,
    stats,
    completeConcept,
    completeScenario,
    recordQuizScore,
    reset,
    refresh,
  };
}
