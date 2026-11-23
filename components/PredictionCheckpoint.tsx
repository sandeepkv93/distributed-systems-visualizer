'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Compass, X } from 'lucide-react';
import { PredictionCheckpoint as CheckpointSpec } from '@/lib/checkpoints';
import { markCheckpointSolved } from '@/lib/progress';
import { useProgress } from '@/hooks/useProgress';

interface PredictionCheckpointProps {
  checkpoint: CheckpointSpec;
}

export default function PredictionCheckpoint({ checkpoint }: PredictionCheckpointProps) {
  const { progress } = useProgress();
  const isAlreadySolved = (progress.checkpointsSolved ?? []).includes(checkpoint.id);

  const [expanded, setExpanded] = useState(!isAlreadySolved);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    isAlreadySolved ? checkpoint.correctIndex : null
  );

  const isCorrect = selectedIdx === checkpoint.correctIndex;
  const isWrong = selectedIdx !== null && selectedIdx !== checkpoint.correctIndex;

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
    if (idx === checkpoint.correctIndex) {
      markCheckpointSolved(checkpoint.id);
    }
  };

  return (
    <div
      className={`mt-2.5 border transition-colors ${
        isAlreadySolved || isCorrect
          ? 'border-[var(--emerald)] bg-[#0F6B50]/[0.06]'
          : 'border-[var(--ink)] bg-[var(--paper-elevated)]'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isAlreadySolved || isCorrect ? (
            <Check className="w-3.5 h-3.5 text-[var(--emerald)] stroke-[2.5] flex-shrink-0" />
          ) : (
            <Compass className="w-3.5 h-3.5 text-[var(--signal)] flex-shrink-0" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.11em] font-semibold text-[var(--ink)] truncate">
            {isAlreadySolved || isCorrect
              ? 'Intuition Verified'
              : 'Predict Before Running'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-[var(--ink-muted)] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)] flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--rule)] space-y-2.5">
          <p className="text-xs font-medium text-[var(--ink)] leading-snug">
            {checkpoint.prompt}
          </p>

          <div className="space-y-1.5">
            {checkpoint.options.map((option, idx) => {
              const picked = selectedIdx === idx;
              const optionCorrect = idx === checkpoint.correctIndex;
              const showRight = (isAlreadySolved || isCorrect) && optionCorrect;
              const showWrong = picked && !optionCorrect;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left px-2.5 py-2 border text-[11px] leading-snug flex items-start gap-2 transition-colors cursor-pointer ${
                    showRight
                      ? 'bg-[var(--emerald)] text-[#FAF7F1] border-[var(--emerald)]'
                      : showWrong
                      ? 'bg-[var(--signal)]/10 text-[var(--signal)] border-[var(--signal)]'
                      : 'bg-[var(--paper)] hover:bg-[var(--chassis)] text-[var(--ink-secondary)] hover:text-[var(--ink)] border-[var(--rule)]'
                  }`}
                >
                  <span className="font-mono text-[10px] font-semibold mt-0.5 flex-shrink-0">
                    {showRight ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : showWrong ? (
                      <X className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      String.fromCharCode(65 + idx)
                    )}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {(isAlreadySolved || isCorrect) && (
            <div className="px-2.5 py-2 bg-[var(--paper)] border-l-2 border-[var(--emerald)] text-[11px] text-[var(--ink-secondary)] leading-relaxed">
              <span className="font-mono text-[9.5px] uppercase tracking-wider font-semibold text-[var(--emerald)] block mb-0.5">
                Invariant Confirmed
              </span>
              {checkpoint.explanation}
            </div>
          )}

          {isWrong && (
            <div className="px-2.5 py-1.5 bg-[var(--signal)]/10 border-l-2 border-[var(--signal)] text-[11px] text-[var(--signal)]">
              Not quite — check the protocol’s quorum/ordering invariant and try another option, or
              step through the scenario to verify.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
