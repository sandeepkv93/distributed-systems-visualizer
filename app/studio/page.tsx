'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Info,
  Layers,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  CLOCK_REPAIR_OPTIONS,
  PARTITIONING_OPTIONS,
  REPLICATION_OPTIONS,
  STACK_PRESETS,
  StackSelection,
  TRANSACTION_OPTIONS,
  evaluateComposedStack,
  formatStackAdrMarkdown,
} from '@/lib/stack-studio';
import { CONCEPTS_BY_ID } from '@/lib/catalog';
import { showToast } from '@/lib/toast';

const DEFAULT_STACK: StackSelection = STACK_PRESETS[0].selection;

export default function StackStudioPage() {
  const [selection, setSelection] = useState<StackSelection>(DEFAULT_STACK);
  const [stackName, setStackName] = useState('Distributed Data Platform');
  const [copiedAdr, setCopiedAdr] = useState(false);

  // Hydrate optional ?p=&r=&t=&c= share URL without useSearchParams
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    const r = params.get('r');
    const t = params.get('t');
    const c = params.get('c');

    const next: StackSelection = { ...DEFAULT_STACK };
    let changed = false;
    if (p && PARTITIONING_OPTIONS.some((o) => o.id === p)) {
      next.partitioning = p as StackSelection['partitioning'];
      changed = true;
    }
    if (r && REPLICATION_OPTIONS.some((o) => o.id === r)) {
      next.replication = r as StackSelection['replication'];
      changed = true;
    }
    if (t && TRANSACTION_OPTIONS.some((o) => o.id === t)) {
      next.transactions = t as StackSelection['transactions'];
      changed = true;
    }
    if (c && CLOCK_REPAIR_OPTIONS.some((o) => o.id === c)) {
      next.clocks = c as StackSelection['clocks'];
      changed = true;
    }
    if (changed) {
      const timer = setTimeout(() => setSelection(next), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateSelection = (patch: Partial<StackSelection>) => {
    setSelection((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('p', next.partitioning);
        url.searchParams.set('r', next.replication);
        url.searchParams.set('t', next.transactions);
        url.searchParams.set('c', next.clocks);
        window.history.replaceState({}, '', url.toString());
      }
      return next;
    });
  };

  const report = useMemo(() => evaluateComposedStack(selection), [selection]);
  const adrMarkdown = useMemo(
    () => formatStackAdrMarkdown(selection, report, stackName.trim() || 'Distributed Data Platform'),
    [selection, report, stackName]
  );

  const handleCopyAdr = async () => {
    try {
      await navigator.clipboard.writeText(adrMarkdown);
      setCopiedAdr(true);
      showToast('Markdown ADR copied to clipboard.', 'success');
      setTimeout(() => setCopiedAdr(false), 1800);
    } catch {
      showToast('Clipboard access blocked — use Download ADR instead.', 'error');
    }
  };

  const handleDownloadAdr = () => {
    const blob = new Blob([adrMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'distributed-architecture-adr.md';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Architecture Decision Record (.md) downloaded.', 'success');
  };

  const scoreTone =
    report.fitScore >= 85
      ? 'text-[var(--emerald)]'
      : report.fitScore >= 65
      ? 'text-[var(--cobalt)]'
      : 'text-[var(--signal)]';

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Spec Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span>VOLUME I · INTERACTIVE SYSTEM DESIGN STACK COMPOSER</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/systems" className="text-[var(--signal)] hover:underline">
              Real-World Blueprints →
            </Link>
            <Link href="/advisor" className="text-[var(--cobalt)] hover:underline">
              Protocol Advisor →
            </Link>
          </div>
        </div>

        {/* Header */}
        <header className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-8">
          <div className="lg:col-span-8 space-y-3">
            <h1 className="font-editorial text-4xl sm:text-5xl leading-[1.04] tracking-[-0.02em]">
              System Design Stack Studio
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] leading-relaxed max-w-2xl">
              Compose a custom four-layer distributed architecture, audit cross-layer protocol
              conflicts in real time, and export a publication-ready{' '}
              <strong className="text-[var(--ink)]">Markdown ADR</strong>.
            </p>
          </div>
          <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-2">
            <button
              type="button"
              onClick={handleCopyAdr}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--paper-elevated)] hover:bg-[var(--chassis)] border border-[var(--ink)] font-mono text-xs uppercase tracking-wider cursor-pointer transition-colors"
            >
              {copiedAdr ? <Check className="w-3.5 h-3.5 text-[var(--emerald)]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAdr ? 'Copied ADR' : 'Copy ADR'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadAdr}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--ink)] hover:bg-[var(--signal)] text-[#FAF7F1] font-mono text-xs uppercase tracking-wider cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .md ADR</span>
            </button>
          </div>
        </header>

        {/* Reference Presets Strip */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mr-1">
            Load Precedent:
          </span>
          {STACK_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => updateSelection(preset.selection)}
              className="px-3 py-1.5 border border-[var(--rule)] hover:border-[var(--ink)] bg-[var(--paper-elevated)] font-mono text-[11px] text-[var(--ink)] cursor-pointer transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Main Split Layout: 4 Layer Pickers (Left 7) + Live Spec Sheet (Right 5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: 4 Composable Protocol Layers */}
          <div className="lg:col-span-7 space-y-5">
            {/* Layer 1: Partitioning */}
            <div className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold mb-3">
                Layer 01 · Partitioning &amp; Key Routing
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PARTITIONING_OPTIONS.map((opt) => {
                  const active = selection.partitioning === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSelection({ partitioning: opt.id })}
                      className={`p-3 border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                          : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                      }`}
                    >
                      <div className="font-medium text-xs leading-snug">{opt.name}</div>
                      <div
                        className={`text-[11px] mt-1 leading-snug ${
                          active ? 'text-[#D6D2C7]' : 'text-[var(--ink-secondary)]'
                        }`}
                      >
                        {opt.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layer 2: Replication & Consensus */}
            <div className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cobalt)] font-semibold mb-3">
                Layer 02 · Replication &amp; Consensus Engine
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REPLICATION_OPTIONS.map((opt) => {
                  const active = selection.replication === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSelection({ replication: opt.id })}
                      className={`p-3 border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                          : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-xs">{opt.name}</span>
                        <span
                          className={`font-mono text-[10px] ${
                            active ? 'text-[#34D399]' : 'text-[var(--ink-muted)]'
                          }`}
                        >
                          +{opt.addedRtts} RTT
                        </span>
                      </div>
                      <div
                        className={`text-[11px] mt-1 leading-snug ${
                          active ? 'text-[#D6D2C7]' : 'text-[var(--ink-secondary)]'
                        }`}
                      >
                        {opt.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layer 3: Transactions & Coordination */}
            <div className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--emerald)] font-semibold mb-3">
                Layer 03 · Cross-Shard Transactions &amp; Coordination
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TRANSACTION_OPTIONS.map((opt) => {
                  const active = selection.transactions === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSelection({ transactions: opt.id })}
                      className={`p-3 border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                          : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-xs">{opt.name}</span>
                        <span
                          className={`font-mono text-[10px] ${
                            active ? 'text-[#FBBF24]' : 'text-[var(--ink-muted)]'
                          }`}
                        >
                          +{opt.addedRtts} RTT
                        </span>
                      </div>
                      <div
                        className={`text-[11px] mt-1 leading-snug ${
                          active ? 'text-[#D6D2C7]' : 'text-[var(--ink-secondary)]'
                        }`}
                      >
                        {opt.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layer 4: Clocks & Anti-Entropy */}
            <div className="border border-[var(--ink)] bg-[var(--paper-elevated)] p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink)] font-semibold mb-3">
                Layer 04 · Clocks, Ordering &amp; Anti-Entropy Repair
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CLOCK_REPAIR_OPTIONS.map((opt) => {
                  const active = selection.clocks === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateSelection({ clocks: opt.id })}
                      className={`p-3 border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--ink)] text-[#FAF7F1] border-[var(--ink)]'
                          : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--ink)]'
                      }`}
                    >
                      <div className="font-medium text-xs">{opt.name}</div>
                      <div
                        className={`text-[11px] mt-1 leading-snug ${
                          active ? 'text-[#D6D2C7]' : 'text-[var(--ink-secondary)]'
                        }`}
                      >
                        {opt.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Live Architecture Specification Sheet & Risk Audit */}
          <aside className="lg:col-span-5 border-2 border-[var(--ink)] bg-[var(--paper-elevated)] shadow-[6px_6px_0_0_var(--ink)]">
            <div className="p-5 border-b border-[var(--ink)] bg-[var(--paper)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Live Architecture Spec Sheet</span>
                </span>
                <span className={`font-editorial text-3xl tabular-nums ${scoreTone}`}>
                  {report.fitScore}
                  <span className="text-base text-[var(--ink-muted)]">/100</span>
                </span>
              </div>

              <input
                type="text"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                aria-label="Architecture title for ADR export"
                className="w-full px-3 py-1.5 bg-[var(--paper-elevated)] border border-[var(--rule)] focus:border-[var(--ink)] outline-none font-editorial text-lg text-[var(--ink)]"
              />

              <div className="grid grid-cols-3 border border-[var(--ink)] divide-x divide-[var(--rule)] bg-[var(--paper-elevated)] text-center">
                <div className="p-2.5">
                  <div className="font-mono text-[9px] uppercase text-[var(--ink-muted)]">CAP</div>
                  <div className="font-mono text-sm font-bold text-[var(--ink)] mt-0.5">
                    {report.capClass}
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="font-mono text-[9px] uppercase text-[var(--ink-muted)]">Write RTT</div>
                  <div className="font-mono text-sm font-bold text-[var(--cobalt)] mt-0.5 tabular-nums">
                    {report.estimatedWriteRtts} RTT
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="font-mono text-[9px] uppercase text-[var(--ink-muted)]">PACELC</div>
                  <div className="font-mono text-xs font-bold text-[var(--emerald)] mt-0.5">
                    {report.pacelcClass.split(' ')[0]}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Guarantees */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between gap-2 pb-1.5 border-b border-[var(--rule)]">
                  <span className="font-mono uppercase text-[var(--ink-muted)]">Consistency</span>
                  <span className="font-medium text-right text-[var(--ink)]">
                    {report.consistencyGuarantee}
                  </span>
                </div>
                <div className="flex justify-between gap-2 pb-1.5 border-b border-[var(--rule)]">
                  <span className="font-mono uppercase text-[var(--ink-muted)]">Fault Model</span>
                  <span className="font-medium text-right text-[var(--ink)]">
                    {report.faultModel}
                  </span>
                </div>
                <div className="flex justify-between gap-2 pb-1.5 border-b border-[var(--rule)]">
                  <span className="font-mono uppercase text-[var(--ink-muted)]">Precedent</span>
                  <span className="font-medium text-right text-[var(--cobalt)]">
                    {report.closestRealSystem}
                  </span>
                </div>
              </div>

              {/* Risk & Anti-Pattern Audit */}
              <div className="space-y-2.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)] font-semibold">
                  Cross-Layer Conflict Audit ({report.warnings.length})
                </div>
                {report.warnings.length === 0 ? (
                  <div className="p-3.5 border border-[var(--emerald)]/40 bg-[var(--emerald)]/8 flex items-start gap-2.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-[var(--emerald)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--ink)]">
                      Clean architectural alignment — zero cross-layer conflicts detected.
                    </span>
                  </div>
                ) : (
                  report.warnings.map((w) => {
                    const styles =
                      w.severity === 'critical'
                        ? 'border-[var(--signal)] bg-[var(--signal)]/8'
                        : w.severity === 'warning'
                        ? 'border-[#D97706] bg-[#FEF3C7]/40'
                        : 'border-[var(--cobalt)]/40 bg-[var(--cobalt)]/6';
                    return (
                      <div key={w.id} className={`p-3.5 border-l-4 ${styles} space-y-1`}>
                        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider font-semibold">
                          {w.severity === 'critical' ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-[var(--signal)]" />
                          ) : w.severity === 'warning' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-[#B45309]" />
                          ) : (
                            <Info className="w-3.5 h-3.5 text-[var(--cobalt)]" />
                          )}
                          <span>
                            {w.severity} · {w.title}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                          {w.detail}
                        </p>
                        <p className="text-xs text-[var(--ink)] leading-relaxed">
                          <strong className="font-mono text-[10px] uppercase">Fix: </strong>
                          {w.remediation}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Linked Atlas Plates */}
              <div className="pt-2 border-t border-[var(--rule)] space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                  Simulate Underlying Plates
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {report.linkedConceptIds.map((cid) => {
                    const concept = CONCEPTS_BY_ID.get(cid);
                    if (!concept) return null;
                    return (
                      <Link
                        key={cid}
                        href={concept.path}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--paper)] border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[#FAF7F1] font-mono text-[10px] uppercase tracking-wider transition-colors"
                      >
                        <span>
                          PL {concept.plateNumber} · {concept.navName}
                        </span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
