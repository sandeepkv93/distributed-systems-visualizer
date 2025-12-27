'use client';

import { ReactNode } from 'react';

type TopicArticleDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function TopicArticleDrawer({ open, title, onClose, children }: TopicArticleDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-slate-900 border-l border-slate-700 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
          >
            Close
          </button>
        </div>
        <div className="p-6 overflow-y-auto h-[calc(100%-64px)] text-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
}
