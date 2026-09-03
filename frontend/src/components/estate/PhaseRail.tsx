import Link from 'next/link';
import { ChevronRight, Route } from 'lucide-react';
import clsx from 'clsx';
import type { Workflow, WorkflowPhase } from '@/types';

/** Compact, wrapping list of phase names: "1 Ingest › 2 Spine › 3 Telling desk …" */
export function PhaseRail({ phases, className }: { phases: WorkflowPhase[]; className?: string }) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-y-1', className)}>
      {phases.map((phase, i) => (
        <span key={phase.phase_number} className="inline-flex items-center text-[11px] leading-tight">
          {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300 mx-0.5 flex-shrink-0" />}
          <span className="font-mono text-gray-400 mr-1">{phase.phase_number}</span>
          <span className="text-gray-700 whitespace-nowrap">{phase.phase_name}</span>
        </span>
      ))}
    </div>
  );
}

const WORKFLOW_CATEGORY_COLORS: Record<string, string> = {
  process: 'bg-violet-100 text-violet-800',
  rendering: 'bg-indigo-100 text-indigo-800',
  synthesis: 'bg-blue-100 text-blue-800',
  influence: 'bg-purple-100 text-purple-800',
  outline: 'bg-teal-100 text-teal-800',
  analysis: 'bg-green-100 text-green-800',
  genealogy: 'bg-amber-100 text-amber-800',
  decision_support: 'bg-rose-100 text-rose-800',
};

export function workflowCategoryClass(category: string | undefined): string {
  return (category && WORKFLOW_CATEGORY_COLORS[category]) || 'badge-gray';
}

/** Which organ a workflow runs in; the registry's own processes default to The Analyst. */
export function workflowOrganKey(workflow: Pick<Workflow, 'source_project'>): string {
  return workflow.source_project || 'the-analyst';
}

export function ProcessCard({
  workflow,
  organName,
}: {
  workflow: Workflow;
  organName?: string;
}) {
  const organKey = workflowOrganKey(workflow);
  const phases = workflow.phases ?? [];
  return (
    <div className="card p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/processes/${workflow.workflow_key}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-primary-700"
          >
            <Route className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <span className="truncate">{workflow.workflow_name}</span>
          </Link>
          <p className="mt-0.5 text-xs text-gray-500">
            runs in{' '}
            <Link href={`/organs/${organKey}`} className="text-primary-600 hover:underline">
              {organName ?? organKey}
            </Link>
            <span className="text-gray-300"> · </span>
            {phases.length} phases
          </p>
        </div>
        <span className={clsx('badge text-[10px] py-0 flex-shrink-0', workflowCategoryClass(workflow.category))}>
          {workflow.category?.replace('_', ' ')}
        </span>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2">{workflow.description}</p>
      <PhaseRail phases={phases} className="mt-1" />
      <Link
        href={`/processes/${workflow.workflow_key}`}
        className="mt-auto pt-1 inline-flex items-center text-xs font-medium text-primary-600 hover:text-primary-700"
      >
        Open process
        <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
      </Link>
    </div>
  );
}
