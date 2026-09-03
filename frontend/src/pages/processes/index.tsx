import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { Workflow } from '@/types';
import { ProcessCard, workflowOrganKey } from '@/components/estate/PhaseRail';

export default function ProcessesPage() {
  const workflowsQ = useQuery({ queryKey: ['workflows', 'detailed'], queryFn: () => api.workflows.listDetailed() });
  const organsQ = useQuery({ queryKey: ['organs'], queryFn: () => api.organs.list() });

  const organs = organsQ.data ?? [];
  const organByKey = useMemo(() => new Map(organs.map((o) => [o.organ_key, o])), [organs]);

  const groups = useMemo(() => {
    const byOrgan = new Map<string, Workflow[]>();
    for (const w of workflowsQ.data ?? []) {
      const k = workflowOrganKey(w);
      if (!byOrgan.has(k)) byOrgan.set(k, []);
      byOrgan.get(k)!.push(w);
    }
    // The Analyst first, then registry order, then unknown organs alphabetically.
    const rank = (k: string) => {
      if (k === 'the-analyst') return -1;
      const o = organByKey.get(k);
      return o ? organs.indexOf(o) : 1000;
    };
    return Array.from(byOrgan.entries()).sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
  }, [workflowsQ.data, organByKey, organs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Processes</h1>
        <p className="mt-1 text-gray-500">
          Every registered sequence of methods, grouped by the organ that runs it. A process is a numbered spine of
          phases; each phase names the engine, chain or function it calls.
        </p>
      </div>

      {workflowsQ.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-36" />
          ))}
        </div>
      )}

      {workflowsQ.error && (
        <div className="flex items-center justify-center h-64 text-red-600">
          <AlertCircle className="h-6 w-6 mr-2" />
          Failed to load processes
        </div>
      )}

      {groups.map(([organKey, workflows]) => {
        const organ = organByKey.get(organKey);
        return (
          <section key={organKey} className="space-y-3">
            <div className="flex items-center gap-2 mt-2">
              <Link href={`/organs/${organKey}`} className="text-base font-semibold text-gray-900 hover:text-primary-700 inline-flex items-center">
                {organ?.organ_name ?? organKey}
                <ChevronRight className="h-4 w-4 ml-0.5 text-gray-300" />
              </Link>
              {organ?.tagline && <span className="text-sm text-gray-400 hidden md:inline truncate">{organ.tagline}</span>}
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">{workflows.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {workflows.map((w) => (
                <ProcessCard key={w.workflow_key} workflow={w} organName={organ?.organ_name} />
              ))}
            </div>
          </section>
        );
      })}

      {workflowsQ.data && workflowsQ.data.length === 0 && (
        <div className="card p-12 text-center text-gray-500">No processes found</div>
      )}
    </div>
  );
}
