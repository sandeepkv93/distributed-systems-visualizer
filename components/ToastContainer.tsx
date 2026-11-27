'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { subscribeToasts, ToastMessage } from '@/lib/toast';

const TOAST_DURATION_MS = 4000;

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const unsubscribe = subscribeToasts((toast) => {
      setToasts((prev) => [...prev, toast].slice(-3));
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
        timers.delete(toast.id);
      }, TOAST_DURATION_MS);
      timers.set(toast.id, timer);
    });

    return () => {
      unsubscribe();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const getStyles = (variant: ToastMessage['variant']) => {
    switch (variant) {
      case 'success':
        return {
          accent: 'border-l-[var(--emerald)]',
          icon: <Check className="w-4 h-4 text-[var(--emerald)] flex-shrink-0 stroke-[2.5]" />,
        };
      case 'error':
        return {
          accent: 'border-l-[var(--signal)]',
          icon: <AlertCircle className="w-4 h-4 text-[var(--signal)] flex-shrink-0" />,
        };
      default:
        return {
          accent: 'border-l-[var(--cobalt)]',
          icon: <Info className="w-4 h-4 text-[var(--cobalt)] flex-shrink-0" />,
        };
    }
  };

  return (
    <div
      className="fixed top-[68px] left-4 right-4 sm:left-auto sm:right-4 z-[60] flex flex-col gap-2 sm:max-w-sm pointer-events-none"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const styles = getStyles(toast.variant);
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto bg-[var(--paper-elevated)] text-[var(--ink)] border border-[var(--ink)] border-l-4 ${styles.accent} shadow-[4px_4px_0_0_var(--ink)] px-3.5 py-2.5 flex items-start gap-3`}
            >
              <div className="mt-0.5">{styles.icon}</div>
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <p className="font-mono text-[11px] uppercase tracking-wider font-semibold text-[var(--ink)]">
                    {toast.title}
                  </p>
                )}
                <p className="text-xs text-[var(--ink-secondary)] leading-snug">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
