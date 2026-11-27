'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Moves keyboard focus into a modal/drawer when it opens and restores focus
 * back to the previously active trigger element when the dialog closes.
 */
export function useDialogFocus(
  open: boolean,
  targetRef: RefObject<HTMLElement | null>
): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const active = document.activeElement;
    previousFocusRef.current = active instanceof HTMLElement ? active : null;

    const rafId = window.requestAnimationFrame(() => {
      targetRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      const prev = previousFocusRef.current;
      previousFocusRef.current = null;
      if (prev && prev.isConnected) {
        prev.focus();
      }
    };
  }, [open, targetRef]);
}
