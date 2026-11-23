'use client';

import { useState, useEffect } from 'react';
import { useProgress } from '@/hooks/useProgress';
import {
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  X,
  Check,
  FileText,
  Printer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportProgress, importProgress } from '@/lib/progress';
import { CONCEPTS_CATALOG, CONCEPT_DOMAINS } from '@/lib/catalog';
import { generateFieldSheetSvg } from '@/lib/field-sheet';
import { showToast } from '@/lib/toast';

interface ProgressDashboardProps {
  onClose: () => void;
}

export default function ProgressDashboard({ onClose }: ProgressDashboardProps) {
  const { progress, achievements, stats, reset, refresh } = useProgress();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showResetConfirm) {
          setShowResetConfirm(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, showResetConfirm]);

  const formatTime = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    if (seconds > 0) {
      return `${seconds}s`;
    }
    return '0m';
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
    showToast('Progress exported as JSON.', 'success');
  };

  const handleDownloadFieldSheet = () => {
    const svg = generateFieldSheetSvg({
      completedConceptIds: progress.conceptsCompleted,
      completedScenarioKeys: progress.scenariosCompleted,
      checkpointsSolved: stats.checkpointsSolved,
      totalCheckpoints: stats.totalCheckpoints,
      achievementsUnlocked: stats.achievementsUnlocked,
      totalAchievements: stats.totalAchievements,
      totalTimeSpentMs: stats.totalTimeSpent,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'distributed-systems-field-sheet.svg';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Archival Field Sheet SVG downloaded.', 'success');
  };

  const handlePrintLedger = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
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
            showToast('Progress imported successfully!', 'success');
          } else {
            showToast('Failed to import progress. Please check the file format.', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleConfirmReset = () => {
    reset();
    setShowResetConfirm(false);
    showToast('All learning progress has been reset.', 'info');
  };

  const completionPercentage =
    stats.totalScenarios > 0
      ? Math.round((stats.completedScenarios / stats.totalScenarios) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 bg-[#161614]/55 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--paper-elevated)] border border-[var(--ink)] shadow-[8px_8px_0_0_var(--ink)] max-w-4xl w-full max-h-[88vh] overflow-y-auto relative text-[var(--ink)]"
        role="dialog"
        aria-modal="true"
        aria-label="Study Ledger"
      >
        {/* Archival Ledger Header */}
        <div className="sticky top-0 bg-[var(--paper)] border-b border-[var(--ink)] px-6 py-4 z-10 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--signal)]">
              Field Study Ledger
            </div>
            <h2 className="font-editorial text-2xl text-[var(--ink)] mt-0.5">
              Mastery &amp; Scenario Record
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="print-hide inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] transition-colors cursor-pointer"
            aria-label="Close study ledger"
          >
            <span>Close</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Summary Spec Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 border border-[var(--ink)] divide-y md:divide-y-0 md:divide-x divide-[var(--rule)] bg-[var(--paper)]">
            <div className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                Completion
              </div>
              <div className="font-editorial text-3xl text-[var(--signal)] mt-1 tabular-nums">
                {completionPercentage}%
              </div>
            </div>
            <div className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                Plates Mastered
              </div>
              <div className="font-editorial text-3xl text-[var(--ink)] mt-1 tabular-nums">
                {stats.completedConcepts}
                <span className="text-lg text-[var(--ink-muted)]">/{stats.totalConcepts}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                Scenarios Run
              </div>
              <div className="font-editorial text-3xl text-[var(--ink)] mt-1 tabular-nums">
                {stats.completedScenarios}
                <span className="text-lg text-[var(--ink-muted)]">/{stats.totalScenarios}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                Intuition Checks
              </div>
              <div className="font-editorial text-3xl text-[var(--emerald)] mt-1 tabular-nums">
                {stats.checkpointsSolved}
                <span className="text-lg text-[var(--ink-muted)]">/{stats.totalCheckpoints}</span>
              </div>
            </div>
            <div className="p-4 col-span-2 md:col-span-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                Bench Time
              </div>
              <div className="font-editorial text-3xl text-[var(--ink)] mt-1 tabular-nums">
                {formatTime(stats.totalTimeSpent)}
              </div>
            </div>
          </div>

          {/* Calibrated Completion Bar */}
          <div>
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-secondary)] mb-1.5">
              <span>Overall Monograph Progress</span>
              <span className="tabular-nums">
                {stats.completedScenarios} of {stats.totalScenarios} scenarios verified
              </span>
            </div>
            <div className="w-full bg-[var(--chassis)] border border-[var(--rule)] h-2.5 overflow-hidden">
              <motion.div
                className="bg-[var(--signal)] h-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Achievements — Archival Verification Seals */}
          <div>
            <div className="flex items-baseline justify-between pb-2 mb-3 border-b border-[var(--ink)]">
              <h3 className="font-editorial text-xl text-[var(--ink)]">Verification Seals</h3>
              <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums uppercase">
                {stats.achievementsUnlocked} / {stats.totalAchievements} unlocked
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-3.5 border flex items-start gap-3 ${
                    achievement.unlocked
                      ? 'bg-[var(--paper)] border-[var(--ink)]'
                      : 'bg-[var(--chassis)]/45 border-[var(--rule)] opacity-70'
                  }`}
                >
                  <div
                    className={`w-8 h-8 border flex items-center justify-center flex-shrink-0 font-mono text-xs font-semibold ${
                      achievement.unlocked
                        ? 'bg-[var(--emerald)] border-[var(--emerald)] text-[#FAF7F1]'
                        : 'bg-[var(--paper-elevated)] border-[var(--rule)] text-[var(--ink-muted)]'
                    }`}
                  >
                    {achievement.unlocked ? <Check className="w-4 h-4 stroke-[2.5]" /> : '—'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-[var(--ink)]">{achievement.name}</h4>
                      {achievement.unlocked && (
                        <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-[var(--emerald)]/12 text-[var(--emerald)]">
                          EARNED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--ink-secondary)] mt-0.5">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Domain-by-Domain Checklist */}
          <div>
            <div className="flex items-baseline justify-between pb-2 mb-4 border-b border-[var(--ink)]">
              <h3 className="font-editorial text-xl text-[var(--ink)]">Plate Checklist</h3>
              <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums uppercase">
                {stats.completedConcepts} / {stats.totalConcepts} completed
              </span>
            </div>

            <div className="space-y-5">
              {CONCEPT_DOMAINS.map((domain) => {
                const domainConcepts = CONCEPTS_CATALOG.filter((c) => c.domainId === domain.id);
                return (
                  <div key={domain.id}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-2">
                      § {domain.index} · {domain.label}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {domainConcepts.map((concept) => {
                        const isCompleted = progress.conceptsCompleted.includes(concept.id);
                        const completedCount = concept.scenarioKeys.filter((key) =>
                          progress.scenariosCompleted.includes(key)
                        ).length;
                        const totalCount = concept.scenarioKeys.length;

                        return (
                          <div
                            key={concept.id}
                            className="flex items-center justify-between gap-3 py-2 px-3 border border-[var(--rule)] bg-[var(--paper)]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
                                  isCompleted
                                    ? 'bg-[var(--emerald)] border-[var(--emerald)] text-[#FAF7F1]'
                                    : 'border-[var(--ink)]/30 bg-[var(--paper-elevated)]'
                                }`}
                              >
                                {isCompleted && <Check className="w-3 h-3 stroke-[2.5]" />}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--ink-muted)] tabular-nums">
                                {concept.plateNumber}
                              </span>
                              <span
                                className={`truncate text-sm ${
                                  isCompleted
                                    ? 'text-[var(--ink)] font-medium'
                                    : 'text-[var(--ink-secondary)]'
                                }`}
                              >
                                {concept.name}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums flex-shrink-0">
                              {totalCount > 0
                                ? `${completedCount}/${totalCount}`
                                : isCompleted
                                ? 'DONE'
                                : 'LIVE'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Management & Archival Export Actions */}
          <div className="print-hide pt-4 border-t border-[var(--rule)] flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleDownloadFieldSheet}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--signal)] hover:bg-[var(--signal-hover)] text-[#FAF7F1] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Field Sheet (SVG)
            </button>
            <button
              type="button"
              onClick={handlePrintLedger}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--paper)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)]/35 hover:border-[var(--ink)] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Ledger
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--ink)] hover:bg-[var(--cobalt)] text-[var(--paper-elevated)] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--paper)] hover:bg-[var(--chassis)] text-[var(--ink)] border border-[var(--ink)]/35 hover:border-[var(--ink)] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Import JSON
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--paper)] hover:bg-[var(--signal)] text-[var(--signal)] hover:text-[#FAF7F1] border border-[var(--signal)] font-mono text-xs uppercase tracking-wider transition-colors ml-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Ledger
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetConfirm && (
            <div className="fixed inset-0 bg-[#161614]/65 flex items-center justify-center z-[60] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-[var(--paper-elevated)] border border-[var(--ink)] shadow-[6px_6px_0_0_var(--ink)] max-w-md w-full p-6 space-y-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reset-confirm-title"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 border border-[var(--signal)] bg-[var(--signal)]/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-[var(--signal)]" />
                  </div>
                  <div>
                    <h3
                      id="reset-confirm-title"
                      className="font-editorial text-xl text-[var(--ink)]"
                    >
                      Reset all learning progress?
                    </h3>
                    <p className="text-sm text-[var(--ink-secondary)] mt-1 leading-relaxed">
                      This clears all completed plates, scenario runs, bench time, and verification
                      seals. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 font-mono text-xs uppercase tracking-wider bg-[var(--paper)] border border-[var(--rule)] hover:border-[var(--ink)] text-[var(--ink)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="px-4 py-2 font-mono text-xs uppercase tracking-wider bg-[var(--signal)] hover:bg-[var(--signal-hover)] text-[#FAF7F1] transition-colors cursor-pointer"
                  >
                    Yes, Reset
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
