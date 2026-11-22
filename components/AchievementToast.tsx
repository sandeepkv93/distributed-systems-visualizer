'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
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

      setToasts((prev) => [...prev, ...newItems]);

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
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.toastKey}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto bg-slate-800 border-2 border-yellow-500/80 rounded-lg shadow-xl p-4 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
                Achievement Unlocked
              </p>
              <p className="text-sm font-bold text-white mt-0.5">{toast.name}</p>
              <p className="text-xs text-slate-300 mt-0.5">{toast.description}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.toastKey)}
              className="text-slate-400 hover:text-white transition-colors"
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
