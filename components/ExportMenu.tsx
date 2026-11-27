'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Share2, Copy, FileJson, Image as ImageIcon, Link2, Check } from 'lucide-react';
import {
  exportAsPNG,
  exportAsSVG,
  exportStateAsJSON,
  shareVisualization,
  copyLinkToClipboard,
  copyStateToClipboard,
} from '@/lib/export';
import { parseScenarioDeepLink } from '@/lib/deeplink';
import { showToast } from '@/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';

interface ExportMenuProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  concept: string;
  currentState?: unknown;
}

export default function ExportMenu({ svgRef, concept, currentState }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const handleExportPNG = async () => {
    if (!svgRef.current) return;

    setIsExporting(true);
    try {
      await exportAsPNG(svgRef.current, `${concept.toLowerCase().replace(/\s+/g, '-')}.png`);
      showToast('Exported visualization as PNG.', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to export PNG. Please try again.', 'error');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportSVG = () => {
    if (!svgRef.current) return;

    setIsExporting(true);
    try {
      exportAsSVG(svgRef.current, `${concept.toLowerCase().replace(/\s+/g, '-')}.svg`);
      showToast('Exported visualization as SVG.', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to export SVG. Please try again.', 'error');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportJSON = () => {
    if (!currentState) {
      showToast('No state available to export.', 'info');
      return;
    }

    setIsExporting(true);
    try {
      exportStateAsJSON(currentState, `${concept.toLowerCase().replace(/\s+/g, '-')}-state.json`);
      showToast('Exported simulation state as JSON.', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to export state. Please try again.', 'error');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleShare = async () => {
    if (!svgRef.current) return;

    setIsExporting(true);
    try {
      await shareVisualization(svgRef.current, concept, `Interactive ${concept} visualization`);
      setIsOpen(false);
    } catch (error: unknown) {
      const err = error as { message?: string; name?: string };
      if (err.message?.includes('not supported')) {
        showToast('Sharing is not supported in this browser. Try exporting as PNG instead.', 'info');
      } else if (err.name !== 'AbortError') {
        console.error('Share failed:', error);
        showToast('Failed to share. Please try exporting instead.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyLinkToClipboard();
      showCopyFeedback('Link copied!');
      const parsed =
        typeof window !== 'undefined'
          ? parseScenarioDeepLink(window.location.search)
          : { scenarioId: null, step: null };
      if (parsed.scenarioId && parsed.step && parsed.step > 0) {
        showToast(
          `Copied exact link (${parsed.scenarioId} · step ${parsed.step}).`,
          'success'
        );
      } else if (parsed.scenarioId) {
        showToast(`Copied scenario deep link (${parsed.scenarioId}).`, 'success');
      } else {
        showToast('Link copied to clipboard.', 'success');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      showToast('Failed to copy link.', 'error');
    }
  };

  const handleCopyState = async () => {
    if (!currentState) {
      showToast('No state available to copy.', 'info');
      return;
    }

    try {
      await copyStateToClipboard(currentState, concept);
      showCopyFeedback('State copied!');
      showToast('Simulation state copied to clipboard.', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      showToast('Failed to copy state.', 'error');
    }
  };

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div className="relative">
      {/* Archival Export Button (high contrast on both paper headers & obsidian canvas) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--paper-elevated)] text-[var(--ink)] border border-[rgba(22,22,20,0.35)] hover:bg-[var(--ink)] hover:text-[var(--paper-elevated)] hover:border-[var(--ink)] font-mono text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
        disabled={isExporting}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export</span>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            aria-label="Export and share options"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 mt-2 w-60 bg-[var(--paper-elevated)] text-[var(--ink)] border border-[var(--ink)] shadow-[5px_5px_0_0_var(--ink)] py-1.5 z-50"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleExportPNG}
              disabled={isExporting}
              className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[var(--chassis)] transition-colors text-left disabled:opacity-50 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-[var(--cobalt)]" aria-hidden="true" />
              <div>
                <div className="text-xs font-semibold text-[var(--ink)]">Export as PNG</div>
                <div className="font-mono text-[10px] text-[var(--ink-muted)]">2× raster capture</div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportSVG}
              disabled={isExporting}
              className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[var(--chassis)] transition-colors text-left disabled:opacity-50 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-[var(--signal)]" aria-hidden="true" />
              <div>
                <div className="text-xs font-semibold text-[var(--ink)]">Export as SVG</div>
                <div className="font-mono text-[10px] text-[var(--ink-muted)]">Scalable vector plate</div>
              </div>
            </button>

            {Boolean(currentState) && (
              <button
                type="button"
                onClick={handleExportJSON}
                disabled={isExporting}
                className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[var(--chassis)] transition-colors text-left disabled:opacity-50 cursor-pointer"
              >
                <FileJson className="w-4 h-4 text-[var(--emerald)]" />
                <div>
                  <div className="text-xs font-semibold text-[var(--ink)]">Export State</div>
                  <div className="font-mono text-[10px] text-[var(--ink-muted)]">JSON snapshot</div>
                </div>
              </button>
            )}

            <div className="border-t border-[var(--rule)] my-1.5" />

            <button
              type="button"
              onClick={handleShare}
              disabled={isExporting}
              className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[var(--chassis)] transition-colors text-left disabled:opacity-50 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[var(--ochre)]" />
              <div>
                <div className="text-xs font-semibold text-[var(--ink)]">Share Plate</div>
                <div className="font-mono text-[10px] text-[var(--ink-muted)]">System share sheet</div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[var(--chassis)] transition-colors text-left cursor-pointer"
            >
              {copyFeedback === 'Link copied!' ? (
                <Check className="w-4 h-4 text-[var(--emerald)]" />
              ) : (
                <Link2 className="w-4 h-4 text-[var(--ink-secondary)]" />
              )}
              <div>
                <div className="text-xs font-semibold text-[var(--ink)]">Copy Link</div>
                <div className="font-mono text-[10px] text-[var(--ink-muted)]">
                  Scenario &amp; exact step URL
                </div>
              </div>
            </button>

            {Boolean(currentState) && (
              <button
                type="button"
                onClick={handleCopyState}
                className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[var(--chassis)] transition-colors text-left cursor-pointer"
              >
                {copyFeedback === 'State copied!' ? (
                  <Check className="w-4 h-4 text-[var(--emerald)]" />
                ) : (
                  <Copy className="w-4 h-4 text-[var(--ink-secondary)]" />
                )}
                <div>
                  <div className="text-xs font-semibold text-[var(--ink)]">Copy State</div>
                  <div className="font-mono text-[10px] text-[var(--ink-muted)]">JSON to clipboard</div>
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
