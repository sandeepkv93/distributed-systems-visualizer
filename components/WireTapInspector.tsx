'use client';

import { ReactNode, useEffect } from 'react';
import { Radio, X } from 'lucide-react';

export interface WireTapMetric {
  label: string;
  value: string | number;
  tone?: 'default' | 'signal' | 'emerald' | 'cobalt' | 'amber' | 'danger';
}

export interface WireTapAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'signal' | 'emerald' | 'danger';
  disabled?: boolean;
}

interface WireTapInspectorProps {
  title: string;
  subtitle?: string;
  status?: 'healthy' | 'failed' | 'leader' | 'candidate' | 'info';
  metrics: WireTapMetric[];
  actions?: WireTapAction[];
  onClose: () => void;
  className?: string;
  children?: ReactNode;
}

const TONE_CLASS: Record<NonNullable<WireTapMetric['tone']>, string> = {
  default: 'text-[#F4F0E8]',
  signal: 'text-[#FB923C]',
  emerald: 'text-[#34D399]',
  cobalt: 'text-[#60A5FA]',
  amber: 'text-[#FBBF24]',
  danger: 'text-[#F87171]',
};

const ACTION_CLASS: Record<NonNullable<WireTapAction['variant']>, string> = {
  default:
    'bg-[#222825] hover:bg-[#2E3531] text-[#F4F0E8] border border-[rgba(244,240,232,0.2)]',
  signal: 'bg-[#D9441E] hover:bg-[#B83412] text-[#FAF7F1] border border-[#D9441E]',
  emerald: 'bg-[#0F6B50] hover:bg-[#0B553F] text-[#FAF7F1] border border-[#10B981]',
  danger: 'bg-[#7F1D1D] hover:bg-[#991B1B] text-[#FEE2E2] border border-[#EF4444]/60',
};

export default function WireTapInspector({
  title,
  subtitle,
  status = 'healthy',
  metrics,
  actions = [],
  onClose,
  className = 'top-4 right-4',
  children,
}: WireTapInspectorProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const dotColor =
    status === 'failed'
      ? 'bg-[#EF4444]'
      : status === 'leader'
      ? 'bg-[#D9441E]'
      : status === 'candidate'
      ? 'bg-[#FBBF24]'
      : status === 'info'
      ? 'bg-[#60A5FA]'
      : 'bg-[#34D399]';

  return (
    <div
      className={`absolute ${className} z-20 w-72 sm:w-80 max-w-[calc(100%-2rem)] bg-[#151917]/95 backdrop-blur-md border border-[rgba(244,240,232,0.24)] shadow-[0_14px_36px_rgba(0,0,0,0.55)] text-[#F4F0E8] font-mono`}
      role="region"
      aria-label={`Wire Tap Inspector: ${title}`}
    >
      {/* Top Wire Tap Rail */}
      <div className="px-3 py-2 border-b border-[rgba(244,240,232,0.14)] bg-[#0E1110] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-3.5 h-3.5 text-[#D9441E] flex-shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#9E9B90]">
            Wire Tap
          </span>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#9E9B90] hover:text-[#F4F0E8] transition-colors cursor-pointer"
          aria-label="Close Wire Tap inspector"
          title="Close (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Entity Header */}
      <div className="px-3.5 py-2.5 border-b border-[rgba(244,240,232,0.1)]">
        <div className="text-sm font-semibold text-[#F4F0E8] tracking-wide">{title}</div>
        {subtitle && (
          <div className="text-[10px] uppercase tracking-[0.1em] text-[#9E9B90] mt-0.5">
            {subtitle}
          </div>
        )}
      </div>

      {/* Key-Value Telemetry Matrix */}
      <div className="grid grid-cols-2 gap-px bg-[rgba(244,240,232,0.1)] border-b border-[rgba(244,240,232,0.1)]">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-[#151917] px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.12em] text-[#9E9B90]">
              {metric.label}
            </div>
            <div
              className={`text-xs font-semibold tabular-nums mt-0.5 truncate ${
                TONE_CLASS[metric.tone ?? 'default']
              }`}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Optional Internal State / Log Entries / Wire Frames */}
      {children && (
        <div className="px-3.5 py-2.5 max-h-44 overflow-y-auto border-b border-[rgba(244,240,232,0.1)] text-[11px]">
          {children}
        </div>
      )}

      {/* Direct Instrument Actions */}
      {actions.length > 0 && (
        <div className="p-2.5 flex flex-wrap gap-1.5 bg-[#101312]">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`flex-1 min-w-[100px] px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                ACTION_CLASS[action.variant ?? 'default']
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WireTapHint({ text = 'Click any node to open Wire Tap' }: { text?: string }) {
  return (
    <div className="hidden sm:inline-flex absolute top-[52px] left-3 sm:left-4 z-10 pointer-events-none items-center gap-2 px-2.5 py-1 bg-[#151917]/88 border border-[rgba(244,240,232,0.16)] font-mono text-[10px] uppercase tracking-[0.1em] text-[#C8C3B8]">
      <Radio className="w-3 h-3 text-[#D9441E]" />
      <span>{text}</span>
    </div>
  );
}
