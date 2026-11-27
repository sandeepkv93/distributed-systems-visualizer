'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { CONCEPTS_BY_ID } from '@/lib/catalog';
import { getLabByPath } from '@/lib/labs-catalog';
import PlateNavigator from './PlateNavigator';
import LabNavigator from './LabNavigator';

export default function VisualizerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const normalizedSlug = pathname?.replace(/^\/|\/$/g, '') || '';
  const normalizedPath = pathname?.replace(/\/$/, '') || '/';
  const isConceptPlate = CONCEPTS_BY_ID.has(normalizedSlug);
  const isInteractiveLab = !isConceptPlate && Boolean(getLabByPath(normalizedPath));

  return (
    <main
      id="main-content"
      tabIndex={-1}
      data-view={isConceptPlate ? 'visualizer' : 'atlas'}
      className="relative z-10 focus:outline-none"
    >
      {children}
      {isConceptPlate && <PlateNavigator conceptId={normalizedSlug} />}
      {isInteractiveLab && <LabNavigator path={normalizedPath} />}
    </main>
  );
}
