import Link from 'next/link';
import { Zap, Link2, GitBranch, FunctionSquare } from 'lucide-react';
import type { WorkflowPhase } from '@/types';

/** Vertical numbered spine of a process: number, name, description, engine link, dependencies. */
export function ProcessSpine({ phases }: { phases: WorkflowPhase[] }) {
  return (
    <ol className="relative border-l-2 border-gray-200 ml-5 space-y-6">
      {phases.map((phase) => {
        const deps = phase.depends_on_phases ?? [];
        return (
          <li key={phase.phase_number} id={`phase-${phase.phase_number}`} className="relative pl-8 scroll-mt-24">
            <span className="absolute -left-[19px] top-0 flex h-9 w-9 items-center justify-center rounded-full bg-white border-2 border-amber-300 text-amber-700 font-mono text-sm font-semibold">
              {phase.phase_number}
            </span>
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900">{phase.phase_name}</h3>
              {phase.phase_description && (
                <p className="mt-1 text-sm text-gray-600">{phase.phase_description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                {phase.engine_key && (
                  <span className="inline-flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-gray-400" />
                    engine{' '}
                    <Link href={`/engines/${phase.engine_key}`} className="font-mono text-primary-600 hover:underline">
                      {phase.engine_key}
                    </Link>
                  </span>
                )}
                {phase.chain_key && (
                  <span className="inline-flex items-center gap-1">
                    <GitBranch className="h-3.5 w-3.5 text-violet-500" />
                    chain{' '}
                    <Link href={`/chains/${phase.chain_key}`} className="font-mono text-violet-700 hover:underline">
                      {phase.chain_key}
                    </Link>
                  </span>
                )}
                {phase.function_key && !phase.engine_key && (
                  <span className="inline-flex items-center gap-1">
                    <FunctionSquare className="h-3.5 w-3.5 text-gray-400" />
                    function <span className="font-mono text-gray-700">{phase.function_key}</span>
                  </span>
                )}
                {deps.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="h-3.5 w-3.5 text-gray-400" />
                    after{' '}
                    {deps.map((d, i) => (
                      <span key={d}>
                        {i > 0 && ', '}
                        <a href={`#phase-${d}`} className="font-mono text-gray-700 hover:text-primary-600">
                          {d}
                        </a>
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
