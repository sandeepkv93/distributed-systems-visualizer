'use client';

import { X, Loader2 } from 'lucide-react';

interface ExplanationPanelProps {
  explanation: string | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ExplanationPanel({
  explanation,
  isLoading,
  error,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: ExplanationPanelProps) {
  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="fixed right-0 top-24 bg-slate-800 border border-slate-700 rounded-l-lg p-2 text-white hover:bg-slate-700 z-10"
      >
        <span className="text-sm">Show Explanation</span>
      </button>
    );
  }

  return (
    <div className="bg-slate-800 border-l border-slate-700 p-4 w-96 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">AI Explanation</h3>
        <div className="flex gap-2">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="text-slate-400 hover:text-white"
              title="Collapse"
            >
              <span className="text-sm">←</span>
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-white" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Getting explanation from Claude...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {explanation && !isLoading && !error && (
          <div className="prose prose-invert prose-sm max-w-none">
            <div className="text-slate-300 whitespace-pre-wrap">{explanation}</div>
          </div>
        )}

        {!explanation && !isLoading && !error && (
          <div className="flex items-center justify-center h-full text-center text-slate-400">
            <div>
              <p className="text-sm">Ask Claude a question about the simulation</p>
              <p className="text-xs mt-2">Use the input field in the control panel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
