'use client';

import { useProgress } from '@/hooks/useProgress';
import { Trophy, Award, Clock, BookOpen, Target, RotateCcw, Download, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { exportProgress, importProgress } from '@/lib/progress';

interface ProgressDashboardProps {
  onClose: () => void;
}

export default function ProgressDashboard({ onClose }: ProgressDashboardProps) {
  const { progress, achievements, stats, reset, refresh } = useProgress();

  const formatTime = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleExport = () => {
    const data = exportProgress();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'distributed-systems-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (importProgress(content)) {
            refresh();
            alert('Progress imported successfully!');
          } else {
            alert('Failed to import progress. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const completionPercentage = Math.round((stats.completedScenarios / stats.totalScenarios) * 100);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800 rounded-lg max-w-4xl w-full border border-slate-700 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Your Learning Progress</h2>
            <p className="text-slate-400 text-sm">Track your journey through distributed systems</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Overall Progress */}
          <div className="bg-slate-700/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Overall Progress</h3>
              <span className="text-3xl font-bold text-blue-400">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 mb-2">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <p className="text-slate-300 text-sm">
              {stats.completedScenarios} of {stats.totalScenarios} scenarios completed
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <span className="text-slate-400 text-sm">Concepts</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.completedConcepts}/{stats.totalConcepts}
              </p>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-green-400" />
                <span className="text-slate-400 text-sm">Scenarios</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.completedScenarios}/{stats.totalScenarios}
              </p>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-slate-400 text-sm">Quizzes</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalQuizzes}</p>
              {stats.totalQuizzes > 0 && (
                <p className="text-xs text-slate-400 mt-1">Avg: {stats.averageQuizScore}%</p>
              )}
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-slate-400 text-sm">Time Spent</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatTime(stats.totalTimeSpent)}</p>
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-slate-700/50 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-6 h-6 text-yellow-400" />
              <h3 className="text-xl font-semibold text-white">Achievements</h3>
              <span className="text-slate-400 text-sm">
                ({stats.achievementsUnlocked}/{stats.totalAchievements})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg border-2 ${
                    achievement.unlocked
                      ? 'bg-yellow-900/20 border-yellow-600'
                      : 'bg-slate-700/30 border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        achievement.unlocked ? 'bg-yellow-600' : 'bg-slate-600'
                      }`}
                    >
                      <Trophy className={`w-5 h-5 ${achievement.unlocked ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <h4
                        className={`font-semibold ${
                          achievement.unlocked ? 'text-yellow-400' : 'text-slate-400'
                        }`}
                      >
                        {achievement.name}
                      </h4>
                      <p className="text-sm text-slate-300 mt-1">{achievement.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Concept Progress */}
          <div className="bg-slate-700/50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Concepts Completed</h3>
            <div className="space-y-2">
              {[
                'Raft Consensus',
                'Paxos Consensus',
                'Vector Clocks',
                'Consistent Hashing',
                'Two-Phase Commit',
                'Eventual Consistency',
                'CAP Theorem',
              ].map((concept) => {
                const isCompleted = progress.conceptsCompleted.includes(concept);
                return (
                  <div key={concept} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-500' : 'bg-slate-600'
                      }`}
                    >
                      {isCompleted && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className={`${isCompleted ? 'text-white' : 'text-slate-400'}`}>{concept}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Progress
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import Progress
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors ml-auto"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Progress
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
