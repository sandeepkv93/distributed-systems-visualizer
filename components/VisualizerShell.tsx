'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export default function VisualizerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/' || pathname === '';

  return (
    <main data-view={isHome ? 'atlas' : 'visualizer'} className="relative z-10">
      {children}
    </main>
  );
}
