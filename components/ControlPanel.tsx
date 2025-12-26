'use client';

import { Play, Pause, SkipForward, SkipBack, RotateCcw } from 'lucide-react';
import { Scenario } from '@/lib/types';

interface ControlPanelProps {
  isPlaying: boolean;
  speed: number;
  progress: number;
  scenarios?: Scenario[];
  selectedScenario?: string;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onScenarioChange?: (scenarioId: string) => void;
  onAskClaude?: (question: string) => void;
  apiKeyExists?: boolean;
}

const SPEED_OPTIONS = [0.5, 1, 2, 5];

export default function ControlPanel({
  isPlaying,
  speed,
  progress,
  scenarios = [],
  selectedScenario,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onReset,
  onSpeedChange,
  onScenarioChange,
  onAskClaude,
  apiKeyExists = false,
}: ControlPanelProps) {
  return (
    <div className="bg-slate-800 border-r border-slate-700 p-4 space-y-6 w-80 flex flex-col h-full">
      {/* Scenario Selector */}
      {scenarios.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Scenario</label>
          <select
            value={selectedScenario || ''}
            onChange={(e) => onScenarioChange?.(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a scenario...</option>
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
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
              onClick={() => onSpeedChange(speedOption)}
              className={`flex-1 px-2 py-1 rounded text-sm ${
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
            onClick={onStepBackward}
            className="p-2 bg-slate-700 text-white rounded hover:bg-slate-600 flex items-center justify-center"
            title="Step Backward"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {isPlaying ? (
            <button
              onClick={onPause}
              className="p-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center"
              title="Pause"
            >
              <Pause className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="p-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center"
              title="Play"
            >
              <Play className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onStepForward}
            className="p-2 bg-slate-700 text-white rounded hover:bg-slate-600 flex items-center justify-center"
            title="Step Forward"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onReset}
          className="w-full mt-2 p-2 bg-slate-700 text-white rounded hover:bg-slate-600 flex items-center justify-center gap-2"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Progress Bar */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Progress: {Math.round(progress)}%
        </label>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Ask Claude */}
      {onAskClaude && (
        <div className="flex-1 flex flex-col">
          <label className="block text-sm font-medium text-slate-300 mb-2">Ask Claude</label>
          {apiKeyExists ? (
            <div className="flex-1 flex flex-col">
              <input
                type="text"
                placeholder="Why did this happen?"
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      onAskClaude(input.value);
                      input.value = '';
                    }
                  }
                }}
              />
              <p className="text-xs text-slate-400 mt-1">Press Enter to ask</p>
            </div>
          ) : (
            <div className="bg-slate-700 rounded p-3 text-sm text-slate-400">
              Set your API key to enable AI explanations
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Legend</label>
        <div className="space-y-1 text-xs">
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
    </div>
  );
}
