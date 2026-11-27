'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { subscribeAchievements, UnlockedAchievement } from '@/lib/progress';

interface ToastItem extends UnlockedAchievement {
  toastKey: string;
}

const TOAST_DURATION_MS = 4500;

export default function AchievementToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const unsubscribe = subscribeAchievements((unlocked) => {
      const newItems: ToastItem[] = unlocked.map((achievement) => ({
        ...achievement,
        toastKey: `${achievement.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      }));

      setToasts((prev) => [...prev, ...newItems].slice(-3));

      newItems.forEach((item) => {
        const timer = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.toastKey !== item.toastKey));
          timers.delete(item.toastKey);
        }, TOAST_DURATION_MS);
        timers.set(item.toastKey, timer);
      });
    });

    return () => {
      unsubscribe();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const dismiss = (toastKey: string) => {
    setToasts((prev) => prev.filter((t) => t.toastKey !== toastKey));
  };

  return (
    <div
      className="fixed bottom-14 left-4 right-4 sm:left-auto sm:right-4 z-[60] flex flex-col gap-2 sm:max-w-sm pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.toastKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto bg-[var(--ink)] text-[var(--paper-elevated)] border border-[var(--ink)] shadow-[5px_5px_0_0_var(--signal)] p-4 flex items-start gap-3"
          >
            <div className="w-8 h-8 bg-[var(--signal)] text-[#FAF7F1] flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FB923C]">
                Verification Seal Unlocked
              </p>
              <p className="font-editorial text-lg leading-tight text-[#FAF7F1] mt-0.5">
                {toast.name}
              </p>
              <p className="text-xs text-[#D6D2C7] mt-1">{toast.description}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.toastKey)}
              className="text-[#9E9B90] hover:text-[#FAF7F1] transition-colors cursor-pointer"
              aria-label="Dismiss achievement notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
