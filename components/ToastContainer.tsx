'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { subscribeToasts, ToastMessage } from '@/lib/toast';

const TOAST_DURATION_MS = 4000;

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const unsubscribe = subscribeToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
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
          border: 'border-green-500/80',
          icon: <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />,
        };
      case 'error':
        return {
          border: 'border-red-500/80',
          icon: <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
        };
      default:
        return {
          border: 'border-blue-500/80',
          icon: <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />,
        };
    }
  };

  return (
    <div
      className="fixed top-20 right-4 z-[60] flex flex-col gap-2 max-w-sm pointer-events-none"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const styles = getStyles(toast.variant);
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto bg-slate-800 border ${styles.border} rounded-lg shadow-xl px-4 py-3 flex items-start gap-3`}
            >
              <div className="mt-0.5">{styles.icon}</div>
              <div className="flex-1 min-w-0">
                {toast.title && <p className="text-sm font-semibold text-white">{toast.title}</p>}
                <p className="text-sm text-slate-200">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
