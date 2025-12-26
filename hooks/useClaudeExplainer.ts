'use client';

import { useState, useCallback } from 'react';
import { explainScenario, predictOutcome, generateQuiz, hasApiKey } from '@/lib/claude-api';
import { QuizQuestion } from '@/lib/types';

export function useClaudeExplainer(concept: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const apiKeyExists = hasApiKey();

  // Explain current state
  const explain = useCallback(
    async (currentState: any, question: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await explainScenario(concept, currentState, question);
        setExplanation(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [concept]
  );

  // Predict outcome
  const predict = useCallback(
    async (currentState: any, proposedAction: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await predictOutcome(concept, currentState, proposedAction);
        setExplanation(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [concept]
  );

  // Generate quiz
  const createQuiz = useCallback(
    async (difficulty: 'easy' | 'medium' | 'hard', count: number = 5) => {
      setIsLoading(true);
      setError(null);

      try {
        const questions = await generateQuiz(concept, difficulty, count);
        return questions;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [concept]
  );

  // Clear explanation
  const clearExplanation = useCallback(() => {
    setExplanation(null);
    setError(null);
  }, []);

  return {
    explain,
    predict,
    createQuiz,
    clearExplanation,
    explanation,
    isLoading,
    error,
    apiKeyExists,
  };
}
