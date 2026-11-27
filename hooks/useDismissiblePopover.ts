'use client';

import { useEffect, useRef } from 'react';

const HUD_OPEN_EVENT = 'atlas:hud-popover-open';

/**
 * Coordinates oscilloscope HUD popovers so:
 *  1. Pressing Escape dismisses the open popover.
 *  2. Clicking outside the popover container dismisses it.
 *  3. Opening one HUD popover (e.g. Invariants) automatically closes sibling
 *     HUD popovers (e.g. Wire Log or Chaos) so they never overlap on canvas.
 */
export function useDismissibleHudPopover(
  id: string,
  expanded: boolean,
  onClose: () => void
) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Notify sibling HUD popovers whenever this one expands
  useEffect(() => {
    if (!expanded || typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(HUD_OPEN_EVENT, { detail: { id } }));
  }, [expanded, id]);

  // Listen for Escape, outside clicks, and sibling HUD open events
  useEffect(() => {
    if (!expanded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        onClose();
      }
    };

    const handleSiblingOpen = (event: Event) => {
      const custom = event as CustomEvent<{ id?: string }>;
      if (custom.detail?.id && custom.detail.id !== id) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener(HUD_OPEN_EVENT, handleSiblingOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener(HUD_OPEN_EVENT, handleSiblingOpen);
    };
  }, [expanded, id, onClose]);

  return containerRef;
}
