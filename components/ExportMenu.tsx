'use client';

import { useState } from 'react';
import { Download, Share2, Copy, FileJson, Image, Link2, Check } from 'lucide-react';
import {
  exportAsPNG,
  exportAsSVG,
  exportStateAsJSON,
  shareVisualization,
  copyLinkToClipboard,
  copyStateToClipboard,
} from '@/lib/export';
import { motion, AnimatePresence } from 'framer-motion';

interface ExportMenuProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  concept: string;
  currentState?: any;
}

export default function ExportMenu({ svgRef, concept, currentState }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleExportPNG = async () => {
    if (!svgRef.current) return;

    setIsExporting(true);
    try {
      await exportAsPNG(svgRef.current, `${concept.toLowerCase().replace(/\s+/g, '-')}.png`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export PNG. Please try again.');
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
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export SVG. Please try again.');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const handleExportJSON = () => {
    if (!currentState) {
      alert('No state available to export');
      return;
    }

    setIsExporting(true);
    try {
      exportStateAsJSON(currentState, `${concept.toLowerCase().replace(/\s+/g, '-')}-state.json`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export state. Please try again.');
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
    } catch (error: any) {
      if (error.message?.includes('not supported')) {
        alert('Sharing is not supported in this browser. Try exporting as PNG instead.');
      } else if (error.name !== 'AbortError') {
        // AbortError means user cancelled the share dialog
        console.error('Share failed:', error);
        alert('Failed to share. Please try exporting instead.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await copyLinkToClipboard();
      showCopyFeedback('Link copied!');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy link');
    }
  };

  const handleCopyState = async () => {
    if (!currentState) {
      alert('No state available to copy');
      return;
    }

    try {
      await copyStateToClipboard(currentState, concept);
      showCopyFeedback('State copied!');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('Failed to copy state');
    }
  };

  const showCopyFeedback = (message: string) => {
    setCopyFeedback(message);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div className="relative">
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        disabled={isExporting}
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50"
          >
            {/* PNG Export */}
            <button
              onClick={handleExportPNG}
              disabled={isExporting}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left disabled:opacity-50"
            >
              <Image className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-white text-sm font-medium">Export as PNG</div>
                <div className="text-slate-400 text-xs">High-quality image</div>
              </div>
            </button>

            {/* SVG Export */}
            <button
              onClick={handleExportSVG}
              disabled={isExporting}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left disabled:opacity-50"
            >
              <Image className="w-4 h-4 text-purple-400" />
              <div>
                <div className="text-white text-sm font-medium">Export as SVG</div>
                <div className="text-slate-400 text-xs">Scalable vector</div>
              </div>
            </button>

            {/* JSON State Export */}
            {currentState && (
              <button
                onClick={handleExportJSON}
                disabled={isExporting}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left disabled:opacity-50"
              >
                <FileJson className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-white text-sm font-medium">Export State</div>
                  <div className="text-slate-400 text-xs">JSON snapshot</div>
                </div>
              </button>
            )}

            <div className="border-t border-slate-700 my-2" />

            {/* Share */}
            <button
              onClick={handleShare}
              disabled={isExporting}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left disabled:opacity-50"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-white text-sm font-medium">Share</div>
                <div className="text-slate-400 text-xs">Via system dialog</div>
              </div>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left relative"
            >
              {copyFeedback === 'Link copied!' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Link2 className="w-4 h-4 text-cyan-400" />
              )}
              <div>
                <div className="text-white text-sm font-medium">Copy Link</div>
                <div className="text-slate-400 text-xs">Share URL</div>
              </div>
            </button>

            {/* Copy State */}
            {currentState && (
              <button
                onClick={handleCopyState}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left relative"
              >
                {copyFeedback === 'State copied!' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <div className="text-white text-sm font-medium">Copy State</div>
                  <div className="text-slate-400 text-xs">To clipboard</div>
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
