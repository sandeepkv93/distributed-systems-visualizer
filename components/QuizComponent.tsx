'use client';

import { useState, useEffect } from 'react';
import { generateQuiz } from '@/lib/claude-api';
import { QuizQuestion } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Trophy, RotateCcw } from 'lucide-react';

interface QuizComponentProps {
  concept: string;
  currentState?: any;
  onClose: () => void;
}

export default function QuizComponent({ concept, currentState, onClose }: QuizComponentProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const quizData = await generateQuiz(concept, currentState);
      if (quizData && quizData.questions && quizData.questions.length > 0) {
        setQuestions(quizData.questions);
      } else {
        setError('Failed to generate quiz questions. Please try again.');
      }
    } catch (err) {
      console.error('Quiz generation error:', err);
      setError('Failed to generate quiz. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return; // Already answered

    setSelectedAnswer(answerIndex);
    setShowExplanation(true);

    // Check if answer is correct
    if (answerIndex === currentQuestion.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setQuizComplete(false);
    loadQuiz();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-400';
      case 'medium':
        return 'text-amber-400';
      case 'hard':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 rounded-lg p-8 max-w-2xl w-full mx-4 border border-slate-700"
        >
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
            <p className="text-white text-lg">Generating quiz questions...</p>
            <p className="text-slate-400 text-sm">Using Claude AI to create personalized questions</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 rounded-lg p-8 max-w-2xl w-full mx-4 border border-slate-700"
        >
          <div className="flex flex-col items-center gap-4">
            <XCircle className="w-12 h-12 text-red-400" />
            <p className="text-white text-lg">Quiz Generation Failed</p>
            <p className="text-slate-400 text-sm text-center">{error}</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={loadQuiz}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (quizComplete) {
    const percentage = (score / questions.length) * 100;
    const passed = percentage >= 70;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 rounded-lg p-8 max-w-2xl w-full mx-4 border border-slate-700"
        >
          <div className="flex flex-col items-center gap-4">
            <Trophy className={`w-16 h-16 ${passed ? 'text-yellow-400' : 'text-slate-400'}`} />
            <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
            <div className="text-center">
              <p className="text-4xl font-bold text-white mb-2">
                {score} / {questions.length}
              </p>
              <p className={`text-xl ${passed ? 'text-green-400' : 'text-amber-400'}`}>
                {percentage.toFixed(0)}% Correct
              </p>
            </div>
            <p className="text-slate-300 text-center max-w-md">
              {passed
                ? 'Great job! You have a solid understanding of this concept.'
                : 'Keep learning! Review the visualizations and try again.'}
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 rounded-lg max-w-3xl w-full border border-slate-700 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">{concept} Quiz</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className={`font-semibold ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty.toUpperCase()}
              </span>
            </div>
            <span className="text-white font-semibold">
              Score: {score} / {questions.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl text-white mb-6 leading-relaxed">{currentQuestion.question}</h3>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options?.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = index === currentQuestion.correctAnswer;
                  const showResult = showExplanation;

                  let bgColor = 'bg-slate-700 hover:bg-slate-600';
                  let borderColor = 'border-slate-600';

                  if (showResult) {
                    if (isCorrect) {
                      bgColor = 'bg-green-900/50';
                      borderColor = 'border-green-500';
                    } else if (isSelected && !isCorrect) {
                      bgColor = 'bg-red-900/50';
                      borderColor = 'border-red-500';
                    }
                  } else if (isSelected) {
                    bgColor = 'bg-blue-900/50';
                    borderColor = 'border-blue-500';
                  }

                  return (
                    <motion.button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={showExplanation}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${bgColor} ${borderColor} ${
                        showExplanation ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      whileHover={!showExplanation ? { scale: 1.02 } : {}}
                      whileTap={!showExplanation ? { scale: 0.98 } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white">{option}</span>
                        {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-green-400" />}
                        {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-400" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                  >
                    <h4 className="text-sm font-semibold text-white mb-2">Explanation:</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{currentQuestion.explanation}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        {showExplanation && (
          <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6">
            <button
              onClick={handleNext}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
