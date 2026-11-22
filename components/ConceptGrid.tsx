'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import { useProgress } from '@/hooks/useProgress';

export default function ConceptGrid() {
  const { progress } = useProgress();

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {CONCEPTS_CATALOG.map((concept) => {
        const isCompleted = progress.conceptsCompleted.includes(concept.id);
        const completedScenarios = concept.scenarioKeys.filter((key) =>
          progress.scenariosCompleted.includes(key)
        ).length;
        const totalScenarios = concept.scenarioKeys.length;

        return (
          <Link
            key={concept.path}
            href={concept.path}
            className="group bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20 flex flex-col"
          >
            <div className={`h-2 ${concept.color}`} />
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-2xl">{concept.emoji}</div>
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </span>
                ) : totalScenarios > 0 && completedScenarios > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700">
                    {completedScenarios}/{totalScenarios} scenarios
                  </span>
                ) : null}
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                {concept.name}
              </h3>
              <p className="text-slate-400 text-sm flex-1">{concept.description}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-blue-400 font-medium">Explore →</span>
                {totalScenarios > 0 && (
                  <span className="text-xs text-slate-500">
                    {totalScenarios} scenario{totalScenarios === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
