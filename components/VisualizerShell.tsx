'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { CONCEPTS_BY_ID } from '@/lib/catalog';
import PlateNavigator from './PlateNavigator';

export default function VisualizerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const normalized = pathname?.replace(/^\/|\/$/g, '') || '';
  const isConceptPlate = CONCEPTS_BY_ID.has(normalized);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      data-view={isConceptPlate ? 'visualizer' : 'atlas'}
      className="relative z-10 focus:outline-none"
    >
      {children}
      {isConceptPlate && <PlateNavigator conceptId={normalized} />}
    </main>
  );
}
